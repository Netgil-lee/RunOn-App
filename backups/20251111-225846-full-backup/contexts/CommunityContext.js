import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Alert } from 'react-native';
import { useNotificationSettings } from './NotificationSettingsContext';
import { useAuth } from './AuthContext';
import firestoreService from '../services/firestoreService'; // 추가: FirestoreService 임포트

const CommunityContext = createContext();

export const useCommunity = () => useContext(CommunityContext);

export const CommunityProvider = ({ children }) => {
  const { user } = useAuth();
  const db = getFirestore();
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { isNotificationTypeEnabled } = useNotificationSettings();
  
  // 커뮤니티 알림 표시 상태 관리
  const [hasCommunityNotification, setHasCommunityNotification] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(false);
  const [hasBoardNotification, setHasBoardNotification] = useState(false);
  
  // 사용자 정보 캐시 (성능 최적화)
  const [userCache, setUserCache] = useState({});
  
  // Alert 표시된 알림 ID 추적 (중복 Alert 방지)
  const shownAlertIds = useRef(new Set());

  // Firebase에서 실시간으로 게시글 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      const postsData = [];
      
      for (const doc of snapshot.docs) {
        const postData = doc.data();
        
        // 댓글의 사용자 정보 업데이트
        let processedComments = postData.comments || [];
        
        if (processedComments.length > 0) {
          processedComments = await Promise.all(
            processedComments.map(async (comment) => {
              // authorId가 있는 모든 댓글에 대해 사용자 정보 확인
              if (comment.authorId) {
                try {
                  // 캐시에서 먼저 확인
                  if (userCache[comment.authorId]) {
                    const cachedAuthorName = userCache[comment.authorId];
                    return {
                      ...comment,
                      author: cachedAuthorName
                    };
                  }
                  
                  // 사용자 정보 조회
                  const { doc: docRef } = await import('firebase/firestore');
                  const userRef = docRef(db, 'users', comment.authorId);
                  const userDoc = await getDoc(userRef);
                                                          if (userDoc.exists()) {
                      const userData = userDoc.data();
                      const authorName = userData.displayName || userData.nickname || userData.profile?.nickname || userData.email?.split('@')[0] || '사용자';
                    
                    // 캐시에 저장
                    setUserCache(prev => ({
                      ...prev,
                      [comment.authorId]: authorName
                    }));
                    
                    return {
                      ...comment,
                      author: authorName
                    };
                  } else {
                    console.warn('⚠️ 사용자 문서가 존재하지 않음 (댓글 작성자):', comment.authorId, '- 기본값으로 처리');
                  }
                } catch (error) {
                  console.warn('⚠️ 댓글 작성자 정보 조회 실패:', error);
                }
              }
              return comment;
            })
          );
        }
        
        // 게시글 작성자 프로필 정보 가져오기
        let authorProfile = null;
        if (postData.authorId && !postData.isAnonymous) {
          try {
            // 캐시에서 먼저 확인
            if (userCache[postData.authorId]) {
              authorProfile = userCache[postData.authorId];
            } else {
              // 사용자 정보 조회
              const { doc: docRef } = await import('firebase/firestore');
              const userRef = docRef(db, 'users', postData.authorId);
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                authorProfile = {
                  displayName: userData.profile?.nickname || userData.displayName || userData.displayName,
                  profileImage: userData.profile?.profileImage || userData.profileImage || userData.photoURL || null
                };
                
                // 캐시에 저장
                setUserCache(prev => ({
                  ...prev,
                  [postData.authorId]: authorProfile
                }));
              }
            }
          } catch (error) {
            console.warn('⚠️ 게시글 작성자 프로필 조회 실패:', error);
          }
        }

        // Firestore Timestamp 객체를 안전하게 처리
        const processedPost = {
          id: doc.id,
          ...postData,
          comments: processedComments,
          authorProfile: authorProfile,
          createdAt: postData.createdAt?.toDate?.() || postData.createdAt,
          updatedAt: postData.updatedAt?.toDate?.() || postData.updatedAt,
        };
        postsData.push(processedPost);
      }
      
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [user, db]);

  // 커뮤니티 알림 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef, 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = [];
      snapshot.forEach((doc) => {
        const notificationData = doc.data();
        // Firestore Timestamp 객체를 안전하게 처리
        const processedNotification = {
          id: doc.id,
          ...notificationData,
          timestamp: notificationData.timestamp?.toDate?.() || notificationData.timestamp,
        };
        notificationsData.push(processedNotification);
        
        // showAlert가 true인 새로운 알림이면 Alert 표시
        if (notificationData.showAlert && !shownAlertIds.current.has(doc.id)) {
          shownAlertIds.current.add(doc.id);
          
          // Alert 표시
          Alert.alert(
            notificationData.title || '알림',
            notificationData.message || '',
            [
              {
                text: '확인',
                onPress: async () => {
                  // showAlert를 false로 업데이트
                  try {
                    const notificationRef = doc(db, 'notifications', doc.id);
                    await updateDoc(notificationRef, { showAlert: false });
                  } catch (error) {
                    console.error('❌ 알림 showAlert 업데이트 실패:', error);
                  }
                }
              }
            ]
          );
        }
      });
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, [user, db]);

  // notifications 상태가 변경될 때마다 알림 상태 자동 업데이트
  useEffect(() => {
    // 초기 로딩 시에도 체크하도록 수정
    checkCommunityNotifications();
    checkChatNotifications();
    checkBoardNotifications();
  }, [notifications]);

  // 커뮤니티 알림이 있는지 확인하는 함수 (채팅 알림 제외)
  const checkCommunityNotifications = () => {
    const hasUnreadNotifications = notifications.some(notification => 
      !notification.isRead && (notification.type === 'like' || notification.type === 'comment')
    );
    setHasCommunityNotification(hasUnreadNotifications);
    return hasUnreadNotifications;
  };

  // 채팅 알림만 있는지 확인하는 함수
  const checkChatNotifications = () => {
    const hasUnreadChatNotifications = notifications.some(notification => 
      !notification.isRead && notification.type === 'message'
    );
    setHasChatNotification(hasUnreadChatNotifications);
    return hasUnreadChatNotifications;
  };

  // 자유게시판 알림만 있는지 확인하는 함수
  const checkBoardNotifications = () => {
    const hasUnreadBoardNotifications = notifications.some(notification => 
      !notification.isRead && (notification.type === 'like' || notification.type === 'comment')
    );
    setHasBoardNotification(hasUnreadBoardNotifications);
    return hasUnreadBoardNotifications;
  };

  // 채팅 탭 클릭 시 (알림 읽음 처리하지 않음 - 채팅카드에 알림 배지 표시 유지)
  const handleChatTabClick = async () => {
    console.log('🔍 채팅 탭 클릭됨 - 알림 읽음 처리하지 않음');
    
    // 채팅 탭 클릭 시에는 알림을 읽음 처리하지 않음
    // 채팅카드에 읽지 않은 메시지 수를 표시하기 위함
    
    // 알림 상태 확인만 수행
    checkCommunityNotifications();
    checkChatNotifications();
    checkBoardNotifications();
  };

  // 특정 채팅방 클릭 시 해당 채팅방 알림을 읽음 처리
  const handleChatRoomClick = async (chatRoomId) => {
    try {
      // chatRoomId를 문자열로 변환하여 비교
      const chatRoomIdStr = chatRoomId.toString();
      
      console.log(`🔍 채팅방 ${chatRoomIdStr} 클릭됨 - 해당 채팅방 알림 읽음 처리`);
      
      // Firestore에서 해당 채팅방의 알림만 읽음 처리
      const notificationsRef = collection(db, 'notifications');
      const chatRoomNotificationsQuery = query(
        notificationsRef,
        where('userId', '==', user.uid),
        where('type', '==', 'message'),
        where('chatId', '==', chatRoomIdStr),
        where('isRead', '==', false)
      );
      
      const querySnapshot = await getDocs(chatRoomNotificationsQuery);
      
      if (querySnapshot.docs.length > 0) {
        const updatePromises = querySnapshot.docs.map(doc => 
          updateDoc(doc.ref, { isRead: true })
        );
        
        await Promise.all(updatePromises);
        console.log(`✅ 채팅방 ${chatRoomIdStr} 알림 읽음 처리 완료:`, querySnapshot.docs.length, '개');
      } else {
        console.log(`🔍 채팅방 ${chatRoomIdStr}에 읽지 않은 알림 없음`);
      }
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notification => 
          notification.type === 'message' && notification.chatId === chatRoomIdStr
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // 알림 상태 다시 확인
      setTimeout(() => {
        checkCommunityNotifications();
        checkChatNotifications();
        checkBoardNotifications();
      }, 100);
      
    } catch (error) {
      console.error(`❌ 채팅방 ${chatRoomId} 알림 읽음 처리 실패:`, error);
    }
  };

  // 자유게시판 탭 클릭 시 모든 자유게시판 알림을 읽음 처리
  const handleBoardTabClick = async () => {
    try {
      // Firestore에서 자유게시판 알림들을 읽음 처리
      const notificationsRef = collection(db, 'notifications');
      const boardNotificationsQuery = query(
        notificationsRef,
        where('userId', '==', user.uid),
        where('type', 'in', ['like', 'comment']),
        where('isRead', '==', false)
      );
      
      const querySnapshot = await getDocs(boardNotificationsQuery);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );
      
      await Promise.all(updatePromises);
      console.log('✅ Firestore 자유게시판 알림 읽음 처리 완료:', querySnapshot.docs.length, '개');
    } catch (error) {
      console.error('❌ Firestore 자유게시판 알림 읽음 처리 실패:', error);
    }
    
    // 로컬 상태 업데이트
    setNotifications(prev => 
      prev.map(notification => 
        notification.type === 'like' || notification.type === 'comment'
          ? { ...notification, isRead: true }
          : notification
      )
    );
    
    // 알림 상태 다시 확인
    setTimeout(() => {
      checkCommunityNotifications();
      checkChatNotifications();
      checkBoardNotifications();
    }, 100);
  };
  
  // 알림 상태 변경 시 커뮤니티 알림 표시 상태 업데이트
  useEffect(() => {
    const hasUnreadNotifications = checkCommunityNotifications();
    const hasUnreadChatNotifications = checkChatNotifications();
    const hasUnreadBoardNotifications = checkBoardNotifications();
    
    // 디버깅: 커뮤니티 알림 상태 로그
    console.log('🔍 CommunityContext 알림 상태 업데이트:', {
      hasUnreadNotifications,
      hasUnreadChatNotifications,
      hasUnreadBoardNotifications,
      totalNotifications: notifications.length,
      unreadCount: notifications.filter(n => !n.isRead).length
    });
  }, [notifications]);

  const addPost = (post) => {
    // Firestore에서 실시간으로 가져오므로 로컬 상태 업데이트는 불필요
    // onSnapshot이 자동으로 업데이트됨
    console.log('게시글 추가됨:', post);
  };

  const updatePost = (postId, updates) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  };

  const deletePost = async (postId) => {
    try {
      // Firebase에서 실제 게시글 삭제
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);
      
      // 게시글과 연관된 이미지 파일들도 삭제 (백그라운드에서 실행)
      try {
        // StorageService를 사용하여 게시글 관련 파일 삭제
        // 에러가 발생해도 게시글 삭제는 성공으로 처리
        const { getStorage, ref, listAll, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        const postImagesRef = ref(storage, `post-images/posts/${postId}`);
        const fileList = await listAll(postImagesRef);
        
        if (fileList.items.length > 0) {
          const deletePromises = fileList.items.map(item => deleteObject(item));
          await Promise.all(deletePromises);
        }
      } catch (fileError) {
        // 파일 삭제 실패는 무시 (게시글 삭제는 성공)
      }
      
      // 로컬 상태 업데이트
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('❌ 게시글 삭제 실패:', error);
      throw error;
    }
  };

  const toggleLike = async (postId, userId) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error('게시글을 찾을 수 없습니다:', postId);
        return;
      }
      
      const postData = postDoc.data();
      const likes = postData.likes || [];
      const isLiked = likes.includes(userId);
      
      let updatedLikes;
      if (isLiked) {
        updatedLikes = likes.filter(id => id !== userId);
      } else {
        updatedLikes = [...likes, userId];
      }
      
      await updateDoc(postRef, { likes: updatedLikes });
      // console.log('✅ 좋아요 토글 완료:', { postId, userId, isLiked: !isLiked });
    } catch (error) {
      console.error('❌ 좋아요 토글 실패:', error);
    }
  };

  // 댓글 추가
  const addComment = async (postId, comment) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error('❌ 게시글을 찾을 수 없음:', postId);
        return;
      }
      
      const postData = postDoc.data();
      const comments = postData.comments || [];
      const updatedComments = [comment, ...comments];
      
      await updateDoc(postRef, { comments: updatedComments });
      // console.log('✅ 댓글 추가 완료:', { postId, commentId: comment.id });
    } catch (error) {
      console.error('❌ 댓글 추가 실패:', error);
    }
  };

  // 댓글 수정
  const updateComment = async (postId, commentId, updatedComment) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error('❌ 게시글을 찾을 수 없음:', postId);
        return;
      }
      
      const postData = postDoc.data();
      const comments = postData.comments || [];
      const updatedComments = comments.map(comment => 
        comment.id === commentId ? updatedComment : comment
      );
      
      await updateDoc(postRef, { comments: updatedComments });
      console.log('✅ 댓글 수정 완료:', { postId, commentId });
    } catch (error) {
      console.error('❌ 댓글 수정 실패:', error);
      throw error;
    }
  };

  // 댓글 삭제
  const deleteComment = async (postId, commentId) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error('❌ 게시글을 찾을 수 없음:', postId);
        return;
      }
      
      const postData = postDoc.data();
      const comments = postData.comments || [];
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      
      await updateDoc(postRef, { comments: updatedComments });
      console.log('✅ 댓글 삭제 완료:', { postId, commentId });
    } catch (error) {
      console.error('❌ 댓글 삭제 실패:', error);
      throw error;
    }
  };

  // 알림 생성 함수
  const createNotification = async (type, postId, postTitle, authorName, targetUserId) => {
    // 알림 설정이 비활성화되어 있으면 알림 생성하지 않음
    if (!isNotificationTypeEnabled(type)) {
      return;
    }

    // 필수 매개변수 검증
    if (!targetUserId || !postId || !authorName) {
      console.warn('⚠️ 알림 생성 실패: 필수 매개변수 누락', { type, postId, authorName, targetUserId });
      return;
    }

    const notification = {
      id: `notification_${Date.now()}_${Math.random()}`,
      type: type,
      action: type, // 액션 필드 추가
      timestamp: new Date(),
      isRead: false,
      userId: targetUserId, // 알림을 받을 사용자 ID
      navigationData: {
        screen: 'PostDetail',
        params: { postId }
      }
    };

    // 알림 타입에 따른 제목과 메시지 설정
    switch (type) {
      case 'like':
        notification.title = '좋아요를 받았습니다';
        notification.message = `${authorName}님이 당신의 게시글 "${postTitle}"에 좋아요를 눌렀습니다`;
        break;
      case 'comment':
        notification.title = '새로운 댓글이 달렸습니다';
        notification.message = `${authorName}님이 당신의 게시글 "${postTitle}"에 댓글을 달았습니다`;
        break;
      default:
        console.warn('⚠️ 알림 생성 실패: 알 수 없는 타입', type);
        return;
    }

    try {
      // Firestore에 알림 저장
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, notification);
      console.log('✅ 알림 생성 완료:', { type, targetUserId, postId });
    } catch (error) {
      console.error('❌ 알림 생성 실패:', error);
      throw error; // 상위 함수에서 처리할 수 있도록 에러 전파
    }
  };

  // 좋아요 알림 생성
  const createLikeNotification = async (postId, postTitle, authorName, targetUserId) => {
    await createNotification('like', postId, postTitle, authorName, targetUserId);
  };

  // 댓글 알림 생성
  const createCommentNotification = async (postId, postTitle, authorName, targetUserId) => {
    await createNotification('comment', postId, postTitle, authorName, targetUserId);
  };

  // 채팅 알림 생성 함수 (DEPRECATED - 푸시 알림으로 대체됨)
  const createChatNotification = async (chatRoomId, chatRoomTitle, message, sender, targetUserId) => {
    try {
      // DEPRECATED: 이 함수는 더 이상 사용되지 않습니다. 
      // 채팅 알림은 pushNotificationService.sendNewMessageNotification으로 대체되었습니다.
      console.warn('⚠️ createChatNotification은 deprecated되었습니다. pushNotificationService를 사용하세요.');
      return;
      
      // 알림 설정이 비활성화되어 있으면 알림 생성하지 않음
      if (!isNotificationTypeEnabled('message')) {
        return;
      }

      // 필수 매개변수 검증
      if (!targetUserId || !chatRoomId || !sender) {
        console.warn('⚠️ 채팅 알림 생성 실패: 필수 매개변수 누락', { chatRoomId, sender, targetUserId });
        return;
      }

      // sender 정보 검증 및 로깅
      console.log('🔍 CommunityContext.createChatNotification - sender 정보:', {
        chatRoomId,
        chatRoomTitle,
        sender,
        senderType: typeof sender,
        targetUserId,
        currentUser: user?.uid
      });

      // sender가 '나' 또는 기본값인 경우 실제 사용자 닉네임 조회
      let finalSender = sender;
      if (sender === '나' || sender === '사용자' || sender === '알 수 없음') {
        console.warn('⚠️ CommunityContext.createChatNotification - sender가 기본값입니다. 실제 닉네임 조회 시도:', {
          sender,
          chatRoomId,
          targetUserId,
          currentUser: user?.uid
        });
        
        try {
          // 현재 사용자의 실제 프로필 정보 조회
          const userProfile = await firestoreService.getUserProfile(user.uid);
          if (userProfile) {
            finalSender = userProfile.profile?.nickname || 
                         userProfile.profile?.displayName || 
                         userProfile.displayName || 
                         user?.displayName || 
                         user?.email?.split('@')[0] || 
                         '사용자';
            
            console.log('✅ CommunityContext.createChatNotification - sender 교체 완료:', {
              original: sender,
              new: finalSender,
              uid: user.uid
            });
          }
        } catch (error) {
          console.error('❌ CommunityContext.createChatNotification - 사용자 프로필 조회 실패:', error);
          finalSender = '사용자'; // 최종 fallback
        }
      }

      const notification = {
        id: `chat_${Date.now()}_${Math.random()}`,
        type: 'message',
        timestamp: new Date(),
        isRead: false,
        title: `${chatRoomTitle}`,
        message: `${finalSender}님이 "${message}" 메시지를 보냈습니다.`,
        action: 'chat',
        chatId: chatRoomId,
        userId: targetUserId, // 알림을 받을 사용자 ID
        navigationData: {
          screen: 'Chat',
          params: { chatRoomId }
        }
      };

      // Firestore에 알림 저장
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, notification);
      console.log('✅ 채팅 알림 생성 완료:', { chatRoomId, targetUserId, sender });

      // 로컬 상태에도 추가 (현재 사용자가 대상인 경우)
      if (targetUserId === user.uid) {
        setNotifications(prev => {
          const newNotifications = [notification, ...prev];
          return newNotifications;
        });
      }
    } catch (error) {
      console.error('❌ 채팅 알림 생성 실패:', error);
    }
  };

  // 알림을 읽음으로 표시
  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) {
      console.warn('⚠️ 알림 읽음 처리 실패: notificationId가 없음');
      return;
    }

    try {
      // Firestore에서 알림 문서 찾기
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, where('id', '==', notificationId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const notificationDoc = querySnapshot.docs[0];
        await updateDoc(notificationDoc.ref, { isRead: true });
        console.log('✅ Firestore 알림 읽음 처리 완료:', notificationId);
      } else {
        console.warn('⚠️ 알림 문서를 찾을 수 없음:', notificationId);
      }
      
      // 로컬 상태도 업데이트
      setNotifications(prev => {
        const updatedNotifications = prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        );
        
        return updatedNotifications;
      });
    } catch (error) {
      console.error('❌ 알림 읽음 처리 실패:', error);
      // 로컬 상태만 업데이트 (Firestore 실패 시에도 UI는 업데이트)
      setNotifications(prev => {
        const updatedNotifications = prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        );
        
        return updatedNotifications;
      });
    }
  };

  // 읽지 않은 알림 개수 가져오기
  const getUnreadNotificationCount = () => {
    return notifications.filter(notification => !notification.isRead).length;
  };

  // 알림 삭제
  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
  };

  // postId로 게시글 찾기
  const getPostById = (postId) => {
    return posts.find(post => post.id === postId);
  };

  return (
    <CommunityContext.Provider value={{ 
      posts, 
      addPost, 
      updatePost, 
      deletePost, 
      toggleLike, 
      addComment,
      updateComment,
      deleteComment,
      notifications,
      createLikeNotification,
      createCommentNotification,
      createChatNotification,
      markNotificationAsRead,
      getUnreadNotificationCount,
      deleteNotification,
      getPostById,
      hasCommunityNotification,
      hasChatNotification,
      hasBoardNotification,
      checkCommunityNotifications,
      checkChatNotifications,
      checkBoardNotifications,
      handleChatTabClick,
      handleChatRoomClick,
      handleBoardTabClick
    }}>
      {children}
    </CommunityContext.Provider>
  );
}; 