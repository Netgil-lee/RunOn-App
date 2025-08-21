import React, { createContext, useContext, useState, useEffect } from 'react';
import firestoreService from '../services/firestoreService';
import evaluationService from '../services/evaluationService';
import { useAuth } from './AuthContext';

const EventContext = createContext();

export const useEvents = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
  const { user } = useAuth();
  
  // 실제 Firebase 데이터로 초기화
  const [allEvents, setAllEvents] = useState([]);
  const [userCreatedEvents, setUserCreatedEvents] = useState([]);
  const [userJoinedEvents, setUserJoinedEvents] = useState([]);
  const [endedEvents, setEndedEvents] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [meetingNotifications, setMeetingNotifications] = useState([]);

  // Firebase에서 실시간으로 이벤트 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestoreService.onEventsSnapshot((snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        const eventData = doc.data();
        console.log('🔍 EventContext - 원본 eventData:', eventData);
        console.log('🔍 EventContext - eventData.date:', eventData.date, typeof eventData.date);
        
        // Firestore Timestamp 객체를 안전하게 처리
        const processedEvent = {
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
          date: eventData.date || null, // date 필드도 처리
        };
        
        console.log('🔍 EventContext - processedEvent.date:', processedEvent.date, typeof processedEvent.date);
        events.push(processedEvent);
      });
      setAllEvents(events);
      
      // 사용자가 생성한 이벤트 필터링
      const userCreated = events.filter(event => event.organizerId === user.uid);
      setUserCreatedEvents(userCreated);
      
      // 사용자가 참여한 이벤트 필터링 (생성자는 제외)
      const userJoined = events.filter(event => 
        event.participants && 
        event.participants.includes(user.uid) && 
        event.organizerId !== user.uid // 내가 만든 모임은 제외
      );
      setUserJoinedEvents(userJoined);
    });

    return () => unsubscribe();
  }, [user]);

  // 채팅방 데이터 실시간 가져오기
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestoreService.onChatRoomsSnapshot(user.uid, (snapshot) => {
      const rooms = [];
      snapshot.forEach((doc) => {
        const roomData = doc.data();
        // Firestore Timestamp 객체를 안전하게 처리
        const processedRoom = {
          id: doc.id,
          ...roomData,
          createdAt: roomData.createdAt?.toDate?.() || roomData.createdAt,
          lastMessageTime: roomData.lastMessageTime?.toDate?.() || roomData.lastMessageTime,
        };
        rooms.push(processedRoom);
      });
      setChatRooms(rooms);
    });

    return () => unsubscribe();
  }, [user]);

  // 종료된 이벤트 가져오기
  useEffect(() => {
    if (!user) return;

    // 종료된 이벤트는 별도 컬렉션에서 관리
    const loadEndedEvents = async () => {
      try {
        // 여기서는 일반 이벤트 중 종료된 것들을 필터링하거나
        // 별도의 endedEvents 컬렉션을 사용할 수 있습니다
        setEndedEvents([]); // 임시로 빈 배열
      } catch (error) {
        console.error('종료된 이벤트 로딩 실패:', error);
      }
    };

    loadEndedEvents();
  }, [user]);

  // 기존 하드코딩된 데이터 제거됨 - Firebase에서 실시간으로 가져옴



  // 모임 알림 관련 상태

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

  // 새 일정 추가 (Firestore에 저장)
  const addEvent = async (newEvent) => {
    try {
      const eventData = {
        ...newEvent,
        organizerId: user.uid,
        organizer: user.displayName || '익명',
        createdBy: user.uid, // 모임 생성자 UID 추가
        participants: [user.uid], // 호스트(생성자)를 참여자 배열에 포함
        isCreatedByUser: true,
        isPublic: newEvent.isPublic || true
      };

      const result = await firestoreService.createEvent(eventData);
      
      if (result.success) {
        // 일정 생성 시 자동으로 채팅방 생성
        await createChatRoomForEvent({ ...eventData, id: result.id });
        
        // 모임 생성자 통계 업데이트 (호스트로 카운트)
        await evaluationService.incrementParticipationCount(user.uid, true);
        
        console.log('✅ 이벤트 생성 완료:', result.id);
        return { ...eventData, id: result.id };
      }
    } catch (error) {
      console.error('❌ 이벤트 생성 실패:', error);
      throw error;
    }
  };

  // 일정 참여
  const joinEvent = async (eventId) => {
    try {
      const result = await firestoreService.joinEvent(eventId, user.uid);
      if (result.success) {
        console.log('✅ 이벤트 참여 완료:', eventId);
        
        // 모임 참여자 통계 업데이트 (일반 참여자로 카운트)
        await evaluationService.incrementParticipationCount(user.uid, false);
        
        // 채팅방 참여도 자동으로 처리
        await joinChatRoom(eventId);
      }
    } catch (error) {
      console.error('❌ 이벤트 참여 실패:', error);
      throw error;
    }
  };

  // 채팅방 생성 (일정 생성 시 자동 호출)
  const createChatRoomForEvent = async (event) => {
    try {
      const chatRoomData = {
        eventId: event.id,
        title: `${event.title} 🏃‍♀️`,
        lastMessage: '채팅방이 생성되었습니다. 러닝 모임에 대해 자유롭게 이야기해보세요!',
        participants: [user.uid], // 생성자만 처음에 입장
        unreadCount: 0,
        type: '러닝모임',
        isCreatedByUser: true
      };

      const result = await firestoreService.createChatRoom(chatRoomData);
      if (result.success) {
        console.log('✅ 채팅방 생성 완료:', result.id);
      }
    } catch (error) {
      console.error('❌ 채팅방 생성 실패:', error);
      throw error;
    }
  };

  // 채팅방 입장 (일정 참여 시 자동 호출)
  const joinChatRoom = async (eventId) => {
    try {
      // 실제 구현에서는 채팅방에 사용자를 추가하는 로직 필요
      console.log('✅ 채팅방 참여 완료:', eventId);
    } catch (error) {
      console.error('❌ 채팅방 참여 실패:', error);
      throw error;
    }
  };

  // 일정 수정
  const updateEvent = async (eventId, updatedEvent) => {
    try {
      const result = await firestoreService.updateEvent(eventId, updatedEvent);
      if (result.success) {
        console.log('✅ 이벤트 수정 완료:', eventId);
      }
    } catch (error) {
      console.error('❌ 이벤트 수정 실패:', error);
      throw error;
    }
  };

  // 일정 삭제 (알림 생성 포함)
  const deleteEvent = async (eventId) => {
    try {
      console.log('🔍 deleteEvent 호출됨 - eventId:', eventId);
      
      // 삭제할 모임 찾기
      const eventToDelete = userCreatedEvents.find(event => event.id === eventId);
      
      if (eventToDelete) {
        // 내가 만든 모임을 삭제하는 경우, 참여자들에게 cancel 알림 생성
        addMeetingNotification('cancel', eventToDelete, true);
        
        // Firebase에서 실제 이벤트 삭제
        await firestoreService.deleteEvent(eventId);
        console.log('✅ Firebase에서 이벤트 삭제 완료');
        
        // Firebase에서 연결된 채팅방도 삭제
        await firestoreService.deleteChatRoom(eventId);
        console.log('✅ Firebase에서 채팅방 삭제 완료');
      }

      // 로컬 상태 업데이트
      setUserCreatedEvents(prev => prev.filter(event => event.id !== eventId));
      setAllEvents(prev => prev.filter(event => event.id !== eventId));
      
      // 연결된 채팅방도 삭제
      setChatRooms(prev => prev.filter(chatRoom => chatRoom.eventId !== eventId));
      
      console.log('✅ 로컬 상태 업데이트 완료');
    } catch (error) {
      console.error('❌ 이벤트 삭제 실패:', error);
      throw error;
    }
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
    checkRatingNotifications,
    hasRatingNotificationForEvent,
    hasRatingNotificationForEndedEventsOption,
    createRatingNotificationForEvent,
    handleEndedEventsOptionClick,
    handleEndedEventCardClick,
    handleChatTabClick,
    handleChatRoomClick,
    addChatMessage
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext; 