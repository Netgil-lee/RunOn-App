import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { useNotificationSettings } from './NotificationSettingsContext';
import { useAuth } from './AuthContext';

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

  // Firebase에서 실시간으로 게시글 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = [];
      snapshot.forEach((doc) => {
        const postData = doc.data();
        // Firestore Timestamp 객체를 안전하게 처리
        const processedPost = {
          id: doc.id,
          ...postData,
          createdAt: postData.createdAt?.toDate?.() || postData.createdAt,
          updatedAt: postData.updatedAt?.toDate?.() || postData.updatedAt,
        };
        postsData.push(processedPost);
      });
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
      });
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, [user, db]);

  // 커뮤니티 알림이 있는지 확인하는 함수
  const checkCommunityNotifications = () => {
    const hasUnreadNotifications = notifications.some(notification => 
      !notification.isRead && (notification.type === 'like' || notification.type === 'comment' || notification.type === 'message')
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

  // 채팅 탭 클릭 시 모든 채팅 알림을 읽음 처리
  const handleChatTabClick = () => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.type === 'message' 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // 특정 채팅방 클릭 시 해당 채팅방 알림을 읽음 처리
  const handleChatRoomClick = (chatRoomId) => {
    // chatRoomId를 문자열로 변환하여 비교
    const chatRoomIdStr = chatRoomId.toString();
    setNotifications(prev => 
      prev.map(notification => 
        notification.type === 'message' && notification.chatId === chatRoomIdStr
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // 자유게시판 탭 클릭 시 모든 자유게시판 알림을 읽음 처리
  const handleBoardTabClick = () => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.type === 'like' || notification.type === 'comment'
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };
  
  // 알림 상태 변경 시 커뮤니티 알림 표시 상태 업데이트
  useEffect(() => {
    checkCommunityNotifications();
    checkChatNotifications();
    checkBoardNotifications();
  }, [notifications]);

  const addPost = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const updatePost = (postId, updates) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  };

  const deletePost = (postId) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const toggleLike = (postId, userId) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const likes = post.likes || [];
        const isLiked = likes.includes(userId);
        
        if (isLiked) {
          return { ...post, likes: likes.filter(id => id !== userId) };
        } else {
          return { ...post, likes: [...likes, userId] };
        }
      }
      return post;
    }));
  };

  const addComment = (postId, comment) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const comments = post.comments || [];
        return { ...post, comments: [comment, ...comments] };
      }
      return post;
    }));
  };

  // 알림 생성 함수
  const createNotification = (type, postId, postTitle, authorName) => {
    // 알림 설정이 비활성화되어 있으면 알림 생성하지 않음
    if (!isNotificationTypeEnabled(type)) {
      return;
    }

    const notification = {
      id: `notification_${Date.now()}_${Math.random()}`,
      type: type,
      timestamp: new Date(),
      isRead: false,
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
        return;
    }

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      return newNotifications;
    });
  };

  // 좋아요 알림 생성
  const createLikeNotification = (postId, postTitle, authorName) => {
    createNotification('like', postId, postTitle, authorName);
  };

  // 댓글 알림 생성
  const createCommentNotification = (postId, postTitle, authorName) => {
    createNotification('comment', postId, postTitle, authorName);
  };

  // 채팅 알림 생성 함수
  const createChatNotification = (chatRoomId, chatRoomTitle, message, sender) => {
    const notification = {
      id: `chat_${Date.now()}_${Math.random()}`,
      type: 'message',
      timestamp: new Date(),
      isRead: false,
      title: `${chatRoomTitle}`,
      message: `${sender}님이 "${message}" 메시지를 보냈습니다.`,
      action: 'chat',
      chatId: chatRoomId,
      navigationData: {
        screen: 'Chat',
        params: { chatRoomId }
      }
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      return newNotifications;
    });
  };

  // 알림을 읽음으로 표시
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => {
      const updatedNotifications = prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      );
      
      return updatedNotifications;
    });
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