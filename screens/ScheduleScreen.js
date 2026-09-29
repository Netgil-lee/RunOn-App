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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import RouteMapSnapshot from '../components/RouteMapSnapshot';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useGuide } from '../contexts/GuideContext';
import GuideOverlay from '../components/GuideOverlay';
import firestoreService from '../services/firestoreService';
import evaluationService from '../services/evaluationService';
import RunningShareModal from '../components/RunningShareModal';
import appleFitnessService from '../services/appleFitnessService';
import runOnRunningService from '../services/runOnRunningService';
import ENV from '../config/environment';
import storageService from '../services/storageService';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { recordMeetingLocation } from '../services/userActivityService';
import kakaoPlacesService from '../services/kakaoPlacesService';
import { useTheme } from '../contexts/ThemeContext';
import { isRunOnWorkoutSource, mergeRunningWorkouts } from '../utils/runningWorkouts';

const firestore = getFirestore();


// NetGill 디자인 시스템 - 홈화면과 동일한 색상 팔레트

const FEED_META_STORAGE_KEY = 'runon_running_feed_meta_v1';
const FEED_PAGE_SIZE = 8;
const ROUTE_FETCH_STEP = 8;
const EFFORT_COLORS = [
  '#4A4A4F',
  '#1B8FF7',
  '#22A6F2',
  '#2CB7E9',
  '#37C8DC',
  '#46D8C7',
  '#64E3A8',
  '#9AE66D',
  '#FFD34D',
  '#FF9E3D',
  '#FF5A5F',
];

const ScheduleScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const toggleAnim = useRef(new Animated.Value(0)).current; // 0: group, 1: feed
  const [toggleTrackWidth, setToggleTrackWidth] = useState(0);

  // 모드 토글 슬라이딩 애니메이션 (같이 달리기 ↔ 러닝 피드)
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: mainMode === 'feed' ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 80,
    }).start();
  }, [mainMode, toggleAnim]);
  const [showMyCreated, setShowMyCreated] = useState(false);
  
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
  const [feedVisibleCount, setFeedVisibleCount] = useState(FEED_PAGE_SIZE);
  const [feedRouteFetchLimit, setFeedRouteFetchLimit] = useState(10);
  const [feedMetaMap, setFeedMetaMap] = useState({});
  const [memoDraftMap, setMemoDraftMap] = useState({});
  const [expandedEffortWorkoutId, setExpandedEffortWorkoutId] = useState(null);
  const [expandedMemoWorkoutId, setExpandedMemoWorkoutId] = useState(null);
  
  
  

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

  const persistFeedMeta = useCallback(async (nextMeta) => {
    try {
      await AsyncStorage.setItem(FEED_META_STORAGE_KEY, JSON.stringify(nextMeta));
    } catch (error) {
      console.error('러닝피드 메타 저장 실패:', error);
    }
  }, []);

  useEffect(() => {
    const loadFeedMeta = async () => {
      try {
        const raw = await AsyncStorage.getItem(FEED_META_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setFeedMetaMap(parsed);
        }
      } catch (error) {
        console.error('러닝피드 메타 로드 실패:', error);
      }
    };
    loadFeedMeta();
  }, []);

  const updateFeedMeta = useCallback((workoutId, patchOrUpdater) => {
    if (!workoutId) return;
    setFeedMetaMap((prev) => {
      const current = prev?.[workoutId] || {};
      const nextEntry = typeof patchOrUpdater === 'function'
        ? patchOrUpdater(current)
        : { ...current, ...patchOrUpdater };
      const next = { ...prev, [workoutId]: nextEntry };
      persistFeedMeta(next);
      return next;
    });
  }, [persistFeedMeta]);

  const handleFeedLikePress = (workout) => {
    if (!workout?.id) return;
    setExpandedEffortWorkoutId((prev) => (prev === workout.id ? null : workout.id));
  };

  const handleEffortSelect = (workoutId, effortLevel) => {
    if (!workoutId) return;
    updateFeedMeta(workoutId, { effortLevel });
  };

  const handleFeedMemoPress = (workout) => {
    if (!workout?.id) return;
    const workoutId = workout.id;
    const savedMemo = feedMetaMap?.[workoutId]?.memo || '';
    setMemoDraftMap((prev) => ({
      ...prev,
      [workoutId]: prev?.[workoutId] ?? savedMemo,
    }));
    setExpandedMemoWorkoutId((prev) => (prev === workoutId ? null : workoutId));
  };

  const handleMemoDraftChange = (workoutId, value) => {
    setMemoDraftMap((prev) => ({ ...prev, [workoutId]: value }));
  };

  const handleFeedMemoSave = (workoutId) => {
    if (!workoutId) return;
    const memoText = `${memoDraftMap?.[workoutId] || ''}`.trim();
    updateFeedMeta(workoutId, { memo: memoText });
    Alert.alert('저장 완료', '메모가 저장되었습니다.');
  };

  // 스크롤로 페이지가 늘어나도(feedRouteFetchLimit 증가) 처음부터 전체를
  // 다시 불러오지 않도록, loadRunningFeed는 항상 "최초 로드 시점"의 값이 아니라
  // ref로 최신 routeFetchLimit만 참조한다 (의존성 배열에서 제외).
  const feedRouteFetchLimitRef = useRef(feedRouteFetchLimit);
  useEffect(() => {
    feedRouteFetchLimitRef.current = feedRouteFetchLimit;
  }, [feedRouteFetchLimit]);

  const isLoadingMoreFeedRoutesRef = useRef(false);

  const loadRunningFeed = useCallback(async () => {
    if (mainMode !== 'feed' || showCreateFlow || showMyCreated || showMyJoined || showEndedEvents) {
      return;
    }

    setIsFeedLoading(true);
    setFeedErrorCode('');

    try {
      const runOnWorkouts = await runOnRunningService.getRecentRunningWorkouts(0);

      let appleWorkouts = [];
      let appleErrorCode = '';
      try {
        appleWorkouts = await appleFitnessService.getRecentRunningWorkouts(0, {
          includeRoutes: true,
          routeFetchLimit: feedRouteFetchLimitRef.current,
          cacheTtlMs: 90000,
        });
      } catch (error) {
        appleErrorCode = error?.code || 'UNKNOWN';
      }

      // 동일 세션(시간대) 데이터는 RunOn 로컬 기록을 우선한다.
      const merged = mergeRunningWorkouts(runOnWorkouts, appleWorkouts);

      setFeedWorkouts(merged);
      setFeedErrorCode(merged.length === 0 ? appleErrorCode : '');
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

  useEffect(() => {
    setFeedVisibleCount((prev) => {
      if (feedWorkouts.length === 0) return FEED_PAGE_SIZE;
      return Math.min(Math.max(prev, FEED_PAGE_SIZE), feedWorkouts.length);
    });
  }, [feedWorkouts.length]);

  // 스크롤로 다음 페이지가 보일 때 이미 불러온 기록은 그대로 두고
  // 아직 경로(route)가 없는 "다음 구간"의 GPS 경로만 추가로 불러온다.
  // (전체 목록을 처음부터 다시 불러오면 화면이 스피너로 전환되면서
  //  이미 그려진 지도들이 한꺼번에 재생성돼 메모리 급증 → 앱 종료로 이어졌다)
  const loadMoreFeedRoutes = useCallback(async (nextRouteLimit) => {
    if (mainMode !== 'feed' || isLoadingMoreFeedRoutesRef.current) return;
    isLoadingMoreFeedRoutesRef.current = true;
    try {
      const appleWorkouts = await appleFitnessService.getRecentRunningWorkouts(0, {
        includeRoutes: true,
        routeFetchLimit: nextRouteLimit,
        cacheTtlMs: 90000,
      });
      const routeById = new Map(appleWorkouts.map((w) => [w.id, w.routeCoordinates]));
      setFeedWorkouts((prev) => prev.map((workout) => {
        if (Array.isArray(workout.routeCoordinates) && workout.routeCoordinates.length > 0) {
          return workout;
        }
        const routeCoordinates = routeById.get(workout.id);
        return Array.isArray(routeCoordinates) && routeCoordinates.length > 0
          ? { ...workout, routeCoordinates }
          : workout;
      }));
    } catch (error) {
      // 추가 경로 로딩 실패는 조용히 무시 — 이미 보이는 기록에는 영향 없음
    } finally {
      isLoadingMoreFeedRoutesRef.current = false;
    }
  }, [mainMode]);

  const handleFeedScroll = useCallback((event) => {
    if (mainMode !== 'feed' || isFeedLoading) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent || {};
    const currentOffsetY = contentOffset?.y || 0;
    const contentHeight = contentSize?.height || 0;
    const layoutHeight = layoutMeasurement?.height || 0;
    const nearBottom = currentOffsetY + layoutHeight >= contentHeight - 240;
    if (!nearBottom) return;

    setFeedVisibleCount((prev) => Math.min(prev + FEED_PAGE_SIZE, feedWorkouts.length));

    // setState 업데이터 안에서 비동기 fetch를 직접 트리거하지 않도록,
    // 최신 routeFetchLimit는 ref로 읽고 다음 값 계산 후 별도로 반영한다.
    const desired = Math.min(feedWorkouts.length, feedVisibleCount + FEED_PAGE_SIZE);
    const currentRouteLimit = feedRouteFetchLimitRef.current;
    if (desired > currentRouteLimit) {
      const nextRouteLimit = Math.min(currentRouteLimit + ROUTE_FETCH_STEP, feedWorkouts.length);
      if (nextRouteLimit > currentRouteLimit) {
        setFeedRouteFetchLimit(nextRouteLimit);
        loadMoreFeedRoutes(nextRouteLimit);
      }
    }
  }, [mainMode, isFeedLoading, feedWorkouts.length, feedVisibleCount, loadMoreFeedRoutes]);

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

  const handleEndedEventLongPressDelete = (event) => {
    if (!event?.id || !user?.uid) return;
    const isOrganizer = event.organizerId === user.uid || event.isCreatedByUser === true;
    if (!isOrganizer) {
      Alert.alert('안내', '주최자만 모임을 삭제할 수 있습니다.');
      return;
    }
    handleDeleteEvent(event.id);
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
                  event={event}
                  onEdit={() => handleEditEvent(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
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
                  onDelete={null}
                  onPress={(e) => handleEventPress(e, 'endedEvents')}
                  onEndedLongPress={handleEndedEventLongPressDelete}
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
        stickyHeaderIndices={[0]}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleFeedScroll}
        scrollEventThrottle={16}
      >
        {/* 모드 토글 (모임탭 최상단 고정) */}
        <View style={styles.modeToggleWrap}>
          <View
            style={styles.modeToggleContainer}
            onLayout={(e) => setToggleTrackWidth(e.nativeEvent.layout.width)}
          >
            {toggleTrackWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.modeTogglePill,
                  {
                    width: (toggleTrackWidth - 8) / 2,
                    transform: [
                      {
                        translateX: toggleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (toggleTrackWidth - 8) / 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
            <TouchableOpacity
              style={styles.modeToggleButton}
              activeOpacity={0.8}
              onPress={() => setMainMode('group')}
            >
              <Text style={[styles.modeToggleButtonText, mainMode === 'group' && styles.modeToggleButtonTextActive]}>
                같이 달리기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeToggleButton}
              activeOpacity={0.8}
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
              : 'Apple Fitness와 RunOn 러닝 기록을 함께 확인하고 공유 이미지를 저장해보세요'}
          </Text>
        </View>

        {mainMode === 'group' ? (
          <>
            {/* 새 모임 만들기 */}
            <TouchableOpacity
              style={styles.mainOptionCard}
              onPress={handleCreateEvent}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: colors.PRIMARY }]}>
                <Ionicons name="add-circle" size={30} color="#0F1115" />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>새 모임 만들기</Text>
                </View>
                <Text style={styles.optionSubtitle}>
                  새 모임을 만들고 함께 달려보세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" style={styles.optionChevron} />
            </TouchableOpacity>

            {/* 내가 참여한 모임 */}
            <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewMyJoined}>
              {hasMeetingNotification && (
                <View style={styles.cardTopNotificationBadge} />
              )}
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(137, 175, 181, 0.9)' }]}>
                <Ionicons name="people" size={30} color="#0F1115" />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>내가 참여한 모임</Text>
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>{userJoinedEvents.filter(event => event.status !== 'ended').length}개</Text>
                  </View>
                </View>
                <Text style={styles.optionSubtitle}>
                  참여한 모임을 확인·관리하세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" style={styles.optionChevron} />
            </TouchableOpacity>

            {/* 내가 만든 모임 */}
            <TouchableOpacity
              style={styles.mainOptionCard}
              onPress={handleViewMyCreated}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(137, 175, 181, 0.9)' }]}>
                <Ionicons name="create" size={30} color="#0F1115" />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>내가 만든 모임</Text>
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>{userCreatedEvents.filter(event => event.status !== 'ended').length}개</Text>
                  </View>
                </View>
                <Text style={styles.optionSubtitle}>
                  만든 모임과 참여자를 관리하세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" style={styles.optionChevron} />
            </TouchableOpacity>

            {/* 종료된 모임 */}
            <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewEndedEvents}>
              {hasRatingNotificationForEndedEventsOption() && (
                <View style={styles.cardTopNotificationBadge} />
              )}
              <View style={[styles.optionIconContainer, { backgroundColor: colors.PRIMARY }]}>
                <Ionicons name="checkmark-circle" size={30} color="#0F1115" />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>종료된 모임</Text>
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>{endedEvents.filter(event =>
                      event.organizerId === user?.uid ||
                      (event.participants && event.participants.includes(user?.uid))
                    ).length}개</Text>
                  </View>
                </View>
                <Text style={styles.optionSubtitle}>
                  종료된 모임의 <Text style={{ color: colors.PRIMARY }}>러닝매너</Text>를 작성하세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666666" style={styles.optionChevron} />
            </TouchableOpacity>

            {/* 추가 정보 섹션 */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>💡 모임 관리 팁</Text>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.PRIMARY} />
                <Text style={styles.infoText}>모임 생성 시 상세한 정보를 입력하면 더 많은 참여자를 모을 수 있어요</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.PRIMARY} />
                <Text style={styles.infoText}>참여한 모임은 시작 24시간 전까지 취소할 수 있어요</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.PRIMARY} />
                <Text style={styles.infoText}>날씨나 상황 변경 시 참여자들에게 미리 알려주세요</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.statsEntryButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('RunningStats')}
            >
              <Ionicons name="stats-chart" size={18} color="#000000" />
              <Text style={styles.statsEntryButtonText}>러닝 통계 보기</Text>
              <Ionicons name="chevron-forward" size={18} color="#000000" />
            </TouchableOpacity>

            {isFeedLoading ? (
              <View style={styles.runningFeedPlaceholderCard}>
                <ActivityIndicator size="small" color={colors.PRIMARY} />
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
                <Ionicons name="fitness-outline" size={34} color={colors.PRIMARY} />
                <Text style={styles.runningFeedPlaceholderTitle}>러닝 기록이 없어요</Text>
                <Text style={styles.runningFeedPlaceholderText}>
                  RunOn과 Apple Fitness의 러닝 기록이 여기에 표시됩니다.
                </Text>
              </View>
            ) : (
              <View style={styles.runningFeedList}>
                {feedWorkouts.slice(0, feedVisibleCount).map((workout, index, slicedWorkouts) => {
                  const isRunOnWorkout = isRunOnWorkoutSource(workout);
                  const isRunOnLocalWorkout = isRunOnWorkout && `${workout?.id || ''}`.startsWith('runon-');
                  const isLastItem = index === slicedWorkouts.length - 1;
                  const workoutMeta = feedMetaMap?.[workout.id] || {};
                  const effortLevel = Number.isInteger(workoutMeta?.effortLevel)
                    ? Math.max(0, Math.min(10, workoutMeta.effortLevel))
                    : null;
                  const savedMemo = `${workoutMeta?.memo || ''}`.trim();
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
                    <TouchableOpacity
                      key={workout.id}
                      style={[styles.runningFeedItemCard, !isLastItem && styles.runningFeedItemDivider]}
                      activeOpacity={1}
                      onLongPress={() => {
                        if (!isRunOnLocalWorkout) return;
                        Alert.alert(
                          '러닝 기록 삭제',
                          'RunOn 측정 기록을 삭제하시겠어요?',
                          [
                            { text: '취소', style: 'cancel' },
                            {
                              text: '삭제',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await runOnRunningService.deleteRecord(workout.id);
                                  setFeedMetaMap((prev) => {
                                    const next = { ...prev };
                                    delete next[workout.id];
                                    persistFeedMeta(next);
                                    return next;
                                  });
                                  setMemoDraftMap((prev) => {
                                    const next = { ...prev };
                                    delete next[workout.id];
                                    return next;
                                  });
                                  await loadRunningFeed();
                                } catch (error) {
                                  Alert.alert('오류', '기록 삭제에 실패했습니다.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      delayLongPress={350}
                    >
                      <View style={styles.runningFeedItemHeader}>
                        <View>
                          <Text style={styles.runningFeedItemDate}>{dateLabel}</Text>
                          <View style={[styles.runningFeedSourceBadge, isRunOnWorkout && styles.runningFeedSourceBadgeRunOn]}>
                            <Text style={[styles.runningFeedSourceBadgeText, isRunOnWorkout && styles.runningFeedSourceBadgeTextRunOn]}>
                              {workout.sourceLabel || 'RunOn'}
                            </Text>
                          </View>
                        </View>
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

                      {Array.isArray(workout.routeCoordinates) && workout.routeCoordinates.length >= 2 && (
                        <View style={styles.runningFeedMapWrapper}>
                          <RouteMapSnapshot
                            coordinates={workout.routeCoordinates}
                            workoutId={workout.id}
                          />
                        </View>
                      )}

                      <View style={styles.runningFeedFooter}>
                        <View style={styles.runningFeedActionButtons}>
                          <TouchableOpacity
                            style={styles.runningFeedIconButton}
                            onPress={() => handleFeedLikePress(workout)}
                          >
                            <Ionicons
                              name={effortLevel !== null ? 'heart' : 'heart-outline'}
                              size={22}
                              color={colors.TEXT}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.runningFeedIconButton}
                            onPress={() => handleFeedMemoPress(workout)}
                          >
                            <Ionicons
                              name={savedMemo ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                              size={22}
                              color={colors.TEXT}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.runningFeedIconButton}
                            onPress={() => handleFeedSharePress(workout)}
                          >
                            <Ionicons name="share-social-outline" size={22} color={colors.TEXT} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {expandedEffortWorkoutId === workout.id && (
                        <View style={styles.runningFeedEffortContainer}>
                          <View style={styles.runningFeedEffortHeader}>
                            <Text style={styles.runningFeedEffortTitle}>훈련 강도</Text>
                            <Text style={styles.runningFeedEffortValue}>{effortLevel ?? 0}/10</Text>
                          </View>
                          <View style={styles.runningFeedEffortScaleRow}>
                            {Array.from({ length: 11 }).map((_, level) => {
                              const isActive = effortLevel !== null && level <= effortLevel;
                              const activeColor = EFFORT_COLORS[level] || colors.PRIMARY;
                              return (
                                <TouchableOpacity
                                  key={`${workout.id}-effort-${level}`}
                                  style={styles.runningFeedEffortTapArea}
                                  onPress={() => handleEffortSelect(workout.id, level)}
                                >
                                  <View
                                    style={[
                                      styles.runningFeedEffortBar,
                                      isActive
                                        ? { backgroundColor: activeColor, borderColor: activeColor }
                                        : styles.runningFeedEffortBarInactive,
                                    ]}
                                  />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <View style={styles.runningFeedEffortLabels}>
                            <Text style={styles.runningFeedEffortLabelText}>0</Text>
                            <Text style={styles.runningFeedEffortLabelText}>10</Text>
                          </View>
                        </View>
                      )}

                      {expandedMemoWorkoutId === workout.id && (
                        <View style={styles.runningFeedMemoContainer}>
                          <TextInput
                            style={styles.runningFeedMemoInput}
                            placeholder="메모를 입력하세요"
                            placeholderTextColor="#77777D"
                            multiline
                            value={memoDraftMap?.[workout.id] ?? savedMemo}
                            onChangeText={(text) => handleMemoDraftChange(workout.id, text)}
                          />
                          <View style={styles.runningFeedMemoFooter}>
                            <Text style={styles.runningFeedMemoHint}>로컬에 저장됩니다</Text>
                            <TouchableOpacity
                              style={styles.runningFeedMemoSaveButton}
                              onPress={() => handleFeedMemoSave(workout.id)}
                            >
                              <Text style={styles.runningFeedMemoSaveButtonText}>저장</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
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
        workoutSource={selectedFeedWorkout?.sourceLabel || selectedFeedWorkout?.sourceName || null}
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

const ScheduleCard = ({ event, onEdit, onDelete, onPress, onEndedLongPress, isCreatedByMe = false, showOrganizerInfo = false, cardIndex, showJoinButton = true, isEnded = false, hasRatingNotification = false, hasMeetingNotification = false, navigation, user }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [buttonLayout, setButtonLayout] = useState(null);
  const [cardLayout, setCardLayout] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 16 });
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [isEvaluationCompleted, setIsEvaluationCompleted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const actionModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const actionSheetTranslateY = useRef(new Animated.Value(300)).current;
  
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
      style={[
        styles.eventCard,
        isEnded && isEvaluationCompleted && styles.eventCardCompleted
      ]}
      onPress={handleCardPress}
      onLongPress={isEnded && typeof onEndedLongPress === 'function' ? () => onEndedLongPress(event) : undefined}
      delayLongPress={isEnded && typeof onEndedLongPress === 'function' ? 450 : undefined}
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
          <Ionicons name="location-outline" size={16} color={colors.PRIMARY} />
          <Text style={styles.infoText}>{event.location}</Text>
        </View>

        {/* 날짜/시간 */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={colors.PRIMARY} />
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
                  <Ionicons name="checkmark-circle" size={16} color={colors.PRIMARY} />
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
        workoutSource={event?.sourceLabel || event?.sourceName || null}
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

// 확정된 모임 장소 마커 색 (iOS 시스템 레드). 미확정 중앙 핀의 시안 PRIMARY와 대비되도록
// 의도적으로 고정색을 쓴다 — 라이트/다크 어느 쪽에서도 "확정" 신호가 같아야 한다.
const CONFIRMED_MARKER_COLOR = '#FF3B30';

// 지도 중심이 확정 마커와 "겹쳤다"고 볼 기준 — 현재 보이는 범위의 4% 이내
// (지도 높이 420px 기준 약 17px. 살짝만 끌어도 중앙 핀이 다시 나타난다)
const CENTER_PIN_SNAP_RATIO = 0.04;

const isCenterOnMarker = (region, markerCoord) => {
  if (!region || !markerCoord) return false;
  return (
    Math.abs(region.latitude - markerCoord.latitude) < region.latitudeDelta * CENTER_PIN_SNAP_RATIO &&
    Math.abs(region.longitude - markerCoord.longitude) < region.longitudeDelta * CENTER_PIN_SNAP_RATIO
  );
};

/**
 * 모임 생성 2단계 인라인 지도 (Apple Maps)
 *
 * 위치 지정 방식은 중앙 고정 핀 하나뿐이다 — 지도를 끌어 원하는 지점을 중앙 시안 핀에 맞추고
 * 핀을 누르면 그 자리에 빨간 마커가 확정된다. 확정 순간 시안 핀은 숨겨져서,
 * 사용자 눈에는 "핀이 빨갛게 변하며 지도에 박히는" 것으로 보인다.
 * 지도를 다시 끌면 마커에서 멀어지는 순간 시안 핀이 되돌아온다.
 *
 * 반드시 모듈 스코프에 둘 것 — 부모 함수 안에서 정의하면 부모가 리렌더될 때마다
 * 새 컴포넌트 타입이 만들어져 지도가 언마운트/리마운트되고 카메라가 initialRegion으로 튄다.
 */
const InlineAppleMapComponent = React.memo(({
  selectedLocation,
  markerCoord,
  onCommitCoord,
  inlineMapRef,
  onCurrentLocationPress,
  mapCenterRef,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialRegion = useMemo(() => {
    if (!selectedLocation?.lat || !selectedLocation?.lng) return null;
    return {
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  // 지도 중심 추적 (중앙 고정 핀이 가리키는 위치).
  // 확정 후 정렬 애니메이션에서 줌을 그대로 유지하려면 delta까지 함께 들고 있어야 한다.
  const centerRegionRef = useRef(initialRegion ? { ...initialRegion } : null);

  // onRegionChange가 준 region을 안전한 형태로 정규화 (비정상 값이면 null → 이후 동작 전부 skip)
  const normalizeRegion = useCallback((region) => {
    if (!Number.isFinite(region?.latitude) || !Number.isFinite(region?.longitude)) return null;
    const prev = centerRegionRef.current;
    return {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: Number.isFinite(region.latitudeDelta)
        ? region.latitudeDelta
        : (prev?.latitudeDelta ?? 0.005),
      longitudeDelta: Number.isFinite(region.longitudeDelta)
        ? region.longitudeDelta
        : (prev?.longitudeDelta ?? 0.005),
    };
  }, []);

  // 확정 마커가 화면 중앙에 있으면 중앙 핀을 숨긴다 (겹쳐서 색 변화가 안 보이므로)
  const [centerPinHidden, setCenterPinHidden] = useState(!!markerCoord);

  // 확정 직후 정렬 애니메이션 동안에는 핀 표시를 건드리지 않는다 (깜빡임 방지)
  const suppressPinRef = useRef(false);

  // 드래그 중에도 즉시 반응하도록 onRegionChange(연속 호출)로 추적한다.
  // 실제 setState는 표시 여부가 뒤집힐 때만 일어나므로 리렌더 비용은 거의 없다.
  const handleRegionChange = useCallback((region) => {
    const next = normalizeRegion(region);
    if (!next) return;
    centerRegionRef.current = next;
    if (suppressPinRef.current) return;

    const hidden = isCenterOnMarker(next, markerCoord);
    setCenterPinHidden((prev) => (prev === hidden ? prev : hidden));
  }, [markerCoord, normalizeRegion]);

  const handleRegionChangeComplete = useCallback((region) => {
    const next = normalizeRegion(region);
    if (!next) return;
    centerRegionRef.current = next;
    // 장소명 검색 시 현재 보고 있는 지역을 기준으로 정렬하기 위해 부모에도 공유
    if (mapCenterRef) {
      mapCenterRef.current = { lat: next.latitude, lng: next.longitude };
    }
  }, [mapCenterRef, normalizeRegion]);

  // 중앙 고정 핀을 눌러 현재 지도 중심을 모임 장소로 확정
  const handleCenterPinPress = useCallback(() => {
    const region = centerRegionRef.current;
    if (!region) return;

    onCommitCoord(region.latitude, region.longitude);
    setCenterPinHidden(true);
    suppressPinRef.current = true;
    setTimeout(() => { suppressPinRef.current = false; }, 400);

    // 확정 지점을 화면 정중앙으로 정렬. 관성 스크롤 도중 눌러 중심이 미세하게
    // 어긋났을 때를 보정한다. 현재 delta를 그대로 넘기므로 줌 레벨은 유지된다.
    //
    // animateCamera가 아니라 animateToRegion을 쓴다 — 같은 화면에서 앱을 죽였던 API이고
    // (New Arch TurboModule은 인자 타입이 틀리면 JS 예외가 아니라 네이티브 abort),
    // animateToRegion은 MapScreen·RunningTrackerScreen에서 실기기 검증된 경로다.
    // 인자는 (region, duration "숫자") — 객체를 넘기면 안 된다.
    try {
      inlineMapRef?.current?.animateToRegion(
        {
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        },
        300
      );
    } catch (error) {
      // 정렬은 미세 보정일 뿐이라 실패해도 확정 자체는 이미 끝났다. 앱을 죽이지 않는다.
      console.log('지도 중앙 정렬 실패(무시):', error);
    }
  }, [onCommitCoord, inlineMapRef]);

  if (!initialRegion) return null;

  // 확정된 마커가 없으면 중앙 핀은 무조건 보여야 한다.
  // (같은 장소를 다시 검색해 카메라가 실제로 움직이지 않으면 onRegionChange가 안 오는데,
  //  숨김 상태가 그대로 굳으면 확정할 방법이 사라진다)
  const showCenterPin = !markerCoord || !centerPinHidden;

  return (
    <View style={styles.inlineMapSection}>
      <View style={styles.inlineMapContainer}>
        <MapView
          ref={inlineMapRef}
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          mapType="standard"
        >
          {markerCoord && (
            <Marker coordinate={markerCoord} tracksViewChanges={false}>
              <View style={styles.inlineMarkerContainer}>
                <View style={styles.inlineMarkerPin} />
                <View style={styles.inlineMarkerTail} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* 중앙 고정 핀 오버레이 — 지도를 움직여 위치를 맞추고 핀을 눌러 확정 */}
        {showCenterPin && (
          <View style={styles.centerPinOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.centerPinTouchable}
              onPress={handleCenterPinPress}
              activeOpacity={0.85}
            >
              <View style={styles.centerPinBadge}>
                <Text style={styles.centerPinBadgeText}>여기로 지정</Text>
              </View>
              <Ionicons
                name="location"
                size={40}
                color={colors.PRIMARY}
                style={styles.centerPinIcon}
              />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={onCurrentLocationPress}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color={colors.PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const RunningEventCreationFlow = ({ onEventCreated, onClose, editingEvent }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    // 기본값: 내일 날짜 (로컬 시간대 기준 YYYY-MM-DD — UTC 변환 시 하루 밀리는 문제 방지)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
  // 초기값 null: GPS로 받아 설정, 실패 시 null 유지 → 오류 UI 표시
  const [selectedLocationData, setSelectedLocationData] = useState(null);
  const [isLocationInitialized, setIsLocationInitialized] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false); // 드롭다운 표시 상태

  // 주소/장소명 검색 (도로명 주소를 입력해 지도를 해당 위치로 이동)
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');

  // 모달 오버레이 페이드 애니메이션
  const datePickerModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const timePickerModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  
  // 커스텀 마커 관련 상태
  const [customLocation, setCustomLocation] = useState('');
  const [hasCustomMarker, setHasCustomMarker] = useState(false);
  const [customMarkerCoords, setCustomMarkerCoords] = useState(null);
  
  // GPS 권한 상태 (안내 문구 노출용)
  const [isGpsPermissionGranted, setIsGpsPermissionGranted] = useState(false);
  const inlineMapRef = useRef(null);
  const mapMoveRetryTimeoutsRef = useRef([]);
  const hasUserSelectedLocationRef = useRef(false);
  // 현재 지도 중심 좌표 (장소명 검색 시 가까운 결과를 우선 정렬하는 기준)
  const mapCenterRef = useRef(null);
  
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

  // 지도 초기화: GPS 권한 요청 후 현재 위치로 초기값 설정
  useEffect(() => {
    const initializeMapLocationState = async () => {
      // 편집 모드이거나 이미 초기화된 경우 스킵
      if (editingEvent || isLocationInitialized) {
        setIsLocationLoading(false);
        return;
      }

      setIsLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === 'granted';
        setIsGpsPermissionGranted(granted);

        if (granted) {
          try {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            // 사용자가 검색으로 직접 선택하지 않은 경우에만 GPS 위치로 초기화
            if (!hasUserSelectedLocationRef.current) {
              setSelectedLocationData({
                name: '',
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                address: '',
              });
            }
          } catch (gpsError) {
            console.log('GPS 현재 위치 획득 실패:', gpsError);
            setSelectedLocationData(null);
          }
        } else {
          setSelectedLocationData(null);
        }
      } catch (error) {
        console.log('위치 권한 상태 확인 실패:', error);
        setIsGpsPermissionGranted(false);
        setSelectedLocationData(null);
      }

      setIsLocationInitialized(true);
      setIsLocationLoading(false);
    };

    initializeMapLocationState();
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
      setIsLocationLoading(false);

      // 커스텀 마커 좌표를 기준으로 지도 위치 설정
      // 신형 이벤트는 customMarkerCoords 없이 coordinates(GeoPoint)만 저장되므로 폴백 처리
      let restoredCoords = null;
      if (editingEvent.customMarkerCoords) {
        restoredCoords = {
          lat: editingEvent.customMarkerCoords.lat ?? editingEvent.customMarkerCoords.latitude,
          lng: editingEvent.customMarkerCoords.lng ?? editingEvent.customMarkerCoords.longitude,
        };
      } else if (editingEvent.coordinates) {
        // GeoPoint: 접근자(latitude/longitude) 또는 직렬화(_lat/_long) 모두 지원
        restoredCoords = {
          lat: editingEvent.coordinates.latitude ?? editingEvent.coordinates._lat,
          lng: editingEvent.coordinates.longitude ?? editingEvent.coordinates._long,
        };
      }

      if (restoredCoords && restoredCoords.lat != null && restoredCoords.lng != null) {
        setCustomMarkerCoords(restoredCoords);
        setHasCustomMarker(true);

        // selectedLocationData를 마커 좌표로 설정 (지도 중심을 마커 위치로)
        setSelectedLocationData({
          name: editingEvent.location || '',
          lat: restoredCoords.lat,
          lng: restoredCoords.lng,
          address: '',
        });
      } else {
        // 좌표가 전혀 없는 경우 — 오류 UI로 위치 재지정 유도
        setSelectedLocationData(null);
      }

      // 장소명 상태 복원
      if (editingEvent.location) {
        setSelectedLocation('custom');
      }

      // 상세 위치 설명 복원
      if (editingEvent.customLocation) {
        setCustomLocation(editingEvent.customLocation);
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


  // 지도 이동 함수 (Apple MapView animateToRegion)
  const moveMapToLocation = useCallback((lat, lng) => {
    inlineMapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 400);
  }, []);

  // 현재 위치 버튼: GPS 권한 요청 후 실제 위치로 지도 이동
  const moveToCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setIsGpsPermissionGranted(granted);

      if (!granted) {
        Alert.alert('위치 권한 필요', '현재 위치 기능을 사용하려면 GPS 권한을 허용해주세요.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;

      if (!hasUserSelectedLocationRef.current) {
        setSelectedLocationData({
          name: '',
          lat: latitude,
          lng: longitude,
          address: '',
        });
      } else {
        moveMapToLocation(latitude, longitude);
      }
    } catch (error) {
      console.log('GPS 현재 위치 획득 실패:', error);
      Alert.alert('위치 오류', 'GPS 위치를 가져올 수 없습니다.');
    }
  }, [moveMapToLocation]);

  // 주소/장소명 검색 실행
  const handleLocationSearch = useCallback(async () => {
    const query = locationQuery.trim();
    if (!query) {
      return;
    }

    Keyboard.dismiss();
    setIsSearchingLocation(true);
    setLocationSearchError('');
    setShowLocationDropdown(true);

    try {
      const results = await kakaoPlacesService.searchPlaces(query, {
        center: mapCenterRef.current,
      });

      setLocationResults(results);

      if (results.length === 0) {
        setLocationSearchError('검색 결과가 없습니다. 도로명 주소나 장소 이름을 다시 확인해주세요.');
      }
    } catch (error) {
      console.log('장소 검색 실패:', error);
      setLocationResults([]);
      setLocationSearchError('검색에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
    } finally {
      setIsSearchingLocation(false);
    }
  }, [locationQuery]);

  // 검색 결과 선택 → 기존 확정을 해제하고 그 위치로 지도 이동
  // (새 장소를 검색한 이상 이전 확정은 무효. 화면 밖에 마커가 남아 엉뚱한 좌표로 모임이
  //  만들어지는 것을 막는다. 확정은 사용자가 중앙 핀을 눌러 다시 해야 한다)
  const handleSelectSearchResult = useCallback((place) => {
    // GPS 초기화 로직이 검색으로 옮긴 위치를 덮어쓰지 않도록 표시
    hasUserSelectedLocationRef.current = true;
    mapCenterRef.current = { lat: place.lat, lng: place.lng };

    // 상세 위치 설명(customLocation) 텍스트는 일부러 지우지 않는다 —
    // 입력칸은 잠시 숨겨졌다가 다시 확정하면 쓰던 내용 그대로 되살아난다.
    setHasCustomMarker(false);
    setCustomMarkerCoords(null);

    setShowLocationDropdown(false);
    setLocationResults([]);
    setLocationSearchError('');
    setLocationQuery(place.roadAddress || place.name);
    Keyboard.dismiss();

    // 지도가 아직 마운트되지 않은 상태(GPS 실패·권한 거부)라면 검색 위치로 지도를 띄운다
    if (!selectedLocationData?.lat || !selectedLocationData?.lng) {
      setSelectedLocationData({
        name: place.name || '',
        lat: place.lat,
        lng: place.lng,
        address: place.roadAddress || place.jibunAddress || '',
      });
      return;
    }

    // 이미 지도가 떠 있으면 state 교체 없이 카메라만 이동 (지도 리마운트·마커 소실 방지)
    moveMapToLocation(place.lat, place.lng);
  }, [selectedLocationData, moveMapToLocation]);

  const handleClearLocationSearch = useCallback(() => {
    setLocationQuery('');
    setLocationResults([]);
    setLocationSearchError('');
    setShowLocationDropdown(false);
  }, []);

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
          '지도를 움직여 원하는 모임 장소를 정하고 클릭해주세요.',
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
      Alert.alert('모임장소를 정해주세요', '지도를 움직여 원하는 모임 장소를 정하고 클릭해주세요.');
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

  // 로컬 시간대 기준 YYYY-MM-DD (toISOString의 UTC 변환으로 날짜가 하루 밀리는 문제 방지)
  const toLocalDateString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toDisplayTimeString = (d) => {
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  // 스크롤 중에는 작업용 값(date/time)만 갱신하고, 확정은 '확인'에서 처리 → '취소' 시 되돌릴 수 있게
  const handleDateChange = React.useCallback((event, selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, []);

  const handleDatePickerConfirm = React.useCallback(() => {
    setDateString(toLocalDateString(date));
    setShowDatePicker(false);
  }, [date]);

  const handleDatePickerCancel = React.useCallback(() => {
    // 작업용 값을 마지막 확정값으로 되돌림
    setDate(new Date(`${dateString}T00:00:00`));
    setShowDatePicker(false);
  }, [dateString]);

  const handleTimeChange = React.useCallback((event, selectedTime) => {
    if (selectedTime) {
      setTime(selectedTime);
    }
  }, []);

  const handleTimePickerConfirm = React.useCallback(() => {
    setTimeString(toDisplayTimeString(time));
    setShowTimePicker(false);
  }, [time]);

  const handleTimePickerCancel = React.useCallback(() => {
    // 작업용 값을 마지막 확정 문자열로부터 되돌림
    const m = timeString.match(/(오전|오후)\s*(\d+):(\d+)/);
    if (m) {
      let h = parseInt(m[2], 10);
      const min = parseInt(m[3], 10);
      if (m[1] === '오후' && h !== 12) h += 12;
      if (m[1] === '오전' && h === 12) h = 0;
      const reverted = new Date();
      reverted.setHours(h, min, 0, 0);
      setTime(reverted);
    }
    setShowTimePicker(false);
  }, [timeString]);

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

  // 중앙 핀으로 모임 장소 확정
  const handleCommitCoord = useCallback((latitude, longitude) => {
    setHasCustomMarker(true);
    setCustomMarkerCoords({ lat: latitude, lng: longitude });
  }, []);

  // 지도에 넘길 마커 좌표 ({lat,lng} → {latitude,longitude})
  const markerCoordForMap = useMemo(() => {
    if (!hasCustomMarker || !customMarkerCoords) return null;
    return { latitude: customMarkerCoords.lat, longitude: customMarkerCoords.lng };
  }, [hasCustomMarker, customMarkerCoords]);

  // 검색 결과 한 줄 렌더링
  const renderLocationSearchResult = (place) => (
    <TouchableOpacity
      key={place.id}
      style={styles.locationResultItem}
      onPress={() => handleSelectSearchResult(place)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={place.source === 'address' ? 'map-outline' : 'location-outline'}
        size={18}
        color={colors.PRIMARY}
        style={styles.locationResultIcon}
      />
      <View style={styles.locationResultTextGroup}>
        <Text style={styles.locationResultName} numberOfLines={1}>
          {place.name}
        </Text>
        {!!(place.roadAddress || place.jibunAddress) && (
          <Text style={styles.locationResultAddress} numberOfLines={1}>
            {place.roadAddress || place.jibunAddress}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // 장소 선택 렌더링 (인라인 드롭다운 방식)
  const renderLocationSelection = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>장소 선택</Text>

      {/* 주소·장소명 검색 — 입력한 위치로 지도를 이동시킨다 */}
      <View style={styles.locationSearchContainer}>
        <Ionicons name="search" size={18} color={colors.TEXT_SECONDARY} />
        <TextInput
          style={styles.locationSearchInput}
          value={locationQuery}
          onChangeText={setLocationQuery}
          placeholder="도로명 주소 또는 장소 이름 검색"
          placeholderTextColor={colors.TEXT_SECONDARY}
          returnKeyType="search"
          onSubmitEditing={handleLocationSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {locationQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearLocationSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.locationSearchButton, !locationQuery.trim() && styles.locationSearchButtonDisabled]}
          onPress={handleLocationSearch}
          disabled={!locationQuery.trim() || isSearchingLocation}
          activeOpacity={0.8}
        >
          {isSearchingLocation ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.locationSearchButtonText}>검색</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 검색 결과 목록 */}
      {showLocationDropdown && !isSearchingLocation && (
        <View style={styles.locationResultsContainer}>
          {locationResults.length > 0
            ? locationResults.map(renderLocationSearchResult)
            : !!locationSearchError && (
                <Text style={styles.locationResultEmptyText}>{locationSearchError}</Text>
              )}
        </View>
      )}

      {/* 선택된 장소 정보 및 지도 */}
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

  // 인라인 지도 컴포넌트는 모듈 스코프의 InlineAppleMapComponent 사용
  // (컴포넌트 함수 안에서 정의하면 렌더마다 새 타입이 생겨 지도가 통째로 리마운트된다)


  // 인라인 지도 컴포넌트 메모이제이션
  const memoizedInlineMap = useMemo(() => {
    // 로딩 중
    if (isLocationLoading) {
      return (
        <View style={styles.locationErrorContainer}>
          <Ionicons name="locate-outline" size={32} color="#3AF8FF" />
          <Text style={styles.locationLoadingText}>현재 위치를 불러오는 중...</Text>
        </View>
      );
    }

    // 위치 데이터 없음 (GPS 실패 또는 권한 거부)
    if (!selectedLocationData || !selectedLocationData.lat || !selectedLocationData.lng) {
      return (
        <View style={styles.locationErrorContainer}>
          <Ionicons name="warning-outline" size={32} color="#FF4444" />
          <Text style={styles.locationErrorTitle}>위치 오류</Text>
          <Text style={styles.locationErrorText}>
            GPS 위치를 가져올 수 없습니다.{'\n'}
            위 검색창에 주소를 입력하거나 위치 권한을 허용해주세요.
          </Text>
        </View>
      );
    }

    return (
      <React.Fragment>
        <View style={styles.mapGuideSection}>
          <View style={styles.mapGuideTextContainer}>
            <Text style={styles.requiredMark}>*</Text>
            <Text style={styles.mapGuideText}>지도를 움직여 원하는 모임 장소를 정하고 클릭하세요!</Text>
          </View>
        </View>
        <InlineAppleMapComponent
          selectedLocation={selectedLocationData}
          markerCoord={markerCoordForMap}
          onCommitCoord={handleCommitCoord}
          inlineMapRef={inlineMapRef}
          onCurrentLocationPress={moveToCurrentLocation}
          mapCenterRef={mapCenterRef}
        />
      </React.Fragment>
    );
  }, [selectedLocationData, markerCoordForMap, handleCommitCoord, moveToCurrentLocation, isLocationLoading, styles]);

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
          blurOnSubmit={false}
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
                textColor={colors.TEXT}
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
                textColor={colors.TEXT}
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
          <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
        </TouchableOpacity>
        <Text style={styles.flowTitle}>
          {editingEvent ? '모임 수정' : '새 모임 만들기'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.TEXT} />
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

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
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
    color: colors.TEXT,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Pretendard-Bold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Pretendard-Regular',
  },
  createButton: {
    backgroundColor: colors.PRIMARY,
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
    backgroundColor: colors.CARD,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
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
    color: colors.TEXT,
    marginLeft: 8,
    flexShrink: 1,
    fontFamily: 'Pretendard-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.SURFACE,
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
    backgroundColor: colors.BORDER,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT,
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
    color: colors.PRIMARY,
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
    color: colors.TEXT,
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
    color: colors.TEXT,
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
    color: colors.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  evaluationButton: {
    backgroundColor: colors.PRIMARY,
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
    backgroundColor: colors.SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.PRIMARY,
  },
  evaluationCompletedButtonText: {
    fontSize: 14,
    color: colors.PRIMARY,
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
    backgroundColor: colors.BORDER,
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
    color: colors.TEXT,
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
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT,
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
    backgroundColor: colors.PRIMARY + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.PRIMARY + '40',
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
    color: colors.PRIMARY,
  },
  publicBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.PRIMARY + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.PRIMARY + '40',
  },
  publicText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.PRIMARY,
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
    color: colors.PRIMARY,
    marginLeft: 8,
  },
  // Flow styles
  flowContainer: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
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
    color: colors.TEXT,
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
    backgroundColor: colors.BACKGROUND,
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
    backgroundColor: colors.BACKGROUND,
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
    color: colors.TEXT_SECONDARY,
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.PRIMARY,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: colors.BORDER,
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
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.PRIMARY,
    borderColor: colors.PRIMARY,
    shadowColor: colors.PRIMARY,
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
    backgroundColor: colors.PRIMARY,
  },
  stepLineInactive: {
    backgroundColor: colors.TEXT_SECONDARY,
  },
  stepContent: {
    gap: 14,
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.TEXT,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventTypeCard: {
    backgroundColor: colors.SURFACE,
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
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
    borderWidth: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.PRIMARY,
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
    color: colors.TEXT,
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
    color: colors.TEXT,
  },
  textInput: {
    backgroundColor: colors.SURFACE,
    padding: 12,
    borderRadius: 8,
    color: colors.TEXT,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 48,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  paceInput: {
    backgroundColor: colors.SURFACE,
    padding: 12,
    borderRadius: 8,
    color: colors.TEXT,
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
    color: colors.TEXT_SECONDARY,
  },
  paceHint: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  difficultyCardSelected: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
    borderWidth: 1,
  },
  difficultyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
  },
  difficultyDescription: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  dateTimeButton: {
    backgroundColor: colors.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.BORDER,
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
    color: colors.TEXT,
  },
  timeSelectButton: {
    backgroundColor: colors.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSelectText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },


  dateTimePickerContainer: {
    backgroundColor: colors.SURFACE,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  datePickerContainer: {
    backgroundColor: colors.SURFACE,
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
    borderBottomColor: colors.BORDER,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.TEXT,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT_SECONDARY,
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.PRIMARY,
  },
  dateTimePicker: {
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT_SECONDARY,
  },
  confirmButton: {
    padding: 12,
    backgroundColor: colors.PRIMARY,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  shareOption: {
    backgroundColor: colors.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareOptionSelected: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
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
    color: colors.TEXT,
  },
  shareOptionDescription: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  
  // 주의사항 섹션 스타일
  noticeSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.PRIMARY + '15',
    borderRadius: 16,
    shadowColor: colors.PRIMARY,
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
    color: colors.PRIMARY,
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
    color: colors.TEXT,
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
    backgroundColor: colors.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  locationTypeCardSelected: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
    borderWidth: 1,
  },
  locationTypeEmoji: {
    fontSize: 32,
  },
  locationTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 4,
  },
  locationTypeDescription: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
  
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationCard: {
    backgroundColor: colors.SURFACE,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    width: '47%',
    position: 'relative',
  },
  locationCardSelected: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
    borderWidth: 1,
  },
  locationEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.TEXT,
    textAlign: 'center',
    marginBottom: 4,
  },
  locationDistance: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.PRIMARY + '20',
    borderRadius: 6,
  },
  mapButtonText: {
    fontSize: 11,
    color: colors.PRIMARY,
    fontWeight: '500',
  },
  
  // 선택된 장소 표시 스타일
  selectedLocationDisplay: {
    backgroundColor: colors.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.PRIMARY,
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
    color: colors.TEXT,
    marginBottom: 2,
  },
  selectedLocationDescription: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
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
    backgroundColor: colors.TEXT_SECONDARY,
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
    color: colors.TEXT,
  },
  locationModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT_SECONDARY,
  },
  locationModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.PRIMARY,
  },
  locationModalConfirmTextDisabled: {
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.CARD,
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
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT,
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
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationSearchResultSubtitle: {
    color: colors.TEXT_SECONDARY,
    fontSize: 12,
  },
  locationSearchResultCategory: {
    color: colors.PRIMARY,
    fontSize: 10,
    marginTop: 2,
  },
  noSearchResultsContainer: {
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  noSearchResultsText: {
    color: colors.TEXT,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  noSearchResultsSubtext: {
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
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
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
    borderWidth: 1,
  },
  locationTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
  },
  
  // 구체적 장소 선택 스타일
  specificLocationContainer: {
    marginBottom: 8,
  },
  specificLocationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT_SECONDARY,
    flex: 1,
  },
  dropdownButtonTextSelected: {
    color: colors.TEXT,
    fontWeight: '500',
  },
  
  // 드롭다운 목록 스타일
  dropdownList: {
    backgroundColor: colors.SURFACE,
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
    backgroundColor: colors.PRIMARY + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.TEXT,
    flex: 1,
  },
  dropdownItemDistance: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
  popularBadgeSmall: {
    backgroundColor: colors.PRIMARY,
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
    backgroundColor: colors.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedLocationDistance: {
    fontSize: 12,
    color: colors.PRIMARY,
    fontWeight: '500',
  },
  coursePhotoSection: {
    marginBottom: 8,
  },
  coursePhotoButton: {
    backgroundColor: colors.SURFACE,
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
    backgroundColor: colors.PRIMARY + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coursePhotoTextContainer: {
    flex: 1,
  },
  coursePhotoButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 2,
  },
  coursePhotoButtonSubtitle: {
    fontSize: 13,
    color: colors.TEXT,
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
    color: colors.TEXT,
    textAlign: 'left',
  },
  gpsPermissionNotice: {
    marginTop: 6,
    marginLeft: 22,
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    lineHeight: 18,
  },
  locationErrorContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.CARD,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    gap: 8,
  },
  locationErrorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4444',
    marginTop: 4,
  },
  locationErrorText: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationLoadingText: {
    fontSize: 14,
    color: '#3AF8FF',
    marginTop: 8,
  },
  requiredMark: {
    color: colors.PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  
  // 주소·장소명 검색 스타일
  locationSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: colors.CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.TEXT,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  locationSearchButton: {
    minWidth: 56,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSearchButtonDisabled: {
    opacity: 0.4,
  },
  locationSearchButtonText: {
    // 시안 배경 위 텍스트 — 라이트/다크 공통으로 검정이 대비가 가장 높다
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  locationResultsContainer: {
    marginTop: 8,
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
    overflow: 'hidden',
  },
  locationResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.BORDER,
  },
  locationResultIcon: {
    marginRight: 10,
  },
  locationResultTextGroup: {
    flex: 1,
  },
  locationResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT,
  },
  locationResultAddress: {
    marginTop: 2,
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
  },
  locationResultEmptyText: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    lineHeight: 18,
  },

  // 인라인 카카오맵 스타일
  inlineMapSection: {
    marginTop: 8,
    marginHorizontal: -20,
  },
  inlineMapContainer: {
    height: 420,
    overflow: 'hidden',
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inlineMarkerContainer: {
    alignItems: 'center',
  },
  // 확정된 모임 장소 마커 — 빨강 = 확정, 시안(중앙 핀) = 아직 미확정
  inlineMarkerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CONFIRMED_MARKER_COLOR,
    borderWidth: 2,
    borderColor: '#fff',
  },
  inlineMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: CONFIRMED_MARKER_COLOR,
    marginTop: -2,
  },
  // 중앙 고정 핀 오버레이 (지도 중심에 떠 있는 위치 지정 핀)
  centerPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinTouchable: {
    alignItems: 'center',
    // 핀 아이콘의 뾰족한 끝(하단)이 지도 정중앙을 가리키도록 위로 보정
    transform: [{ translateY: -20 }],
  },
  centerPinBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: colors.PRIMARY,
  },
  centerPinBadgeText: {
    color: colors.PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  centerPinIcon: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.CARD,
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
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3AF8FF',
  },
  customLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.PRIMARY,
    marginBottom: 8,
  },
  customLocationInput: {
    backgroundColor: colors.CARD,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    fontSize: 16,
    color: colors.TEXT,
    marginBottom: 8,
  },
  customLocationHint: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.TEXT,
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
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.TEXT,
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
    color: colors.PRIMARY,
    marginRight: 6,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },

  // 메인 옵션 카드 스타일
  mainOptionCard: {
    backgroundColor: colors.CARD,
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 104,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
    overflow: 'hidden',
    position: 'relative',
  },
  optionIconContainer: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: colors.BORDER,
  },
  optionContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionChevron: {
    alignSelf: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.TEXT,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY_STRONG,
    lineHeight: 20,
  },
  optionBadge: {
    backgroundColor: colors.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.PRIMARY,
  },

  // 모임/러닝 피드 토글
  modeToggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.BACKGROUND,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  modeTogglePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    backgroundColor: colors.PRIMARY,
  },
  modeToggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
  },
  modeToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    lineHeight: 22,
  },

  // 헤더 스타일
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
    backgroundColor: colors.BACKGROUND,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.TEXT,
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.TEXT,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  statsEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: colors.PRIMARY,
  },
  statsEntryButtonText: {
    fontSize: 16,
    // 시안 배경 위 텍스트 — colors.BACKGROUND는 라이트모드에서 흰색이라 대비가 무너진다
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
    marginLeft: 8,
    marginRight: 4,
  },
  runningFeedPlaceholderCard: {
    backgroundColor: colors.CARD,
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
    color: colors.TEXT,
    marginTop: 12,
    marginBottom: 8,
  },
  runningFeedPlaceholderText: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  runningFeedRetryButton: {
    marginTop: 14,
    backgroundColor: colors.PRIMARY,
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
    marginBottom: 16,
    backgroundColor: colors.BACKGROUND,
  },
  runningFeedItemCard: {
    backgroundColor: colors.BACKGROUND,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  runningFeedItemDivider: {
    borderBottomWidth: 3,
    borderBottomColor: colors.DIVIDER,
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
    color: colors.TEXT,
  },
  runningFeedSourceBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  runningFeedSourceBadgeRunOn: {
    backgroundColor: colors.PRIMARY,
    borderColor: colors.PRIMARY,
  },
  runningFeedSourceBadgeText: {
    fontSize: 11,
    color: colors.TEXT,
    fontWeight: '600',
  },
  runningFeedSourceBadgeTextRunOn: {
    color: '#000000',
  },
  runningFeedItemTime: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
  },
  runningFeedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  runningFeedMapWrapper: {
    marginHorizontal: -14,  // 카드 paddingHorizontal(14) 상쇄 → 풀 너비
    marginBottom: 12,
    overflow: 'hidden',
  },
  runningFeedStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  runningFeedStatLabel: {
    fontSize: 13,
    color: colors.TEXT,
    marginBottom: 4,
  },
  runningFeedStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.TEXT,
  },
  runningFeedFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  runningFeedActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  runningFeedIconButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  runningFeedEffortContainer: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F2F35',
    backgroundColor: colors.CARD,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  runningFeedEffortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  runningFeedEffortTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.TEXT,
  },
  runningFeedEffortValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  runningFeedEffortScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runningFeedEffortTapArea: {
    flex: 1,
    paddingHorizontal: 1,
  },
  runningFeedEffortBar: {
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
  },
  runningFeedEffortBarInactive: {
    backgroundColor: colors.SURFACE,
    borderColor: '#34343C',
  },
  runningFeedEffortLabels: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  runningFeedEffortLabelText: {
    fontSize: 11,
    color: colors.TEXT_SECONDARY,
  },
  runningFeedMemoContainer: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F2F35',
    backgroundColor: colors.CARD,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  runningFeedMemoInput: {
    minHeight: 76,
    maxHeight: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303038',
    backgroundColor: colors.SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.TEXT,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  runningFeedMemoFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runningFeedMemoHint: {
    fontSize: 11,
    color: colors.TEXT_SECONDARY,
  },
  runningFeedMemoSaveButton: {
    backgroundColor: colors.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  runningFeedMemoSaveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },



  // 업데이트된 이벤트 카드 스타일
  eventTitleContainer: {
    flex: 1,
  },
  organizerText: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT,
    fontWeight: '500',
  },
  bottomMenuItemTextDelete: {
    color: '#F44336',
  },
  bottomModalSeparator: {
    height: 8,
    backgroundColor: colors.BACKGROUND,
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
    color: colors.TEXT,
    marginBottom: 4,
  },
  coursePhotoDescription: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  coursePhotoDistance: {
    fontSize: 14,
    color: colors.PRIMARY,
    fontWeight: '500',
    marginBottom: 8,
  },
  coursePhotoFeatures: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  coursePhotoFeature: {
    fontSize: 13,
    color: colors.TEXT,
    marginBottom: 2,
  },
  coursePhotoLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  coursePhotoLoadingText: {
    color: colors.TEXT_SECONDARY,
    fontSize: 15,
  },
  
  // 러닝매너 작성 모달창 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT,
    fontFamily: 'Pretendard-Bold',
  },
  modalEventInfo: {
    backgroundColor: colors.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
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
    color: colors.TEXT,
    fontFamily: 'Pretendard-Regular',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.TEXT,
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
    backgroundColor: colors.CARD,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: colors.PRIMARY,
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
  const { guideStates, currentGuide, startGuide, completeGuide } = guideContext;
  
  // 사용자 프로필 상태 추가
  const [userProfile, setUserProfile] = useState(null);
  
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

  // setTimeout ID 저장용 ref
  const guideTimeoutRef = useRef(null);

  // 모임탭 가이드 시작 조건: 온보딩 완료 + 가이드 미완료 (최초 1회)
  useEffect(() => {
    if (!userProfile || !guideStates) return;

    if (userProfile.onboardingCompleted &&
        !guideStates.meetingGuideCompleted &&
        currentGuide !== 'meeting') {
      if (guideTimeoutRef.current) {
        clearTimeout(guideTimeoutRef.current);
        guideTimeoutRef.current = null;
      }
      guideTimeoutRef.current = setTimeout(() => {
        if (userProfile.onboardingCompleted &&
            !guideStates.meetingGuideCompleted &&
            currentGuide !== 'meeting') {
          startGuide('meeting');
        }
        guideTimeoutRef.current = null;
      }, 500);
    }
  }, [userProfile, guideStates, currentGuide]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (guideTimeoutRef.current) {
        clearTimeout(guideTimeoutRef.current);
      }
    };
  }, []);
  
  // 모임탭 가이드 (단일 스텝, 최초 1회만 노출)
  const meetingGuideStep = {
    id: 'overview',
    title: '모임탭',
    description: `같이 달릴 모임을 만들고,\n내가 달린 기록을 러닝 피드로 공유해보세요`,
    targetId: 'meetingTabOverview',
    highlightShape: 'none',
  };



  return (
    <View style={{ flex: 1 }}>
      <ScheduleScreen {...props} />

      {/* 모임탭 가이드 오버레이 (최초 1회) */}
      {currentGuide === 'meeting' && meetingGuideStep && (
        <GuideOverlay
          visible={true}
          title={meetingGuideStep.title}
          description={meetingGuideStep.description}
          targetPosition={null}
          targetSize={null}
          highlightShape={meetingGuideStep.highlightShape}
          showArrow={false}
          onNext={() => completeGuide('meeting')}
          isLastStep={true}
          targetId={meetingGuideStep.targetId}
        />
      )}
    </View>
  );
};


export default ScheduleScreenWithGuide;
export { ScheduleScreen }; 