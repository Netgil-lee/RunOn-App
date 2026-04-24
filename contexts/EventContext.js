import React, { createContext, useContext, useState, useEffect } from 'react';
import firestoreService from '../services/firestoreService';
import storageService from '../services/storageService';
import evaluationService from '../services/evaluationService';
import blacklistService from '../services/blacklistService';
import { useAuth } from './AuthContext';
import { firestore } from '../config/firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';

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
  const [blacklist, setBlacklist] = useState([]);

  // 블랙리스트 가져오기
  useEffect(() => {
    if (!user?.uid) return;

    const fetchBlacklist = async () => {
      try {
        const blacklistData = await blacklistService.getBlacklist(user.uid);
        setBlacklist(blacklistData);
      } catch (error) {
        console.log('블랙리스트 조회 실패 (빈 배열로 처리):', error.message);
        setBlacklist([]); // 빈 배열로 설정
      }
    };

    fetchBlacklist();
  }, [user?.uid]);

  // Firebase에서 실시간으로 이벤트 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestoreService.onEventsSnapshot((snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        const eventData = doc.data();
        // console.log('🔍 EventContext - 원본 eventData:', eventData);
        // console.log('🔍 EventContext - eventData.date:', eventData.date, typeof eventData.date);
        
        // Firestore Timestamp 객체를 안전하게 처리
        const processedEvent = {
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
          date: eventData.date || null, // date 필드도 처리
          isCreatedByUser: eventData.organizerId === user.uid, // 내가 만든 모임인지 확인
        };
        
        // console.log('🔍 EventContext - processedEvent.date:', processedEvent.date, typeof processedEvent.date);
        events.push(processedEvent);
      });
      
      // 디버깅: allEvents 데이터 확인
      
      // 블랙리스트 필터링 적용
      const filteredEvents = blacklistService.filterEventsByBlacklist(events, blacklist);
      
      setAllEvents(filteredEvents);
      
      // 사용자가 생성한 이벤트 필터링
      const userCreated = filteredEvents.filter(event => event.organizerId === user.uid);
      setUserCreatedEvents(userCreated);
      
      // 사용자가 참여한 이벤트 필터링 (생성자는 제외, 종료된 모임도 제외)
      const userJoined = filteredEvents.filter(event => 
        event.participants && 
        event.participants.includes(user.uid) && 
        event.organizerId !== user.uid && // 내가 만든 모임은 제외
        event.status !== 'ended' // 종료된 모임은 제외
      );
      setUserJoinedEvents(userJoined);
      
      // 사용자가 참여한 종료된 모임 필터링 (생성자는 제외)
      const userJoinedEnded = filteredEvents.filter(event => 
        event.participants && 
        event.participants.includes(user.uid) && 
        event.organizerId !== user.uid && // 내가 만든 모임은 제외
        event.status === 'ended' // 종료된 모임만
      );
      
      // 종료된 모임 필터링 - status가 'ended'인 모임만
      const allEndedEvents = filteredEvents.filter(event => {
        return event.status === 'ended';
      });
      
      
      setEndedEvents(allEndedEvents);
    });

    return () => unsubscribe();
  }, [user, blacklist]); // blacklist 의존성 추가

  // 기존 채팅방 데이터 마이그레이션 (한 번만 실행)
  const migrateChatRooms = async () => {
    if (!user) return;
    
    try {
  
      
      // 모든 채팅방 가져오기
      const chatRoomsRef = collection(firestore, 'chatRooms');
      const chatQuery = query(chatRoomsRef, where('participants', 'array-contains', user.uid));
      const snapshot = await getDocs(chatQuery);
      
      let migrationCount = 0;
      
      snapshot.forEach((doc) => {
        const roomData = doc.data();
        
        // createdBy나 organizerId가 없는 채팅방만 마이그레이션
        // 또한, 제목 끝의 달리기 이모지(🏃, 🏃‍♂️, 🏃‍♀️)를 제거
        if (!roomData.createdBy || !roomData.organizerId || typeof roomData.title === 'string') {
          const updateData = {};
          
          if (!roomData.createdBy && roomData.participants && roomData.participants.length > 0) {
            updateData.createdBy = roomData.participants[0];
          }
          
          if (!roomData.organizerId && (roomData.createdBy || updateData.createdBy)) {
            updateData.organizerId = roomData.createdBy || updateData.createdBy;
          }

          // 제목 말미 이모지 제거 처리
          if (typeof roomData.title === 'string') {
            let sanitizedTitle = roomData.title;
            // 말미 공백 + 달리기 이모지 변형 제거
            sanitizedTitle = sanitizedTitle.replace(/\s*🏃‍♀️$/u, '');
            sanitizedTitle = sanitizedTitle.replace(/\s*🏃‍♂️$/u, '');
            sanitizedTitle = sanitizedTitle.replace(/\s*🏃$/u, '');
            // 말미 불필요 공백 정리
            sanitizedTitle = sanitizedTitle.replace(/\s+$/u, '');
            if (sanitizedTitle !== roomData.title) {
              updateData.title = sanitizedTitle;
            }
          }
          
          if (Object.keys(updateData).length > 0) {
            // Firebase에 업데이트
            updateDoc(doc.ref, updateData);
            migrationCount++;

          }
        }
      });
      

      
    } catch (error) {
      console.error('❌ 채팅방 마이그레이션 실패:', error);
    }
  };

  // 앱 시작 시 마이그레이션 실행 (한 번만)
  useEffect(() => {
    if (user) {
      migrateChatRooms();
    }
  }, [user]);

  // 채팅방 데이터 실시간 가져오기
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestoreService.onChatRoomsSnapshot(user.uid, (snapshot) => {
      const rooms = [];
      snapshot.forEach((doc) => {
        const roomData = doc.data();
        // Firestore Timestamp 객체를 안전하게 처리
        // 기존 채팅방 데이터 마이그레이션: createdBy와 organizerId가 없는 경우 설정
        let processedRoom = {
          id: doc.id,
          ...roomData,
          createdAt: roomData.createdAt?.toDate?.() || roomData.createdAt,
          lastMessageTime: roomData.lastMessageTime?.toDate?.() || roomData.lastMessageTime,
        };

        // createdBy가 없는 경우, participants 배열의 첫 번째 사용자를 생성자로 설정
        if (!processedRoom.createdBy && processedRoom.participants && processedRoom.participants.length > 0) {
          processedRoom.createdBy = processedRoom.participants[0];

        }

        // organizerId가 없는 경우, createdBy와 동일하게 설정
        if (!processedRoom.organizerId && processedRoom.createdBy) {
          processedRoom.organizerId = processedRoom.createdBy;

        }

        // 사용자가 해당 채팅방을 생성했는지 확인
        processedRoom.isCreatedByUser = processedRoom.createdBy === user.uid || processedRoom.organizerId === user.uid;
        
        rooms.push(processedRoom);
      });

      setChatRooms(rooms);
    });

    return () => unsubscribe();
  }, [user]);

  // 모임 알림 데이터 실시간 가져오기
  useEffect(() => {
    if (!user) return;

    const { collection, query, where, orderBy, onSnapshot } = require('firebase/firestore');
    const notificationsRef = collection(firestore, 'meetingNotifications');
    const notificationsQuery = query(
      notificationsRef,
      where('targetUserId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        const notificationData = doc.data();
        const processedNotification = {
          id: doc.id,
          ...notificationData,
          timestamp: notificationData.timestamp?.toDate?.() || notificationData.timestamp,
        };
        notifications.push(processedNotification);
      });
      setMeetingNotifications(notifications);
    });

    return () => unsubscribe();
  }, [user]);

  // meetingNotifications 상태가 변경될 때마다 알림 상태 자동 업데이트
  useEffect(() => {
    // 초기 로딩 시에도 체크하도록 수정
    checkMeetingNotifications();
    checkRatingNotifications();
  }, [meetingNotifications]);

  // 사용자 로그인 시 업데이트 알림 상태 확인
  useEffect(() => {
    if (user) {
      checkUpdateNotificationStatus();
    }
  }, [user]);

  // 종료된 이벤트는 이제 위의 useEffect에서 통합 관리됨

  // 기존 하드코딩된 데이터 제거됨 - Firebase에서 실시간으로 가져옴



  // 모임 알림 관련 상태

  // 알림 표시 상태 관리
  const [hasMeetingNotification, setHasMeetingNotification] = useState(false);
  const [hasRatingNotification, setHasRatingNotification] = useState(false);
  const [hasUpdateNotification, setHasUpdateNotification] = useState(false);
  
  // 종료된 모임 옵션카드 클릭 상태 관리 (rating 알림용)
  const [endedEventsOptionClicked, setEndedEventsOptionClicked] = useState(false);
  
  // 종료된 모임 옵션카드 마지막 클릭 시간 관리
  const [lastOptionClickTime, setLastOptionClickTime] = useState(null);
  
  // 개별 종료된 모임 카드 클릭 상태 관리 (rating 알림용)
  const [clickedEndedEventIds, setClickedEndedEventIds] = useState(new Set());
  
  // 전체 모임 알림표시 상태 관리 (개별 모임 읽음 상태 제거)
  const [hasUnreadJoinedMeetings, setHasUnreadJoinedMeetings] = useState(false);

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
    
    console.log('🔍 checkMeetingNotifications 결과:', {
      hasCancelNotifications,
      hasUnresolvedRatingNotifications,
      hasUnreadNotifications,
      totalNotifications: meetingNotifications.length
    });
    
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
    // 참여한 일정들에 대한 채팅방이 없으면 Firestore에서 조회
    userJoinedEvents.forEach(event => {
      setChatRooms(prev => {
        const existingChatRoom = prev.find(chatRoom => chatRoom.eventId === event.id);
        if (!existingChatRoom) {
          // Firestore에서 해당 이벤트의 채팅방 조회
          const fetchChatRoom = async () => {
            try {
              const chatRoomsRef = collection(firestore, 'chatRooms');
              const q = query(chatRoomsRef, where('eventId', '==', event.id));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const chatRoomDoc = querySnapshot.docs[0];
                const chatRoom = { id: chatRoomDoc.id, ...chatRoomDoc.data() };
                
                // 로컬 상태에 추가
                setChatRooms(prevRooms => {
                  const alreadyExists = prevRooms.find(room => room.id === chatRoom.id);
                  if (!alreadyExists) {
                    return [...prevRooms, chatRoom];
                  }
                  return prevRooms;
                });
              }
            } catch (error) {
              console.error('❌ Firestore 채팅방 조회 실패:', error);
            }
          };
          
          fetchChatRoom();
        }
        return prev;
      });
    });
  }, [userJoinedEvents]);

  // 모임 알림 생성 함수들 (모든 참여자에게 전송)
  const addMeetingNotification = async (type, event, isCreatedByMe = false) => {
    try {
      // 모임 참여자 목록 가져오기 (생성자 포함)
      const participants = event.participants || [];
      
      // 알림을 받을 사용자들 (모임 생성자는 제외)
      const targetUsers = participants.filter(participantId => 
        participantId !== event.organizerId
      );

      // Firestore에 알림 저장
      const { collection, addDoc } = await import('firebase/firestore');
      const notificationsRef = collection(firestore, 'meetingNotifications');

      const notificationPromises = targetUsers.map(async (targetUserId) => {
        const notification = {
          id: `meeting_${Date.now()}_${Math.random()}`,
          type: type,
          eventId: event.id,
          eventTitle: event.title,
          organizerId: event.organizerId,
          organizerName: event.organizer,
          targetUserId: targetUserId, // 알림을 받을 사용자 ID
          isRead: false,
          timestamp: new Date(),
          action: type
        };

        switch (type) {
          case 'reminder':
            notification.title = `${event.title}`;
            notification.message = `내일 ${event.time} ${event.location}에서 러닝 모임이 시작됩니다. 미리 준비해주세요!`;
            break;
          case 'cancel':
            notification.title = `${event.title} 취소`;
            notification.message = `${event.organizer}님이 모임을 취소했습니다.`;
            break;
          case 'rating':
            notification.title = '러닝매너점수 작성 요청';
            notification.message = `참여한 ${event.title} 모임이 종료되었습니다. 러닝매너점수를 작성해주세요.`;
            break;
          case 'new_participant':
            notification.title = '새로운 참여자가 입장했습니다';
            notification.message = `${event.title} 모임에 새로운 참여자가 입장했습니다.`;
            break;
        }

        try {
          await addDoc(notificationsRef, notification);
          console.log('✅ 모임 알림 생성 완료:', { type, targetUserId, eventId: event.id });
        } catch (error) {
          console.error('❌ 모임 알림 생성 실패:', error);
        }
      });

      await Promise.all(notificationPromises);
      
      // 로컬 상태에도 추가 (현재 사용자가 대상인 경우)
      if (targetUsers.includes(user.uid)) {
        const localNotification = {
          id: `meeting_${Date.now()}_${Math.random()}`,
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
            localNotification.title = `${event.title}`;
            localNotification.message = `내일 ${event.time} ${event.location}에서 러닝 모임이 시작됩니다. 미리 준비해주세요!`;
            localNotification.icon = 'time';
            break;
          case 'cancel':
            localNotification.title = `${event.title} 취소`;
            localNotification.message = `${event.organizer}님이 모임을 취소했습니다.`;
            localNotification.icon = 'close-circle';
            break;
          case 'rating':
            localNotification.title = '러닝매너점수 작성 요청';
            localNotification.message = `참여한 ${event.title} 모임이 종료되었습니다. 러닝매너점수를 작성해주세요.`;
            localNotification.icon = 'star';
            break;
        }

        setMeetingNotifications(prev => [localNotification, ...prev]);
      }
    } catch (error) {
      console.error('❌ 모임 알림 생성 중 오류:', error);
    }
  };

  // 모임 시작 24시간 전 reminder 알림 스케줄링 (현재 미사용)
  const scheduleReminderNotification = (event) => {
    // 모임 날짜와 시간을 파싱하여 24시간 전 시간 계산
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
        // 24시간 전 시간 계산
        const reminderTime = new Date(eventTime.getTime() - 24 * 60 * 60 * 1000);
        const now = new Date();
        
        // 현재 시간보다 미래인 경우에만 스케줄링
        if (reminderTime > now) {
          const timeUntilReminder = reminderTime.getTime() - now.getTime();
          
          setTimeout(() => {
            addMeetingNotification('reminder', event, false); // 모든 참여자에게 전송
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
        organizer: newEvent.organizer || user.displayName || '익명',
        organizerImage: newEvent.organizerImage || null,
        createdBy: user.uid, // 모임 생성자 UID 추가
        participants: [user.uid], // 호스트(생성자)를 참여자 배열에 포함
        isCreatedByUser: true,
        isPublic: newEvent.isPublic || true
      };

      // 디버깅: EventContext에서 받은 데이터 확인
      console.log('📥 EventContext.addEvent - 받은 데이터:', {
        location: eventData.location,
        customMarkerCoords: eventData.customMarkerCoords,
        title: eventData.title
      });
      
      const result = await firestoreService.createEvent(eventData);
      
      if (result.success) {
        // 일정 생성 시 자동으로 채팅방 생성
        const chatRoomResult = await createChatRoomForEvent({ ...eventData, id: result.id });
        
        // 모임 생성자 통계 업데이트 (호스트로 카운트)
        await evaluationService.incrementParticipationCount(user.uid, true);
        
        console.log('✅ 이벤트 생성 완료:', result.id);
        console.log('📤 반환하는 이벤트 데이터:', {
          id: result.id,
          location: eventData.location,
          title: eventData.title
        });
        return { ...eventData, id: result.id, chatRoomId: chatRoomResult?.id };
      }
    } catch (error) {
      console.error('❌ 이벤트 생성 실패:', error);
      throw error;
    }
  };

  // 일정 참여
  const joinEvent = async (eventId) => {
    try {
      // 1. 먼저 로컬에서 이벤트 정보 확인
      const targetEvent = allEvents.find(event => event.id === eventId);
      if (!targetEvent) {
        throw new Error('모임 정보를 찾을 수 없습니다.');
      }

      // 2. 로컬에서 참여 가능 여부 사전 체크
      const currentParticipants = Array.isArray(targetEvent.participants) ? targetEvent.participants.length : 1;
      const maxParticipants = Number(targetEvent.maxParticipants);
      const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
      
      // 디버깅 로그 추가
      console.log('🔍 EventContext - 참여자 수 계산 (로컬):', {
        eventId,
        targetEvent: {
          id: targetEvent.id,
          title: targetEvent.title,
          participants: targetEvent.participants,
          participantsType: typeof targetEvent.participants,
          isArray: Array.isArray(targetEvent.participants),
          maxParticipants: targetEvent.maxParticipants
        },
        currentParticipants,
        maxParticipants,
        canJoin: !hasParticipantLimit || currentParticipants < maxParticipants
      });
      
      if (hasParticipantLimit && currentParticipants >= maxParticipants) {
        throw new Error('참여 가능 인원수가 마감되었습니다.');
      }

      // 3. 이미 참여한 사용자인지 확인
      if (Array.isArray(targetEvent.participants) && targetEvent.participants.includes(user.uid)) {
        throw new Error('이미 참여한 모임입니다.');
      }

      // 4. Firestore에 참여 요청
      const result = await firestoreService.joinEvent(eventId, user.uid);
      if (result.success) {
        console.log('✅ 이벤트 참여 완료:', eventId);
        
        // 로컬 상태 즉시 업데이트
        setAllEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === eventId 
              ? { 
                  ...event, 
                  participants: Array.isArray(event.participants) 
                    ? [...event.participants, user.uid]
                    : [user.uid]
                }
              : event
          )
        );

        // userJoinedEvents 상태도 업데이트
        setUserJoinedEvents(prevJoined => {
          const joinedEvent = allEvents.find(event => event.id === eventId);
          if (joinedEvent && !prevJoined.find(event => event.id === eventId)) {
            return [...prevJoined, {
              ...joinedEvent,
              participants: Array.isArray(joinedEvent.participants) 
                ? [...joinedEvent.participants, user.uid]
                : [user.uid]
            }];
          }
          return prevJoined;
        });
        
        // 모임 참여자 통계 업데이트 (일반 참여자로 카운트)
        await evaluationService.incrementParticipationCount(user.uid, false);
        
        // 채팅방 참여도 자동으로 처리
        await joinChatRoom(eventId);
        
        // 새로운 모임 참여 시 알림표시 활성화
        setHasUnreadJoinedMeetings(true);
        
        // 기존 참여자들에게 새로운 참여자 입장 알림 전송
        const updatedEvent = {
          ...targetEvent,
          participants: Array.isArray(targetEvent.participants) 
            ? [...targetEvent.participants, user.uid]
            : [user.uid]
        };
        await addMeetingNotification('new_participant', updatedEvent);
        console.log('✅ 새로운 참여자 입장 알림 전송 완료:', eventId);
      }
    } catch (error) {
      console.error('❌ 이벤트 참여 실패:', error);
      
      // 사용자에게 적절한 에러 메시지 표시
      let errorMessage = '모임 참여에 실패했습니다.';
      
      if (error.message.includes('마감되었습니다')) {
        errorMessage = '참여 가능 인원수가 마감되었습니다.';
      } else if (error.message.includes('이미 참여한 모임')) {
        errorMessage = '이미 참여한 모임입니다.';
      } else if (error.message.includes('참여 가능 인원수')) {
        errorMessage = '참여 가능 인원수가 마감되었습니다.';
      }
      
      // 에러 메시지를 Alert로 표시 (필요시)
      // Alert.alert('참여 실패', errorMessage);
      
      throw error;
    }
  };

  // 일정 나가기
  const leaveEvent = async (eventId) => {
    try {
      console.log('🔍 leaveEvent - 시작:', eventId);
      
      // Firestore에서 참여자 목록에서 제거
      const eventRef = doc(firestore, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Firestore 이벤트 나가기 완료:', eventId);
      
      // 로컬 상태 즉시 업데이트
      setAllEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                participants: Array.isArray(event.participants) 
                  ? event.participants.filter(participantId => participantId !== user.uid)
                  : []
              }
            : event
        )
      );

      // userJoinedEvents에서 즉시 제거
      setUserJoinedEvents(prevJoined => 
        prevJoined.filter(event => event.id !== eventId)
      );
      
      // 채팅방에서도 나가기
      await leaveChatRoom(eventId);
      
      console.log('✅ 이벤트 나가기 완료:', eventId);
    } catch (error) {
      console.error('❌ 이벤트 나가기 실패:', error);
      throw error;
    }
  };

  // 채팅방 생성 (일정 생성 시 자동 호출)
  const createChatRoomForEvent = async (event) => {
    try {
      const chatRoomData = {
        eventId: event.id,
        title: `${event.title}`,
        lastMessage: '채팅방이 생성되었습니다. 러닝 모임에 대해 자유롭게 이야기해보세요!',
        participants: [user.uid], // 생성자만 처음에 입장
        unreadCount: 0,
        type: '러닝모임',
        createdBy: user.uid, // 생성자 ID 추가
        organizerId: event.organizerId || user.uid, // 모임 생성자 ID 추가
        isCreatedByUser: true
      };

      const result = await firestoreService.createChatRoom(chatRoomData);
      if (result.success) {
        console.log('✅ 채팅방 생성 완료:', result.id);
        
        // 채팅방 생성 후 환영 메시지 자동 전송
        const organizerName = user.displayName || user.email?.split('@')[0] || '모임장';
        const welcomeMessage = {
          text: `🎉 ${organizerName}님이 "${event.title}" 모임을 생성했습니다! 러닝 모임에 대해 자유롭게 이야기해보세요!`,
          sender: '시스템',
          senderId: 'system',
          senderProfileImage: null,
          timestamp: new Date(),
          isSystemMessage: true
        };
        
        try {
          await firestoreService.sendMessage(result.id, welcomeMessage);
          console.log('✅ 채팅방 환영 메시지 전송 완료');
        } catch (messageError) {
          console.error('❌ 환영 메시지 전송 실패:', messageError);
          // 메시지 전송 실패해도 채팅방 생성은 성공으로 처리
        }
        
        return result;
      }
    } catch (error) {
      console.error('❌ 채팅방 생성 실패:', error);
      throw error;
    }
  };

  // 채팅방 환영 메시지 전송 헬퍼 함수
  const sendWelcomeMessageToChatRoom = async (chatRoomId, eventId) => {
    try {
      const event = allEvents.find(e => e.id === eventId);
      if (!event) return;
      
      // 사용자 프로필에서 실제 닉네임 가져오기
      let participantName = '새 참여자';
      try {
        const userProfile = await firestoreService.getUserProfile(user.uid);
        if (userProfile) {
          participantName = userProfile.profile?.nickname || 
                          userProfile.profile?.displayName ||
                          userProfile.displayName || 
                          user?.displayName || 
                          user?.email?.split('@')[0] || 
                          '새 참여자';
        }
      } catch (error) {
        console.warn('⚠️ 사용자 프로필 조회 실패, 기본값 사용:', error);
        participantName = user?.displayName || user?.email?.split('@')[0] || '새 참여자';
      }
      
      const welcomeMessage = {
        text: `👋 ${participantName}님이 "${event.title}" 모임에 참여했습니다!`,
        sender: '시스템',
        senderId: 'system',
        senderProfileImage: null,
        timestamp: new Date(),
        isSystemMessage: true
      };
      
      await firestoreService.sendMessage(chatRoomId, welcomeMessage);
      console.log('✅ 채팅방 참여 환영 메시지 전송 완료');
    } catch (error) {
      console.error('❌ 환영 메시지 전송 실패:', error);
      // 메시지 전송 실패해도 채팅방 참여는 성공으로 처리
    }
  };

  // 채팅방 입장 (일정 참여 시 자동 호출)
  const joinChatRoom = async (eventId) => {
    try {
      // 먼저 로컬에서 채팅방 확인
      let existingChatRoom = chatRooms.find(room => room.eventId === eventId);
      
      if (existingChatRoom) {
        // 이미 참여자 목록에 있는지 확인
        if (existingChatRoom.participants && existingChatRoom.participants.includes(user.uid)) {
          return;
        }
        
        // Firestore에서 채팅방 참여자 업데이트
        const chatRoomRef = doc(firestore, 'chatRooms', existingChatRoom.id);
        await updateDoc(chatRoomRef, {
          participants: arrayUnion(user.uid),
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태 업데이트
        setChatRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === existingChatRoom.id 
              ? { 
                  ...room, 
                  participants: Array.isArray(room.participants) 
                    ? [...room.participants, user.uid]
                    : [user.uid]
                }
              : room
          )
        );
        
        // 참여자 추가 후 환영 메시지 전송 (약간의 지연을 두어 Firestore 업데이트가 완료되도록)
        setTimeout(async () => {
          await sendWelcomeMessageToChatRoom(existingChatRoom.id, eventId);
        }, 1000);
        
        return;
      }
      
      // 로컬에 없으면 Firestore에서 조회
      const chatRoomsRef = collection(firestore, 'chatRooms');
      const q = query(chatRoomsRef, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const chatRoomDoc = querySnapshot.docs[0];
        const chatRoom = { id: chatRoomDoc.id, ...chatRoomDoc.data() };
        
        // 채팅방에 사용자 추가
        const chatRoomRef = doc(firestore, 'chatRooms', chatRoom.id);
        await updateDoc(chatRoomRef, {
          participants: arrayUnion(user.uid),
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태에 추가
        setChatRooms(prevRooms => {
          const alreadyExists = prevRooms.find(room => room.id === chatRoom.id);
          if (alreadyExists) {
            return prevRooms.map(room => 
              room.id === chatRoom.id 
                ? { 
                    ...room, 
                    participants: Array.isArray(room.participants) 
                      ? [...room.participants, user.uid]
                      : [user.uid]
                  }
                : room
            );
          } else {
            return [...prevRooms, {
              ...chatRoom,
              participants: Array.isArray(chatRoom.participants) 
                ? [...chatRoom.participants, user.uid]
                : [user.uid]
            }];
          }
        });
        
        // 참여자 추가 후 환영 메시지 전송 (약간의 지연을 두어 Firestore 업데이트가 완료되도록)
        setTimeout(async () => {
          await sendWelcomeMessageToChatRoom(chatRoom.id, eventId);
        }, 1000);
      } else {
        // 채팅방이 없으면 생성
        const event = allEvents.find(e => e.id === eventId);
        if (event) {
          await createChatRoomForEvent(event);
        }
      }
    } catch (error) {
      console.error('❌ 채팅방 참여 실패:', error);
      throw error;
    }
  };

  // 채팅방 나가기 (일정 나가기 시 자동 호출)
  const leaveChatRoom = async (eventId) => {
    try {
      console.log('🔍 leaveChatRoom - 시작:', eventId);
      // Firestore에서 직접 해당 이벤트의 채팅방 조회
      const chatRoomsRef = collection(firestore, 'chatRooms');
      const q = query(chatRoomsRef, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const chatRoomDoc = querySnapshot.docs[0];
        const chatRoom = { id: chatRoomDoc.id, ...chatRoomDoc.data() };
        
        // 채팅방에서 사용자 제거
        const chatRoomRef = doc(firestore, 'chatRooms', chatRoom.id);
        await updateDoc(chatRoomRef, {
          participants: arrayRemove(user.uid),
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태 업데이트
        setChatRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === chatRoom.id 
              ? { 
                  ...room, 
                  participants: Array.isArray(room.participants) 
                    ? room.participants.filter(participantId => participantId !== user.uid)
                    : []
                }
              : room
          )
        );
        
        console.log('✅ 채팅방 나가기 완료:', chatRoom.id);
      } else {
        console.warn('⚠️ 해당 이벤트의 채팅방을 찾을 수 없습니다:', eventId);
      }
    } catch (error) {
      console.error('❌ 채팅방 나가기 실패:', error);
      throw error;
    }
  };

  // 일정 수정
  const updateEvent = async (eventId, updatedEvent) => {
    try {
      const result = await firestoreService.updateEvent(eventId, updatedEvent);
      if (result.success) {
        console.log('✅ 이벤트 수정 완료:', eventId);
        
        // 제목이 변경된 경우 채팅방 제목도 업데이트
        if (updatedEvent.title) {
          try {
            // 해당 이벤트의 채팅방을 찾아서 제목 업데이트
            const chatRoom = chatRooms.find(room => room.eventId === eventId);
            if (chatRoom) {
              const newChatRoomTitle = `${updatedEvent.title}`;
              await firestoreService.updateChatRoomTitle(chatRoom.id, newChatRoomTitle);
              console.log('✅ 채팅방 제목 업데이트 완료:', newChatRoomTitle);
            } else {
              console.log('⚠️ 해당 이벤트의 채팅방을 찾을 수 없음:', eventId);
            }
          } catch (chatError) {
            console.error('❌ 채팅방 제목 업데이트 실패:', chatError);
            // 채팅방 제목 업데이트 실패는 모임 수정 실패로 처리하지 않음
          }
        }
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
  const endEvent = async (eventId) => {
    try {
      console.log('🔍 EventContext.endEvent 호출됨:', eventId);
      
      // 내가 만든 모임에서 찾기
      const createdEvent = userCreatedEvents.find(event => event.id === eventId);
      if (createdEvent) {
        const endedEvent = {
          ...createdEvent,
          endedAt: new Date().toISOString(),
          status: 'ended'
        };
        
        // 1. 먼저 endedEvents에 추가 (종료된 모임 목록에 표시)
        setEndedEvents(prev => [...prev, endedEvent]);
        
        // 2. Firebase에서 모임 상태를 'ended'로 변경 (삭제 안함)
        await firestoreService.endEvent(eventId);
        
        // 3. Firebase Storage에서 모임 관련 파일 삭제 (이미지 등)
        await storageService.deleteEventFiles(eventId);
        
        // 4. 로컬 상태에서 종료된 모임을 userCreatedEvents에서 제거
        setUserCreatedEvents(prev => 
          prev.filter(event => event.id !== eventId)
        );
        setAllEvents(prev => 
          prev.map(event => 
            event.id === eventId 
              ? { ...event, status: 'ended', endedAt: new Date().toISOString() }
              : event
          )
        );
        
        // 내가 만든 모임을 종료하는 경우, 참여자들에게 rating 알림 생성
        addMeetingNotification('rating', createdEvent, true);
        
        // 연결된 채팅방 삭제 (Firestore에서 삭제됨)
        setChatRooms(prev => 
          prev.filter(chatRoom => chatRoom.eventId !== eventId)
        );
        
        // 상태 업데이트 후 즉시 확인
        console.log('✅ 모임 종료 완료:', eventId);
        console.log('🔍 EventContext - endedEvents 상태 확인:', {
          eventId,
          endedEventsLength: endedEvents.length + 1,
          addedEvent: endedEvent
        });
        
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
    } catch (error) {
      console.error('❌ 모임 종료 실패:', error);
      throw error;
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

  // 업데이트 알림 설정 함수
  const setUpdateNotification = (show) => {
    setHasUpdateNotification(show);
    console.log('🔔 업데이트 알림 상태 변경:', show);
  };

  // 업데이트 알림 해제 함수
  const clearUpdateNotification = () => {
    setHasUpdateNotification(false);
    console.log('✅ 업데이트 알림 해제됨');
  };

  // AsyncStorage와 동기화하여 업데이트 알림 상태 확인
  const checkUpdateNotificationStatus = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const updateRead = await AsyncStorage.getItem('updateNotificationRead');
      
      // 안전한 값 검증
      if (updateRead === 'true') {
        // 이미 읽었으면 알림 표시하지 않음
        setHasUpdateNotification(false);
        console.log('🔄 AsyncStorage 동기화: 업데이트 알림 읽음 처리됨');
      } else if (updateRead === 'false' || updateRead === null || updateRead === undefined) {
        // 읽지 않았거나 값이 없으면 알림 표시
        setHasUpdateNotification(true);
        console.log('🔄 AsyncStorage 동기화: 업데이트 알림 표시됨');
      } else {
        // 잘못된 값이면 초기화하고 알림 표시
        console.log('⚠️ AsyncStorage 잘못된 값 발견, 초기화:', updateRead);
        await AsyncStorage.removeItem('updateNotificationRead');
        setHasUpdateNotification(true);
        console.log('🔄 AsyncStorage 동기화: 잘못된 값 초기화 후 알림 표시됨');
      }
    } catch (error) {
      console.error('❌ AsyncStorage 동기화 실패:', error);
      // 오류 발생 시 기본값으로 설정
      setHasUpdateNotification(true);
      console.log('🔄 AsyncStorage 동기화: 오류 발생으로 기본값 설정');
    }
  };

  // 메시지 연속성 확인 함수 (1분 미만 간격)
  const isConsecutiveMessage = (currentMessageTime, previousMessageTime) => {
    if (!currentMessageTime || !previousMessageTime) return false;
    
    const current = new Date(currentMessageTime);
    const previous = new Date(previousMessageTime);
    const timeDiff = current.getTime() - previous.getTime();
    
    // 1분(60초) 미만이면 연속 메시지로 간주
    return timeDiff < 60 * 1000;
  };

  // 메시지 그룹에서 시간 표시 여부 결정 함수 (더 이상 사용하지 않음)
  // const shouldShowTimestamp = (messages, currentIndex) => { ... };

  // 메시지 그룹화 함수 (연속 메시지 그룹으로 분리)
  const groupConsecutiveMessages = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    const groups = [];
    let currentGroup = [];
    
    messages.forEach((message, index) => {
      if (index === 0) {
        // 첫 번째 메시지는 새 그룹 시작
        currentGroup = [message];
      } else {
        const previousMessage = messages[index - 1];
        
        // 같은 사용자의 연속 메시지인지 확인
        const isSameUser = message.senderId === previousMessage.senderId;
        const isConsecutive = isSameUser && isConsecutiveMessage(message.timestamp, previousMessage.timestamp);
        
        if (isConsecutive) {
          // 연속 메시지면 현재 그룹에 추가
          currentGroup.push(message);
        } else {
          // 연속이 아니면 현재 그룹을 저장하고 새 그룹 시작
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
          }
          currentGroup = [message];
        }
      }
    });
    
    // 마지막 그룹 추가
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  // 메시지에 연속성 정보 추가 함수
  const addConsecutiveInfoToMessages = (messages) => {
    if (!messages || messages.length === 0) return messages;
    
    // 먼저 연속 메시지 그룹을 식별
    const messageGroups = [];
    let currentGroup = [];
    
    messages.forEach((message, index) => {
      if (index === 0) {
        // 첫 번째 메시지는 새 그룹 시작
        currentGroup = [message];
      } else {
        const previousMessage = messages[index - 1];
        
        // 같은 사용자의 연속 메시지인지 확인
        const isSameUser = message.senderId === previousMessage.senderId;
        const isConsecutive = isSameUser && isConsecutiveMessage(message.timestamp, previousMessage.timestamp);
        
        if (isConsecutive) {
          // 연속 메시지면 현재 그룹에 추가
          currentGroup.push(message);
        } else {
          // 연속이 아니면 현재 그룹을 저장하고 새 그룹 시작
          if (currentGroup.length > 0) {
            messageGroups.push([...currentGroup]);
          }
          currentGroup = [message];
        }
      }
    });
    
    // 마지막 그룹 추가
    if (currentGroup.length > 0) {
      messageGroups.push(currentGroup);
    }
    
    console.log('🔍 메시지 그룹화 결과:', messageGroups.map(group => ({
      senderId: group[0].senderId,
      count: group.length,
      messages: group.map(m => m.text)
    })));
    
    // 각 메시지에 연속성 정보 추가
    return messages.map((message, index) => {
      // 현재 메시지가 속한 그룹 찾기
      let messageGroup = null;
      let messageIndexInGroup = -1;
      
      for (const group of messageGroups) {
        const groupIndex = group.findIndex(m => m.id === message.id);
        if (groupIndex !== -1) {
          messageGroup = group;
          messageIndexInGroup = groupIndex;
          break;
        }
      }
      
      if (!messageGroup) {
        console.warn('⚠️ 메시지 그룹을 찾을 수 없음:', message.id);
        return message;
      }
      
      const isFirstInGroup = messageIndexInGroup === 0;
      const isLastInGroup = messageIndexInGroup === messageGroup.length - 1;
      
      // 시간 표시 여부 결정: 그룹의 마지막 메시지에만 시간 표시
      const showTimestamp = isLastInGroup;
      
      console.log(`🔍 메시지 ${index} (${message.text}):`, {
        senderId: message.senderId,
        groupIndex: messageIndexInGroup,
        groupSize: messageGroup.length,
        isFirstInGroup,
        isLastInGroup,
        showTimestamp
      });
      
      return {
        ...message,
        showTimestamp,
        isFirstInGroup,
        isLastInGroup,
        isConsecutive: !isFirstInGroup
      };
    });
  };


  // 알림 변경 시 상태 업데이트
  useEffect(() => {
    // 참여한 모임이 있는지 확인
    const hasJoinedEvents = userJoinedEvents.length > 0;
    
    // 모임 알림 확인
    const hasCancelNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'cancel'
    );
    
    const hasNewParticipantNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'new_participant'
    );
    
    const hasReminderNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'reminder'
    );
    
    const hasUnresolvedRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && 
      notification.type === 'rating' && 
      notification.event && 
      !clickedEndedEventIds.has(notification.event.id)
    );
    
    const hasUnreadNotifications = hasCancelNotifications || hasNewParticipantNotifications || hasReminderNotifications || hasUnresolvedRatingNotifications;
    
    // 전체 모임 알림표시 상태 사용
    setHasMeetingNotification(hasUnreadJoinedMeetings || hasUnreadNotifications);

    // 러닝매너점수 알림 확인
    const hasUnreadRatingNotifications = meetingNotifications.some(notification => 
      !notification.isRead && notification.type === 'rating'
    );
    setHasRatingNotification(hasUnreadRatingNotifications);



  }, [userJoinedEvents, meetingNotifications, endedEventsOptionClicked, clickedEndedEventIds, lastOptionClickTime, hasUnreadJoinedMeetings]);

  // 전체 모임 알림표시 제거 함수
  const clearMeetingNotificationBadge = async () => {

    setHasUnreadJoinedMeetings(false);
    
    // Firestore에서 모임 알림들을 읽음 처리
    try {
      const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
      const notificationsRef = collection(firestore, 'meetingNotifications');
      const notificationsQuery = query(
        notificationsRef,
        where('targetUserId', '==', user.uid),
        where('isRead', '==', false)
      );
      
      const querySnapshot = await getDocs(notificationsQuery);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );
      
      await Promise.all(updatePromises);

    } catch (error) {
      console.error('❌ Firestore 모임 알림 읽음 처리 실패:', error);
    }
  };

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
    leaveEvent,
    createChatRoomForEvent,
    joinChatRoom,
    leaveChatRoom,
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
    hasUpdateNotification,
    hasRatingNotification,
    checkRatingNotifications,
    hasRatingNotificationForEvent,
    hasRatingNotificationForEndedEventsOption,
    createRatingNotificationForEvent,
    handleEndedEventsOptionClick,
    handleEndedEventCardClick,
    handleChatTabClick,
    handleChatRoomClick,
    addChatMessage,
    setUpdateNotification,
    clearUpdateNotification,
    checkUpdateNotificationStatus,
    clearMeetingNotificationBadge,
    // 메시지 연속 기능 관련 함수들
    isConsecutiveMessage,
    groupConsecutiveMessages,
    addConsecutiveInfoToMessages
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext; 