import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNotificationSettings } from './NotificationSettingsContext';

const CommunityContext = createContext();

export const useCommunity = () => useContext(CommunityContext);

export const CommunityProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { isNotificationTypeEnabled } = useNotificationSettings();
  
  // 커뮤니티 알림 표시 상태 관리
  const [hasCommunityNotification, setHasCommunityNotification] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(false);
  const [hasBoardNotification, setHasBoardNotification] = useState(false);

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

  // 초기화 시 샘플 게시글 추가
  useEffect(() => {
    if (!Array.isArray(posts)) {
      setPosts([]);
    }
    
    // 샘플 게시글 추가 (한 번만)
    if (posts.length === 0) {
      const samplePosts = [
        {
          id: 1,
          title: '한강 러닝 후기 공유합니다!',
          content: '어제 한강공원에서 5km 뛰었는데 정말 좋았어요. 날씨도 좋고...',
          author: '러닝매니아',
          authorId: 'user_002',
          createdAt: '2024-01-15',
          likes: 12,
          comments: 3,
          category: 'review'
        },
        {
          id: 2,
          title: '초보자 러닝 팁 질문드려요',
          content: '러닝을 시작한지 한 달 정도 됐는데, 무릎이 아픈 경우가 있어서...',
          author: '초보러너',
          authorId: 'user_003',
          createdAt: '2024-01-14',
          likes: 8,
          comments: 7,
          category: 'question'
        },
        {
          id: 3,
          title: '러닝화 추천 부탁드립니다',
          content: '발볼이 넓은 편인데 어떤 러닝화가 좋을까요?',
          author: '발넓이',
          authorId: 'user_004',
          createdAt: '2024-01-13',
          likes: 15,
          comments: 12,
          category: 'gear'
        },
        {
          id: 4,
          title: '내가 작성한 첫 번째 게시글입니다!',
          content: '안녕하세요! 저는 러닝을 좋아하는 사용자입니다. 오늘은 제가 작성한 게시글이 어떻게 보이는지 확인해보겠습니다.',
          author: '나',
          authorId: 'user_001',
          createdAt: '2024-01-16',
          likes: 5,
          comments: 2,
          category: 'free'
        },
        {
          id: 5,
          title: '러닝 코스 추천해드려요',
          content: '한강공원에서 발견한 좋은 러닝 코스를 공유합니다. 경사가 적당하고 경치도 좋아요!',
          author: '나',
          authorId: 'user_001',
          createdAt: '2024-01-17',
          likes: 10,
          comments: 4,
          category: 'course'
        }
      ];
      
      samplePosts.forEach(post => {
        addPost(post);
      });
    }
  }, [posts.length]);

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
      // 테스트를 위해 강제로 알림 생성
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

  // 좋아요 알림 생성 (테스트용으로 항상 생성)
  const createLikeNotification = (postId, postTitle, authorName) => {
    createNotification('like', postId, postTitle, authorName);
  };

  // 댓글 알림 생성 (테스트용으로 항상 생성)
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