import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Animated,
  Platform,
  Keyboard,
  SafeAreaView,
  Share,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useGuide } from '../contexts/GuideContext';
import GuideOverlay from '../components/GuideOverlay';
import firestoreService from '../services/firestoreService';
import evaluationService from '../services/evaluationService';
import RunningShareModal from '../components/RunningShareModal';
import appleFitnessService from '../services/appleFitnessService';
import ENV from '../config/environment';
import storageService from '../services/storageService';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { searchPlace } from '../services/kakaoPlacesService';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { recordMeetingLocation } from '../services/userActivityService';

const firestore = getFirestore();


// NetGill 디자인 시스템 - 홈화면과 동일한 색상 팔레트
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};



const ScheduleScreen = ({ navigation, route, onMyCreatedScreenEnter, onCreateMeetingCardRef, onMyCreatedMeetingsSectionRef, onMeetingCardRef, onMeetingCardMenuRef }) => {
  const authContext = useAuth();
  const { user } = authContext || {};
  const [userProfile, setUserProfile] = useState(null);
  const { guideStates, currentGuide, setCurrentGuide, currentStep, setCurrentStep, startGuide, nextStep, completeGuide, exitGuide, resetGuide } = useGuide();
  const { 
    userCreatedEvents, 
    userJoinedEvents, 
    endedEvents, 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    joinEvent, 
    addMeetingNotification, 
    hasRatingNotification, 
    hasRatingNotificationForEvent, 
    hasRatingNotificationForEndedEventsOption,
    createRatingNotificationForEvent, 
    handleEndedEventsOptionClick,
    handleEndedEventCardClick,
    hasMeetingNotification,
    clearMeetingNotificationBadge
  } = useEvents();
  
  // route 파라미터에서 화면 표시 여부 확인
  const showEndedEventsFromRoute = route?.params?.showEndedEvents;
  const showMyCreatedFromRoute = route?.params?.showMyCreated;
  const showMyJoinedFromRoute = route?.params?.showMyJoined;

  // 탭이 포커스될 때마다 메인 화면으로 리셋 (새 모임 만들기 생성 중이 아닐 때만)
  useFocusEffect(
    React.useCallback(() => {
      // 새 모임 만들기 생성 플로우 중이 아닐 때만 메인 화면으로 리셋
      if (!showCreateFlow) {
        // 요구사항: 화면 재진입 시 항상 "같이 달리기"로 시작
        setMainMode('group');
        setShowMyCreated(false);
        setShowMyJoined(false);
        setShowEndedEvents(false);
        
        // 러닝매너 작성 모달창 표시 확인
        checkRunningMannerNotification();
      } else {
      }
    }, [showCreateFlow])
  );

  // route 파라미터에 따라 적절한 화면 표시
  useEffect(() => {
    
    if (showEndedEventsFromRoute) {
      setShowEndedEvents(true);
      // route 파라미터 초기화
      navigation.setParams({ showEndedEvents: undefined });
    } else if (showMyCreatedFromRoute) {
      setShowMyCreated(true);
      // route 파라미터 초기화
      navigation.setParams({ showMyCreated: undefined });
    } else if (showMyJoinedFromRoute) {
      setShowMyJoined(true);
      // route 파라미터 초기화
      navigation.setParams({ showMyJoined: undefined });
    }
  }, [showEndedEventsFromRoute, showMyCreatedFromRoute, showMyJoinedFromRoute, navigation]);

  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [mainMode, setMainMode] = useState('group'); // 'group' | 'feed'
  const [showMyCreated, setShowMyCreated] = useState(false);
  
  // 내가 만든 모임 화면 진입 감지
  useEffect(() => {
    if (showMyCreated && onMyCreatedScreenEnter) {
      try {
        onMyCreatedScreenEnter();
      } catch (error) {
        console.error('❌ onMyCreatedScreenEnter 콜백 실행 오류:', error);
      }
    }
  }, [showMyCreated]); // onMyCreatedScreenEnter 제거
  const [showMyJoined, setShowMyJoined] = useState(false);
  const [showEndedEvents, setShowEndedEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  
  
  // 러닝매너 작성 모달창 상태
  const [showRunningMannerModal, setShowRunningMannerModal] = useState(false);
  const [runningMannerEvent, setRunningMannerEvent] = useState(null);

  // 러닝 피드 상태
  const [feedWorkouts, setFeedWorkouts] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedErrorCode, setFeedErrorCode] = useState('');
  const [showFeedShareModal, setShowFeedShareModal] = useState(false);
  const [selectedFeedWorkout, setSelectedFeedWorkout] = useState(null);
  
  // 가이드 타겟 refs
  const [createMeetingCardRef, setCreateMeetingCardRef] = useState(null);
  const [myCreatedMeetingsSectionRef, setMyCreatedMeetingsSectionRef] = useState(null);
  const [meetingCardRef, setMeetingCardRef] = useState(null);
  const [meetingCardMenuRef, setMeetingCardMenuRef] = useState(null);

  
  
  // ref 설정을 위한 useEffect
  useEffect(() => {
    if (onCreateMeetingCardRef) {
      onCreateMeetingCardRef(createMeetingCardRef);
    }
  }, [createMeetingCardRef, onCreateMeetingCardRef]);
  
  useEffect(() => {
    if (onMyCreatedMeetingsSectionRef) {
      onMyCreatedMeetingsSectionRef(myCreatedMeetingsSectionRef);
    }
  }, [myCreatedMeetingsSectionRef, onMyCreatedMeetingsSectionRef]);
  
  useEffect(() => {
    if (onMeetingCardRef) {
      onMeetingCardRef(meetingCardRef);
    }
  }, [meetingCardRef, onMeetingCardRef]);
  
  useEffect(() => {
    if (onMeetingCardMenuRef) {
      onMeetingCardMenuRef(meetingCardMenuRef);
    }
  }, [meetingCardMenuRef, onMeetingCardMenuRef]);
  
  

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowCreateFlow(true);
  };

  const formatDateToEventDate = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateToEventTime = (date) => {
    const hour = date.getHours();
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    const period = hour >= 12 ? '오후' : '오전';
    const hour12 = hour % 12 || 12;
    return `${period} ${hour12}:${minute}`;
  };

  const handleFeedSharePress = (workout) => {
    setSelectedFeedWorkout(workout);
    setShowFeedShareModal(true);
  };

  const handleFeedShareClose = () => {
    setShowFeedShareModal(false);
    setSelectedFeedWorkout(null);
  };

  const loadRunningFeed = useCallback(async () => {
    if (mainMode !== 'feed' || showCreateFlow || showMyCreated || showMyJoined || showEndedEvents) {
      return;
    }

    setIsFeedLoading(true);
    setFeedErrorCode('');

    try {
      const workouts = await appleFitnessService.getRecentRunningWorkouts(14);
      setFeedWorkouts(workouts);
    } catch (error) {
      const code = error?.code || 'UNKNOWN';
      setFeedErrorCode(code);
      setFeedWorkouts([]);
    } finally {
      setIsFeedLoading(false);
    }
  }, [mainMode, showCreateFlow, showMyCreated, showMyJoined, showEndedEvents]);

  useEffect(() => {
    loadRunningFeed();
  }, [loadRunningFeed]);

  // 러닝매너 작성 모달창 표시 함수
  const showRunningMannerNotification = (event) => {
    setRunningMannerEvent(event);
    setShowRunningMannerModal(true);
  };

  // 러닝매너 작성 모달창 닫기 함수
  const hideRunningMannerModal = async () => {
    if (runningMannerEvent && user?.uid) {
      // 알림 표시 여부 저장
      await markNotificationAsShown(runningMannerEvent.id, user.uid);
    }
    setShowRunningMannerModal(false);
    setRunningMannerEvent(null);
  };

  // 로컬 스토리지에서 알림 표시 여부 확인
  const getNotificationShownKey = (eventId, userId) => {
    return `running_manner_notification_shown_${eventId}_${userId}`;
  };

  // 알림 표시 여부 저장
  const markNotificationAsShown = async (eventId, userId) => {
    try {
      const key = getNotificationShownKey(eventId, userId);
      await AsyncStorage.setItem(key, 'true');
    } catch (error) {
      console.error('알림 표시 여부 저장 실패:', error);
    }
  };

  // 알림 표시 여부 확인
  const isNotificationShown = async (eventId, userId) => {
    try {
      const key = getNotificationShownKey(eventId, userId);
      const shown = await AsyncStorage.getItem(key);
      return shown === 'true';
    } catch (error) {
      console.error('알림 표시 여부 확인 실패:', error);
      return false;
    }
  };

  // 러닝매너 작성 모달창 표시 확인 함수
  const checkRunningMannerNotification = async () => {
    if (!user?.uid) return;
    
    try {
      // 종료된 모임 중에서 러닝매너를 작성하지 않은 모임 찾기
      const endedEventsList = endedEvents || [];
      const eventsNeedingReview = [];
      
      for (const event of endedEventsList) {
        // 현재 사용자가 참여한 모임인지 확인
        const isParticipant = event.participants?.includes(user.uid) || 
                             event.createdBy === user.uid ||
                             event.organizerId === user.uid;
        
        if (isParticipant) {
          // 러닝매너 작성 완료 여부 확인
          const isCompleted = await evaluationService.isEvaluationCompleted(event.id, user.uid);
          if (!isCompleted) {
            // 알림 표시 여부 확인
            const notificationShown = await isNotificationShown(event.id, user.uid);
            if (!notificationShown) {
              eventsNeedingReview.push(event);
            }
          }
        }
      }
      
      // 러닝매너를 작성해야 하는 모임이 있으면 첫 번째 모임에 대해 모달창 표시
      if (eventsNeedingReview.length > 0) {
        const eventToShow = eventsNeedingReview[0];
        showRunningMannerNotification(eventToShow);
      }
    } catch (error) {
      console.error('러닝매너 작성 모달창 확인 중 오류:', error);
    }
  };

  // 러닝매너 작성하기 버튼 클릭 (ScheduleCard의 handleEvaluationPress 로직 재사용)
  const handleRunningMannerWrite = async () => {
    if (!runningMannerEvent) return;
    
    try {
      // ScheduleCard의 handleEvaluationPress와 동일한 로직 사용
      const hostName = runningMannerEvent.organizer || '알 수 없음';
      const currentParticipants = Array.isArray(runningMannerEvent.participants) ? runningMannerEvent.participants.length : (runningMannerEvent.participants || 1);
      
      const isCurrentUserHost = user && (
        user.displayName === hostName || 
        user.email?.split('@')[0] === hostName ||
        hostName === '나'
      );
      
      const hostParticipant = isCurrentUserHost ? {
        id: user.uid, // 실제 사용자 ID 사용
        name: user.displayName || user.email?.split('@')[0] || '나',
        profileImage: user.photoURL || null,
        isHost: true,
        role: 'host',
        bio: user.bio || '새벽 러닝의 매력을 알려드리는 코치입니다!'
      } : {
        id: runningMannerEvent.organizerId, // 실제 호스트 ID 사용
        name: hostName,
        profileImage: null,
        isHost: true,
        role: 'host',
        bio: '새벽 러닝의 매력을 알려드리는 코치입니다!'
      };

      // 실제 참여자 목록 생성 (EventDetailScreen과 동일한 로직)
      let participantsList = [];
      if (runningMannerEvent.participants && Array.isArray(runningMannerEvent.participants)) {
        participantsList = await Promise.all(
          runningMannerEvent.participants.map(async (participantId, index) => {
            try {
              // Firestore에서 참여자 프로필 정보 가져오기
              const userProfile = await firestoreService.getUserProfile(participantId);
              
              const isHost = runningMannerEvent.organizerId === participantId;
              const hostName = runningMannerEvent.organizer || '알 수 없음';
              
              // file:// 로컬 경로는 타 사용자 기기에서 열 수 없어 제외
              const imageCandidates = [
                userProfile?.photoURL,
                userProfile?.profileImage,
                userProfile?.profile?.profileImage
              ];
              const profileImage = imageCandidates.find(
                (url) => typeof url === 'string' && url.startsWith('http')
              ) || null;
              
              return {
                id: participantId, // 실제 사용자 ID 사용
                name: isHost ? hostName : (userProfile?.profile?.nickname || userProfile?.displayName),
                profileImage: profileImage,
                isHost: isHost,
                level: userProfile?.profile?.level || '초급',
                mannerScore: userProfile?.profile?.mannerScore || 5.0,
                totalParticipated: userProfile?.profile?.totalParticipated || 0,
                thisMonth: userProfile?.profile?.thisMonth || 0,
                hostedEvents: userProfile?.profile?.hostedEvents || 0,
                joinDate: runningMannerEvent.createdAt ? new Date(runningMannerEvent.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.') : '날짜 없음',
                bio: userProfile?.profile?.bio || '자기소개를 입력해주세요.',
                runningProfile: userProfile?.profile || null,
                age: userProfile?.profile?.age || null,
                gender: userProfile?.gender || userProfile?.profile?.gender || null,
                userId: participantId
              };
            } catch (error) {
              return {
                id: participantId, // 실제 사용자 ID 사용
                name: null,
                profileImage: null,
                isHost: runningMannerEvent.organizerId === participantId,
                level: '초급',
                mannerScore: 5.0,
                totalParticipated: 0,
                thisMonth: 0,
                hostedEvents: 0,
                joinDate: '날짜 없음',
                bio: '자기소개를 입력해주세요.',
                runningProfile: null,
                age: null,
                gender: null,
                userId: participantId
              };
            }
          })
        );
      }
      
      // 실제 모임 참여자 데이터 사용
      const actualParticipants = participantsList.length > 0 
        ? participantsList 
        : [hostParticipant]; // 참여자 데이터가 없으면 호스트만
      
      // Date 객체를 문자열로 변환하여 직렬화 가능하게 만듦
      const serializableEvent = {
        ...runningMannerEvent,
        date: runningMannerEvent.date ? (typeof runningMannerEvent.date.toISOString === 'function' ? runningMannerEvent.date.toISOString() : runningMannerEvent.date) : null,
        createdAt: runningMannerEvent.createdAt ? (typeof runningMannerEvent.createdAt.toISOString === 'function' ? runningMannerEvent.createdAt.toISOString() : runningMannerEvent.createdAt) : null,
        updatedAt: runningMannerEvent.updatedAt ? (typeof runningMannerEvent.updatedAt.toISOString === 'function' ? runningMannerEvent.updatedAt.toISOString() : runningMannerEvent.updatedAt) : null
      };
      
      // 알림 표시 여부 저장
      if (user?.uid) {
        await markNotificationAsShown(runningMannerEvent.id, user.uid);
      }
      
      // 모달창 닫기
      hideRunningMannerModal();
      
      // 러닝매너 작성 화면으로 이동
      navigation.navigate('RunningMeetingReview', { 
        event: serializableEvent, 
        participants: actualParticipants
      });
    } catch (error) {
      Alert.alert('오류', '참여자 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowCreateFlow(true);
  };

  const handleEventCreated = async (newEvent) => {
    if (editingEvent && editingEvent.id) {
      // 수정 모드
      updateEvent(editingEvent.id, newEvent);
      setShowCreateFlow(false);
      setEditingEvent(null);
    } else {
      // 새 모임 생성
      const createdEvent = await addEvent(newEvent);
      setShowCreateFlow(false);
      setEditingEvent(null);
      
      // 새 모임 생성 완료 알림
      Alert.alert(
        '모임 생성 완료! 🎉',
        `"${newEvent.title}" 모임이 성공적으로 생성되었습니다.\n\n채팅방을 확인해보세요!`,
        [
          { text: '나중에' },
          { 
            text: '채팅방 보기', 
            onPress: () => {
              if (createdEvent?.chatRoomId) {
                const chatRoom = { id: createdEvent.chatRoomId, title: `${newEvent.title} 🏃‍♀️` };
                navigation.navigate('Chat', { chatRoom });
              } else {
                navigation.navigate('CommunityTab');
              }
            }
          }
        ]
      );
    }
  };

  const handleCloseCreateFlow = () => {
    setShowCreateFlow(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      '모임 삭제',
      '이 모임을 삭제하시겠습니까?\n\n⚠️ 모임을 삭제하면 관련된 채팅방도 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // 삭제할 모임 찾기
              const eventToDelete = userCreatedEvents.find(event => event.id === eventId);
              
              // 모임 삭제 (EventContext에서 알림 생성 포함)
              await deleteEvent(eventId);
              
              Alert.alert(
                '삭제 완료',
                '모임과 관련 채팅방이 삭제되었습니다.',
                [{ text: '확인' }]
              );
            } catch (error) {
              console.error('모임 삭제 실패:', error);
              Alert.alert(
                '삭제 실패',
                '모임 삭제 중 오류가 발생했습니다.',
                [{ text: '확인' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleViewMyCreated = () => {
    setShowMyCreated(true);
  };

  const handleViewMyJoined = () => {
    // '내가 참여한 모임' 카드 클릭 시 알림표시 제거
    clearMeetingNotificationBadge();
    setShowMyJoined(true);
  };

  const handleBackToMain = () => {
    setShowMyCreated(false);
    setShowMyJoined(false);
    setShowEndedEvents(false);
  };

  const handleViewEndedEvents = () => {
    // 종료된 모임 옵션카드 클릭 처리
    handleEndedEventsOptionClick();
    setShowEndedEvents(true);
  };

  const handleEventPress = (event, currentScreen) => {
    // 종료된 모임 카드 클릭 시 알림 처리
    if (currentScreen === 'endedEvents') {
      handleEndedEventCardClick(event.id);
    }
    
    // 내가 만든 모임 카드 클릭 시 6단계 가이드는 EventDetailScreen에서 처리
    // if (currentScreen === 'myCreated' && onMeetingCardClick) {
    //   onMeetingCardClick();
    // }
    
                // 내가 참여한 모임 카드 클릭 시 개별 읽음 처리 제거 (전체 알림표시만 사용)
            if (currentScreen === 'myJoined') {
            }
    
    // 내가 만든 모임인지 확인 (event.isCreatedByUser 필드 사용)
    const isCreatedByMe = event.isCreatedByUser || false;
    
    
    // Date 객체를 문자열로 변환하여 직렬화 문제 해결
    const serializedEvent = {
      ...event,
      createdAt: event.createdAt && typeof event.createdAt.toISOString === 'function' ? event.createdAt.toISOString() : event.createdAt,
      date: event.date && typeof event.date.toISOString === 'function' ? event.date.toISOString() : event.date,
      updatedAt: event.updatedAt && typeof event.updatedAt.toISOString === 'function' ? event.updatedAt.toISOString() : event.updatedAt
    };
    
    navigation.navigate('EventDetail', { 
      event: serializedEvent, 
      isJoined: userJoinedEvents.some(e => e.id === event.id), 
      currentScreen,
      isCreatedByMe
    });
  };



  const handleJoinEvent = (eventId) => {
    // 모임 참여 처리 (채팅방 자동 입장 포함)
    joinEvent(eventId);
    Alert.alert(
      '참여 완료', 
      '모임에 참여했습니다!\n채팅방에도 자동으로 입장되었습니다.',
      [
        { text: '확인' }
      ]
    );
  };

  const handleLeaveEvent = (eventId) => {
    Alert.alert('나가기 완료', '모임에서 나갔습니다.');
  };

  const handleParticipantPress = (participant) => {
    // ParticipantScreen으로 네비게이션
    navigation.navigate('Participant', { participant });
  };





  // 모임 생성 플로우 화면
  if (showCreateFlow) {
    return (
      <RunningEventCreationFlow
        onEventCreated={handleEventCreated}
        onClose={handleCloseCreateFlow}
        editingEvent={editingEvent}
      />
    );
  }

  // 내가 만든 모임 화면
  if (showMyCreated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내가 만든 모임</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {userCreatedEvents.filter(event => event.status !== 'ended').length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="create-outline" size={80} color="#ffffff" />
              <Text style={styles.emptyTitle}>생성한 모임이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                새로운 러닝 모임을 만들어보세요!
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
                <Ionicons name="add" size={24} color="#000000" />
                <Text style={styles.createButtonText}>모임 생성하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {userCreatedEvents
                .filter(event => event.status !== 'ended') // 종료된 모임 제외
                .map((event, index) => (
                <ScheduleCard
                  key={event.id || index}
                  id={index === 0 ? 'meetingCard' : undefined}
                  event={event}
                  onEdit={() => handleEditEvent(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                  onMeetingCardRef={index === 0 ? onMeetingCardRef : undefined}
                  onMeetingCardMenuRef={index === 0 ? onMeetingCardMenuRef : undefined}
                  onPress={(e) => handleEventPress(e, 'myCreated')}
                  onMenuPress={(event) => {
                    // 메뉴 버튼 클릭 시 수정/삭제 옵션 표시
                    setEditingEvent(event);
                  }}
                  isCreatedByMe={true}
                  cardIndex={index}
                  hasMeetingNotification={hasMeetingNotification}
                  navigation={navigation}
                  user={user}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 내가 참여한 모임 화면
  if (showMyJoined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내가 참여한 모임</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {userJoinedEvents.filter(event => event.status !== 'ended').length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={80} color="#ffffff" />
              <Text style={styles.emptyTitle}>참여한 모임이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                다른 사람들의 러닝 모임에 참여해보세요!
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {userJoinedEvents
                .filter(event => event.status !== 'ended') // 종료된 모임 제외
                .map((event, index) => (
                <ScheduleCard
                  key={event.id}
                  event={event}
                  onEdit={null} // 참여한 모임은 수정 불가
                  onDelete={null} // 참여한 모임은 삭제 불가
                  onPress={(e) => handleEventPress(e, 'myJoined')}
                  isCreatedByMe={false}
                  showOrganizerInfo={true}
                  cardIndex={index}
                  showJoinButton={true} // 참여한 모임에서는 나가기 버튼 표시
                  hasMeetingNotification={hasMeetingNotification}
                  navigation={navigation}
                  user={user}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 종료된 모임 화면
  if (showEndedEvents) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>종료된 모임</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {endedEvents.filter(event => 
            event.organizerId === user?.uid || 
            (event.participants && event.participants.includes(user?.uid))
          ).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#ffffff" />
              <Text style={styles.emptyTitle}>종료된 모임이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                모임이 종료되면 여기에서 확인할 수 있습니다.
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {endedEvents
                .filter(event => 
                  // 사용자가 생성한 모임이거나 참여한 모임만 표시
                  event.organizerId === user?.uid || 
                  (event.participants && event.participants.includes(user?.uid))
                )
                .map((event, index) => (
                <ScheduleCard
                  key={event.id || index}
                  event={event}
                  onEdit={null} // 종료된 모임은 수정 불가
                  onDelete={null} // 종료된 모임은 삭제 불가
                  onPress={(e) => handleEventPress(e, 'endedEvents')}
                  isCreatedByMe={event.isCreatedByUser}
                  showOrganizerInfo={true}
                  cardIndex={index}
                  showJoinButton={false} // 종료된 모임에서는 버튼 숨김
                  isEnded={true}
                  hasRatingNotification={hasRatingNotificationForEvent(event.id)}
                  navigation={navigation}
                  user={user}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 메인 모임 화면 (3개 옵션)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 모드 토글 (모임탭 최상단) */}
        <View style={styles.modeToggleWrap}>
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeToggleButton, mainMode === 'group' && styles.modeToggleButtonActive]}
              onPress={() => setMainMode('group')}
            >
              <Text style={[styles.modeToggleButtonText, mainMode === 'group' && styles.modeToggleButtonTextActive]}>
                같이 달리기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleButton, mainMode === 'feed' && styles.modeToggleButtonActive]}
              onPress={() => setMainMode('feed')}
            >
              <Text style={[styles.modeToggleButtonText, mainMode === 'feed' && styles.modeToggleButtonTextActive]}>
                러닝 피드
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 헤더 섹션 */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{mainMode === 'group' ? '모임' : '러닝 피드'}</Text>
          <Text style={styles.subtitle}>
            {mainMode === 'group'
              ? '러닝 모임을 만들고 관리해보세요'
              : 'Apple Fitness 러닝 기록을 확인하고 공유 이미지를 저장해보세요'}
          </Text>
        </View>

        {mainMode === 'group' ? (
          <>
            {/* 새 모임 만들기 */}
            <TouchableOpacity
              id="createMeetingCard"
              ref={setCreateMeetingCardRef}
              style={styles.mainOptionCard}
              onPress={handleCreateEvent}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="add-circle" size={48} color={COLORS.PRIMARY} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>새 모임 만들기</Text>
                <Text style={styles.optionSubtitle}>
                  새로운 러닝 모임을 생성하고 다른 사람들과 함께 달려보세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" />
            </TouchableOpacity>

            {/* 내가 참여한 모임 */}
            <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewMyJoined}>
              {hasMeetingNotification && (
                <View style={styles.cardTopNotificationBadge} />
              )}
              <View style={styles.optionIconContainer}>
                <Ionicons name="people" size={48} color="#ffffff" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>내가 참여한 모임</Text>
                <Text style={styles.optionSubtitle}>
                  참여 신청한 러닝 모임들을 확인하고 관리하세요
                </Text>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>{userJoinedEvents.filter(event => event.status !== 'ended').length}개</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" />
            </TouchableOpacity>

            {/* 내가 만든 모임 */}
            <TouchableOpacity
              id="myCreatedMeetingsSection"
              ref={setMyCreatedMeetingsSectionRef}
              style={styles.mainOptionCard}
              onPress={handleViewMyCreated}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="create" size={48} color="#ffffff" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>내가 만든 모임</Text>
                <Text style={styles.optionSubtitle}>
                  내가 만든 러닝 모임들을 관리하고 참여자를 확인하세요
                </Text>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>{userCreatedEvents.filter(event => event.status !== 'ended').length}개</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" />
            </TouchableOpacity>

            {/* 종료된 모임 */}
            <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewEndedEvents}>
              {hasRatingNotificationForEndedEventsOption() && (
                <View style={styles.cardTopNotificationBadge} />
              )}
              <View style={styles.optionIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#FFEA00" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>종료된 모임</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Text style={styles.optionSubtitle}>종료된 모임을 확인하고 </Text>
                  <Text style={[styles.optionSubtitle, { color: COLORS.PRIMARY }]}>러닝매너</Text>
                  <Text style={styles.optionSubtitle}>를 작성하세요</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>{endedEvents.filter(event =>
                    event.organizerId === user?.uid ||
                    (event.participants && event.participants.includes(user?.uid))
                  ).length}개</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" />
            </TouchableOpacity>

            {/* 추가 정보 섹션 */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>💡 모임 관리 팁</Text>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.infoText}>모임 생성 시 상세한 정보를 입력하면 더 많은 참여자를 모을 수 있어요</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.infoText}>참여한 모임은 시작 24시간 전까지 취소할 수 있어요</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.infoText}>날씨나 상황 변경 시 참여자들에게 미리 알려주세요</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {isFeedLoading ? (
              <View style={styles.runningFeedPlaceholderCard}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.runningFeedPlaceholderTitle}>러닝 기록을 불러오는 중</Text>
              </View>
            ) : feedErrorCode ? (
              <View style={styles.runningFeedPlaceholderCard}>
                <Ionicons name="warning-outline" size={34} color="#FFCC00" />
                <Text style={styles.runningFeedPlaceholderTitle}>러닝 기록을 불러오지 못했어요</Text>
                <Text style={styles.runningFeedPlaceholderText}>
                  {feedErrorCode === 'NO_PERMISSION'
                    ? 'Apple Fitness 권한을 확인해주세요.'
                    : '잠시 후 다시 시도해주세요.'}
                </Text>
                <TouchableOpacity style={styles.runningFeedRetryButton} onPress={loadRunningFeed}>
                  <Text style={styles.runningFeedRetryButtonText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : feedWorkouts.length === 0 ? (
              <View style={styles.runningFeedPlaceholderCard}>
                <Ionicons name="fitness-outline" size={34} color={COLORS.PRIMARY} />
                <Text style={styles.runningFeedPlaceholderTitle}>최근 14일 러닝 기록이 없어요</Text>
                <Text style={styles.runningFeedPlaceholderText}>
                  Apple Fitness에서 러닝을 기록하면 여기에 자동으로 표시됩니다.
                </Text>
              </View>
            ) : (
              <View style={styles.runningFeedList}>
                {feedWorkouts.map((workout) => {
                  const startedAt = workout.startTime ? new Date(workout.startTime) : null;
                  const dateLabel = startedAt
                    ? startedAt.toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })
                    : '날짜 정보 없음';
                  const timeLabel = startedAt
                    ? startedAt.toLocaleTimeString('ko-KR', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '-';

                  return (
                    <View key={workout.id} style={styles.runningFeedItemCard}>
                      <View style={styles.runningFeedItemHeader}>
                        <Text style={styles.runningFeedItemDate}>{dateLabel}</Text>
                        <Text style={styles.runningFeedItemTime}>{timeLabel}</Text>
                      </View>

                      <View style={styles.runningFeedStatRow}>
                        <View style={styles.runningFeedStatItem}>
                          <Text style={styles.runningFeedStatLabel}>Distance</Text>
                          <Text style={styles.runningFeedStatValue}>{workout.distance}</Text>
                        </View>
                        <View style={styles.runningFeedStatItem}>
                          <Text style={styles.runningFeedStatLabel}>Pace</Text>
                          <Text style={styles.runningFeedStatValue}>{workout.pace}</Text>
                        </View>
                        <View style={styles.runningFeedStatItem}>
                          <Text style={styles.runningFeedStatLabel}>Time</Text>
                          <Text style={styles.runningFeedStatValue}>{workout.duration}</Text>
                        </View>
                      </View>

                      <View style={styles.runningFeedFooter}>
                        <Text style={styles.runningFeedCalories}>{workout.calories} kcal</Text>
                        <TouchableOpacity
                          style={styles.runningFeedShareButton}
                          onPress={() => handleFeedSharePress(workout)}
                        >
                          <Ionicons name="image-outline" size={16} color="#000000" />
                          <Text style={styles.runningFeedShareButtonText}>이미지 생성</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}


      </ScrollView>
      
      {/* 러닝매너 작성 모달창 */}
      <Modal
        visible={showRunningMannerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={hideRunningMannerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>오늘 러닝은 어땠나요?</Text>
            </View>
            
            {runningMannerEvent && (
              <View style={styles.modalEventInfo}>
                <Text style={styles.modalEventTitle}>{runningMannerEvent.title}</Text>
                <View style={styles.modalEventDetails}>
                  <View style={styles.modalEventDetailItem}>
                    <Ionicons name="calendar" size={16} color="#666666" />
                    <Text style={styles.modalEventDetailText}>
                      {runningMannerEvent.date ? 
                        new Date(runningMannerEvent.date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        }) : '날짜 미정'
                      }
                    </Text>
                  </View>
                  <View style={styles.modalEventDetailItem}>
                    <Ionicons name="time" size={16} color="#666666" />
                    <Text style={styles.modalEventDetailText}>
                      {runningMannerEvent.time || '시간 미정'}
                    </Text>
                  </View>
                  <View style={styles.modalEventDetailItem}>
                    <Ionicons name="location" size={16} color="#666666" />
                    <Text style={styles.modalEventDetailText}>
                      {runningMannerEvent.location || '장소 미정'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <Text style={styles.modalMessage}>
              러닝매너를 작성해주세요!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={hideRunningMannerModal}
              >
                <Text style={styles.modalButtonSecondaryText}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleRunningMannerWrite}
              >
                <Text style={styles.modalButtonPrimaryText}>네</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 러닝 피드 공유 모달 */}
      <RunningShareModal
        visible={showFeedShareModal}
        onClose={handleFeedShareClose}
        workoutData={{
          distance: selectedFeedWorkout?.distance || '0m',
          pace: selectedFeedWorkout?.pace || '0:00/km',
          duration: selectedFeedWorkout?.duration || '0s',
          calories: selectedFeedWorkout?.calories || 0,
          routeCoordinates: selectedFeedWorkout?.routeCoordinates || [],
        }}
        presetWorkoutData={selectedFeedWorkout ? {
          distance: selectedFeedWorkout.distance,
          pace: selectedFeedWorkout.pace,
          duration: selectedFeedWorkout.duration,
          calories: selectedFeedWorkout.calories,
          routeCoordinates: selectedFeedWorkout.routeCoordinates || [],
        } : null}
        eventData={selectedFeedWorkout?.startTime ? {
          title: '러닝 피드',
          location: '한강',
          date: formatDateToEventDate(new Date(selectedFeedWorkout.startTime)),
          time: formatDateToEventTime(new Date(selectedFeedWorkout.startTime)),
          organizer: user?.displayName || '나',
        } : null}
        onShareComplete={handleFeedShareClose}
      />
    </SafeAreaView>
  );
};

const ScheduleCard = ({ event, onEdit, onDelete, onPress, isCreatedByMe = false, showOrganizerInfo = false, cardIndex, showJoinButton = true, isEnded = false, hasRatingNotification = false, hasMeetingNotification = false, navigation, user, onMeetingCardRef, onMeetingCardMenuRef }) => {
  const [showActionModal, setShowActionModal] = useState(false);
  const [buttonLayout, setButtonLayout] = useState(null);
  const [cardLayout, setCardLayout] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 16 });
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [isEvaluationCompleted, setIsEvaluationCompleted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const actionModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const actionSheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // ref 상태들
  const [meetingCardRef, setMeetingCardRef] = useState(null);
  const [meetingCardMenuRef, setMeetingCardMenuRef] = useState(null);
  
  // ref 설정을 위한 useEffect
  useEffect(() => {
    if (onMeetingCardRef) {
      onMeetingCardRef(meetingCardRef);
    }
  }, [meetingCardRef, onMeetingCardRef]);
  
  useEffect(() => {
    if (onMeetingCardMenuRef) {
      onMeetingCardMenuRef(meetingCardMenuRef);
    }
  }, [meetingCardMenuRef, onMeetingCardMenuRef]);

  useEffect(() => {
    if (showActionModal) {
      actionModalBackdropOpacity.setValue(0);
      actionSheetTranslateY.setValue(300);

      Animated.parallel([
        Animated.timing(actionModalBackdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(actionSheetTranslateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showActionModal, actionModalBackdropOpacity, actionSheetTranslateY]);

  const closeActionModal = useCallback((afterClose) => {
    Animated.parallel([
      Animated.timing(actionModalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(actionSheetTranslateY, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowActionModal(false);
      if (typeof afterClose === 'function') {
        afterClose();
      }
    });
  }, [actionModalBackdropOpacity, actionSheetTranslateY]);

  // 평가 완료 여부 확인 함수
  const checkEvaluationStatus = async () => {
    if (!user?.uid || !event.id || !isEnded) return;
    
    try {
      const completed = await evaluationService.isEvaluationCompleted(event.id, user.uid);
      setIsEvaluationCompleted(completed);
    } catch (error) {
      setIsEvaluationCompleted(false);
    }
  };

  // 평가 완료 여부 확인
  useEffect(() => {
    checkEvaluationStatus();
  }, [user?.uid, event.id, isEnded]);

  // 화면이 포커스될 때마다 평가 완료 상태 확인
  useFocusEffect(
    useCallback(() => {
      if (isEnded) {
        checkEvaluationStatus();
      }
    }, [isEnded, user?.uid, event.id])
  );

  // 공유 버튼 클릭 함수
  const handleSharePress = (event) => {
    setShowShareModal(true);
  };

  // 공유 모달 닫기 함수
  const handleShareClose = () => {
    setShowShareModal(false);
  };

  // 공유 완료 함수
  const handleShareComplete = () => {
    setShowShareModal(false);
  };

  // 러닝매너 작성 함수 (EventDetailScreen 로직 활용)
  const handleEvaluationPress = async (event) => {
    try {
      // 참여자 목록 데이터 생성
      const hostName = event.organizer || '알 수 없음';
      const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
      
      const isCurrentUserHost = user && (
        user.displayName === hostName || 
        user.email?.split('@')[0] === hostName ||
        hostName === '나'
      );
      
      const hostParticipant = isCurrentUserHost ? {
        id: user.uid, // 실제 사용자 ID 사용
        name: user.displayName || user.email?.split('@')[0] || '나',
        profileImage: user.photoURL || null,
        isHost: true,
        role: 'host',
        bio: user.bio || '새벽 러닝의 매력을 알려드리는 코치입니다!'
      } : {
        id: event.organizerId, // 실제 호스트 ID 사용
        name: hostName,
        profileImage: null,
        isHost: true,
        role: 'host',
        bio: '새벽 러닝의 매력을 알려드리는 코치입니다!'
      };

      // 실제 참여자 목록 생성 (EventDetailScreen과 동일한 로직)
      let participantsList = [];
      if (event.participants && Array.isArray(event.participants)) {
        participantsList = await Promise.all(
          event.participants.map(async (participantId, index) => {
            try {
              // Firestore에서 참여자 프로필 정보 가져오기
              const userProfile = await firestoreService.getUserProfile(participantId);
              
              const isHost = event.organizerId === participantId;
              const hostName = event.organizer || '알 수 없음';
              
              // file:// 로컬 경로는 타 사용자 기기에서 열 수 없어 제외
              const imageCandidates = [
                userProfile?.photoURL,
                userProfile?.profileImage,
                userProfile?.profile?.profileImage
              ];
              const profileImage = imageCandidates.find(
                (url) => typeof url === 'string' && url.startsWith('http')
              ) || null;
              
              return {
                id: participantId, // 실제 사용자 ID 사용
                name: isHost ? hostName : (userProfile?.profile?.nickname || userProfile?.displayName),
                profileImage: profileImage,
                isHost: isHost,
                level: userProfile?.profile?.level || '초급',
                mannerScore: userProfile?.profile?.mannerScore || 5.0,
                totalParticipated: userProfile?.profile?.totalParticipated || 0,
                thisMonth: userProfile?.profile?.thisMonth || 0,
                hostedEvents: userProfile?.profile?.hostedEvents || 0,
                joinDate: event.createdAt ? new Date(event.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.') : '날짜 없음',
                bio: userProfile?.profile?.bio || '자기소개를 입력해주세요.',
                runningProfile: userProfile?.profile || null,
                age: userProfile?.profile?.age || null,
                gender: userProfile?.gender || userProfile?.profile?.gender || null,
                userId: participantId
              };
            } catch (error) {
              return {
                id: participantId, // 실제 사용자 ID 사용
                name: null,
                profileImage: null,
                isHost: event.organizerId === participantId,
                level: '초급',
                mannerScore: 5.0,
                totalParticipated: 0,
                thisMonth: 0,
                hostedEvents: 0,
                joinDate: '날짜 없음',
                bio: '자기소개를 입력해주세요.',
                runningProfile: null,
                age: null,
                gender: null,
                userId: participantId
              };
            }
          })
        );
      }

      // 실제 모임 참여자 데이터 사용
      const actualParticipants = participantsList.length > 0 
        ? participantsList 
        : [hostParticipant]; // 참여자 데이터가 없으면 호스트만
      
      
      // Date 객체를 문자열로 변환하여 직렬화 가능하게 만듦
      const serializableEvent = {
        ...event,
        date: event.date ? (typeof event.date.toISOString === 'function' ? event.date.toISOString() : event.date) : null,
        createdAt: event.createdAt ? (typeof event.createdAt.toISOString === 'function' ? event.createdAt.toISOString() : event.createdAt) : null,
        updatedAt: event.updatedAt ? (typeof event.updatedAt.toISOString === 'function' ? event.updatedAt.toISOString() : event.updatedAt) : null
      };
      
      navigation.navigate('RunningMeetingReview', { 
        event: serializableEvent, 
        participants: actualParticipants,
        onEvaluationComplete: () => {
          // 러닝매너 작성 완료 후 상태 업데이트
          setIsEvaluationCompleted(true);
        }
      });
    } catch (error) {
      Alert.alert('오류', '참여자 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      '초급': '#C9CD8F',
      '중급': '#DAE26F',
      '고급': '#EEFF00',
    };
    return colorMap[difficulty] || '#666666';
  };

  const parseHashtags = (hashtagString) => {
    if (!hashtagString || !hashtagString.trim()) return [];
    
    // #으로 시작하는 해시태그들을 추출
    const hashtags = hashtagString
      .split(/\s+/) // 공백으로 분리
      .filter(tag => tag.startsWith('#') && tag.length > 1) // #으로 시작하고 길이가 1보다 큰 것만
      .map(tag => {
        // 모든 #을 제거하고 하나의 #만 추가
        const cleanTag = tag.replace(/[^#\w가-힣]/g, ''); // 특수문자 제거 (한글, 영문, 숫자, # 만 허용)
        const tagWithoutHash = cleanTag.replace(/^#+/, ''); // 앞의 모든 # 제거
        return `#${tagWithoutHash}`; // 하나의 #만 추가
      })
      .slice(0, 5); // 최대 5개까지만
    
    return hashtags;
  };

  const formatDateWithoutYear = (dateString) => {
    if (!dateString) return '';
    
    // 이미 요일이 포함된 형식인 경우 (예: "1월 18일 (목)") 그대로 반환
    if (dateString.includes('(') && dateString.includes(')')) {
      return dateString;
    }
    
    // "2024년 1월 18일" 또는 ISO 형식을 "1월 18일 (요일)" 형식으로 변환
    try {
      let date;
      if (dateString.includes('년')) {
        // 한국어 형식: "2024년 1월 18일"
        const cleaned = dateString.replace(/^\d{4}년\s*/, '');
        const match = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (match) {
          const month = parseInt(match[1]);
          const day = parseInt(match[2]);
          date = new Date(new Date().getFullYear(), month - 1, day);
        }
      } else {
        // ISO 형식: "2024-01-18"
        date = new Date(dateString);
      }
      
      if (date && !isNaN(date.getTime())) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        return `${month}월 ${day}일 (${dayOfWeek})`;
      }
    } catch (error) {
      // 날짜 파싱 오류 - 기본값 사용
    }
    
    // 파싱 실패 시 연도만 제거하여 반환
    return dateString.replace(/^\d{4}년\s*/, '');
  };

  const handleEditAction = () => {
    closeActionModal(() => {
      onEdit();
    });
  };

  const handleDeleteAction = () => {
    closeActionModal(() => {
      onDelete();
    });
  };

  const handleLeaveEvent = () => {
    closeActionModal();
    Alert.alert(
      '모임 나가기',
      '이 모임에서 나가시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            if (onDelete) onDelete();
          },
        },
      ]
    );
  };

  const handleShareMeetingLink = useCallback(async () => {
    try {
      if (!event?.id) {
        Alert.alert('오류', '모임 링크를 생성할 수 없습니다.');
        return;
      }

      const projectId = ENV.firebaseProjectId || 'runon-production-app';
      const cacheVersion = Date.now();
      const meetingLink = `https://us-central1-${projectId}.cloudfunctions.net/eventShare?eventId=${encodeURIComponent(event.id)}&v=${cacheVersion}`;
      const setStringAsync =
        Clipboard?.setStringAsync ||
        Clipboard?.setString;

      if (typeof setStringAsync !== 'function') {
        throw new Error('Clipboard module unavailable');
      }

      await setStringAsync(meetingLink);
      Alert.alert('안내', '모임공유링크가 복사되었습니다');
    } catch (error) {
      console.error('모임 공유 링크 복사 실패:', error);
      try {
        if (!event?.id) {
          Alert.alert('오류', '모임 링크를 생성할 수 없습니다.');
          return;
        }
        const projectId = ENV.firebaseProjectId || 'runon-production-app';
        const cacheVersion = Date.now();
        const meetingLink = `https://us-central1-${projectId}.cloudfunctions.net/eventShare?eventId=${encodeURIComponent(event.id)}&v=${cacheVersion}`;
        await Share.share({ message: meetingLink });
      } catch (shareError) {
        console.error('모임 공유 시트 실행 실패:', shareError);
        Alert.alert('오류', '모임 공유 링크 복사에 실패했습니다.');
      }
    }
  }, [event?.id]);

  const handleCardPress = () => {
    // 버튼이 눌린 상태가 아닐 때만 카드 클릭 이벤트 실행
    if (!isButtonPressed && onPress) {
      onPress(event);
    }
    // 상태 초기화
    setTimeout(() => setIsButtonPressed(false), 100);
  };

  return (
    <TouchableOpacity 
      ref={setMeetingCardMenuRef}
      style={[
        styles.eventCard,
        isEnded && isEvaluationCompleted && styles.eventCardCompleted
      ]}
      onPress={handleCardPress}
      activeOpacity={0.8}
      onLayout={(event) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        setCardLayout({ x, y, width, height });
      }}
    >
      {(hasRatingNotification || hasMeetingNotification) && (
        <View style={styles.cardTopNotificationBadge} />
      )}
      {/* 제목과 난이도, 메뉴 버튼 */}
      <View style={styles.titleRow}>
        <View style={styles.titleWithDifficulty}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.difficulty && (
            <View style={[styles.difficultyBadge, { 
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: getDifficultyColor(event.difficulty),
              marginLeft: 12
            }]}> 
              <Text style={[styles.difficultyText, { color: getDifficultyColor(event.difficulty) }]}>{event.difficulty}</Text>
            </View>
          )}
        </View>
        <View style={styles.titleRightSection}>
          {isCreatedByMe && !isEnded ? (
            <TouchableOpacity 
              ref={setMeetingCardRef}
              onPress={() => {
                setIsButtonPressed(true);
                setShowActionModal(true);
              }} 
              style={styles.actionButton}
              onLayout={(event) => {
                const { x, y, width, height } = event.nativeEvent.layout;
                setButtonLayout({ x, y, width, height });
                // 모달 위치 계산
                event.target.measure((fx, fy, width, height, px, py) => {
                  setModalPosition({
                    top: py + height + 8,
                    right: 16,
                  });
                });
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 위치와 날짜/시간을 한 줄로 배치 */}
      <View style={styles.locationDateTimeRow}>
        {/* 위치 */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.infoText}>{event.location}</Text>
        </View>

        {/* 날짜/시간 */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.infoText}>
            {event.date ? formatDateWithoutYear(event.date) : '날짜 없음'} {event.time || '시간 없음'}
          </Text>
        </View>
      </View>

      {/* 거리/페이스 통계 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{event.distance ? `${event.distance}km` : '5km'}</Text>
        </View>
        <View style={styles.dividerContainer}>
          <View style={styles.statDivider} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{event.pace || '6:00-7:00'}</Text>
        </View>
      </View>

      {/* 태그들 */}
      {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
        <View style={styles.tagsContainer}>
          {parseHashtags(event.hashtags).map((hashtag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{hashtag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 하단 정보 */}
      <View style={styles.footer}>
        <View style={styles.organizerInfo}>
          <View style={styles.organizerAvatar}>
            {event.organizerImage && !event.organizerImage.startsWith('file://') ? (
              <Image 
                source={{ uri: event.organizerImage }} 
                style={styles.organizerAvatarImage}
              />
            ) : (
              <Ionicons name="person" size={14} color="#ffffff" />
            )}
          </View>
          <Text style={styles.organizerName}>
            {event.organizer || '호스트'}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {isEnded ? (
            isEvaluationCompleted ? (
              <View style={styles.completedSection}>
                <View style={[styles.evaluationCompletedButton, styles.evaluationCompletedButtonBright]}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.evaluationCompletedButtonText}>러닝매너 작성완료</Text>
                </View>
                <TouchableOpacity 
                  style={styles.shareButton}
                  onPress={() => handleSharePress(event)}
                >
                  <Ionicons name="share-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.evaluationButton}
                onPress={() => handleEvaluationPress(event)}
              >
                <Ionicons name="heart" size={16} color="#000000" />
                <Text style={styles.evaluationButtonText}>러닝매너 작성하기</Text>
              </TouchableOpacity>
            )
          ) : (
            // 일반 모임일 때는 참여자 정보 표시
            <View style={styles.rightInfoRow}>
              <TouchableOpacity style={styles.shareMeetingLinkButton} onPress={handleShareMeetingLink}>
                <Text style={styles.shareMeetingLinkButtonText}>모임공유</Text>
              </TouchableOpacity>
              {(event.participants || event.maxParticipants) && (
                <Text style={styles.participantInfo}>
                  참여자 {Array.isArray(event.participants) ? event.participants.length : (event.participants || 0)}
                  {event.maxParticipants ? `/${event.maxParticipants}` : ' (제한 없음)'}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 액션 모달 */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeActionModal}
      >
        <TouchableOpacity 
          style={styles.actionModalOverlay}
          activeOpacity={1} 
          onPress={closeActionModal}
        >
          <Animated.View
            style={[
              styles.actionModalBackdrop,
              { opacity: actionModalBackdropOpacity }
            ]}
          />
          <Animated.View
            style={[
              styles.bottomModalContainer,
              { transform: [{ translateY: actionSheetTranslateY }] }
            ]}
          >
            <View style={styles.bottomModal}>
              <TouchableOpacity 
                style={styles.bottomMenuItem} 
                onPress={handleEditAction}
              >
                <Text style={styles.bottomMenuItemText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.bottomMenuItem} 
                onPress={handleDeleteAction}
              >
                <Text style={[styles.bottomMenuItemText, styles.bottomMenuItemTextDelete]}>삭제</Text>
              </TouchableOpacity>
              <View style={styles.bottomModalSeparator} />
              <TouchableOpacity 
                style={styles.bottomMenuItem} 
                onPress={closeActionModal}
              >
                <Text style={styles.bottomMenuItemText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 공유 모달 */}
      <RunningShareModal
        visible={showShareModal}
        onClose={handleShareClose}
        workoutData={{
          distance: event.distance || 0,
          pace: event.pace || '0:00',
          duration: event.duration || 0,
          calories: event.calories || 0,
          routeCoordinates: event.routeCoordinates || []
        }}
        eventData={{
          title: event.title,
          location: event.location,
          date: event.date,
          time: event.time,
          organizer: event.organizer
        }}
        onShareComplete={handleShareComplete}
      />
    </TouchableOpacity>
  );
};

const RunningEventCreationFlow = ({ onEventCreated, onClose, editingEvent }) => {
  const { user, updateUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [eventType, setEventType] = useState(editingEvent?.type || '');
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [description, setDescription] = useState(editingEvent?.description || '');
  const [location, setLocation] = useState(editingEvent?.location || '');
  const [date, setDate] = useState(() => {
    if (editingEvent?.date) {
      return new Date(editingEvent.date);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [dateString, setDateString] = useState(() => {
    if (editingEvent?.date) {
      return editingEvent.date;
    }
    // 기본값: 내일 날짜를 ISO 문자열로 설정
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    if (editingEvent?.time) {
      // 기존 시간 문자열을 Date 객체로 변환
      const [ampm, timeStr] = editingEvent.time.split(' ');
      const [hour, minute] = timeStr.split(':');
      const date = new Date();
      let hour24 = parseInt(hour);
      if (ampm === '오후' && hour24 !== 12) hour24 += 12;
      if (ampm === '오전' && hour24 === 12) hour24 = 0;
      date.setHours(hour24, parseInt(minute), 0, 0);
      return date;
    }
    // 기본값: 오전 9시
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    return defaultTime;
  });
  const [timeString, setTimeString] = useState(() => {
    if (editingEvent?.time) {
      return editingEvent.time;
    }
    // 기본값: 오전 12시
    return '오전 12:00';
  });
  const [distance, setDistance] = useState(editingEvent?.distance || '');
  const [minPace, setMinPace] = useState(() => {
    if (editingEvent?.pace && editingEvent.pace.includes(' - ')) {
      return editingEvent.pace.split(' - ')[0];
    }
    return editingEvent?.minPace || '';
  });
  const [maxPace, setMaxPace] = useState(() => {
    if (editingEvent?.pace && editingEvent.pace.includes(' - ')) {
      return editingEvent.pace.split(' - ')[1];
    }
    return editingEvent?.maxPace || '';
  });
  const [difficulty, setDifficulty] = useState(editingEvent?.difficulty || '');
  const [isPublic, setIsPublic] = useState(editingEvent?.isPublic || true); // 기본값을 true로 변경
  const [hashtags, setHashtags] = useState(editingEvent?.hashtags || '');
  const [maxParticipants, setMaxParticipants] = useState(() => {
    if (editingEvent?.maxParticipants) {
      return editingEvent.maxParticipants.toString();
    }
    return '';
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // 장소 선택 관련 상태
  const [selectedLocationType, setSelectedLocationType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  // 기본 위치: 서울 중심 (서울시청) - GPS 위치 가져오기 실패 시 사용
  const [selectedLocationData, setSelectedLocationData] = useState({
    name: '서울시청',
    lat: 37.5665,
    lng: 126.9780,
    address: '',
  });
  const [isLocationInitialized, setIsLocationInitialized] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false); // 드롭다운 표시 상태
  // 검색 관련 state
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [showLocationSearchResults, setShowLocationSearchResults] = useState(false);
  
  // 모달 오버레이 페이드 애니메이션
  const datePickerModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const timePickerModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  
  // 커스텀 마커 관련 상태
  const [customLocation, setCustomLocation] = useState('');
  const [hasCustomMarker, setHasCustomMarker] = useState(false);
  const [customMarkerCoords, setCustomMarkerCoords] = useState(null);
  
  // GPS 현재 위치 저장 (현재 위치 버튼용)
  const [gpsLocation, setGpsLocation] = useState(null);
  const mapWebViewRef = useRef(null);
  const isInlineMapLoadedRef = useRef(false);
  const pendingMapMoveRef = useRef(null);
  const hasUserSelectedLocationRef = useRef(false);
  
  const scrollViewRef = useRef(null);
  const titleInputRef = useRef(null);
  const customLocationInputRef = useRef(null);
  const [inputLayout, setInputLayout] = useState(null);
  const [customLocationInputLayout, setCustomLocationInputLayout] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const restrictedDescriptionPatterns = [
    {
      type: '운동 지도 행태',
      regex: /(운동\s*지도\s*행태|운동지도행태|개인\s*레슨|레슨\s*제공|pt\s*제공|트레이닝\s*지도|코칭\s*제공)/i,
    },
    {
      type: '금전 요구',
      regex: /(금전\s*요구|현금\s*요구|돈\s*요구|입금\s*요청|송금\s*요청|계좌\s*이체|수강료|레슨비|유료\s*지도|별도\s*비용)/i,
    },
  ];

  const getRestrictedDescriptionType = (text) => {
    if (!text || !text.trim()) {
      return null;
    }

    const matchedPattern = restrictedDescriptionPatterns.find(({ regex }) => regex.test(text));
    return matchedPattern?.type || null;
  };

  // 사용자 프로필 정보 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await firestoreService.getUserProfile(user.uid);
          
          if (profile) {
            setUserProfile(profile);
          } else {
            console.error('❌ 사용자 프로필 로드 실패 - profile이 null');
          }
        } catch (error) {
          console.error('❌ 사용자 프로필 로드 실패:', error);
        }
      } else {
      }
    };

    fetchUserProfile();
  }, [user?.uid]);

  // 현재 위치 가져오기 (편집 모드가 아닐 때만)
  useEffect(() => {
    const getCurrentLocation = async () => {
      // 편집 모드이거나 이미 초기화된 경우 스킵
      if (editingEvent || isLocationInitialized) {
        return;
      }

      try {
        // 위치 권한 요청
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          // 현재 위치 가져오기
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              timeout: 10000, // 10초 타임아웃
            });

            if (location && location.coords) {
              // 검색 결과 선택이 이미 완료되었다면 자동 GPS 반영을 건너뜀
              if (hasUserSelectedLocationRef.current) {
                setIsLocationInitialized(true);
                return;
              }

              const coords = {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              };
              setSelectedLocationData({
                name: '',
                ...coords,
                address: '',
              });
              // GPS 위치 별도 저장 (현재 위치 버튼용)
              setGpsLocation(coords);
              setIsLocationInitialized(true);
              return;
            }
          } catch (locationError) {
            console.log('현재 위치 가져오기 실패 (네트워크/타임아웃):', locationError);
            // 네트워크 문제나 타임아웃 시 기본 위치 사용
          }
        } else {
          console.log('위치 권한이 거부됨');
          // 권한 거부 시 기본 위치 사용
        }
      } catch (error) {
        console.log('위치 권한 요청 실패:', error);
        // 에러 발생 시 기본 위치 사용
      }

      // 권한 거부, 네트워크 문제, 또는 에러 발생 시 기본 위치(서울시청) 사용
      if (hasUserSelectedLocationRef.current) {
        setIsLocationInitialized(true);
        return;
      }

      setSelectedLocationData({
        name: '서울시청',
        lat: 37.5665,
        lng: 126.9780,
        address: '',
      });
      setIsLocationInitialized(true);
    };

    getCurrentLocation();
  }, [editingEvent, isLocationInitialized]);



  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
  
      
      // 키보드가 나타나면 자동으로 스크롤
      if (scrollViewRef.current) {
        setTimeout(() => {
          if (currentStep === 1) {
            // 1단계: 모임 제목 입력칸으로 스크롤
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                y: 300,
                animated: true,
              });
            }
          } else if (currentStep === 2) {
            // 2단계: 현재 포커스된 입력칸 확인
            const focusedInput = customLocationInputRef.current?.isFocused();
            if (focusedInput && scrollViewRef.current) {
              // 상세 위치 입력칸이 포커스된 경우
              const keyboardHeight = event.endCoordinates.height;
              const scrollY = 550; // 더 큰 지도를 고려한 상세 위치 입력칸이 키보드 위에 잘 보이는 고정 위치
  
              scrollViewRef.current.scrollTo({
                y: scrollY,
                animated: true,
              });
            }
          }
        }, 100);
      }
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [currentStep, hasCustomMarker]);

  // 편집 모드 초기화
  useEffect(() => {
    if (editingEvent) {
      // 편집 모드에서는 위치 초기화를 스킵하도록 플래그 설정
      setIsLocationInitialized(true);
      
      // 장소 관련 데이터 초기화
      if (editingEvent.location) {
        // 검색으로 선택된 장소 또는 기타 장소
        setSelectedLocation('custom');
        setLocationSearchQuery(editingEvent.location);
        // customMarkerCoords가 있으면 사용, 없으면 기본 좌표 설정
        if (editingEvent.customMarkerCoords) {
          setSelectedLocationData({
            name: editingEvent.location,
            lat: editingEvent.customMarkerCoords.lat,
            lng: editingEvent.customMarkerCoords.lng,
            address: '',
          });
        }
      }
      
      // 상세 위치 관련 데이터 초기화
      if (editingEvent.customLocation) {
        setCustomLocation(editingEvent.customLocation);
        setHasCustomMarker(true);
      }
      
      if (editingEvent.customMarkerCoords) {
        setCustomMarkerCoords(editingEvent.customMarkerCoords);
        setHasCustomMarker(true);
      }
    } else {
      // 편집 모드가 아닐 때는 위치 초기화 플래그 리셋
      setIsLocationInitialized(false);
    }
  }, [editingEvent]);

  // 커스텀 마커 상태 변경 감지
  useEffect(() => {

    
    // 상세 위치 입력칸이 나타나면 자동으로 스크롤
    if (hasCustomMarker && scrollViewRef.current) {
      setTimeout(() => {
        // 상세 위치 입력칸으로 부드럽게 스크롤 (적당한 위치로)
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: 650, // 더 큰 지도와 상세 위치 입력칸이 보이는 적당한 위치
            animated: true,
          });
  
        }
      }, 500); // 입력칸이 렌더링된 후 스크롤
    }
  }, [hasCustomMarker, customMarkerCoords]);

  const handleInputFocus = () => {
    // 키보드 이벤트에서 이미 스크롤 처리하므로 여기서는 별도 처리 없음
  };

  const handleInputBlur = () => {
    // 키보드 이벤트에서 이미 스크롤 처리하므로 여기서는 별도 처리 없음
  };

  const eventTypes = [
    { name: '모닝러닝', emoji: '🌅', popular: true },
    { name: '저녁러닝', emoji: '🌃', popular: true },
    { name: 'LSD', emoji: '🏃‍♀️', popular: false },
    { name: '인터벌 훈련', emoji: '⚡', popular: false },
    { name: '슬로우 조깅', emoji: '🐌', popular: false },
    { name: '소셜 러닝', emoji: '👥', popular: false },
  ];

  const difficulties = [
    { name: '초급', description: '편안한 페이스' },
    { name: '중급', description: '적당한 강도' },
    { name: '고급', description: '높은 강도' },
  ];


  // 장소 검색 함수
  const [noSearchResults, setNoSearchResults] = useState(false);
  
  const performLocationSearch = async (query) => {
    if (!query.trim()) {
      setLocationSearchResults([]);
      setShowLocationSearchResults(false);
      setIsLocationSearching(false);
      setNoSearchResults(false);
      return;
    }

    setIsLocationSearching(true);
    setShowLocationSearchResults(true);
    setNoSearchResults(false);

    try {
      const results = await searchPlace(query, { size: 10 });
      setLocationSearchResults(results);
      
      if (results.length === 0) {
        // Alert 대신 UI에서 표시 (더 부드러운 UX)
        setNoSearchResults(true);
      }
    } catch (error) {
      console.error('장소 검색 실패:', error);
      setNoSearchResults(true);
      setLocationSearchResults([]);
    } finally {
      setIsLocationSearching(false);
    }
  };

  // 지도 이동 함수 (WebView에 postMessage로 좌표 전달)
  const moveMapToLocation = useCallback((lat, lng, addMarker = false) => {
    const movePayload = {
      type: 'moveToLocation',
      lat: lat,
      lng: lng,
      addMarker: addMarker
    };

    if (!mapWebViewRef.current || !isInlineMapLoadedRef.current) {
      pendingMapMoveRef.current = movePayload;
      return;
    }

    mapWebViewRef.current.postMessage(JSON.stringify(movePayload));
  }, []);

  // 현재 GPS 위치로 이동
  const moveToCurrentLocation = useCallback(async () => {
    if (gpsLocation) {
      // 저장된 GPS 위치로 이동
      moveMapToLocation(gpsLocation.lat, gpsLocation.lng, false);
    } else {
      // GPS 위치가 없으면 새로 가져오기
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 10000,
          });
          if (location && location.coords) {
            const coords = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            };
            setGpsLocation(coords);
            moveMapToLocation(coords.lat, coords.lng, false);
          }
        }
      } catch (error) {
        console.log('현재 위치 가져오기 실패:', error);
        Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
      }
    }
  }, [gpsLocation, moveMapToLocation]);

  // 검색 결과 선택 핸들러
  const handleLocationSearchResultSelect = (result) => {
    const locationName = result.place_name || result.name;
    const locationLat = parseFloat(result.y || result.lat);
    const locationLng = parseFloat(result.x || result.lng);

    // 사용자가 검색 결과를 직접 선택한 이후에는
    // 비동기 현재위치 초기화가 선택 좌표를 덮어쓰지 않도록 플래그 설정
    hasUserSelectedLocationRef.current = true;
    setIsLocationInitialized(true);
    
    // 선택된 장소 정보 저장
    setLocation(locationName);
    const newSelectedLocationData = {
      name: locationName,
      lat: locationLat,
      lng: locationLng,
      address: result.address_name || result.road_address_name || '',
    };
    // 새 검색 결과로 WebView가 재로딩되므로 로딩 완료 신호 전까지 이동 명령을 큐에 보관
    isInlineMapLoadedRef.current = false;
    setSelectedLocationData(newSelectedLocationData);
    setSelectedLocation('custom'); // 커스텀 위치로 설정
    setLocationSearchQuery(locationName);
    setShowLocationSearchResults(false);
    
    // 검색 결과 선택 시에는 빨간 마커(상세 위치 마커)를 설정하지 않음
    // 지도 클릭 시에만 빨간 마커가 나타나도록 함
    // 기존 커스텀 마커 초기화 (검색 결과 선택 시에는 노란 마커만 표시)
    setCustomMarkerCoords(null);
    setHasCustomMarker(false);
    setCustomLocation(''); // 상세 위치 설명도 초기화
    
    // 이동 명령은 WebView 로딩 완료(inlineMapLoaded) 시점에 자동 실행됨
    moveMapToLocation(locationLat, locationLng, true); // addMarker: true = 노란 마커 표시
  };

  // Debounce를 통한 자동 검색
  useEffect(() => {
    if (!locationSearchQuery.trim()) {
      setLocationSearchResults([]);
      setShowLocationSearchResults(false);
      setIsLocationSearching(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performLocationSearch(locationSearchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [locationSearchQuery]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return eventType && title.trim();
      case 2: return hasCustomMarker && customLocation.trim() && dateString && timeString;
      case 3: return distance && minPace && maxPace && difficulty;
      case 4: return maxParticipants && parseInt(maxParticipants, 10) >= 2; // 최소 2명(호스트 포함)부터 설정
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      const restrictedType = getRestrictedDescriptionType(description);
      if (restrictedType) {
        Alert.alert(
          '⚠️ 경고',
          `모임설명에 ${restrictedType} 관련 내용이 포함되어 있습니다.\n해당 내용은 작성할 수 없습니다.`,
          [{ text: '확인', style: 'default' }]
        );
        return;
      }
    }

    // 2단계에서 지도 클릭 및 상세 위치 설명 필수 체크
    if (currentStep === 2) {
      if (!hasCustomMarker) {
        Alert.alert(
          '모임장소를 정해주세요',
          '지도를 클릭하여 상세한 모임장소를 정해주세요.',
          [{ text: '확인', style: 'default' }]
        );
        return;
      }
      
      if (!customLocation.trim()) {
        Alert.alert(
          '상세 위치 설명을 입력해주세요',
          '지도에 표시한 빨간 마커의 구체적인 위치를 설명해주세요.',
          [{ text: '확인', style: 'default' }]
        );
        return;
      }
    }
    
    if (canProceed()) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleCreateEvent();
      }
    } else {
      // 다른 단계에서도 유효성 검사 실패 시 얼러트 표시
      if (currentStep === 1) {
        Alert.alert(
          '⚠️ 입력 필요',
          '러닝 유형과 모임 제목을 입력해주세요.',
          [{ text: '확인', style: 'default' }]
        );
      } else if (currentStep === 3) {
        Alert.alert(
          '⚠️ 입력 필요',
          '거리, 페이스, 난이도를 모두 입력해주세요.',
          [{ text: '확인', style: 'default' }]
        );
      } else if (currentStep === 4) {
        Alert.alert(
          '⚠️ 입력 필요',
          '최대 참여 인원을 입력해주세요. (최소 2명)',
          [{ text: '확인', style: 'default' }]
        );
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const handleCreateEvent = async () => {

    // 현재 사용자의 프로필 정보를 직접 가져오기
    let currentUserProfileData = null;
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        currentUserProfileData = userSnap.data();
      }
    } catch (error) {
      console.error('❌ 현재 사용자 프로필 데이터 가져오기 실패:', error);
    }

    // 사용자 프로필에서 닉네임과 이미지 가져오기
    const organizerName = currentUserProfileData?.profile?.nickname || user?.displayName || userProfile?.profile?.nickname || user?.email?.split('@')[0] || '나';
    const organizerImageCandidates = [
      currentUserProfileData?.profileImage,
      currentUserProfileData?.profile?.profileImage,
      user?.photoURL,
      userProfile?.profileImage,
      userProfile?.profile?.profileImage
    ];
    let organizerImage = organizerImageCandidates.find(
      (url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('file://'))
    ) || null;
    
    // 이미지가 로컬 파일 경로인 경우 Firebase Storage에 업로드
    if (organizerImage && organizerImage.startsWith('file://')) {
      try {
        const imageFile = {
          uri: organizerImage,
          name: 'profile.jpg',
          type: 'image/jpeg'
        };
        
        const uploadResult = await storageService.uploadProfileImage(user.uid, imageFile);
        if (uploadResult.success) {
          organizerImage = uploadResult.url;
        } else {
          console.error('❌ 이미지 업로드 실패:', uploadResult.error);
          // 업로드 실패 시 기존 이미지 사용
        }
      } catch (error) {
        console.error('❌ 이미지 업로드 중 오류:', error);
        // 오류 발생 시 기존 이미지 사용
      }
    }
    
    // 최종 값 설정
    const finalOrganizerName = organizerName;
    const finalOrganizerImage = organizerImage;

    // 모임 카드와 프로필 화면의 이미지 소스 불일치를 막기 위해 사용자 프로필에도 동기화
    if (typeof finalOrganizerImage === 'string' && finalOrganizerImage.startsWith('http')) {
      try {
        await updateUserProfile({ profileImage: finalOrganizerImage });
      } catch (profileSyncError) {
        console.warn('⚠️ organizerImage 프로필 동기화 실패:', profileSyncError?.message || profileSyncError);
      }
    }
    
    
    // location 필드 검증 및 설정
    // hasCustomMarker와 customLocation이 있으면 location은 선택 사항
    let finalLocation = location && location.trim() ? location.trim() : (selectedLocationData?.name || '');
    
    // 장소 검색 없이 지도에서 직접 위치를 설정한 경우
    if (!finalLocation && hasCustomMarker && customMarkerCoords) {
      // customLocation을 location으로 사용하거나, 기본값 설정
      finalLocation = customLocation.trim() || '지도에서 선택한 위치';
    }
    
    // 최종 검증: hasCustomMarker와 customLocation이 필수
    if (!hasCustomMarker || !customMarkerCoords) {
      Alert.alert('모임장소를 정해주세요', '지도를 클릭하여 상세한 모임장소를 정해주세요.');
      return;
    }
    
    if (!customLocation.trim()) {
      Alert.alert('상세 위치 설명을 입력해주세요', '지도에 표시한 빨간 마커의 구체적인 위치를 설명해주세요.');
      return;
    }

    // 디버깅: 저장 전 데이터 확인
    console.log('📝 모임 생성 데이터 확인:', {
      location: finalLocation,
      locationState: location,
      selectedLocationData: selectedLocationData,
      customMarkerCoords: customMarkerCoords,
      customLocation: customLocation
    });
    
    const newEvent = {
      type: eventType,
      title: title.trim(),
      description: description.trim() || null, // 모임설명 추가
      location: finalLocation, // 검색으로 선택한 장소명 사용
      date: dateString,
      time: timeString,
      distance,
      pace: `${minPace} - ${maxPace}`,
      difficulty,
      isPublic,
      hashtags: hashtags.trim(),
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      customMarkerCoords: customMarkerCoords, // 커스텀 마커 좌표 추가
      customLocation: customLocation.trim() || null, // 사용자가 입력한 상세 위치 설명
      organizer: finalOrganizerName, // 실제 사용자 정보를 호스트로 설정
      organizerImage: finalOrganizerImage, // 생성자 프로필 이미지 추가
      createdBy: user?.uid, // 모임 생성자 UID 추가
    };

    console.log('📤 onEventCreated 호출, location:', newEvent.location);
    
    // 모임 장소 기록 저장 (마이 대시보드용)
    if (user?.uid && finalLocation) {
      recordMeetingLocation(user.uid, {
        location: finalLocation,
        customLocation: customLocation.trim() || null
      }).catch(error => {
        console.warn('⚠️ 모임 장소 기록 저장 실패:', error);
      });
    }
    
    onEventCreated(newEvent);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '날짜 선택';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '내일';
    } else {
      return `${date.getMonth() + 1}월 ${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
    }
  };

  const handleDateChange = React.useCallback((event, selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      setDateString(dateStr);
    }
  }, []);

  const handleDatePickerConfirm = React.useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleDatePickerCancel = React.useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleTimeChange = React.useCallback((event, selectedTime) => {
    if (selectedTime) {
      setTime(selectedTime);
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? '오후' : '오전';
      const displayHours = hours % 12 || 12;
      const formattedTime = `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
      setTimeString(formattedTime);
    }
  }, []);

  const handleTimePickerConfirm = React.useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimePickerCancel = React.useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const formatTime = (timeString) => {
    return timeString || '시간 선택';
  };

  const formatPaceInput = (value, previousValue) => {
    // 사용자가 삭제하고 있는지 확인 (이전 값보다 길이가 짧아졌는지)
    const isDeleting = previousValue && value.length < previousValue.length;
    
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    if (numbers.length === 0) return '';
    
    // 5자리 이상 숫자는 입력 제한 (비현실적인 페이스)
    if (numbers.length >= 5) {
      return previousValue || '';
    }
    
    // 6001 이상의 숫자는 입력 제한 (100분 1초 이상은 비현실적)
    const numericValue = parseInt(numbers);
    if (numericValue >= 6001) {
      return previousValue || '';
    }
    
    // 이미 올바른 포맷팅된 형태라면 그대로 반환 (예: 5'30", 10'15")
    if (/^\d+'\d+"$/.test(value)) {
      return value;
    }
    
    // 삭제 중인 경우 자동 포맷팅 방지
    if (isDeleting) {
      // 사용자가 의도적으로 삭제하고 있으므로 현재 값을 그대로 반환
      return value;
    }
    
    // 3자리 또는 4자리 숫자인 경우에만 자동 포맷팅
    if (numbers.length === 3) {
      // 540 -> 5'40"
      const minutes = numbers.charAt(0);
      const seconds = numbers.slice(1);
      
      // 초가 59를 초과하면 59로 제한
      const secondsNum = parseInt(seconds);
      const validSeconds = secondsNum > 59 ? '59' : seconds.padStart(2, '0');
      
      return `${minutes}'${validSeconds}"`;
    } else if (numbers.length === 4) {
      // 1010 -> 10'10"
      const minutes = numbers.slice(0, 2);
      const seconds = numbers.slice(2);
      
      // 분이 99를 초과하면 99로 제한
      const minutesNum = parseInt(minutes);
      const validMinutes = minutesNum > 99 ? '99' : minutes;
      
      // 초가 59를 초과하면 59로 제한
      const secondsNum = parseInt(seconds);
      const validSeconds = secondsNum > 59 ? '59' : seconds.padStart(2, '0');
      
      return `${validMinutes}'${validSeconds}"`;
    }
    
    // 그 외의 경우는 원본 반환
    return value;
  };

  // 페이스를 초 단위로 변환하는 함수
  const paceToSeconds = (pace) => {
    if (!pace || !pace.includes("'") || !pace.includes('"')) return 0;
    
    const match = pace.match(/(\d+)'(\d+)"/);
    if (!match) return 0;
    
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    return minutes * 60 + seconds;
  };

  // 페이스 유효성 검사 함수
  const validatePaces = (minPaceValue, maxPaceValue) => {
    if (!minPaceValue || !maxPaceValue) return true; // 둘 중 하나라도 비어있으면 검사하지 않음
    
    const minSeconds = paceToSeconds(minPaceValue);
    const maxSeconds = paceToSeconds(maxPaceValue);
    
    if (minSeconds > 0 && maxSeconds > 0 && minSeconds > maxSeconds) {
      Alert.alert(
        '페이스 입력 오류',
        '최대빠르기는 최소빠르기보다 빨라야 합니다.\n(더 작은 숫자가 더 빠른 페이스입니다)',
        [{ text: '확인' }]
      );
      return false;
    }
    return true;
  };

  const handleMinPaceChange = (value) => {
    const formatted = formatPaceInput(value, minPace);
    setMinPace(formatted);
    
    // 포맷팅이 완료된 경우에만 유효성 검사
    if (formatted.includes("'") && formatted.includes('"')) {
      validatePaces(formatted, maxPace);
    }
  };

  const handleMaxPaceChange = (value) => {
    const formatted = formatPaceInput(value, maxPace);
    setMaxPace(formatted);
    
    // 포맷팅이 완료된 경우에만 유효성 검사
    if (formatted.includes("'") && formatted.includes('"')) {
      validatePaces(minPace, formatted);
    }
  };

  // 커스텀 마커 변경 핸들러
  const handleCustomMarkerChange = useCallback((hasMarker, coords) => {
    setHasCustomMarker(hasMarker);
    setCustomMarkerCoords(coords);
  }, []);

  // 장소 선택 렌더링 (인라인 드롭다운 방식)
  const renderLocationSelection = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>장소 선택</Text>
      
      {/* 1단계: 장소 유형 선택 */}
      {/* 장소 검색바 */}
      <View style={styles.locationSearchContainer}>
        <Ionicons name="search" size={20} color={COLORS.SECONDARY} style={styles.locationSearchIcon} />
        <TextInput
          style={styles.locationSearchInput}
          placeholder="장소 키워드 입력 (예: 여의도, 해운대, 석촌호수 등)"
          placeholderTextColor={COLORS.SECONDARY}
          value={locationSearchQuery}
          onChangeText={setLocationSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setShowLocationSearchResults(true)}
          onBlur={() => {
            // 약간의 지연 후 드롭다운 닫기 (선택 이벤트가 먼저 발생하도록)
            setTimeout(() => setShowLocationSearchResults(false), 200);
          }}
        />
        {isLocationSearching && (
          <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.locationSearchLoading} />
        )}
        {locationSearchQuery.length > 0 && !isLocationSearching && (
        <TouchableOpacity
          onPress={() => {
              setLocationSearchQuery('');
              setLocationSearchResults([]);
              setShowLocationSearchResults(false);
            }}
            style={styles.locationSearchClearButton}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
        </TouchableOpacity>
        )}
      </View>

      {/* 검색 결과 리스트 */}
      {showLocationSearchResults && locationSearchResults.length > 0 && (
        <View style={styles.locationSearchResultsDropdown}>
          <ScrollView style={styles.locationSearchResultsList}>
            {locationSearchResults.map((result, index) => (
          <TouchableOpacity
                key={index}
                style={styles.locationSearchResultItem}
                onPress={() => handleLocationSearchResultSelect(result)}
              >
            <Ionicons 
                  name="location"
              size={20} 
                  color={COLORS.PRIMARY}
                  style={styles.locationSearchResultIcon}
                />
                <View style={styles.locationSearchResultContent}>
                  <Text style={styles.locationSearchResultTitle}>
                    {result.place_name || result.name}
                  </Text>
                  <Text style={styles.locationSearchResultSubtitle} numberOfLines={1}>
                    {result.address_name || result.road_address_name || ''}
                  </Text>
                  {result.category_name && (
                    <Text style={styles.locationSearchResultCategory}>{result.category_name}</Text>
                  )}
                </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
        </View>
      )}

      {/* 검색 결과 없음 표시 */}
      {showLocationSearchResults && noSearchResults && locationSearchResults.length === 0 && !isLocationSearching && (
        <View style={styles.noSearchResultsContainer}>
          <Ionicons name="search-outline" size={24} color={COLORS.SECONDARY} />
          <Text style={styles.noSearchResultsText}>검색 결과가 없습니다</Text>
          <Text style={styles.noSearchResultsSubtext}>다른 키워드로 검색해 보세요</Text>
        </View>
      )}

      {/* 3단계: 선택된 장소 정보 및 지도 */}
      <View style={styles.selectedLocationSection}>
        
        {/* 카카오맵 표시 - 상태 변경 격리 */}
        {memoizedInlineMap}
          
          {/* 상세 위치 입력칸 */}
          {hasCustomMarker && (
            <View style={[styles.customLocationInputGroup]}>
              <View style={styles.customLocationHeader}>
                <Ionicons name="location" size={16} color="#3AF8FF" />
                <Text style={styles.customLocationLabel}>상세 위치 설명</Text>
                <View style={styles.customMarkerIndicator}>
                  <Text style={styles.customMarkerIndicatorText}>📍 빨간 마커</Text>
                </View>
              </View>
              <TextInput
                ref={customLocationInputRef}
                style={styles.customLocationInput}
                value={customLocation}
                onChangeText={(text) => {
                  setCustomLocation(text);
                }}
                placeholder="예: 뚝섬한강공원 2번 출입구 근처"
                placeholderTextColor="#666666"
                returnKeyType="done"
                blurOnSubmit={true}
                multiline={true}
                numberOfLines={2}
                onFocus={() => {
                  // 키보드가 나타나면 자동으로 스크롤
                  if (scrollViewRef.current) {
                    setTimeout(() => {
                      // 상세 위치 입력칸이 키보드 위에 보이도록 스크롤
                      const scrollY = 450; // 더 큰 지도를 고려한 상세 위치 입력칸이 키보드 위에 잘 보이는 위치
                      if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({
                          y: scrollY,
                          animated: true,
                        });
                      }
                    }, 300); // 키보드 애니메이션 후 스크롤
                  }
                }}
                onLayout={(event) => {
                  const layout = event.nativeEvent.layout;
                  setCustomLocationInputLayout(layout);
                }}
              />
              <Text style={styles.customLocationHint}>
                지도에 표시한 빨간 마커의 구체적인 위치를 설명해주세요
              </Text>
            </View>
          )}
        </View>
    </View>
  );

  // 모달 애니메이션 효과
  useEffect(() => {
    if (showDatePicker) {
      Animated.timing(datePickerModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(datePickerModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showDatePicker, datePickerModalBackdropOpacity]);

  useEffect(() => {
    if (showTimePicker) {
      Animated.timing(timePickerModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(timePickerModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showTimePicker, timePickerModalBackdropOpacity]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleOutsideClick = () => {
      if (showLocationDropdown) {
        setShowLocationDropdown(false);
      }
    };
    
    // 키보드 이벤트 처리
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', handleOutsideClick);
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      // 키보드가 사라질 때 WebView가 다시 로드되는 것을 방지하기 위한 처리
      // 상태는 그대로 유지
    });
    
    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [showLocationDropdown]);

  // 인라인 카카오맵 컴포넌트를 별도로 분리하여 격리
  const InlineKakaoMapComponent = React.memo(({ selectedLocation, onCustomMarkerChange, initialCustomMarkerCoords, mapWebViewRef, onCurrentLocationPress }) => {
    // WebView 재렌더링 방지를 위한 안정적인 key 생성
    const stableKey = React.useMemo(() => {
      if (!selectedLocation) return 'no-location-no-boundary-v24';
      return `${selectedLocation.id || 'custom'}-${selectedLocation.name}-no-boundary-v24`;
    }, [selectedLocation?.id, selectedLocation?.name]);

    if (!selectedLocation) return null;

    // 선택된 장소의 카카오맵 HTML 생성
    const createInlineMapHTML = React.useCallback(() => {
      // TestFlight에서 API 키 로딩 상태 확인
      const kakaoApiKey = ENV.kakaoMapApiKey;
      if (!__DEV__) {

      }
      
      // 마커 색상 결정 (검색으로 선택한 장소는 노란색)
      const markerColor = '#FFD700';
      
      // selectedLocation 값들을 변수로 추출 (템플릿 문자열에서 사용)
      const locationName = selectedLocation?.name || '';
      const locationLat = selectedLocation?.lat || 37.5665;
      const locationLng = selectedLocation?.lng || 126.9780;
      const customMarkerLat = initialCustomMarkerCoords?.lat || null;
      const customMarkerLng = initialCustomMarkerCoords?.lng || null;
      const hasCustomMarkerValue = initialCustomMarkerCoords ? true : false;
      // 현재 위치는 selectedLocationData에 저장되어 있음 (GPS 위치 또는 기본 위치)
      const currentLocationLat = selectedLocation?.lat || 37.5665;
      const currentLocationLng = selectedLocation?.lng || 126.9780;
      // 현재 위치가 GPS 위치인지 확인 (name이 비어있으면 GPS 위치)
      const isCurrentLocationGPS = !selectedLocation?.name || selectedLocation.name === '';
      
      return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

            <title>${locationName || '위치'} 위치</title>
            <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${ENV.kakaoMapApiKey}"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    background: #171719; 
                    overflow: hidden; 
                    height: 300px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                #map { 
                    width: 100%; 
                    height: 300px; 
                    border: none;
                }
                
                /* 카카오맵 기본 InfoWindow 완전히 숨기기 */
                div[style*="background"] {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                
                /* 모든 InfoWindow 관련 기본 스타일 제거 */
                .infowindow,
                .info-window-container,
                [class*="infowindow"],
                [class*="InfoWindow"] {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                
                /* 홈화면과 동일한 정보창 스타일 */
                .info-window {
                    background: #171719 !important;
                    color: #ffffff !important;
                    padding: 6px 10px !important;
                    border-radius: 4px !important;
                    border: 1px solid #333333 !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                    margin: 0 !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                    display: inline-block !important;
                    margin-top: -5px !important;
                }
                
                .diagonal-info {
                    transform: translate(70px, 5px) !important;
                }
                
                /* 커스텀 마커 정보창 스타일 */
                .custom-info-window {
                    background: #171719 !important;
                    color: #3AF8FF !important;
                    padding: 6px 10px !important;
                    border-radius: 4px !important;
                    border: 1px solid #3AF8FF !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                    margin: 0 !important;
                    box-shadow: 0 2px 8px rgba(58, 248, 255, 0.3) !important;
                    display: inline-block !important;
                    margin-top: -5px !important;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            
            <script>
                var map;
                var customMarker = null;
                var customInfoWindow = null;
                var currentLocationMarker = null;
                var currentMapCenter = null;
                var currentMapLevel = 4;
                

                
                function waitForKakaoSDK() {
                    if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
                        setTimeout(waitForKakaoSDK, 100);
                        return;
                    }
                    initializeMap();
                }
                
                function initializeMap() {
                    try {
                        var mapContainer = document.getElementById('map');
                        
                        // 지도 중심 설정 (커스텀 마커가 있으면 그 위치 중심으로)
                        var mapCenter, mapLevel = 4;
                        var hasCustomMarker = ${hasCustomMarkerValue};
                        
                        if (hasCustomMarker) {
                            // 커스텀 마커가 있으면 그 위치를 중심으로
                            mapCenter = new kakao.maps.LatLng(${customMarkerLat || locationLat}, ${customMarkerLng || locationLng});
                        } else {
                            // 기본 장소를 중심으로
                            mapCenter = new kakao.maps.LatLng(${locationLat}, ${locationLng});
                        }
                        
                        var mapOption = {
                            center: mapCenter,
                            level: mapLevel,
                            disableDoubleClick: false,
                            disableDoubleClickZoom: false
                        };
                        
                        map = new kakao.maps.Map(mapContainer, mapOption);
                        map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
                        
                        // 현재 지도 상태 저장
                        currentMapCenter = map.getCenter();
                        currentMapLevel = map.getLevel();
                        
                        // 기본 장소 마커 위치
                        var markerPosition = new kakao.maps.LatLng(${locationLat}, ${locationLng});
                        
                        // 기본 마커 이미지 생성
                        var svgString = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="${markerColor}"/>' +
                            '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                            '<circle cx="12" cy="12" r="3" fill="${markerColor}"/>' +
                            '</svg>';
                        
                        var markerImageSrc = 'data:image/svg+xml;base64,' + btoa(svgString);
                        var markerImageSize = new kakao.maps.Size(24, 30);
                        var markerImageOffset = new kakao.maps.Point(12, 30);
                        
                        var markerImage = new kakao.maps.MarkerImage(
                            markerImageSrc,
                            markerImageSize,
                            { offset: markerImageOffset }
                        );
                        
                        // 기본 마커 생성
                        var marker = new kakao.maps.Marker({
                            position: markerPosition,
                            image: markerImage,
                            map: map
                        });
                        
                        // 기본 정보창 생성 (홈화면과 동일한 스타일)
                        // 기본 위치(서울시청)일 때만 푯말 표시, GPS 위치일 때는 표시하지 않음
                        var infoWindowContent = '';
                        var locationNameValue = '${locationName}';
                        if (locationNameValue && locationNameValue.trim() !== '') {
                            infoWindowContent = '<div class="info-window">' + locationNameValue + '</div>';
                        }
                        var infoWindow = null;
                        if (infoWindowContent) {
                            infoWindow = new kakao.maps.InfoWindow({
                                content: infoWindowContent,
                                removable: false,
                                yAnchor: 1.0
                            });
                            // 정보창 자동 표시
                            infoWindow.open(map, marker);
                        }
                        
                        // 기본 마커 클릭 이벤트
                        if (infoWindow) {
                            kakao.maps.event.addListener(marker, 'click', function() {
                                if (infoWindow.getMap()) {
                                    infoWindow.close();
                                } else {
                                    infoWindow.open(map, marker);
                                }
                            });
                        }
                        
                        // 현재 위치 마커 생성 (GPS 위치일 때만 표시) - SVG 사용
                        var isCurrentLocationGPS = ${isCurrentLocationGPS};
                        if (isCurrentLocationGPS) {
                            var currentLocationPosition = new kakao.maps.LatLng(${currentLocationLat}, ${currentLocationLng});
                            
                            // SVG 사용 (넓은 반경의 파란색 원 + 투명도 40%)
                            var currentLocationSvg = '<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">' +
                                '<circle cx="25" cy="25" r="25" fill="#2294FF" fill-opacity="0.4"/>' +
                                '<circle cx="25" cy="25" r="10" fill="#ffffff"/>' +
                                '<circle cx="25" cy="25" r="6" fill="#2294FF"/>' +
                                '</svg>';
                            
                            var currentLocationImageSrc = 'data:image/svg+xml;base64,' + btoa(currentLocationSvg);
                            var currentLocationImageSize = new kakao.maps.Size(50, 50);
                            var currentLocationImageOffset = new kakao.maps.Point(25, 50);
                            
                            var currentLocationImage = new kakao.maps.MarkerImage(
                                currentLocationImageSrc,
                                currentLocationImageSize,
                                { offset: currentLocationImageOffset }
                            );
                            
                            currentLocationMarker = new kakao.maps.Marker({
                                position: currentLocationPosition,
                                image: currentLocationImage,
                                map: map,
                                zIndex: 500 // 기본 마커(600)와 커스텀 마커(700)보다 낮게
                            });
                        }
                        
                        // 커스텀 마커 이미지 생성 (빨간색)
                        var customSvgString = '<svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="#FF4444"/>' +
                            '<circle cx="14" cy="14" r="7" fill="#ffffff"/>' +
                            '<circle cx="14" cy="14" r="4" fill="#FF4444"/>' +
                            '</svg>';
                        
                        var customMarkerImageSrc = 'data:image/svg+xml;base64,' + btoa(customSvgString);
                        var customMarkerImageSize = new kakao.maps.Size(28, 35);
                        var customMarkerImageOffset = new kakao.maps.Point(14, 35);
                        
                        var customMarkerImage = new kakao.maps.MarkerImage(
                            customMarkerImageSrc,
                            customMarkerImageSize,
                            { offset: customMarkerImageOffset }
                        );
                        
                        // 지도 클릭 이벤트 (상세 위치 설정)
                        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
                            var latlng = mouseEvent.latLng;
                            var clickLat = latlng.getLat();
                            var clickLng = latlng.getLng();
                            
                            // 디버그 로그
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage('LOG: INFO - 지도 클릭: ' + clickLat + ', ' + clickLng);
                            }
                            
                            // 기존 커스텀 마커 제거
                            if (customMarker) {
                                customMarker.setMap(null);
                            }
                            if (customInfoWindow) {
                                customInfoWindow.close();
                            }
                            
                            // 새 커스텀 마커 생성
                            customMarker = new kakao.maps.Marker({
                                position: latlng,
                                image: customMarkerImage,
                                map: map
                            });
                            
                            // 커스텀 정보창 생성
                            var customInfoContent = '<div class="custom-info-window">상세 위치</div>';
                            customInfoWindow = new kakao.maps.InfoWindow({
                                content: customInfoContent,
                                removable: false,
                                yAnchor: 1.0
                            });
                            
                            // 커스텀 정보창 표시
                            customInfoWindow.open(map, customMarker);
                            
                            // 커스텀 마커 클릭 이벤트
                            kakao.maps.event.addListener(customMarker, 'click', function() {
                                if (customInfoWindow.getMap()) {
                                    customInfoWindow.close();
                                } else {
                                    customInfoWindow.open(map, customMarker);
                                }
                            });
                            
                            // React Native에 커스텀 마커 정보 전송
                            if (window.ReactNativeWebView) {
                                var message = 'customMarkerAdded:' + latlng.getLat() + ',' + latlng.getLng();
                                window.ReactNativeWebView.postMessage(message);
                            }
                            
                            // 현재 지도 중심과 레벨 업데이트 (재렌더링 방지용)
                            currentMapCenter = map.getCenter();
                            currentMapLevel = map.getLevel();
                        });
                        
                        // 커스텀 마커 복원 (있는 경우)
                        if (hasCustomMarker) {
                            var customLat = ${customMarkerCoords?.lat || 'null'};
                            var customLng = ${customMarkerCoords?.lng || 'null'};
                            
                            if (customLat !== null && customLng !== null && !isNaN(customLat) && !isNaN(customLng)) {
                                var customPosition = new kakao.maps.LatLng(customLat, customLng);
                                
                                customMarker = new kakao.maps.Marker({
                                    position: customPosition,
                                    image: customMarkerImage,
                                    map: map
                                });
                                
                                var customInfoContent = '<div class="custom-info-window">상세 위치</div>';
                                customInfoWindow = new kakao.maps.InfoWindow({
                                    content: customInfoContent,
                                    removable: false,
                                    yAnchor: 1.0
                                });
                                
                                customInfoWindow.open(map, customMarker);
                                
                                kakao.maps.event.addListener(customMarker, 'click', function() {
                                    if (customInfoWindow.getMap()) {
                                        customInfoWindow.close();
                                    } else {
                                        customInfoWindow.open(map, customMarker);
                                    }
                                });
                            }
                        }
                        
                        // React Native에서 보낸 메시지 처리 (지도 이동)
                        document.addEventListener('message', function(event) {
                            try {
                                var data = JSON.parse(event.data);
                                if (data.type === 'moveToLocation') {
                                    var newCenter = new kakao.maps.LatLng(data.lat, data.lng);
                                    map.setCenter(newCenter);
                                    map.setLevel(4);
                                    
                                    // 마커 추가 옵션이 있으면 커스텀 마커 추가
                                    if (data.addMarker) {
                                        // 기존 커스텀 마커 제거
                                        if (customMarker) {
                                            customMarker.setMap(null);
                                        }
                                        if (customInfoWindow) {
                                            customInfoWindow.close();
                                        }
                                        
                                        // 새 커스텀 마커 생성
                                        customMarker = new kakao.maps.Marker({
                                            position: newCenter,
                                            image: customMarkerImage,
                                            map: map,
                                            zIndex: 700
                                        });
                                        
                                        // 커스텀 인포윈도우 생성
                                        customInfoWindow = new kakao.maps.InfoWindow({
                                            content: '<div style="padding:8px 12px;font-size:12px;background:#1F1F24;color:#3AF8FF;border:1px solid #3AF8FF;border-radius:4px;white-space:nowrap;">여기서 만나요! 📍</div>',
                                            removable: true
                                        });
                                        
                                        // 마커 클릭 이벤트
                                        kakao.maps.event.addListener(customMarker, 'click', function() {
                                            if (customInfoWindow.getMap()) {
                                                customInfoWindow.close();
                                            } else {
                                                customInfoWindow.open(map, customMarker);
                                            }
                                        });
                                        
                                        // React Native에 커스텀 마커 정보 전송
                                        if (window.ReactNativeWebView) {
                                            var message = 'customMarkerAdded:' + data.lat + ',' + data.lng;
                                            window.ReactNativeWebView.postMessage(message);
                                        }
                                    }
                                    
                                    currentMapCenter = newCenter;
                                    currentMapLevel = 4;
                                }
                            } catch (e) {
                                // JSON 파싱 실패 시 무시
                            }
                        });
                        
                        // iOS용 메시지 리스너
                        window.addEventListener('message', function(event) {
                            try {
                                var data = JSON.parse(event.data);
                                if (data.type === 'moveToLocation') {
                                    var newCenter = new kakao.maps.LatLng(data.lat, data.lng);
                                    map.setCenter(newCenter);
                                    map.setLevel(4);
                                    
                                    if (data.addMarker) {
                                        if (customMarker) {
                                            customMarker.setMap(null);
                                        }
                                        if (customInfoWindow) {
                                            customInfoWindow.close();
                                        }
                                        
                                        customMarker = new kakao.maps.Marker({
                                            position: newCenter,
                                            image: customMarkerImage,
                                            map: map,
                                            zIndex: 700
                                        });
                                        
                                        customInfoWindow = new kakao.maps.InfoWindow({
                                            content: '<div style="padding:8px 12px;font-size:12px;background:#1F1F24;color:#3AF8FF;border:1px solid #3AF8FF;border-radius:4px;white-space:nowrap;">여기서 만나요! 📍</div>',
                                            removable: true
                                        });
                                        
                                        kakao.maps.event.addListener(customMarker, 'click', function() {
                                            if (customInfoWindow.getMap()) {
                                                customInfoWindow.close();
                                            } else {
                                                customInfoWindow.open(map, customMarker);
                                            }
                                        });
                                        
                                        if (window.ReactNativeWebView) {
                                            var message = 'customMarkerAdded:' + data.lat + ',' + data.lng;
                                            window.ReactNativeWebView.postMessage(message);
                                        }
                                    }
                                    
                                    currentMapCenter = newCenter;
                                    currentMapLevel = 4;
                                }
                            } catch (e) {
                                // JSON 파싱 실패 시 무시
                            }
                        });
                        
                        // 메시지 리스너 등록이 끝난 뒤 로딩 완료 신호 전송
                        // (실기기에서는 신호가 너무 빨리 오면 moveToLocation 메시지가 유실될 수 있음)
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage('inlineMapLoaded');
                        }
                        
                    } catch (error) {
                        console.error('Inline map error:', error);
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage('inlineMapError: ' + error.message);
                        }
                    }
                }
                
                // SDK 로딩 대기
                waitForKakaoSDK();
            </script>
        </body>
        </html>
      `;
    }, [selectedLocation, initialCustomMarkerCoords]);

    // 메시지 처리 함수를 useCallback으로 최적화
    const handleWebViewMessage = React.useCallback((event) => {
              const { data } = event.nativeEvent;
              
              if (data === 'inlineMapLoaded') {
        isInlineMapLoadedRef.current = true;
        if (pendingMapMoveRef.current && mapWebViewRef.current) {
          mapWebViewRef.current.postMessage(JSON.stringify(pendingMapMoveRef.current));
          pendingMapMoveRef.current = null;
        }
              } else if (data.startsWith('inlineMapError')) {
        console.error('인라인 지도 로딩 실패:', data);
              } else if (data.startsWith('customMarkerAdded:')) {
                const coords = data.replace('customMarkerAdded:', '');
                const [lat, lng] = coords.split(',');
                
                // 중복 업데이트 방지
                const newCoords = {
                  lat: parseFloat(lat),
                  lng: parseFloat(lng)
                };
                
                if (!customMarkerCoords || 
                    customMarkerCoords.lat !== newCoords.lat || 
                    customMarkerCoords.lng !== newCoords.lng) {
                  // 부모 컴포넌트에 변경 알림
                  if (onCustomMarkerChange) {
                    onCustomMarkerChange(true, newCoords);
          }
        }
      }
    }, [selectedLocation?.name, selectedLocation?.lat, selectedLocation?.lng, customMarkerCoords, onCustomMarkerChange]);

    return (
      <View style={styles.inlineMapSection}>
        <View 
          style={styles.inlineMapContainer}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={() => {}}
          onResponderRelease={() => {}}
        >
          <WebView
            ref={mapWebViewRef}
            key={stableKey}
            source={{ html: createInlineMapHTML() }}
            style={styles.inlineMapWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={false}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={false}
            onMessage={handleWebViewMessage}
            // WebView 재렌더링 최적화 설정
            cacheEnabled={true}
            incognito={false}
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
          />
          {/* 현재 위치 버튼 */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={onCurrentLocationPress}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={22} color="#3AF8FF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    // 더 엄격한 비교 조건 설정
    const locationChanged = prevProps.selectedLocation?.id !== nextProps.selectedLocation?.id ||
                           prevProps.selectedLocation?.name !== nextProps.selectedLocation?.name;
    
    // 커스텀 마커 변경은 WebView 내부에서 처리하므로 지도 재생성 조건에서 제외
    const shouldNotRerender = !locationChanged;
    

    
    return shouldNotRerender;
  });

  // 인라인 지도 컴포넌트 메모이제이션
  const memoizedInlineMap = useMemo(() => {
    if (!selectedLocationData) return null;
    
    return (
      <React.Fragment>
        <View style={styles.mapGuideSection}>
          <View style={styles.mapGuideTextContainer}>
            <Text style={styles.requiredMark}>*</Text>
            <Text style={styles.mapGuideText}>지도를 클릭하여 상세한 모임장소를 정하세요!</Text>
          </View>
        </View>
        <InlineKakaoMapComponent 
          key={`map-${selectedLocationData.id || selectedLocationData.name || 'custom'}-${selectedLocationData.lat}-${selectedLocationData.lng}`}
          selectedLocation={selectedLocationData}
          onCustomMarkerChange={handleCustomMarkerChange}
          initialCustomMarkerCoords={customMarkerCoords}
          mapWebViewRef={mapWebViewRef}
          onCurrentLocationPress={moveToCurrentLocation}
        />
      </React.Fragment>
    );
  }, [selectedLocationData, handleCustomMarkerChange, moveToCurrentLocation]);

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>어떤 러닝을 계획하고 계신가요?</Text>
      <Text style={styles.stepSubtitle}>러닝 유형을 선택해주세요</Text>
      
      <View style={styles.eventTypesGrid}>
        {eventTypes.map((type) => (
          <TouchableOpacity
            key={type.name}
            style={[
              styles.eventTypeCard,
              eventType === type.name && styles.eventTypeCardSelected,
            ]}
            onPress={() => setEventType(type.name)}
          >
            {type.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>인기</Text>
              </View>
            )}
            <Text style={styles.eventTypeEmoji}>{type.emoji}</Text>
            <Text style={styles.eventTypeName}>{type.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.inputGroup, styles.titleInputGroup]}>
                      <Text style={styles.inputLabel}>모임 제목</Text>
        <TextInput
          ref={titleInputRef}
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="예: 한강 러닝"
          placeholderTextColor="#666666"
          returnKeyType="done"
          blurOnSubmit={true}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onLayout={(event) => {
            setInputLayout(event.nativeEvent.layout);
          }}
        />
        <Text style={styles.inputHint}>다른 사람들이 쉽게 찾을 수 있는 제목을 입력해주세요</Text>
      </View>

      <View style={[styles.inputGroup, { marginTop: 20 }]}>
        <Text style={styles.inputLabel}>모임설명</Text>
        <TextInput
          style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="모임에 대한 설명을 입력해주세요"
          placeholderTextColor="#666666"
          multiline={true}
          numberOfLines={4}
          returnKeyType="default"
          blurOnSubmit={true}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        <Text style={styles.inputHint}>모임의 목적이나 특징을 자유롭게 작성해주세요</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>언제, 어디서 만날까요?</Text>
      <Text style={styles.stepSubtitle}>장소와 시간을 설정해주세요</Text>

      {renderLocationSelection()}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>날짜</Text>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.dateTimeInfo}>
            <Text style={styles.dateText}>
              {formatDate(dateString)}
            </Text>
          </View>
          <Ionicons name="calendar" size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>시간</Text>
        <TouchableOpacity
          style={styles.timeSelectButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.timeSelectText}>{formatTime(timeString)}</Text>
          <Ionicons name="time" size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* 날짜 선택기 */}
      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="none">
          <View style={styles.datePickerModalOverlay}>
            <Animated.View
              style={[
                styles.datePickerModalBackdrop,
                {
                  opacity: datePickerModalBackdropOpacity,
                },
              ]}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleDatePickerCancel}>
                  <Text style={styles.datePickerCancelText}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>날짜 선택</Text>
                <TouchableOpacity onPress={handleDatePickerConfirm}>
                  <Text style={styles.datePickerConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#ffffff"
                style={styles.dateTimePicker}
                locale="ko-KR"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* 시간 선택 모달 */}
      {showTimePicker && (
        <Modal visible={showTimePicker} transparent animationType="none">
          <View style={styles.datePickerModalOverlay}>
            <Animated.View
              style={[
                styles.datePickerModalBackdrop,
                {
                  opacity: timePickerModalBackdropOpacity,
                },
              ]}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleTimePickerCancel}>
                  <Text style={styles.datePickerCancelText}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>시간 선택</Text>
                <TouchableOpacity onPress={handleTimePickerConfirm}>
                  <Text style={styles.datePickerConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor="#ffffff"
                style={styles.dateTimePicker}
                locale="ko-KR"
                minuteInterval={15}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>러닝 세부사항을 설정해주세요</Text>
      <Text style={styles.stepSubtitle}>거리, 페이스, 난이도를 입력해주세요</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>거리 (km)</Text>
        <TextInput
          style={styles.textInput}
          value={distance}
          onChangeText={setDistance}
          placeholder="예: 5"
          placeholderTextColor="#666666"
          keyboardType="numeric"
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>페이스</Text>
        <View style={styles.paceRangeContainer}>
          <View style={styles.paceInputContainer}>
            <Text style={styles.paceLabel}>최대빠르기</Text>
            <TextInput
              style={styles.paceInput}
              value={minPace}
              onChangeText={handleMinPaceChange}
              placeholder="5'30&quot;"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
          <View style={styles.paceSeparator}>
            <Text style={styles.paceSeparatorText}>-</Text>
          </View>
          <View style={styles.paceInputContainer}>
            <Text style={styles.paceLabel}>최소빠르기</Text>
            <TextInput
              style={styles.paceInput}
              value={maxPace}
              onChangeText={handleMaxPaceChange}
              placeholder="6'30&quot;"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
        </View>
        <Text style={styles.paceHint}>분'초&quot;/km 형식으로 입력해주세요</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>난이도</Text>
        <View style={styles.difficultyGrid}>
          {difficulties.map((diff) => (
            <TouchableOpacity
              key={diff.name}
              style={[
                styles.difficultyCard,
                difficulty === diff.name && styles.difficultyCardSelected,
              ]}
              onPress={() => setDifficulty(diff.name)}
            >
              <Text style={styles.difficultyName}>{diff.name}</Text>
              <Text style={styles.difficultyDescription}>{diff.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 해시태그 관련 상태 추가
  const [hashtagInput, setHashtagInput] = useState('');

  // 해시태그 추가 (직접 입력용)
  const addHashtag = (tag) => {
    // 모든 #과 공백을 제거하여 깨끗한 태그 생성
    const cleanTag = tag.replace(/[#\s]/g, '');
    if (cleanTag && cleanTag.length <= 20 && hashtags.split(' ').filter(t => t.trim()).length < 3) {
      const currentTags = hashtags.split(' ').filter(t => t.trim());
      // 이미 존재하는지 확인 (cleanTag로 비교)
      const existingTags = currentTags.map(t => t.replace(/^#+/, '')); // 기존 태그에서 # 제거
      if (!existingTags.includes(cleanTag)) {
        const newTags = [...currentTags, `#${cleanTag}`];
        setHashtags(newTags.join(' '));
      }
    } else if (hashtags.split(' ').filter(t => t.trim()).length >= 3) {
      Alert.alert('해시태그 제한', '해시태그는 최대 3개까지 입력할 수 있습니다.');
    }
    setHashtagInput('');
  };

  // 해시태그 삭제
  const removeHashtag = (tagToRemove) => {
    const currentTags = hashtags.split(' ').filter(t => t.trim());
    const newTags = currentTags.filter(tag => tag !== `#${tagToRemove}`);
    setHashtags(newTags.join(' '));
  };

  // 해시태그 키 입력 처리
  const handleHashtagKeyPress = (e) => {
    if (e.nativeEvent.key === 'Enter' || e.nativeEvent.key === ' ') {
      e.preventDefault();
      addHashtag(hashtagInput.trim());
    }
  };

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>추가사항</Text>
      <Text style={styles.stepSubtitle}>해시태그와 참여 인원을 설정해주세요</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>최대 참여 인원</Text>
        <TextInput
          style={styles.textInput}
          value={maxParticipants}
          onChangeText={(text) => {
            // 숫자만 입력 허용
            const numericValue = text.replace(/[^0-9]/g, '');
            setMaxParticipants(numericValue);
          }}
          placeholder="예: 10"
          placeholderTextColor="#666666"
          keyboardType="numeric"
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Text style={[styles.inputHint, { fontSize: 15 }]}>
          참여 가능한 최대 인원수를 직접 설정해주세요.{'\n'}최소 2명부터 입력할 수 있습니다. (호스트 포함)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>해시태그</Text>
        <View style={styles.hashtagContainer}>
          <TextInput
            style={styles.hashtagInput}
            placeholder="해시태그를 입력하세요 (엔터로 추가)"
            placeholderTextColor="#666666"
            value={hashtagInput}
            onChangeText={setHashtagInput}
            onSubmitEditing={() => addHashtag(hashtagInput.trim())}
            maxLength={20}
          />
        </View>
        
        {/* 선택된 해시태그들 */}
        {hashtags.split(' ').filter(t => t.trim()).length > 0 && (
          <View style={styles.selectedTags}>
            {hashtags.split(' ').filter(t => t.trim()).map((tag, index) => (
              <View key={index} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeHashtag(tag.replace('#', ''))}>
                  <Ionicons name="close" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>



      {/* 모임 생성 주의사항 */}
      <View style={styles.noticeSection}>
        <Text style={styles.noticeTitle}>💡 모임 생성 주의사항</Text>
        <View style={styles.noticeItem}>
          <Text style={styles.noticeText}>1. 모임 정보는 정확하게 입력해주세요</Text>
        </View>
        <View style={styles.noticeItem}>
          <Text style={styles.noticeText}>2. 날씨가 나쁠 때는 모임을 취소하거나 연기해주세요</Text>
        </View>
        <View style={styles.noticeItem}>
          <Text style={styles.noticeText}>3. 모임 취소 시, 참여자들과 소통하여 알려주세요</Text>
        </View>
      </View>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step, index) => (
        <View key={step} style={styles.stepRow}>
          <View style={[
            styles.stepCircle,
            step <= currentStep ? styles.stepCircleActive : styles.stepCircleInactive
          ]}>
            <Text style={{
              color: step <= currentStep ? '#000000' : '#666666',
              fontWeight: 'bold'
            }}>
              {step}
            </Text>
          </View>
          {index < 3 && (
            <View style={[
              styles.stepLine,
              step < currentStep ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <View style={styles.flowContainer}>
      <View style={styles.flowHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.flowTitle}>
          {editingEvent ? '모임 수정' : '새 모임 만들기'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.flowContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingBottom: keyboardVisible ? 210 : 80 }
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {renderStepIndicator()}
        {getCurrentStepContent()}
      </ScrollView>

      <View style={styles.fixedBottomNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>
            {currentStep === 1 ? '취소' : '이전'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
            currentStep === 4 && styles.nextButtonFull,
          ]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={[
            styles.nextButtonText,
            !canProceed() && styles.nextButtonTextDisabled,
          ]}>
            {currentStep === 4 ? (editingEvent ? '수정 완료' : '모임 생성') : '다음'}
          </Text>
          {currentStep < 4 && (
            <Ionicons name="arrow-forward" size={20} color={canProceed() ? "#000000" : "#666666"} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // BottomTab을 위한 여백
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Pretendard-Bold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Pretendard-Regular',
  },
  createButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
  },
  eventsList: {
    paddingVertical: 20,
    gap: 16,
  },
  eventCard: {
    backgroundColor: COLORS.CARD,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    fontFamily: 'Pretendard-SemiBold',
  },
  locationDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  infoText: {
    fontSize: 15,
    color: '#ffffff',
    marginLeft: 8,
    flexShrink: 1,
    fontFamily: 'Pretendard-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#1F1F24',
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
    fontFamily: 'Pretendard-SemiBold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#1C3336',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7280', // 회색톤
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  organizerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  organizerAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Pretendard-Bold',
  },
  organizerName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantInfo: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  rightInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareMeetingLinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#263238',
  },
  shareMeetingLinkButtonText: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  evaluationButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evaluationButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  evaluationCompletedButton: {
    backgroundColor: '#1F1F24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  evaluationCompletedButtonText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  eventCardCompleted: {
    opacity: 0.7,
  },
  evaluationCompletedButtonBright: {
    opacity: 1.0, // 버튼은 원래 밝기 유지
  },
  completedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithDifficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  actionButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 헤더 섹션 (러닝 제목과 난이도)
  eventHeaderSection: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    position: 'relative',
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    marginRight: 80, // 액션 버튼 공간 확보
    gap: 10,
  },
  eventEmoji: {
    fontSize: 30,
    marginTop: 2,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT,
    flex: 1,
    lineHeight: 28,
    letterSpacing: -0.5,
    fontFamily: 'Pretendard-Bold',
  },
  eventTitleContainer: {
    flex: 1,
  },
  organizerText: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  
  // 난이도 배지 (헤더용)
  difficultyBadgeHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  difficultyTextHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'Pretendard-Bold',
  },
  

  
  eventActions: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    top: 10,
    right: 16,
  },
  actionButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 구분선
  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: -16,
    marginTop: 8,
  },
  
  // 상세 정보 섹션
  eventDetailsSection: {
    padding: 16,
    paddingTop: 12,
    gap: 16,
  },
  eventDetailItem: {
    marginBottom: 4,
  },
  eventDetailItemWithRecruitment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventDetailLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    width: 50,
    textAlign: 'left',
    marginBottom: 2,
    fontFamily: 'Pretendard-Bold',
  },
  eventDetailText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
    fontFamily: 'Pretendard-SemiBold',
  },
  
  // 모집 현황 스타일
  recruitmentStatusContainer: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  recruitmentStatusText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E6C200',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    fontFamily: 'Pretendard-SemiBold',
  },
  
  // 하단 배지 섹션
  eventFooter: {
    padding: 16,
    paddingTop: 8,
  },
  eventBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  hashtagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '40',
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
    color: COLORS.PRIMARY,
  },
  publicBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '40',
  },
  publicText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginLeft: 8,
  },
  // Flow styles
  flowContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,

  },
  headerButton: {
    padding: 8,
  },
  flowTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  flowContent: {
    flex: 1,
  },
      scrollContentContainer: {
      paddingTop: 20,
      paddingHorizontal: 20,
      flexGrow: 1,
    },
  bottomNav: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
    backgroundColor: COLORS.BACKGROUND,
  },
  fixedBottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
    backgroundColor: COLORS.BACKGROUND,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cccccc',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#333333',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  nextButtonTextDisabled: {
    color: '#666666',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  stepCircleInactive: {
    backgroundColor: 'transparent',
    borderColor: '#666666',
  },
  stepLine: {
    width: 48,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  stepLineInactive: {
    backgroundColor: '#666666',
  },
  stepContent: {
    gap: 14,
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventTypeCard: {
    backgroundColor: COLORS.SURFACE,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '47%',
    position: 'relative',
    gap: 8,
  },
  eventTypeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  eventTypeEmoji: {
    fontSize: 32,
  },
  eventTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
    marginBottom: 4,
  },
  titleInputGroup: {
    marginTop: 20,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  textInput: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    color: COLORS.TEXT,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 48,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    marginTop: 6,
    paddingBottom: 4,
  },
  paceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paceInputContainer: {
    flex: 1,
    gap: 4,
  },
  paceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  paceInput: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    color: COLORS.TEXT,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 48,
    fontSize: 16,
    textAlign: 'center',
  },
  paceSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  paceSeparatorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
  },
  paceHint: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyCard: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  difficultyCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
  },
  difficultyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  difficultyDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  dateTimeButton: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  timeSelectButton: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSelectText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },


  dateTimePickerContainer: {
    backgroundColor: COLORS.SURFACE,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  datePickerContainer: {
    backgroundColor: COLORS.SURFACE,
    margin: 20,
    borderRadius: 12,
    padding: 0,
    width: '90%',
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  dateTimePicker: {
    backgroundColor: COLORS.SURFACE,
    height: 200,
  },
  dateTimeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    padding: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  shareOption: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
  },
  shareOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  shareOptionText: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  shareOptionDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  
  // 주의사항 섹션 스타일
  noticeSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: COLORS.PRIMARY + '15',
    borderRadius: 16,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginBottom: 16,
    textAlign: 'center',
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  noticeText: {
    fontSize: 15,
    color: COLORS.TEXT,
    lineHeight: 22,
    flex: 1,
    fontWeight: '400',
  },
  
  // 장소 선택 관련 스타일
  locationTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  locationTypeCard: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  locationTypeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
  },
  locationTypeEmoji: {
    fontSize: 32,
  },
  locationTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  locationTypeDescription: {
    fontSize: 12,
    color: '#666666',
  },
  
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationCard: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    width: '47%',
    position: 'relative',
  },
  locationCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
  },
  locationEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 4,
  },
  locationDistance: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 6,
  },
  mapButtonText: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  
  // 선택된 장소 표시 스타일
  selectedLocationDisplay: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedLocationEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  selectedLocationDescription: {
    fontSize: 12,
    color: '#666666',
  },
  
  // 장소 선택 모달 스타일
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  locationModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  locationModalContainer: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  locationModalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationModalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  locationModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  locationModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  locationModalConfirmTextDisabled: {
    color: '#666666',
  },
  locationModalContent: {
    flex: 1,
  },
  locationModalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  
  // 카카오맵 WebView 스타일
  kakaoMapContainer: {
    flex: 1,
    backgroundColor: COLORS.CARD,
  },
  kakaoMapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // 새로운 인라인 장소 선택 스타일
  // 장소 검색바 스타일
  locationSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#333333',
  },
  locationSearchIcon: {
    marginRight: 8,
  },
  locationSearchInput: {
    flex: 1,
    color: COLORS.TEXT,
    fontSize: 14,
  },
  locationSearchLoading: {
    marginLeft: 8,
  },
  locationSearchClearButton: {
    marginLeft: 8,
    padding: 4,
  },
  locationSearchResultsDropdown: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    maxHeight: 300,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationSearchResultsList: {
    maxHeight: 300,
  },
  locationSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  locationSearchResultIcon: {
    marginRight: 12,
  },
  locationSearchResultContent: {
    flex: 1,
  },
  locationSearchResultTitle: {
    color: COLORS.TEXT,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationSearchResultSubtitle: {
    color: COLORS.SECONDARY,
    fontSize: 12,
  },
  locationSearchResultCategory: {
    color: COLORS.PRIMARY,
    fontSize: 10,
    marginTop: 2,
  },
  noSearchResultsContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  noSearchResultsText: {
    color: COLORS.TEXT,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  noSearchResultsSubtext: {
    color: COLORS.SECONDARY,
    fontSize: 12,
    marginTop: 4,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  locationTypeButton: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  locationTypeButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
  },
  locationTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  
  // 구체적 장소 선택 스타일
  specificLocationContainer: {
    marginBottom: 8,
  },
  specificLocationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#666666',
    flex: 1,
  },
  dropdownButtonTextSelected: {
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  
  // 드롭다운 목록 스타일
  dropdownList: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.PRIMARY + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT,
    flex: 1,
  },
  dropdownItemDistance: {
    fontSize: 12,
    color: '#666666',
  },
  popularBadgeSmall: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularBadgeSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // 선택된 장소 섹션 스타일
  selectedLocationSection: {
    marginTop: 0,
  },
  selectedLocationCard: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedLocationDistance: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  coursePhotoSection: {
    marginBottom: 8,
  },
  coursePhotoButton: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  coursePhotoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 10,
  },
  coursePhotoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coursePhotoTextContainer: {
    flex: 1,
  },
  coursePhotoButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  coursePhotoButtonSubtitle: {
    fontSize: 13,
    color: COLORS.TEXT,
    lineHeight: 16,
  },
  
  // 지도 안내 문구 스타일
  mapGuideSection: {
    marginBottom: 8,
  },
  mapGuideTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  mapGuideText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    textAlign: 'left',
  },
  requiredMark: {
    color: COLORS.PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  
  // 인라인 카카오맵 스타일
  inlineMapSection: {
    marginTop: 8,
  },
  inlineMapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: COLORS.CARD,
  },
  inlineMapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3AF8FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  
  // 상세 위치 입력 스타일
  customLocationInputContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3AF8FF',
  },
  customLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginBottom: 8,
  },
  customLocationInput: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    fontSize: 16,
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  customLocationHint: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  
  // 개선된 상세 위치 입력 스타일
  customLocationInputGroup: {
    backgroundColor: '#3AF8FF' + '10',
    borderWidth: 1,
    borderColor: '#3AF8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  customLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customLocationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3AF8FF',
    marginLeft: 8,
    flex: 1,
  },
  customMarkerIndicator: {
    backgroundColor: '#FF0000' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  customMarkerIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF0000',
  },
  customLocationInput: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.TEXT,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  customLocationHint: {
    fontSize: 12,
    color: '#3AF8FF',
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // 해시태그 관련 스타일
  hashtagContainer: {
    position: 'relative',
  },
  hashtagInput: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C3336',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  selectedTagText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    marginRight: 6,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },

  // 메인 옵션 카드 스타일
  mainOptionCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 104,
    position: 'relative',
  },
  optionIconContainer: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
    marginBottom: 8,
  },
  optionBadge: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },

  // 모임/러닝 피드 토글
  modeToggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F1F24',
    borderRadius: 12,
    padding: 4,
  },
  modeToggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
  },
  modeToggleButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  modeToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A0A0',
  },
  modeToggleButtonTextActive: {
    color: '#000000',
  },

  // 헤더 섹션 스타일
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    lineHeight: 22,
  },

  // 헤더 스타일
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
    backgroundColor: COLORS.BACKGROUND,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT,
    flex: 1,
    textAlign: 'center',
  },
  headerBackButton: {
    padding: 16,
    marginRight: 8,
    marginTop: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  headerRight: {
    width: 40, // 헤더 균형을 위한 빈 공간
  },

  // 정보 섹션 스타일
  infoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  runningFeedPlaceholderCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B2B2F',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  runningFeedPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginTop: 12,
    marginBottom: 8,
  },
  runningFeedPlaceholderText: {
    fontSize: 14,
    color: '#B5B5B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  runningFeedRetryButton: {
    marginTop: 14,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  runningFeedRetryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  runningFeedList: {
    gap: 12,
    marginBottom: 16,
  },
  runningFeedItemCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B2B2F',
    padding: 14,
  },
  runningFeedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  runningFeedItemDate: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT,
  },
  runningFeedItemTime: {
    fontSize: 13,
    color: '#A7A7AA',
  },
  runningFeedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  runningFeedStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  runningFeedStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  runningFeedStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT,
  },
  runningFeedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runningFeedCalories: {
    fontSize: 13,
    color: '#B5B5B8',
  },
  runningFeedShareButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  runningFeedShareButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },



  // 업데이트된 이벤트 카드 스타일
  eventTitleContainer: {
    flex: 1,
  },
  organizerText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  creatorBadge: {
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700' + '40',
  },
  creatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  joinedBadge: {
    backgroundColor: '#4CAF50' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50' + '40',
  },
  joinedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
  },
  endedBadge: {
    backgroundColor: '#FF6B35' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#FF6B35' + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF6B35',
  },

  // 액션 모달 스타일
  actionModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomModalContainer: {
    justifyContent: 'flex-end',
  },
  bottomModal: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // 하단 안전 영역 고려
  },
  bottomMenuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bottomMenuItemText: {
    fontSize: 18,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  bottomMenuItemTextDelete: {
    color: '#F44336',
  },
  bottomModalSeparator: {
    height: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
  // 날짜/시간 선택 모달 오버레이
  datePickerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  // 알림 표시 스타일
  notificationBadge: {
    width: 10,
    height: 10,
    backgroundColor: '#FF0022',
    borderRadius: 5,
    marginLeft: 8,
  },
  cardNotificationBadge: {
    width: 8,
    height: 8,
    backgroundColor: '#FF0022',
    borderRadius: 4,
    marginRight: 8,
  },
  cardTopNotificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#FF0022',
    borderRadius: 4,
    zIndex: 1,
  },
  titleRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coursePhotoImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  coursePhotoImage: {
    width: 220,
    height: 120,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  coursePhotoImageText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  coursePhotoImageSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  coursePhotoInfo: {
    alignItems: 'center',
  },
  coursePhotoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  coursePhotoDescription: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  coursePhotoDistance: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginBottom: 8,
  },
  coursePhotoFeatures: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  coursePhotoFeature: {
    fontSize: 13,
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  coursePhotoLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  coursePhotoLoadingText: {
    color: COLORS.SECONDARY,
    fontSize: 15,
  },
  
  // 러닝매너 작성 모달창 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Bold',
  },
  modalEventInfo: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
    fontFamily: 'Pretendard-SemiBold',
  },
  modalEventDetails: {
    gap: 8,
  },
  modalEventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalEventDetailText: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Regular',
  },
  modalMessage: {
    fontSize: 16,
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Pretendard-Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.CARD,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
  },
});

