import React, { createContext, useContext, useState } from 'react';

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
      unreadCount: 3,
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
      unreadCount: 1,
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
      id: 100,
      title: '임시 종료 모임',
      type: '모닝러닝',
      location: '여의도한강공원',
      date: '2월 1일',
      time: '오전 7:00',
      distance: '5',
      pace: "6:00-7:00",
      difficulty: '초급',
      organizer: '테스트유저',
      participants: 3,
      maxParticipants: 6,
      isPublic: true,
      hashtags: '#임시 #종료 #모닝런',
      customMarkerCoords: { latitude: 37.5285, longitude: 126.9375 },
      customLocation: '여의도한강공원 물빛광장 앞',
      endedAt: new Date().toISOString(),
      status: 'ended',
      isCreatedByUser: false
    }
  ]);

  // 참여한 일정에 대응하는 채팅방들도 포함하도록 초기 채팅방 데이터 확장
  React.useEffect(() => {
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

  // 일정 삭제
  const deleteEvent = (eventId) => {
    setUserCreatedEvents(prev => prev.filter(event => event.id !== eventId));
    setAllEvents(prev => prev.filter(event => event.id !== eventId));
    
    // 연결된 채팅방도 삭제
    setChatRooms(prev => prev.filter(chatRoom => chatRoom.eventId !== eventId));
  };

  // 모임 종료
  const endEvent = (eventId) => {
    // 내가 생성한 모임에서 찾기
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

  const value = {
    allEvents,
    userCreatedEvents,
    userJoinedEvents,
    endedEvents,
    chatRooms,
    addEvent,
    updateEvent,
    deleteEvent,
    endEvent,
    joinEvent,
    createChatRoomForEvent,
    joinChatRoom,
    setUserCreatedEvents,
    setUserJoinedEvents,
    setEndedEvents,
    setChatRooms
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext; 