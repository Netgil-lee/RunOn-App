import React, { createContext, useContext, useState, useEffect } from 'react';

const EventContext = createContext();

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};

export const EventProvider = ({ children }) => {
  // 홈화면과 일정탭에서 공유할 일정 데이터
  const [allEvents, setAllEvents] = useState([
    {
      id: 3,
      title: '한강 모닝런 모임',
      type: '모닝러닝',
      location: '여의도한강공원',
      date: '1월 25일',
      time: '오전 6:30',
      distance: '5',
      pace: '6:00-7:00',
      difficulty: '초급',
      organizer: '모닝러너',
      participants: 4,
      maxParticipants: 6, // 호스트 포함 최대 6명
      isPublic: true,
      hashtags: '#모닝런 #초급 #한강',
      customMarkerCoords: { latitude: 37.5285, longitude: 126.9375 },
      customLocation: '여의도한강공원 물빛광장 앞',
      tags: ['모닝런', '초급', '한강']
    },
    {
      id: 4,
      title: '저녁 러닝 클럽',
      type: '저녁러닝',
      location: '올림픽공원',
      date: '1월 26일',
      time: '오후 7:00',
      distance: '8',
      pace: '5:30-6:30',
      difficulty: '중급',
      organizer: '러닝클럽',
      participants: 5,
      maxParticipants: 6, // 호스트 포함 최대 6명
      isPublic: true,
      hashtags: '#저녁런 #중급 #올림픽공원',
      customMarkerCoords: { latitude: 37.5219, longitude: 127.1277 },
      customLocation: '올림픽공원 평화의광장',
      tags: ['저녁런', '중급', '올림픽공원']
    },
    {
      id: 5,
      title: '초보자 환영 러닝',
      type: '소셜 러닝',
      location: '반포한강공원',
      date: '1월 27일',
      time: '오전 9:00',
      distance: '3',
      pace: '7:00-8:00',
      difficulty: '초급',
      organizer: '초보러닝가이드',
      participants: 3,
      maxParticipants: 6, // 호스트 포함 최대 6명
      isPublic: true,
      hashtags: '#초보 #환영 #러닝',
      customMarkerCoords: { latitude: 37.5172, longitude: 126.9881 },
      customLocation: '반포한강공원 잠수교 아래',
      tags: ['초보', '환영', '러닝']
    }
  ]);

  // 사용자가 생성한 일정들
  const [userCreatedEvents, setUserCreatedEvents] = useState([]);

  // 채팅방 데이터
  const [chatRooms, setChatRooms] = useState([
    {
      id: 1,
      eventId: 1,
      title: '한강 새벽 러닝 모임 🌅',
      lastMessage: '내일 오전 6시에 반포한강공원에서 만나요!',
      lastMessageTime: '방금 전',
      participants: 12,
      unreadCount: 0,
      type: '러닝모임',
      isCreatedByUser: false
    },
    {
      id: 2,
      eventId: 2,
      title: '주말 장거리 러닝 🏃‍♂️',
      lastMessage: '15km 완주 화이팅!',
      lastMessageTime: '2시간 전',
      participants: 8,
      unreadCount: 0,
      type: '러닝모임',
      isCreatedByUser: false
    }
  ]);



  // 사용자가 참여한 일정들
  const [userJoinedEvents, setUserJoinedEvents] = useState([
    {
      id: 1,
      title: '한강 새벽 러닝 모임',
      type: '그룹 러닝',
      location: '반포한강공원',
      date: '2024년 1월 15일',
      time: '오전 6:00',
      distance: '5',
      pace: '6:00-7:00',
      difficulty: '초급',
      organizer: '박코치',
      participants: 4,
      maxParticipants: 6, // 호스트 포함 최대 6명
      isPublic: true,
      isJoined: true,
      hashtags: '#새벽러닝 #초급자',
      customMarkerCoords: { latitude: 37.5172, longitude: 126.9881 },
      customLocation: '반포한강공원 세빛둥둥섬 앞 잔디밭',
      isCreatedByUser: false
    },
    {
      id: 2,
      title: '주말 장거리 러닝',
      type: '그룹 러닝',
      location: '잠실한강공원',
      date: '2024년 1월 20일',
      time: '오전 7:00',
      distance: '15',
      pace: '5:00-6:00',
      difficulty: '고급',
      organizer: '이마라토너',
      participants: 5,
      maxParticipants: 6, // 호스트 포함 최대 6명
      isPublic: true,
      isJoined: true,
      hashtags: '#장거리 #고급자',
      customMarkerCoords: { latitude: 37.5219, longitude: 127.0747 },
      customLocation: '잠실한강공원 자전거 대여소 옆 운동기구 앞',
      isCreatedByUser: false
    }
  ]);

  // 종료된 모임들
  const [endedEvents, setEndedEvents] = useState([
    {
      id: 'ended_1',
      title: '한강 새벽 러닝 모임',
      type: '모닝러닝',
      location: '반포한강공원',
      date: '1월 15일 (월)',
      time: '오전 6:00',
      distance: '5',
      pace: '6:00-7:00',
      difficulty: '초급',
      organizer: '박코치',
      participants: 4,
      maxParticipants: 6,
      isPublic: true,
      hashtags: '#새벽러닝 #초급자 #한강',
      customMarkerCoords: { latitude: 37.5172, longitude: 126.9881 },
      customLocation: '반포한강공원 세빛둥둥섬 앞 잔디밭',
      status: 'ended',
      isCreatedByUser: false,
      endedDate: '2024-01-15'
    }
  ]);

  // 모임 알림 데이터 (NotificationScreen과 공유)
  const [meetingNotifications, setMeetingNotifications] = useState([]);

  // 알림 표시 상태 관리
  const [hasMeetingNotification, setHasMeetingNotification] = useState(false);
  const [hasRatingNotification, setHasRatingNotification] = useState(false);
  
  // 종료된 모임 옵션카드 클릭 상태 관리 (rating 알림용)
  const [endedEventsOptionClicked, setEndedEventsOptionClicked] = useState(false);
  
  // 종료된 모임 옵션카드 마지막 클릭 시간 관리
  const [lastOptionClickTime, setLastOptionClickTime] = useState(null);
  
  // 개별 종료된 모임 카드 클릭 상태 관리 (rating 알림용)
  const [clickedEndedEventIds, setClickedEndedEventIds] = useState(new Set());

  // 모임 알림이 있는지 확인하는 함수
  const checkMeetingNotifications = () => {
    // cancel 알림이 있거나, rating 알림이 있고 아직 해결되지 않은 경우
    const hasCancelNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'cancel'
    );
    
    const hasUnresolvedRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && 
      notification.type === 'rating' && 
      notification.event && 
      !clickedEndedEventIds.has(notification.event.id)
    );
    
    const hasUnreadNotifications = hasCancelNotifications || hasUnresolvedRatingNotifications;
    setHasMeetingNotification(hasUnreadNotifications);
    return hasUnreadNotifications;
  };

  // 러닝매너점수 알림이 있는지 확인하는 함수
  const checkRatingNotifications = () => {
    const hasUnreadRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'rating'
    );
    setHasRatingNotification(hasUnreadRatingNotifications);
    return hasUnreadRatingNotifications;
  };

  // 특정 모임에 대한 러닝매너점수 알림이 있는지 확인하는 함수
  const hasRatingNotificationForEvent = (eventId) => {
    // 종료된 모임 옵션카드를 클릭했고, 해당 모임 카드도 클릭했다면 알림 표시하지 않음
    if (endedEventsOptionClicked && clickedEndedEventIds.has(eventId)) {
      return false;
    }
    
    return meetingNotifications.some(notification => 
      !notification.isRead && 
      notification.type === 'rating' && 
      notification.event && 
      notification.event.id === eventId
    );
  };

  // 종료된 모임 옵션카드에 알림 표시할지 확인하는 함수
  const hasRatingNotificationForEndedEventsOption = () => {
    // 새로운 rating 알림이 있으면 옵션카드 클릭 여부와 관계없이 표시
    const hasNewRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && 
      notification.type === 'rating' &&
      notification.timestamp &&
      lastOptionClickTime &&
      new Date(notification.timestamp) > new Date(lastOptionClickTime)
    );
    
    if (hasNewRatingNotifications) {
      console.log('🆕 새로운 rating 알림이 있어서 옵션카드에 표시');
      return true;
    }
    
    // 기존 알림은 옵션카드 클릭 여부에 따라 결정
    if (endedEventsOptionClicked) {
      console.log('✅ 옵션카드를 이미 클릭했으므로 기존 알림 표시하지 않음');
      return false;
    }
    
    const hasExistingRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'rating'
    );
    
    if (hasExistingRatingNotifications) {
      console.log('📋 기존 rating 알림이 있어서 옵션카드에 표시');
    }
    
    return hasExistingRatingNotifications;
  };

  // 알림 추가 시 표시 상태 업데이트
  const addMeetingNotificationWithBadge = (type, event, isCreatedByMe = false) => {
    const notification = {
      id: `meeting_${Date.now()}_${Math.random()}`,
      type: type,
      event: event,
      timestamp: new Date(),
      isRead: false,
      isCreatedByMe: isCreatedByMe
    };

    // 알림 타입에 따른 제목과 메시지 설정
    switch (type) {
      case 'reminder':
        notification.title = '모임 알림';
        notification.message = `"${event.title}" 모임이 1시간 후에 시작됩니다.`;
        break;
      case 'cancel':
        notification.title = '모임 취소';
        notification.message = `"${event.title}" 모임이 취소되었습니다.`;
        break;
      case 'rating':
        notification.title = '러닝매너점수 요청';
        notification.message = `"${event.title}" 모임의 러닝매너점수를 평가해주세요.`;
        break;
      default:
        return;
    }

    setMeetingNotifications(prev => [notification, ...prev]);
    
    // 알림 표시 상태 업데이트
    if (type === 'cancel' || type === 'rating') {
      setHasMeetingNotification(true);
    }
    
    // 러닝매너점수 알림 상태 업데이트
    if (type === 'rating') {
      setHasRatingNotification(true);
    }
  };

  // 참여한 일정에 대응하는 채팅방들도 포함하도록 초기 채팅방 데이터 확장
  useEffect(() => {
    // 참여한 일정들에 대한 채팅방이 없으면 추가
    userJoinedEvents.forEach(event => {
      setChatRooms(prev => {
        const existingChatRoom = prev.find(chatRoom => chatRoom.eventId === event.id);
        if (!existingChatRoom) {
          const newChatRoom = {
            id: event.id,
            eventId: event.id,
            title: `${event.title} 🏃‍♀️`,
            lastMessage: `${event.organizer}님이 생성한 모임입니다.`,
            lastMessageTime: '1일 전',
            participants: event.participants,
            unreadCount: Math.floor(Math.random() * 3), // 임시로 랜덤 읽지 않은 메시지 수
            type: '러닝모임',
            isCreatedByUser: false
          };
          return [...prev, newChatRoom];
        }
        return prev;
      });
    });
  }, []);

  // 모임 알림 생성 함수들
  const addMeetingNotification = (type, event, isCreatedByMe = false) => {
    const notificationId = Date.now();
    let notification = {
      id: notificationId,
      type: type,
      eventId: event.id,
      meetingId: `meeting_${event.id}`,
      isRead: false,
      time: '방금 전',
      icon: '',
      action: type
    };

    switch (type) {
      case 'reminder':
        notification = {
          ...notification,
          title: `${event.title}`,
          message: `오늘 ${event.time} ${event.location}에서 러닝 모임이 시작됩니다. 미리 준비해주세요!`,
          icon: 'time'
        };
        break;
      case 'cancel':
        notification = {
          ...notification,
          title: `${event.title} 취소`,
          message: `${event.organizer}님이 모임을 취소했습니다.`,
          icon: 'close-circle'
        };
        break;
      case 'rating':
        notification = {
          ...notification,
          title: '러닝매너점수 작성 요청',
          message: `참여한 ${event.title} 모임이 종료되었습니다. 러닝매너점수를 작성해주세요.`,
          icon: 'star'
        };
        break;
    }

    // 내가 만든 모임의 경우 reminder만 생성, cancel과 rating은 생성하지 않음
    if (isCreatedByMe && (type === 'cancel' || type === 'rating')) {
      return;
    }

    setMeetingNotifications(prev => [notification, ...prev]);
  };

  // 모임 시작 1시간 전 reminder 알림 스케줄링
  const scheduleReminderNotification = (event) => {
    // 모임 날짜와 시간을 파싱하여 1시간 전 시간 계산
    try {
      let eventDate;
      let eventTime;
      
      // 날짜 파싱
      if (event.date.includes('년')) {
        // "2024년 1월 18일" 형식
        const dateMatch = event.date.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]) - 1;
          const day = parseInt(dateMatch[3]);
          eventDate = new Date(year, month, day);
        }
      } else {
        // "1월 18일" 형식 - 현재 연도 사용
        const dateMatch = event.date.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (dateMatch) {
          const month = parseInt(dateMatch[1]) - 1;
          const day = parseInt(dateMatch[2]);
          eventDate = new Date(new Date().getFullYear(), month, day);
        }
      }
      
      // 시간 파싱
      if (event.time) {
        const timeMatch = event.time.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          let hour = parseInt(timeMatch[2]);
          const minute = parseInt(timeMatch[3]);
          const isPM = timeMatch[1] === '오후';
          
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          
          eventTime = new Date(eventDate);
          eventTime.setHours(hour, minute, 0, 0);
        }
      }
      
      if (eventTime) {
        // 1시간 전 시간 계산
        const reminderTime = new Date(eventTime.getTime() - 60 * 60 * 1000);
        const now = new Date();
        
        // 현재 시간보다 미래인 경우에만 스케줄링
        if (reminderTime > now) {
          const timeUntilReminder = reminderTime.getTime() - now.getTime();
          
          setTimeout(() => {
            addMeetingNotification('reminder', event, event.isCreatedByUser);
          }, timeUntilReminder);
        }
      }
    } catch (error) {
      console.error('Reminder scheduling error:', error);
    }
  };

  // 새 일정 추가 (홈화면에도 반영)
  const addEvent = (newEvent) => {
    const eventWithId = {
      ...newEvent,
      id: Date.now(),
      isCreatedByUser: true,
      organizer: newEvent.organizer || '나', // 호스트 정보 추가
      participants: 1, // 호스트(생성자) 1명으로 시작
      maxParticipants: newEvent.maxParticipants ? newEvent.maxParticipants + 1 : null // 호스트 포함하여 최대 인원 설정
    };

    // 사용자 생성 일정에 추가
    setUserCreatedEvents(prev => [...prev, eventWithId]);

    // 공개 일정이면 전체 일정에도 추가 (홈화면에 표시)
    if (eventWithId.isPublic) {
      const homeEvent = {
        ...eventWithId,
        date: formatDateForHome(eventWithId.date),
        organizer: eventWithId.organizer, // 실제 호스트 정보 사용
        tags: parseHashtagsToArray(eventWithId.hashtags)
      };
      setAllEvents(prev => [...prev, homeEvent]);
    }

    // 일정 생성 시 자동으로 채팅방 생성
    createChatRoomForEvent(eventWithId);

    // 모임 생성 시 1시간 전 reminder 알림 스케줄링
    scheduleReminderNotification(eventWithId);

    return eventWithId;
  };

  // 일정 참여 시 채팅방 입장
  const joinEvent = (eventId) => {
    // 참여한 일정 목록에 추가하는 로직은 나중에 구현
    // 여기서는 채팅방 입장만 처리
    joinChatRoom(eventId);
  };

  // 채팅방 생성 (일정 생성 시 자동 호출)
  const createChatRoomForEvent = (event) => {
    const newChatRoom = {
      id: event.id,
      eventId: event.id,
      title: `${event.title} 🏃‍♀️`,
      lastMessage: '채팅방이 생성되었습니다. 러닝 모임에 대해 자유롭게 이야기해보세요!',
      lastMessageTime: '방금 전',
      participants: 1, // 생성자만 처음에 입장
      unreadCount: 0,
      type: '러닝모임',
      isCreatedByUser: true
    };

    setChatRooms(prev => [...prev, newChatRoom]);
  };

  // 채팅방 입장 (일정 참여 시 자동 호출)
  const joinChatRoom = (eventId) => {
    setChatRooms(prev => 
      prev.map(chatRoom => 
        chatRoom.eventId === eventId 
          ? { 
              ...chatRoom, 
              participants: chatRoom.participants + 1,
              lastMessage: '새로운 멤버가 참여했습니다!',
              lastMessageTime: '방금 전'
            }
          : chatRoom
      )
    );
  };

  // 일정 수정
  const updateEvent = (eventId, updatedEvent) => {
    setUserCreatedEvents(prev => 
      prev.map(event => 
        event.id === eventId ? { ...event, ...updatedEvent } : event
      )
    );

    // 홈화면 일정도 업데이트
    if (updatedEvent.isPublic) {
      const homeEvent = {
        ...updatedEvent,
        date: formatDateForHome(updatedEvent.date),
        organizer: updatedEvent.organizer || '나', // 실제 호스트 정보 사용
        tags: parseHashtagsToArray(updatedEvent.hashtags)
      };
      setAllEvents(prev => 
        prev.map(event => 
          event.id === eventId ? homeEvent : event
        )
      );
    } else {
      // 비공개로 변경된 경우 홈화면에서 제거
      setAllEvents(prev => prev.filter(event => event.id !== eventId));
    }
  };

  // 일정 삭제 (알림 생성 포함)
  const deleteEvent = (eventId) => {
    // 삭제할 모임 찾기
    const eventToDelete = userCreatedEvents.find(event => event.id === eventId);
    
    if (eventToDelete) {
      // 내가 만든 모임을 삭제하는 경우, 참여자들에게 cancel 알림 생성
      addMeetingNotification('cancel', eventToDelete, true);
    }

    setUserCreatedEvents(prev => prev.filter(event => event.id !== eventId));
    setAllEvents(prev => prev.filter(event => event.id !== eventId));
    
    // 연결된 채팅방도 삭제
    setChatRooms(prev => prev.filter(chatRoom => chatRoom.eventId !== eventId));
  };

  // 모임 종료 (알림 생성 포함)
  const endEvent = (eventId) => {
    // 내가 만든 모임에서 찾기
    const createdEvent = userCreatedEvents.find(event => event.id === eventId);
    if (createdEvent) {
      const endedEvent = {
        ...createdEvent,
        endedAt: new Date().toISOString(),
        status: 'ended'
      };
      setEndedEvents(prev => [...prev, endedEvent]);
      setUserCreatedEvents(prev => prev.filter(event => event.id !== eventId));
      setAllEvents(prev => prev.filter(event => event.id !== eventId));
      
      // 내가 만든 모임을 종료하는 경우, 참여자들에게 rating 알림 생성
      addMeetingNotification('rating', createdEvent, true);
      
      // 연결된 채팅방도 종료 상태로 변경
      setChatRooms(prev => 
        prev.map(chatRoom => 
          chatRoom.eventId === eventId 
            ? { ...chatRoom, status: 'ended', title: `${chatRoom.title} (종료됨)` }
            : chatRoom
        )
      );
      return;
    }

    // 내가 참여한 모임에서 찾기
    const joinedEvent = userJoinedEvents.find(event => event.id === eventId);
    if (joinedEvent) {
      const endedEvent = {
        ...joinedEvent,
        endedAt: new Date().toISOString(),
        status: 'ended'
      };
      setEndedEvents(prev => [...prev, endedEvent]);
      setUserJoinedEvents(prev => prev.filter(event => event.id !== eventId));
      
      // 연결된 채팅방도 종료 상태로 변경
      setChatRooms(prev => 
        prev.map(chatRoom => 
          chatRoom.eventId === eventId 
            ? { ...chatRoom, status: 'ended', title: `${chatRoom.title} (종료됨)` }
            : chatRoom
        )
      );
    }
  };

  // 헬퍼 함수들
  const formatDateForHome = (dateString) => {
    if (!dateString) return '';
    // "2024년 1월 18일" -> "1월 18일"
    return dateString.replace(/^\d{4}년\s*/, '');
  };

  const parseHashtagsToArray = (hashtagString) => {
    if (!hashtagString) return [];
    return hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.replace('#', ''))
      .slice(0, 3);
  };

  // 테스트용 모임 알림 생성 함수
  const createTestMeetingNotification = (type) => {
    const testEvent = {
      id: 999,
      title: '테스트 모임',
      type: '테스트',
      location: '테스트 장소',
      date: '테스트 날짜',
      time: '테스트 시간',
      organizer: '테스트 호스트'
    };
    
    addMeetingNotificationWithBadge(type, testEvent);
  };

  // 종료된 모임 알림 생성 함수
  const createEndedMeetingNotification = (type) => {
    const endedEvent = {
      id: 888,
      title: '종료된 테스트 모임',
      type: '종료된 모임',
      location: '한강공원',
      date: '2024-01-15',
      time: '오전 7:00',
      organizer: '테스트 호스트',
      endedAt: new Date().toISOString(),
      status: 'ended'
    };
    
    addMeetingNotificationWithBadge(type, endedEvent);
  };

  // 특정 종료된 모임에 대한 러닝매너점수 알림 생성 함수
  const createRatingNotificationForEvent = (eventId) => {
    const targetEvent = endedEvents.find(event => event.id === eventId);
    if (targetEvent) {
      addMeetingNotificationWithBadge('rating', targetEvent);
      console.log(`✅ ${targetEvent.title}에 대한 러닝매너점수 알림 생성됨`);
    } else {
      console.log(`❌ ID ${eventId}에 해당하는 종료된 모임을 찾을 수 없음`);
    }
  };

  // 종료된 모임 옵션카드 클릭 처리 함수
  const handleEndedEventsOptionClick = () => {
    setEndedEventsOptionClicked(true);
    setLastOptionClickTime(new Date().toISOString());
    console.log('✅ 종료된 모임 옵션카드 클릭됨 - 옵션카드 알림 표시 제거');
  };

  // 개별 종료된 모임 카드 클릭 처리 함수
  const handleEndedEventCardClick = (eventId) => {
    setClickedEndedEventIds(prev => new Set([...prev, eventId]));
    console.log(`✅ 종료된 모임 카드 클릭됨 (ID: ${eventId}) - 해당 카드 알림 표시 제거`);
    
    // 해당 모임의 rating 알림을 읽음 처리
    const targetNotification = meetingNotifications.find(notification => 
      notification.type === 'rating' && 
      notification.event && 
      notification.event.id === eventId &&
      !notification.isRead
    );
    
    if (targetNotification) {
      console.log(`📖 NotificationScreen의 rating 알림 읽음 처리 (모임 ID: ${eventId})`);
      setMeetingNotifications(prev => 
        prev.map(notification => 
          notification.id === targetNotification.id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } else {
      console.log(`❌ 모임 ID ${eventId}에 대한 읽지 않은 rating 알림을 찾을 수 없음`);
    }
  };

  // 종료된 모임을 생성하고 바로 rating 알림을 생성하는 함수
  const createEndedEventWithRatingNotification = (testNumber) => {
    const eventId = 200 + testNumber;
    
    // 기존에 같은 ID의 종료된 모임이 있으면 제거
    setEndedEvents(prev => prev.filter(event => event.id !== eventId));
    
    // 해당 모임의 기존 알림도 제거
    setMeetingNotifications(prev => prev.filter(notification => 
      !(notification.event && notification.event.id === eventId)
    ));
    
    // 해당 모임의 클릭 상태만 초기화 (옵션카드 클릭 상태는 유지)
    setClickedEndedEventIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
    
    const newEndedEvent = {
      id: eventId,
      title: `테스트 종료된 모임 ${testNumber}`,
      type: '테스트러닝',
      location: '테스트 공원',
      date: `2024-01-${15 + testNumber}`,
      time: '오전 9:00',
      distance: '5',
      pace: "6:00-7:00",
      difficulty: '초급',
      organizer: '테스트유저',
      participants: 4,
      maxParticipants: 6,
      isPublic: true,
      hashtags: `#테스트${testNumber} #종료된모임`,
      customMarkerCoords: { latitude: 37.5285, longitude: 126.9375 },
      customLocation: '테스트 장소',
      endedAt: new Date().toISOString(),
      status: 'ended',
      isCreatedByUser: false
    };

    // 종료된 모임 추가
    setEndedEvents(prev => [...prev, newEndedEvent]);
    
    // 바로 해당 모임에 대한 rating 알림 생성
    addMeetingNotificationWithBadge('rating', newEndedEvent);
    
    console.log(`✅ 종료된 모임 ${testNumber} 생성 및 러닝매너점수 알림 생성 완료`);
  };

  // 채팅 탭 클릭 처리 함수
  const handleChatTabClick = () => {
    console.log('✅ 채팅 탭 클릭됨');
  };

  // 개별 채팅방 클릭 처리 함수
  const handleChatRoomClick = (chatRoomId) => {
    console.log(`✅ 채팅방 클릭됨 (ID: ${chatRoomId})`);
  };

  // 채팅 메시지 추가 함수
  const addChatMessage = (chatRoomId, message, sender = '다른 사용자') => {
    setChatRooms(prev => 
      prev.map(chatRoom => 
        chatRoom.id === chatRoomId 
          ? { 
              ...chatRoom, 
              lastMessage: message,
              lastMessageTime: '방금 전',
              unreadCount: chatRoom.unreadCount + 1
            }
          : chatRoom
      )
    );
    
    console.log(`💬 채팅방 ${chatRoomId}에 메시지 추가됨: ${message}`);
  };

  // 테스트용 채팅 알림 생성 함수
  const createTestChatNotification = (chatRoomId) => {
    const targetChatRoom = chatRooms.find(chatRoom => chatRoom.id === chatRoomId);
    if (targetChatRoom) {
      addChatMessage(chatRoomId, `테스트 메시지 ${Date.now()}`, '테스트 사용자');
      console.log(`✅ 채팅방 ${chatRoomId}에 테스트 알림 생성됨`);
    } else {
      console.log(`❌ ID ${chatRoomId}에 해당하는 채팅방을 찾을 수 없음`);
    }
  };

  // 알림 변경 시 상태 업데이트
  useEffect(() => {
    // 모임 알림 확인
    const hasCancelNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'cancel'
    );
    
    const hasUnresolvedRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && 
      notification.type === 'rating' && 
      notification.event && 
      !clickedEndedEventIds.has(notification.event.id)
    );
    
    const hasUnreadNotifications = hasCancelNotifications || hasUnresolvedRatingNotifications;
    setHasMeetingNotification(hasUnreadNotifications);

    // 러닝매너점수 알림 확인
    const hasUnreadRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'rating'
    );
    setHasRatingNotification(hasUnreadRatingNotifications);


  }, [meetingNotifications, endedEventsOptionClicked, clickedEndedEventIds, lastOptionClickTime]);

  const value = {
    allEvents,
    userCreatedEvents,
    userJoinedEvents,
    endedEvents,
    chatRooms,
    meetingNotifications,
    addEvent,
    updateEvent,
    deleteEvent,
    endEvent,
    joinEvent,
    createChatRoomForEvent,
    joinChatRoom,
    addMeetingNotification,
    scheduleReminderNotification,
    setUserCreatedEvents,
    setUserJoinedEvents,
    setEndedEvents,
    setChatRooms,
    setMeetingNotifications,
    checkMeetingNotifications,
    addMeetingNotificationWithBadge,
    hasMeetingNotification,
    hasRatingNotification,
    createTestMeetingNotification,
    checkRatingNotifications,
    hasRatingNotificationForEvent,
    hasRatingNotificationForEndedEventsOption,
    createEndedMeetingNotification,
    createRatingNotificationForEvent,
    createEndedEventWithRatingNotification,
    handleEndedEventsOptionClick,
    handleEndedEventCardClick,
    handleChatTabClick,
    handleChatRoomClick,
    addChatMessage,
    createTestChatNotification
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext; 