// 가이드 오버레이와 리셋 버튼을 포함한 ScheduleScreen 래퍼
const ScheduleScreenWithGuide = (props) => {
  // Safe Area insets 가져오기
  const insets = useSafeAreaInsets();
  
  // Context 안전장치 추가
  const authContext = useAuth();
  const guideContext = useGuide();
  const eventsContext = useEvents();
  
  // Context가 완전히 초기화되지 않은 경우 조기 반환
  if (!authContext || !guideContext || !eventsContext) {
    return null;
  }
  
  const { user } = authContext;
  const { guideStates, currentGuide, currentStep, resetGuide, startGuide, completeGuide, nextStep, exitGuide, setCurrentStep, setCurrentGuide } = guideContext;
  const { userCreatedEvents } = eventsContext;
  
  // 사용자 프로필 상태 추가
  const [userProfile, setUserProfile] = useState(null);
  
  // 사용자가 처음으로 모임을 만든 경우인지 확인
  const [hasShownFirstMeetingGuide, setHasShownFirstMeetingGuide] = useState(false);
  const [previousCreatedEventsCount, setPreviousCreatedEventsCount] = useState(0);
  const [hasShownMeetingCardGuide, setHasShownMeetingCardGuide] = useState(false);
  const [hasCompletedStep2, setHasCompletedStep2] = useState(false);
  const [hasCompletedStep3, setHasCompletedStep3] = useState(false);
  
  // 가이드 타겟 refs
  const [createMeetingCardRef, setCreateMeetingCardRef] = useState(null);
  const [myCreatedMeetingsSectionRef, setMyCreatedMeetingsSectionRef] = useState(null);
  const [meetingCardRef, setMeetingCardRef] = useState(null);
  const [meetingCardMenuRef, setMeetingCardMenuRef] = useState(null);
  
  // 3단계 가이드 완료는 onNext 콜백에서 직접 처리
  
  // 5단계 가이드 완료는 onNext 콜백에서 직접 처리
  
  // Safe Area 기반 위치 보정 함수
  const applySafeAreaCorrection = (x, y, width, height) => {
    // Status Bar 높이 보정 (개발환경과 프로덕트 환경 차이)
    const statusBarCorrection = insets.top;
    
    return {
      x: x,
      y: y - statusBarCorrection, // Status Bar 높이만큼 위로 조정
      width: width,
      height: height
    };
  };

  // 하이브리드 측정 함수 (Safe Area 보정 적용)
  const measureTargetPositionHybrid = (targetRef, targetId, basePosition) => {
    if (!targetRef || typeof targetRef.measureInWindow !== 'function') {
      // ref가 없으면 Safe Area 보정된 기본값 사용
      const correctedPosition = applySafeAreaCorrection(
        basePosition.x, 
        basePosition.y, 
        basePosition.width, 
        basePosition.height
      );
      setGuideTargetPosition(targetId, correctedPosition.x, correctedPosition.y, correctedPosition.width, correctedPosition.height);
      return;
    }

    try {
      targetRef.measureInWindow((x, y, width, height) => {
        try {
          // 측정값 유효성 검사
          if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number' ||
              isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) ||
              width <= 0 || height <= 0) {
            // 유효하지 않은 값이면 기본값 사용
            const correctedPosition = applySafeAreaCorrection(
              basePosition.x, 
              basePosition.y, 
              basePosition.width, 
              basePosition.height
            );
            setGuideTargetPosition(targetId, correctedPosition.x, correctedPosition.y, correctedPosition.width, correctedPosition.height);
            return;
          }

          const offsetX = x - basePosition.x;
          const offsetY = y - basePosition.y;

          let finalPosition;

          if (Math.abs(offsetX) > 100 || Math.abs(offsetY) > 100) {
            // 오프셋이 너무 크면 Safe Area 보정된 기본값 사용
            finalPosition = applySafeAreaCorrection(
              basePosition.x, 
              basePosition.y, 
              basePosition.width, 
              basePosition.height
            );
          } else {
            // 합리적인 범위 내면 측정값에 Safe Area 보정 적용
            finalPosition = applySafeAreaCorrection(x, y, width, height);
          }
          
          setGuideTargetPosition(targetId, finalPosition.x, finalPosition.y, finalPosition.width, finalPosition.height);
        } catch (error) {
          console.error('가이드 타겟 위치 측정 콜백 오류:', error);
          // 에러 발생 시 기본값 사용
          const correctedPosition = applySafeAreaCorrection(
            basePosition.x, 
            basePosition.y, 
            basePosition.width, 
            basePosition.height
          );
          setGuideTargetPosition(targetId, correctedPosition.x, correctedPosition.y, correctedPosition.width, correctedPosition.height);
        }
      });
    } catch (error) {
      console.error('가이드 타겟 위치 측정 오류:', error);
      // 에러 발생 시 기본값 사용
      const correctedPosition = applySafeAreaCorrection(
        basePosition.x, 
        basePosition.y, 
        basePosition.width, 
        basePosition.height
      );
      setGuideTargetPosition(targetId, correctedPosition.x, correctedPosition.y, correctedPosition.width, correctedPosition.height);
    }
  };

  // 가이드 타겟 위치 설정 함수
  const setGuideTargetPosition = (targetId, x, y, width, height) => {
    // 가이드 타겟 위치를 저장하는 로직 (HomeScreen과 동일한 방식으로 구현)
    // 실제로는 GuideContext나 별도 상태로 관리해야 할 수 있음
  };
  
  // 가이드 타겟 위치 동적 계산 함수
  const getGuideTargetPosition = (targetId) => {
    const screenWidth = Dimensions.get('window').width;
    
    switch (targetId) {
      case 'createMeetingCard':
        return createMeetingCardRef ? 
          (() => {
            let position = { x: screenWidth / 2, y: 210 };
            createMeetingCardRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - 5;
              const offsetY = y - 210;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                position = { x: x + width / 2, y: y + height / 2 };
              }
            });
            return position;
          })() : 
          { x: screenWidth / 2, y: 210 };
          
      case 'myCreatedMeetingsSection':
        return myCreatedMeetingsSectionRef ? 
          (() => {
            let position = { x: screenWidth / 2, y: 480 };
            myCreatedMeetingsSectionRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - 5;
              const offsetY = y - 480;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                position = { x: x + width / 2, y: y + height / 2 };
              }
            });
            return position;
          })() : 
          { x: screenWidth / 2, y: 480 };
          
      case 'meetingCard':
        return meetingCardRef ? 
          (() => {
            let position = { x: screenWidth - 54, y: 195 };
            meetingCardRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - (screenWidth - 54);
              const offsetY = y - 195;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                position = { x: x + width / 2, y: y + height / 2 };
              }
            });
            return position;
          })() : 
          { x: screenWidth - 54, y: 195 };
          
      case 'meetingCardMenu':
        return meetingCardMenuRef ? 
          (() => {
            let position = { x: screenWidth / 2, y: 270 };
            meetingCardMenuRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - (screenWidth / 2);
              const offsetY = y - 270;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                position = { x: x + width / 2, y: y + height / 2 };
              }
            });
            return position;
          })() : 
          { x: screenWidth / 2, y: 270 };
          
      default:
        return { x: 200, y: 300 };
    }
  };
  
  // 가이드 타겟 크기 동적 계산 함수
  const getGuideTargetSize = (targetId) => {
    const screenWidth = Dimensions.get('window').width;
    
    switch (targetId) {
      case 'createMeetingCard':
        return createMeetingCardRef ? 
          (() => {
            let size = { width: screenWidth - 10, height: 120 };
            createMeetingCardRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - 5;
              const offsetY = y - 210;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                size = { width, height };
              }
            });
            return size;
          })() : 
          { width: screenWidth - 10, height: 120 };
          
      case 'myCreatedMeetingsSection':
        return myCreatedMeetingsSectionRef ? 
          (() => {
            let size = { width: screenWidth - 10, height: 140 };
            myCreatedMeetingsSectionRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - 5;
              const offsetY = y - 480;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                size = { width, height };
              }
            });
            return size;
          })() : 
          { width: screenWidth - 10, height: 140 };
          
      case 'meetingCard':
        return meetingCardRef ? 
          (() => {
            let size = { width: 40, height: 40 };
            meetingCardRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - (screenWidth - 54);
              const offsetY = y - 195;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                size = { width, height };
              }
            });
            return size;
          })() : 
          { width: 40, height: 40 };
          
      case 'meetingCardMenu':
        return meetingCardMenuRef ? 
          (() => {
            let size = { width: screenWidth - 20, height: 220 };
            meetingCardMenuRef.measureInWindow((x, y, width, height) => {
              const offsetX = x - (screenWidth / 2);
              const offsetY = y - 270;
              if (Math.abs(offsetX) <= 100 && Math.abs(offsetY) <= 100) {
                size = { width, height };
              }
            });
            return size;
          })() : 
          { width: screenWidth - 20, height: 220 };
          
      default:
        return { width: 200, height: 250 };
    }
  };
  
  // 사용자 프로필 데이터 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserProfile(userData);
        }
      } catch (error) {
        console.error('사용자 프로필 로드 실패:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // 모임탭 가이드 시작 조건: 온보딩 완료 + 가이드 미완료
  useEffect(() => {
    // 모든 필수 상태가 로드될 때까지 대기
    if (!userProfile || !guideStates) {
      return;
    }
    
    // 온보딩 완료 후 모임탭 가이드가 완료되지 않았고, 현재 가이드가 진행 중이 아닐 때
    // 그리고 2단계를 완료하지 않은 상태에서만 1~2단계 가이드 시작
    if (userProfile.onboardingCompleted && 
        !guideStates.meetingGuideCompleted && 
        currentGuide !== 'meeting' &&
        !hasCompletedStep2) { // 2단계 완료 후에는 1~2단계 가이드 재시작 방지
      
      // 이전 setTimeout 정리 (중복 실행 방지)
      if (guideTimeoutRef.current) {
        clearTimeout(guideTimeoutRef.current);
        guideTimeoutRef.current = null;
      }
      
      const screenWidth = Dimensions.get('window').width;
      
      // 하이브리드 측정으로 타겟 위치 설정
      const createMeetingCardBasePosition = { x: 5, y: 210, width: screenWidth - 10, height: 120 };
      measureTargetPositionHybrid(createMeetingCardRef, 'createMeetingCard', createMeetingCardBasePosition);
      
      const myCreatedMeetingsSectionBasePosition = { x: 5, y: 480, width: screenWidth - 10, height: 140 };
      measureTargetPositionHybrid(myCreatedMeetingsSectionRef, 'myCreatedMeetingsSection', myCreatedMeetingsSectionBasePosition);
      
      // 1~2단계 가이드 자동 시작 (중복 실행 방지)
      guideTimeoutRef.current = setTimeout(() => {
        // 실행 시점에서 다시 한 번 조건 확인
        if (userProfile.onboardingCompleted && 
            !guideStates.meetingGuideCompleted && 
            currentGuide !== 'meeting' &&
            !hasCompletedStep2) { // 2단계 완료 후에는 1~2단계 가이드 재시작 방지
          startGuide('meeting');
        }
        guideTimeoutRef.current = null;
      }, 500);
    }
  }, [userProfile, guideStates, currentGuide, hasCompletedStep2]);

  // setTimeout ID를 저장하기 위한 ref
  const guideTimeoutRef = useRef(null);

  // 새 모임 생성 감지 및 3단계 가이드 자동 시작
  useEffect(() => {
    const currentCreatedEventsCount = userCreatedEvents.filter(event => event.status !== 'ended').length;
    
    
    // 새 모임이 생성되었고, 이전에 가이드를 보여주지 않았으며, 현재 가이드가 진행 중이 아닐 때
    // 그리고 실제로 새 모임이 생성된 경우에만 (이전 개수보다 증가한 경우)
    // 그리고 2단계가 완료된 후에만 3단계 시작
    if (currentCreatedEventsCount > previousCreatedEventsCount && 
        !hasShownFirstMeetingGuide && 
        currentGuide !== 'meeting' &&
        hasCompletedStep2) {
      
      
      // 이전 setTimeout 정리 (새로운 모임 생성이 감지된 경우에만)
      if (guideTimeoutRef.current) {
        clearTimeout(guideTimeoutRef.current);
        guideTimeoutRef.current = null;
      }
      
      // 3단계 가이드 자동 시작 - 모임 생성 플로우 완전히 끝난 후 0.5초
      guideTimeoutRef.current = setTimeout(() => {
        // 실행 시점에서 다시 한 번 조건 확인
        if (!hasShownFirstMeetingGuide && currentGuide !== 'meeting' && hasCompletedStep2) {
          // 3단계 가이드 시작 전 하이브리드 측정
          const screenWidth = Dimensions.get('window').width;
          const myCreatedMeetingsSectionBasePosition = { x: 5, y: 480, width: screenWidth - 10, height: 140 };
          measureTargetPositionHybrid(myCreatedMeetingsSectionRef, 'myCreatedMeetingsSection', myCreatedMeetingsSectionBasePosition);
          
          setCurrentStep(2); // 3단계 (0-based index)
          setCurrentGuide('meeting');
          setHasShownFirstMeetingGuide(true);
        } else {
        }
        guideTimeoutRef.current = null;
      }, 500); // 0.5초 후 시작 (모임 생성 플로우 완전히 끝난 후)
    } else {
    }
    
    setPreviousCreatedEventsCount(currentCreatedEventsCount);
  }, [userCreatedEvents, previousCreatedEventsCount, hasShownFirstMeetingGuide, currentGuide, hasCompletedStep2, setCurrentStep, setCurrentGuide]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (guideTimeoutRef.current) {
        clearTimeout(guideTimeoutRef.current);
      }
    };
  }, []);
  
  // 모임탭 가이드 단계 정의
  const meetingGuideSteps = [
    {
      id: 'overview',
      title: '모임탭',
      description: `러닝 모임을 종합적으로 관리할 수 있는
모임탭입니다`,
      targetId: 'meetingTabOverview',
      highlightShape: 'none',
      showArrow: false,
      arrowDirection: 'down',
    },
    {
      id: 'createMeeting',
      title: '새 모임 만들기',
      description: `새로운 러닝 모임을 만들어보세요.
모임을 만들면, 다음 가이드가 진행됩니다!`,
      targetId: 'createMeetingCard',
      highlightShape: 'rectangle',
      showArrow: false,
      arrowDirection: 'down',
    },
    {
      id: 'myCreatedMeetings',
      title: '내가 만든 모임',
      description: `만든 모임들을 관리할 수 있습니다.
모임 수정, 삭제, 참여자 확인이 가능해요.`,
      targetId: 'myCreatedMeetingsSection',
      highlightShape: 'rectangle',
      showArrow: false,
      arrowDirection: 'down',
    },
    {
      id: 'meetingCard',
      title: '모임카드 메뉴',
      description: `모임카드의 메뉴 버튼을 클릭하면\n모임을 수정/삭제할 수 있습니다.`,
      targetId: 'meetingCard',
      highlightShape: 'circle',
      showArrow: false,
      arrowDirection: 'down',
    },
    {
      id: 'meetingCardMenu',
      title: '모임카드',
      description: `잘 생성하셨습니다!\n모임카드를 클릭해서 상세 정보를 확인해보세요.`,
      targetId: 'meetingCardMenu',
      highlightShape: 'rectangle',
      showArrow: false,
      arrowDirection: 'down',
    },
  ];
  
  // 내가 만든 모임 화면 진입 시 4단계 가이드 시작 콜백
  const handleMyCreatedScreenEnter = useCallback(() => {
    try {
      // 내가 만든 모임 화면 진입 시 4단계 가이드 시작
      // 3단계 가이드를 완료한 후에만 4단계 시작
      if (!hasShownMeetingCardGuide && currentGuide !== 'meeting' && hasCompletedStep3) {
          setTimeout(() => {
            try {
              setCurrentStep(3); // 4단계 (0-based index)
              setCurrentGuide('meeting');
              setHasShownMeetingCardGuide(true);
            } catch (error) {
              console.error('❌ 4단계 가이드 시작 오류:', error);
            }
          }, 500);
      } else {
      }
    } catch (error) {
      console.error('❌ handleMyCreatedScreenEnter 오류:', error);
    }
  }, [hasShownMeetingCardGuide, currentGuide, hasCompletedStep3, setCurrentStep, setCurrentGuide]);

  // 가이드 리셋 함수들 (개발환경에서만 사용)
  const handleResetHomeGuide = () => {
    resetGuide('home');
    Alert.alert('가이드 리셋', '홈탭 가이드가 리셋되었습니다.');
  };

  const handleResetMeetingGuide = () => {
    resetGuide('meeting');
    // 로컬 상태들도 함께 리셋
    setHasShownFirstMeetingGuide(false);
    setHasShownMeetingCardGuide(false);
    setHasCompletedStep2(false);
    setHasCompletedStep3(false);
    setPreviousCreatedEventsCount(0);
    // 진행 중인 타이머도 정리
    if (guideTimeoutRef.current) {
      clearTimeout(guideTimeoutRef.current);
      guideTimeoutRef.current = null;
    }
    Alert.alert('가이드 리셋', '모임탭 가이드가 리셋되었습니다.');
  };

  const handleResetAllGuides = () => {
    resetGuide();
    // 로컬 상태들도 함께 리셋
    setHasShownFirstMeetingGuide(false);
    setHasShownMeetingCardGuide(false);
    setHasCompletedStep2(false);
    setHasCompletedStep3(false);
    setPreviousCreatedEventsCount(0);
    // 진행 중인 타이머도 정리
    if (guideTimeoutRef.current) {
      clearTimeout(guideTimeoutRef.current);
      guideTimeoutRef.current = null;
    }
    Alert.alert('가이드 리셋', '모든 가이드가 리셋되었습니다.');
  };


  return (
    <View style={{ flex: 1 }}>
      <ScheduleScreen 
        {...props} 
        onMyCreatedScreenEnter={handleMyCreatedScreenEnter}
        onCreateMeetingCardRef={setCreateMeetingCardRef}
        onMyCreatedMeetingsSectionRef={setMyCreatedMeetingsSectionRef}
        onMeetingCardRef={setMeetingCardRef}
        onMeetingCardMenuRef={setMeetingCardMenuRef}
      />
      
      
      {/* 가이드 오버레이 */}
      {currentGuide === 'meeting' && meetingGuideSteps[currentStep] && (
        <GuideOverlay
          visible={true}
          title={meetingGuideSteps[currentStep].title}
          description={meetingGuideSteps[currentStep].description}
          targetPosition={meetingGuideSteps[currentStep].highlightShape === 'none' ? null : 
            getGuideTargetPosition(meetingGuideSteps[currentStep].targetId)}
          targetSize={meetingGuideSteps[currentStep].highlightShape === 'none' ? null : 
            getGuideTargetSize(meetingGuideSteps[currentStep].targetId)}
          highlightShape={meetingGuideSteps[currentStep].highlightShape}
          showArrow={meetingGuideSteps[currentStep].showArrow}
          arrowDirection={meetingGuideSteps[currentStep].arrowDirection}
          onNext={() => {
            if (currentStep === 1) {
              // 2단계에서 가이드 일시 종료 (완료 처리 안 함)
              setHasCompletedStep2(true); // 2단계 완료 상태 설정
              exitGuide(); // 가이드만 숨김, 완료 상태는 변경하지 않음
            } else if (currentStep === 2) {
              // 3단계에서 가이드 일시 종료 (완료 처리 안 함)
              setHasCompletedStep3(true); // 3단계 완료 상태 설정
              exitGuide(); // 가이드만 숨김, 완료 상태는 변경하지 않음
              
              // 3단계 완료 후 내가 생성한 모임 화면으로 안전하게 이동
              setTimeout(() => {
                try {
                  setShowMyCreated(true);
                } catch (error) {
                  console.error('❌ 내가 생성한 모임 화면 이동 오류:', error);
                }
              }, 100);
            } else if (currentStep === 3) {
              // 4단계에서 다음 버튼 클릭 시 5단계로 진행
              nextStep();
            } else if (currentStep === 4) {
              // 5단계 완료 시 가이드 완료 처리
              completeGuide('meeting');
            } else if (currentStep < meetingGuideSteps.length - 1) {
              // 다음 단계로 진행
              nextStep();
            } else {
              // 완료 처리
              completeGuide('meeting');
            }
          }}
          isLastStep={currentStep === 4}
          targetId={meetingGuideSteps[currentStep].targetId}
        />
      )}
    </View>
  );
};


export default ScheduleScreenWithGuide;
export { ScheduleScreen }; 