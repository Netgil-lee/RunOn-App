// screens/MapScreen.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Linking, StatusBar, TouchableOpacity, Text, TextInput, FlatList, ScrollView, Image, Animated, Dimensions, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetFooter, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import EventDetailScreen, { EventDetailBottomButton } from './EventDetailScreen';
import firestoreService from '../services/firestoreService';
import { unifiedSearch } from '../services/searchService';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import evaluationService from '../services/evaluationService';
import { recordCafeVisit, recordFoodVisit } from '../services/userActivityService';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// 현재 위치 마커는 SVG로 직접 생성 (이미지 파일 사용 안 함)

// 운영시간 요일 키 → 한국어 표기
const OPERATING_HOURS_DAY_LABELS = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
  saturday: '토요일',
  sunday: '일요일',
  월요일: '월요일',
  화요일: '화요일',
  수요일: '수요일',
  목요일: '목요일',
  금요일: '금요일',
  토요일: '토요일',
  일요일: '일요일',
};

// 오늘을 기준으로 앞으로 7일의 요일 순서 (0=일, 1=월, ..., 6=토)
const JS_DAY_TO_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** 오늘을 기준으로 앞으로 7일의 요일 순서 반환 */
function getDaysOrderFromToday() {
  const today = new Date().getDay();
  const order = [];
  for (let i = 0; i < 7; i++) {
    order.push(JS_DAY_TO_KEY[(today + i) % 7]);
  }
  return order;
}

/** 오늘 기준 index(0-6)일 후의 날짜를 (month)/(date) 형식으로 반환 */
function getDateLabelForPosition(index) {
  const d = new Date();
  d.setDate(d.getDate() + index);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 운영시간 값에서 표시 텍스트 반환 (휴무 버튼 클릭 시 '휴무' 등)
function getOperatingHoursDisplayText(hours) {
  if (hours == null || hours === '') return '휴무';
  if (typeof hours === 'string') {
    const s = hours.trim().toLowerCase();
    if (s === '휴무' || s === 'closed' || s === 'close') return '휴무';
    return hours; // 그 외 문자열은 그대로 (예: "휴무")
  }
  if (typeof hours === 'object') {
    if (hours.closed === true) {
      const reason = hours.closedReason?.trim();
      return reason ? `휴무 (${reason})` : '휴무';
    }
    const open = hours.open != null ? String(hours.open).trim() : '';
    const close = hours.close != null ? String(hours.close).trim() : '';
    if (!open && !close) return '휴무';
    if (open.toLowerCase() === '휴무' || close.toLowerCase() === '휴무') return '휴무';
    if (open === 'closed' || close === 'closed') return '휴무';
    if (open && close) return `${open} - ${close}`;
    if (open) return open;
    if (close) return close;
    return '휴무';
  }
  return '휴무';
}

function getInstagramUrl(entity) {
  if (!entity) return '';
  const raw = entity.instagramLink || entity.instagramUrl || entity.instagramURL || '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** 바텀시트 목록용 날짜 라벨 (MeetingCard와 동일 규칙) */
function formatMapEventDateLabel(dateString) {
  if (!dateString) return '날짜 미정';
  if (dateString.includes('(') && dateString.includes(')')) {
    return dateString.replace(/^\d{4}년\s*/, '');
  }
  try {
    let date;
    if (dateString.includes('년')) {
      const cleaned = dateString.replace(/^\d{4}년\s*/, '');
      const match = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
      if (match) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        date = new Date(new Date().getFullYear(), month - 1, day);
      }
    } else {
      date = new Date(dateString);
    }
    if (date && !isNaN(date.getTime())) {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      return `${month}월 ${day}일 (${dayOfWeek})`;
    }
  } catch {
    // ignore
  }
  return dateString.replace(/^\d{4}년\s*/, '');
}

function mapEventParticipantLabel(meeting) {
  const participantCount = Array.isArray(meeting.participants)
    ? meeting.participants.length
    : meeting.participants || 1;
  const maxParticipantText = meeting.maxParticipants ? `/${meeting.maxParticipants}` : '';
  return `${participantCount}${maxParticipantText}`;
}

function mapEventDistanceLabel(meeting) {
  if (meeting.distance == null || meeting.distance === '') return '-';
  const s = String(meeting.distance).trim();
  if (/km$/i.test(s)) return s;
  return `${s}km`;
}

const PinMarker = React.memo(({ color }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{
      width: 32, height: 32, borderRadius: 16, backgroundColor: color,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35, shadowRadius: 3, elevation: 4,
    }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
    </View>
    <View style={{ width: 0, height: 0,
      borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderTopColor: color, marginTop: -2 }} />
  </View>
));

const MapScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  
  // route params에서 대시보드에서 전달된 데이터 받기
  const { targetEventId, targetCafeId, targetFoodId, activeToggle: initialToggle, searchQuery: initialSearchQuery } = route?.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [activeToggle, setActiveToggle] = useState('events'); // 'events' | 'cafes' | 'foods'
  const [events, setEvents] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [foods, setFoods] = useState([]);
  // useFocusEffect 내부에서 최신 값을 읽기 위한 refs
  // (cafes/foods를 의존성에 넣으면 setCafes/setFoods 호출 시마다 effect가 재실행되어 지도가 현재위치로 튀는 버그 발생)
  const cafesRef = useRef([]);
  const foodsRef = useRef([]);
  const handleCafeClickRef = useRef(null);
  const handleFoodClickRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null); // 선택된 모임 (상세 화면 표시용)
  const [selectedCafe, setSelectedCafe] = useState(null); // 선택된 카페 (상세 화면 표시용)
  const [selectedFood, setSelectedFood] = useState(null); // 선택된 러닝푸드 (상세 화면 표시용)
  const [cafeImageIndex, setCafeImageIndex] = useState(0); // 카페 이미지 캐러셀 현재 인덱스
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false); // 이미지 원본 오버레이 표시 여부
  const [imageViewerImages, setImageViewerImages] = useState([]); // 오버레이에서 표시할 이미지 목록
  const [imageViewerInitialIndex, setImageViewerInitialIndex] = useState(0); // 오버레이 초기 인덱스
  const [imageViewerCurrentIndex, setImageViewerCurrentIndex] = useState(0); // 오버레이 현재 인덱스
  const [showAllEvents, setShowAllEvents] = useState(false); // 전체 모임 목록 표시 여부
  const [showAllCafes, setShowAllCafes] = useState(false); // 전체 카페 목록 표시 여부
  const [showAllFoods, setShowAllFoods] = useState(false); // 전체 러닝푸드 목록 표시 여부
  const [searchQuery, setSearchQuery] = useState(''); // 검색어
  const [cafeSearchQuery, setCafeSearchQuery] = useState(''); // 카페 검색어
  const [foodSearchQuery, setFoodSearchQuery] = useState(''); // 러닝푸드 검색어
  const [mapSearchQuery, setMapSearchQuery] = useState(''); // 지도 탭 검색어
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false); // 검색 중 상태
  const [showSearchResults, setShowSearchResults] = useState(false); // 검색 결과 표시 여부
  const [isSearchMode, setIsSearchMode] = useState(false); // 검색 전용 화면 모드
  const [pendingSearchResult, setPendingSearchResult] = useState(null); // 검색 모드 종료 후 처리할 검색 결과
  const mapRef = useRef(null);
  const locationWatchSubRef = useRef(null);
  /** 탭 포커스마다 최초 1회만 내 위치로 지도 패닝 */
  const didInitialCenterOnFocusRef = useRef(false);
  const currentLocationForMapRef = useRef(null);

  const animateToLocation = useCallback((lat, lng, delta = 0.02, aboveSheet = false) => {
    // aboveSheet=true 시 바텀시트(50%)가 마커를 가리지 않도록 중심을 마커 아래로 오프셋
    const latCenter = aboveSheet ? lat - delta * 0.28 : lat;
    mapRef.current?.animateToRegion({
      latitude: latCenter,
      longitude: lng,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }, 400);
  }, []);

  const syncUserLocation = useCallback((lat, lng, tryInitialPan) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    currentLocationForMapRef.current = { latitude: lat, longitude: lng };
    if (tryInitialPan && !didInitialCenterOnFocusRef.current) {
      didInitialCenterOnFocusRef.current = true;
      animateToLocation(lat, lng, 0.05);
    }
  }, [animateToLocation]);

  const bottomSheetRef = useRef(null);
  const searchInputRef = useRef(null);
  const eventDetailScreenRef = useRef(null);
  const [bottomButtonProps, setBottomButtonProps] = useState(null);
  const { user } = useAuth();
  const { endEvent, joinEvent, leaveEvent, chatRooms } = useEvents();
  const firestore = getFirestore();
  
  // footerComponent를 위한 render 함수
  const renderFooter = useCallback((props) => {
    if (activeToggle === 'events' && selectedEvent && bottomButtonProps) {
      try {
        return (
          <BottomSheetFooter {...props} bottomInset={-10}>
            <EventDetailBottomButton
              {...bottomButtonProps}
              onJoinPress={bottomButtonProps.handleJoinPress}
              onEvaluationPress={bottomButtonProps.handleEvaluationPress}
            />
          </BottomSheetFooter>
        );
      } catch (error) {
        console.error('하단 버튼 렌더링 오류:', error);
        return null;
      }
    }
    return null;
  }, [activeToggle, selectedEvent, bottomButtonProps, insets.bottom]);

  useEffect(() => {
    if (!selectedEvent) {
      setBottomButtonProps(null);
    }
  }, [selectedEvent]);
  
  // 애니메이션 값들
  const locationButtonOpacity = useRef(new Animated.Value(1)).current;
  const locationButtonWidth = useRef(new Animated.Value(52)).current;
  const searchBarBorderWidth = useRef(new Animated.Value(0)).current;
  const searchBarBorderColor = useRef(new Animated.Value(0)).current;
  
  // Bottom Sheet snap points (부분 확장, 전체 확장)
  // 토글 버튼 위치 아래까지만 확장되도록 제한
  const screenHeight = Dimensions.get('window').height;
  // 토글 버튼 위치: insets.top + 77
  // 토글 버튼 높이: paddingVertical: 12 * 2 + fontSize: 16 = 약 40px
  // 여백: 12px
  const toggleBottom = insets.top + 77 + 40 + 12;
  const maxBottomSheetHeight = screenHeight - toggleBottom;
  
  const snapPoints = useMemo(() => {
    // 시스템바를 가리지 않는 최대 높이 계산
    const maxHeightPercent = ((screenHeight - insets.top) / screenHeight) * 100;
    // 3단계 snapPoints: 부분 확장(10%), 중간 확장(50%), 전체 확장(시스템바 아래까지)
    return ['10%', '50%', `${maxHeightPercent}%`];
  }, [screenHeight, insets.top]);
  
  // Bottom Sheet 최대 높이 제한 (스와이프로 올릴 때의 최대 높이)
  // 스크롤 테스트를 위해 60% 제한 제거
  const maxDynamicContentSize = useMemo(() => {
    return maxBottomSheetHeight;
  }, [maxBottomSheetHeight]);
  
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => {
      const titleMatch = event.title?.toLowerCase().includes(query);
      const tagMatch = event.tags?.some(tag => tag.toLowerCase().includes(query));
      const hashtagMatch = event.hashtags?.toLowerCase().includes(query);
      return titleMatch || tagMatch || hashtagMatch;
    });
  }, [events, searchQuery]);

  const filteredCafes = useMemo(() => {
    if (!cafeSearchQuery.trim()) return cafes;
    const query = cafeSearchQuery.toLowerCase();
    return cafes.filter(cafe => cafe.name?.toLowerCase().includes(query));
  }, [cafes, cafeSearchQuery]);

  const filteredFoods = useMemo(() => {
    if (!foodSearchQuery.trim()) return foods;
    const query = foodSearchQuery.toLowerCase();
    return foods.filter(food => food.name?.toLowerCase().includes(query));
  }, [foods, foodSearchQuery]);

  // Runon 색상 시스템
  const COLORS = {
    PRIMARY: '#3AF8FF',
    BACKGROUND: '#000000',
    SURFACE: '#1F1F24',
    SECONDARY: '#666666',
  };

  // 기본 위치 (서울 중심)
  const DEFAULT_LOCATION = {
    latitude: 37.5665,
    longitude: 126.9780,
  };

  // 마커 좌표 추출 헬퍼 (이벤트/카페/음식 공통)
  const getMarkerCoords = useCallback((item) => {
    if (!item) return null;
    if (item.coordinates) {
      const lat = item.coordinates.latitude ?? item.coordinates._lat;
      const lng = item.coordinates.longitude ?? item.coordinates._long;
      if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return { latitude: Number(lat), longitude: Number(lng) };
      }
    }
    if (item.customMarkerCoords) {
      const lat = item.customMarkerCoords.latitude ?? item.customMarkerCoords.lat;
      const lng = item.customMarkerCoords.longitude ?? item.customMarkerCoords.lng;
      if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return { latitude: Number(lat), longitude: Number(lng) };
      }
    }
    if (Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))) {
      return { latitude: Number(item.latitude), longitude: Number(item.longitude) };
    }
    return null;
  }, []);

  // 초기 지도 영역 (서울 중심, 한 번만 계산)
  const initialRegion = useMemo(() => ({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }), []);


  // 현재 위치 가져오기 함수
  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'GPS 설정이 필요합니다',
          '현재 위치를 표시하려면 위치 권한이 필요합니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        setLocationPermission(false);
        setIsLocationLoading(false);
        return null;
      }
      
      setLocationPermission(true);
      
      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(locationData);
      setIsLocationLoading(false);
      syncUserLocation(locationData.latitude, locationData.longitude, false);

      return locationData;
    } catch (error) {
      console.error('현재 위치 가져오기 실패:', error);
      setIsLocationLoading(false);
      return null;
    }
  };

  const handleRunningStart = () => {
    navigation.navigate('RunningTracker');
  };

  // 모든 모임 데이터 로드 (반경 제한 없음)
  const loadAllEvents = async () => {
    try {
      console.log('📍 전체 모임 데이터 로드 시작');
      const allEvents = await firestoreService.getAllActiveEvents();
      console.log('✅ 전체 모임 데이터 로드 완료:', allEvents.length, '개');
      
      // 디버깅: location 필드 확인
      const eventsWithLocation = allEvents.filter(e => e.location);
      const eventsWithoutLocation = allEvents.filter(e => !e.location);
      if (eventsWithoutLocation.length > 0) {
        console.warn('⚠️ location 필드가 없는 모임:', eventsWithoutLocation.length, '개');
        eventsWithoutLocation.forEach(e => {
          console.warn('  - 모임 ID:', e.id, '제목:', e.title);
        });
      }
      
      setEvents(allEvents);
    } catch (error) {
      console.error('❌ 모임 데이터 로드 실패:', error);
    }
  };

  // 현재 위치 기준 반경 내 모임만 필터링
  const filterEventsByLocation = async (latitude, longitude) => {
    try {
      console.log('📍 현재 위치 기준 모임 필터링 시작:', latitude, longitude);
      const nearbyEvents = await firestoreService.getEventsNearbyHybrid(latitude, longitude, 3);
      console.log('✅ 현재 위치 기준 모임 필터링 완료:', nearbyEvents.length, '개');
      setEvents(nearbyEvents);
    } catch (error) {
      console.error('❌ 모임 필터링 실패:', error);
    }
  };

  // 카페 데이터 로드 (반경 제한 없음 - 모든 카페 조회)
  const loadCafes = async (latitude, longitude) => {
    try {
      console.log('📍 카페 데이터 로드 시작 (모든 카페 조회)');
      const allCafes = await firestoreService.getAllCafes();
      console.log('✅ 카페 데이터 로드 완료:', allCafes.length, '개');
      setCafes(allCafes);
    } catch (error) {
      console.error('❌ 카페 데이터 로드 실패:', error);
    }
  };

  // 러닝푸드 데이터 로드 (반경 제한 없음 - 모든 러닝푸드 조회)
  const loadFoods = async () => {
    try {
      console.log('📍 러닝푸드 데이터 로드 시작 (모든 러닝푸드 조회)');
      const allFoods = await firestoreService.getAllFoods();
      console.log('✅ 러닝푸드 데이터 로드 완료:', allFoods.length, '개');
      setFoods(allFoods);
    } catch (error) {
      console.error('❌ 러닝푸드 데이터 로드 실패:', error);
    }
  };

  // 초기 위치 설정 및 데이터 로드
  useEffect(() => {
    const initializeLocation = async () => {
      // 모든 모임 로드 (반경 제한 없음)
      await Promise.all([
        loadAllEvents(),
        loadCafes(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude), // 카페는 기본 위치 기준
        loadFoods()
      ]);
    };
    
    initializeLocation();
  }, []);

  // 로딩 타임아웃 처리 (무한 로딩 방지)
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ 지도 로딩 타임아웃 (10초) - 강제로 로딩 해제');
        setIsLoading(false);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // cafes/foods state → ref 최신화 (useFocusEffect 의존성에서 제외하기 위해 ref로 전달)
  useEffect(() => { cafesRef.current = cafes; }, [cafes]);
  useEffect(() => { foodsRef.current = foods; }, [foods]);

  // 화면 포커스 시 StatusBar 설정 및 위치 업데이트, 모임 데이터 새로고침
  useFocusEffect(
    React.useCallback(() => {
      didInitialCenterOnFocusRef.current = false;

      // StatusBar 설정 (iOS) - 한 번만 설정
      StatusBar.setBarStyle('dark-content', true);
      
      // 지도탭에서만 bottombar 구분선 추가
      navigation.setOptions({
        tabBarStyle: {
          backgroundColor: '#1F1F24',
          borderTopWidth: 1,
          borderTopColor: '#333333', // 약간 밝은 구분선 색상
          height: 85,
          paddingBottom: 36,
          paddingTop: 0,
        },
      });
      
      // 화면 포커스 시 모임 데이터 새로고침 (약간의 지연을 두어 Firestore 업데이트 반영)
      setTimeout(() => {
        loadAllEvents();
      }, 500);
      
      // 화면 포커스 시 위치 권한 확인 및 위치 업데이트
      const checkAndUpdateLocation = async () => {
        try {
          // 현재 권한 상태 확인
          const { status } = await Location.getForegroundPermissionsAsync();
          
          if (status === 'granted') {
            // 권한이 있으면 즉시 1회 갱신 (지도·마커 빠르게 표시)
            await getCurrentLocation();

            locationWatchSubRef.current?.remove();
            const sub = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 1500,
                distanceInterval: 5,
              },
              (watchLoc) => {
                const lat = watchLoc.coords.latitude;
                const lng = watchLoc.coords.longitude;
                setCurrentLocation({ latitude: lat, longitude: lng });
                syncUserLocation(lat, lng, true);
              }
            );
            locationWatchSubRef.current = sub;
          }
        } catch (error) {
          console.error('위치 권한 확인 실패:', error);
        }
      };
      
      checkAndUpdateLocation();
      
      // 대시보드에서 카페 카드 클릭으로 진입한 경우 처리
      if (targetCafeId && cafesRef.current.length > 0) {
        const targetCafe = cafesRef.current.find(cafe => cafe.id === targetCafeId);
        if (targetCafe) {
          // 토글을 카페로 변경
          setActiveToggle('cafes');
          // 해당 카페 선택 (상세 화면 표시 및 지도 이동)
          setTimeout(() => {
            handleCafeClickRef.current?.(targetCafe);
          }, 300);
          // params 초기화 (재진입 시 중복 실행 방지)
          navigation.setParams({ targetCafeId: undefined, activeToggle: undefined });
        }
      }

      // 대시보드에서 러닝푸드 카드 클릭으로 진입한 경우 처리
      if (targetFoodId && foodsRef.current.length > 0) {
        const targetFood = foodsRef.current.find(food => food.id === targetFoodId);
        if (targetFood) {
          setActiveToggle('foods');
          setTimeout(() => {
            handleFoodClickRef.current?.(targetFood);
          }, 300);
          navigation.setParams({ targetFoodId: undefined, activeToggle: undefined });
        }
      }
      
      // 대시보드에서 토글 변경 요청이 있는 경우
      if (initialToggle && !targetCafeId && !targetFoodId) {
        setActiveToggle(initialToggle);
        navigation.setParams({ activeToggle: undefined });
      }
      
      // 대시보드에서 장소 검색 요청이 있는 경우
      if (initialSearchQuery) {
        // 검색 모드 진입 및 검색어 설정
        setIsSearchMode(true);
        setMapSearchQuery(initialSearchQuery);
        // 검색 실행
        setTimeout(() => {
          performMapSearch(initialSearchQuery);
        }, 500);
        navigation.setParams({ searchQuery: undefined });
      }
      
      return () => {
        locationWatchSubRef.current?.remove();
        locationWatchSubRef.current = null;

        // 화면을 벗어날 때 원래 설정으로 복원
        StatusBar.setBarStyle('light-content', true);
        // bottombar 구분선 제거 (원래 스타일로 복원)
        navigation.setOptions({
          tabBarStyle: {
            backgroundColor: '#1F1F24',
            borderTopWidth: 0,
            height: 85,
            paddingBottom: 36,
            paddingTop: 0,
          },
        });
      };
    }, [navigation, targetCafeId, targetFoodId, initialToggle, initialSearchQuery, syncUserLocation])
  );

  // 검색 결과 선택 후 pendingSearchResult 처리
  useEffect(() => {
    if (!pendingSearchResult) return;
    const result = pendingSearchResult;
    setPendingSearchResult(null);
    if (result.searchType === 'event') {
      handleEventClick(result);
    } else if (result.searchType === 'cafe') {
      handleCafeClick(result);
    } else if (result.searchType === 'food') {
      handleFoodClick(result);
    } else if (result.searchType === 'place' && result.x && result.y) {
      animateToLocation(parseFloat(result.y), parseFloat(result.x), 0.01);
    }
  }, [pendingSearchResult]);

  // 한국 지역인지 확인하는 함수
  const isInKorea = (lat, lng) => (
    lat >= 33.0 && lat <= 38.6 && lng >= 124.5 && lng <= 132.0
  );

  // 토글 변경 핸들러
  const handleToggleChange = (toggle) => {
    setActiveToggle(toggle);
    setShowAllEvents(false);
    setShowAllCafes(false);
    setShowAllFoods(false);
    setSelectedEvent(null);
    setSelectedCafe(null);
    setSelectedFood(null);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    }
    const targetLocation = (currentLocation && isInKorea(currentLocation.latitude, currentLocation.longitude))
      ? currentLocation
      : DEFAULT_LOCATION;
    animateToLocation(targetLocation.latitude, targetLocation.longitude, 0.1);
  };

  // Bottom Sheet 핸들러
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  
  const handleSheetChanges = useCallback((index) => {
    console.log('📄 Bottom Sheet 변경:', index);
    setCurrentSheetIndex(index);
    // Bottom Sheet가 10% 또는 60%로 축소되면 전체 보기 모드 해제
    if (index === 0 || index === 1) {
      setShowAllEvents(false);
      setShowAllCafes(false);
      setShowAllFoods(false);
    }
  }, []);
  
  // 헤더 클릭 시 BottomSheet 확장
  const handleHeaderPress = useCallback(() => {
    if (bottomSheetRef.current) {
      // 현재 인덱스에서 다음 단계로 확장
      const nextIndex = currentSheetIndex < 2 ? currentSheetIndex + 1 : 0;
      bottomSheetRef.current.snapToIndex(nextIndex);
    }
  }, [currentSheetIndex]);
  
  // 커스텀 핸들 컴포넌트
  const renderHandle = useCallback(() => (
    <TouchableOpacity 
      onPress={handleHeaderPress}
      activeOpacity={0.7}
      style={styles.bottomSheetHandleContainer}
    >
      <View style={styles.bottomSheetIndicator} />
    </TouchableOpacity>
  ), [handleHeaderPress]);

  // 지도 클릭/드래그 시 Bottom Sheet 축소
  const handleMapInteraction = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0); // 부분 확장으로 복귀
    }
    setSelectedEvent(null); // 상세 화면 닫기
    setSelectedCafe(null); // 카페 상세 화면 닫기
    setSelectedFood(null); // 러닝푸드 상세 화면 닫기
    setShowAllEvents(false); // 전체 보기 모드 해제
    setShowAllCafes(false); // 전체 보기 모드 해제
    setShowAllFoods(false); // 전체 보기 모드 해제
  }, []);
  
  // 모임 클릭 핸들러
  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
    setSelectedCafe(null);
    setSelectedFood(null);
    setShowAllEvents(false); // 전체 보기 모드 해제 (상세 화면으로 전환)
    
    // Bottom Sheet 전체 확장 (60%)
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }
    
    const coords = getMarkerCoords(event);
    if (coords) animateToLocation(coords.latitude, coords.longitude, 0.01, true);
  }, [animateToLocation, getMarkerCoords]);

  const fetchEventById = useCallback(async (eventId) => {
    try {
      const eventRef = doc(firestore, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) return null;

      const eventData = eventSnap.data();
      if (eventData.status === 'ended') return null;

      return {
        id: eventSnap.id,
        ...eventData,
        createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
        updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
      };
    } catch (error) {
      console.error('딥링크 대상 모임 조회 실패:', error);
      return null;
    }
  }, [firestore]);

  useEffect(() => {
    let cancelled = false;

    const focusDeepLinkedEvent = async () => {
      if (!targetEventId || isLoading) return;

      let targetEvent = events.find(item => item.id === targetEventId);

      // 반경 필터로 목록에 없는 모임은 Firestore에서 직접 조회해 주입
      if (!targetEvent) {
        const fetchedEvent = await fetchEventById(targetEventId);
        if (cancelled || !fetchedEvent) return;

        targetEvent = fetchedEvent;

        const mergedEvents = (() => {
          const exists = events.some(item => item.id === fetchedEvent.id);
          return exists ? events : [...events, fetchedEvent];
        })();

        setEvents(mergedEvents);
      }

      if (cancelled || !targetEvent) return;

      setActiveToggle('events');

      setTimeout(() => {
        if (!cancelled) {
          handleEventClick(targetEvent);
          navigation.setParams({ targetEventId: undefined, activeToggle: undefined });
        }
      }, 450);
    };

    focusDeepLinkedEvent();

    return () => {
      cancelled = true;
    };
  }, [targetEventId, events, isLoading, fetchEventById, handleEventClick, navigation]);
  
  // 모임 상세 화면 닫기
  const handleCloseEventDetail = useCallback(() => {
    setSelectedEvent(null);
    setShowAllEvents(false); // 전체 보기 모드 해제
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1); // 중간 확장(50%)으로 복귀 - 마커 클릭 시 상태
    }
  }, []);

  // 이미지 원본 오버레이 열기
  const handleOpenImageViewer = useCallback((images, index = 0) => {
    if (!Array.isArray(images) || images.length === 0) return;

    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    setImageViewerImages(images);
    setImageViewerInitialIndex(safeIndex);
    setImageViewerCurrentIndex(safeIndex);
    setIsImageViewerVisible(true);
  }, []);

  // 이미지 원본 오버레이 닫기
  const handleCloseImageViewer = useCallback(() => {
    setIsImageViewerVisible(false);
  }, []);

  // 더보기 버튼 클릭 핸들러 (모임)
  const handleShowAllEvents = useCallback(() => {
    setShowAllEvents(true);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(2); // 전체 확장 (90%)
    }
  }, []);

  // 더보기 버튼 클릭 핸들러 (카페)
  const handleShowAllCafes = useCallback(() => {
    setShowAllCafes(true);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(2); // 전체 확장 (90%)
    }
  }, []);

  // 더보기 버튼 클릭 핸들러 (러닝푸드)
  const handleShowAllFoods = useCallback(() => {
    setShowAllFoods(true);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(2); // 전체 확장 (90%)
    }
  }, []);
  
  // 카페 클릭 핸들러
  const handleCafeClick = useCallback(async (cafe) => {
    // 먼저 기존 데이터로 표시 (로딩 느림 방지)
    setSelectedCafe(cafe);
    setSelectedEvent(null);
    setSelectedFood(null);
    setCafeImageIndex(0); // 이미지 인덱스 초기화
    setShowAllCafes(false); // 전체 보기 모드 해제 (상세 화면으로 전환)
    
    // Bottom Sheet 전체 확장 (60%) - 러닝모임과 동일
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }
    
    // 최신 카페 데이터 조회 (관리자 대시보드 수정 내용 반영)
    if (cafe?.id) {
      try {
        const latestCafe = await firestoreService.getCafeById(cafe.id);
        if (latestCafe) {
          setSelectedCafe(latestCafe);
          // cafes 배열도 업데이트 (다음 클릭 시 최신 데이터 사용)
          setCafes(prevCafes => {
            const updatedCafes = prevCafes.map(c => 
              c.id === latestCafe.id ? latestCafe : c
            );
            return updatedCafes;
          });
        }
      } catch (error) {
        console.warn('⚠️ 최신 카페 데이터 조회 실패:', error);
        // 실패해도 기존 데이터로 계속 표시
      }
    }
    
    // 카페 방문 기록 저장 (마이 대시보드용)
    if (user?.uid && cafe?.id) {
      recordCafeVisit(user.uid, {
        cafeId: cafe.id,
        cafeName: cafe.name,
        representativeImage: cafe.representativeImage || cafe.images?.[0] || null
      }).catch(error => {
        console.warn('⚠️ 카페 방문 기록 저장 실패:', error);
      });
    }
    
    const coords = getMarkerCoords(cafe);
    if (coords) animateToLocation(coords.latitude, coords.longitude, 0.01, true);
  }, [user, animateToLocation, getMarkerCoords]);

  // handleCafeClick / handleFoodClick ref 최신화
  // useFocusEffect 의존성에서 제외하기 위해 ref로 접근
  useEffect(() => { handleCafeClickRef.current = handleCafeClick; }, [handleCafeClick]);
  useEffect(() => { handleFoodClickRef.current = handleFoodClick; }, [handleFoodClick]);

  // 카페 상세 화면 닫기
  const handleCloseCafeDetail = useCallback(() => {
    setSelectedCafe(null);
    setShowAllCafes(false); // 전체 보기 모드 해제
    setIsImageViewerVisible(false);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0); // 부분 확장으로 복귀
    }
  }, []);

  // 러닝푸드 클릭 핸들러
  const handleFoodClick = useCallback(async (food) => {
    setSelectedFood(food);
    setSelectedEvent(null);
    setSelectedCafe(null);
    setCafeImageIndex(0);
    setShowAllFoods(false);

    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }

    if (food?.id) {
      try {
        const latestFood = await firestoreService.getFoodById(food.id);
        if (latestFood) {
          setSelectedFood(latestFood);
          setFoods(prevFoods => prevFoods.map(f => (f.id === latestFood.id ? latestFood : f)));
        }
      } catch (error) {
        console.warn('⚠️ 최신 러닝푸드 데이터 조회 실패:', error);
      }
    }

    if (user?.uid && food?.id) {
      recordFoodVisit(user.uid, {
        foodId: food.id,
        foodName: food.name,
        representativeImage: food.representativeImage || food.images?.[0] || null
      }).catch(error => {
        console.warn('⚠️ 러닝푸드 방문 기록 저장 실패:', error);
      });
    }

    const coords = getMarkerCoords(food);
    if (coords) animateToLocation(coords.latitude, coords.longitude, 0.01, true);
  }, [user, animateToLocation, getMarkerCoords]);

  // 러닝푸드 상세 화면 닫기
  const handleCloseFoodDetail = useCallback(() => {
    setSelectedFood(null);
    setShowAllFoods(false);
    setIsImageViewerVisible(false);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    }
  }, []);
  
  // 검색어 입력 핸들러
  const handleMapSearchInput = useCallback((query) => {
    setMapSearchQuery(query);
  }, []);
  
  // 검색 모드 진입
  const handleSearchFocus = useCallback(() => {
    // 애니메이션 먼저 시작
    Animated.parallel([
      // 현재 위치 버튼 사라지기
      Animated.timing(locationButtonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false, // width 애니메이션을 위해 false
      }),
      Animated.timing(locationButtonWidth, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      // 검색바 테두리 나타나기
      Animated.timing(searchBarBorderWidth, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchBarBorderColor, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // 애니메이션 완료 후 검색 모드 진입
      setIsSearchMode(true);
      
      // 검색 모드 진입 시 자동 포커스
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    });
  }, [locationButtonOpacity, locationButtonWidth, searchBarBorderWidth, searchBarBorderColor]);
  
  // 검색 모드 종료
  const handleSearchBack = useCallback(() => {
    // 먼저 검색 모드 종료 (검색 전용 화면 숨김)
    setIsSearchMode(false);
    setMapSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    
    // 약간의 지연 후 애니메이션 역방향 실행 (지도 화면의 검색바가 다시 나타난 후)
    setTimeout(() => {
      Animated.parallel([
        // 현재 위치 버튼 나타나기
        Animated.timing(locationButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(locationButtonWidth, {
          toValue: 52,
          duration: 300,
          useNativeDriver: false,
        }),
        // 검색바 테두리 사라지기
        Animated.timing(searchBarBorderWidth, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(searchBarBorderColor, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }, 50);
  }, [locationButtonOpacity, locationButtonWidth, searchBarBorderWidth, searchBarBorderColor]);
  
  // 통합 검색 실행
  const performMapSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const results = await unifiedSearch(query);
      const allResults = [];
      
      // Firestore 결과 추가
      if (results.firestoreResults && results.firestoreResults.length > 0) {
        results.firestoreResults.forEach(item => {
          allResults.push({
            ...item,
            searchType: item.type, // 'event' | 'cafe' | 'food'
            source: 'firestore'
          });
        });
      }
      
      // 최대 5개로 제한
      setSearchResults(allResults.slice(0, 5));
      
      // 검색 결과가 없으면 알림
      if (allResults.length === 0) {
        Alert.alert('검색 결과 없음', '장소를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('검색 실패:', error);
      Alert.alert('검색 실패', '장소를 찾을 수 없습니다.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // 검색 실행 핸들러 (엔터/입력 버튼 클릭 시)
  const handleSearchSubmit = useCallback(async () => {
    if (!mapSearchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // 검색 실행
    await performMapSearch(mapSearchQuery);
    
    // 검색 결과 확인은 performMapSearch 내부에서 처리
    // 결과가 있으면 자동으로 표시되고, 없으면 빈 상태로 유지
  }, [mapSearchQuery, performMapSearch]);
  
  // Debounce를 통한 자동 검색 (드롭다운 결과 표시)
  useEffect(() => {
    if (!mapSearchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      performMapSearch(mapSearchQuery);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [mapSearchQuery, performMapSearch]);
  
  // 검색 결과 선택 핸들러
  const handleSearchResultSelect = useCallback((result) => {
    setShowSearchResults(false);
    setMapSearchQuery('');
    
    // 검색 결과를 저장하고 검색 모드 종료
    setPendingSearchResult(result);
    setIsSearchMode(false);
    
    // 역방향 애니메이션 실행
    setTimeout(() => {
      Animated.parallel([
        // 현재 위치 버튼 나타나기
        Animated.timing(locationButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(locationButtonWidth, {
          toValue: 52,
          duration: 300,
          useNativeDriver: false,
        }),
        // 검색바 테두리 사라지기
        Animated.timing(searchBarBorderWidth, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(searchBarBorderColor, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }, 50);
  }, [locationButtonOpacity, locationButtonWidth, searchBarBorderWidth, searchBarBorderColor]);
  

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        )}
        
        {/* 검색바 및 현재 위치 버튼 */}
        <View style={[styles.mapSearchWrapper, { top: insets.top + 10 }]}>
          <Animated.View 
            style={[
              styles.mapSearchContainer,
              {
                borderWidth: searchBarBorderWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
                borderColor: searchBarBorderColor.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['transparent', '#FFFFFF'],
                }),
              }
            ]}
          >
            {isSearchMode ? (
              <TouchableOpacity 
                onPress={handleSearchBack}
                style={styles.searchBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={24} color={COLORS.SECONDARY} style={styles.mapSearchIcon} />
            )}
            <TextInput
              style={styles.mapSearchInput}
              placeholder="모임, 카페, 푸드, 장소 검색..."
              placeholderTextColor={COLORS.SECONDARY}
              value={mapSearchQuery}
              onChangeText={handleMapSearchInput}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={handleSearchFocus}
              ref={searchInputRef}
              onBlur={() => {
                // 약간의 지연 후 드롭다운 닫기 (선택 이벤트가 먼저 발생하도록)
                setTimeout(() => setShowSearchResults(false), 200);
              }}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.mapSearchLoading} />
            )}
            {mapSearchQuery.length > 0 && !isSearching && (
              <TouchableOpacity
                onPress={() => {
                  setMapSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                style={styles.mapSearchClearButton}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
              </TouchableOpacity>
            )}
          </Animated.View>
          <Animated.View
            style={[
              styles.currentLocationButton,
              {
                opacity: locationButtonOpacity,
                width: locationButtonWidth,
                marginLeft: locationButtonWidth.interpolate({
                  inputRange: [0, 52],
                  outputRange: [0, 8],
                }),
              }
            ]}
          >
            <TouchableOpacity
              style={styles.currentLocationButtonInner}
              onPress={async () => {
                const location = await getCurrentLocation();
                if (location) {
                  animateToLocation(location.latitude, location.longitude, 0.05);
                  await filterEventsByLocation(location.latitude, location.longitude);
                }
              }}
            >
            <Image 
              source={require('../assets/images/locate_button.png')} 
              style={styles.currentLocationIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* 검색 전용 화면 */}
        {isSearchMode && (
          <View style={styles.searchModeContainer}>
            <View style={[styles.searchModeHeader, { paddingTop: insets.top }]}>
              <View style={styles.searchModeSearchBar}>
                <TouchableOpacity 
                  onPress={handleSearchBack}
                  style={styles.searchModeBackButton}
                >
                  <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                </TouchableOpacity>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchModeInput}
                  placeholder="모임, 카페, 푸드, 장소 검색..."
                  placeholderTextColor={COLORS.SECONDARY}
                  value={mapSearchQuery}
                  onChangeText={handleMapSearchInput}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.searchModeLoading} />
                )}
                {mapSearchQuery.length > 0 && !isSearching && (
                  <TouchableOpacity
                    onPress={() => {
                      setMapSearchQuery('');
                      setSearchResults([]);
                    }}
                    style={styles.searchModeClearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* 검색 결과 리스트 */}
            <ScrollView style={styles.searchModeResultsList}>
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchModeResultItem}
                    onPress={() => handleSearchResultSelect(result)}
                  >
                    <Ionicons
                      name={
                        result.searchType === 'event' ? 'people' :
                        result.searchType === 'cafe' ? 'cafe' :
                        result.searchType === 'food' ? 'restaurant' :
                        'location'
                      }
                      size={20}
                      color={COLORS.PRIMARY}
                      style={styles.searchModeResultIcon}
                    />
                    <View style={styles.searchModeResultContent}>
                      <Text style={styles.searchModeResultTitle}>
                        {result.searchType === 'event' ? result.title :
                         result.searchType === 'cafe' ? result.name :
                         result.searchType === 'food' ? result.name :
                         result.name || result.place_name}
                      </Text>
                      <Text style={styles.searchModeResultSubtitle} numberOfLines={1}>
                        {result.searchType === 'event' ? result.location :
                         result.searchType === 'cafe' ? result.address :
                         result.searchType === 'food' ? result.address :
                         result.address || result.address_name || result.road_address_name}
                      </Text>
                      {result.searchType === 'place' && result.category && (
                        <Text style={styles.searchModeResultCategory}>{result.category}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : mapSearchQuery.trim().length > 0 && !isSearching ? (
                <View style={styles.searchModeEmptyContainer}>
                  <Text style={styles.searchModeEmptyText}>검색 결과가 없습니다</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
        
        {/* 검색 결과 드롭다운 (지도 화면에서만 표시) */}
        {!isSearchMode && showSearchResults && searchResults.length > 0 && (
          <View style={[styles.searchResultsDropdown, { top: insets.top + 70 }]}>
            <ScrollView style={styles.searchResultsList}>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultSelect(result)}
                >
                  <Ionicons
                    name={
                      result.searchType === 'event' ? 'people' :
                      result.searchType === 'cafe' ? 'cafe' :
                      result.searchType === 'food' ? 'restaurant' :
                      'location'
                    }
                    size={20}
                    color={COLORS.PRIMARY}
                    style={styles.searchResultIcon}
                  />
                  <View style={styles.searchResultContent}>
                    <Text style={styles.searchResultTitle}>
                      {result.searchType === 'event' ? result.title :
                       result.searchType === 'cafe' ? result.name :
                       result.searchType === 'food' ? result.name :
                       result.name || result.place_name}
                    </Text>
                    <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                      {result.searchType === 'event' ? result.location :
                       result.searchType === 'cafe' ? result.address :
                       result.searchType === 'food' ? result.address :
                       result.address || result.address_name || result.road_address_name}
                    </Text>
                    {result.searchType === 'place' && result.category && (
                      <Text style={styles.searchResultCategory}>{result.category}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* 토글 버튼 */}
        {!isSearchMode && (
          <View style={[styles.toggleContainer, { top: insets.top + 77 }]}>
          <TouchableOpacity
            style={[styles.toggleButton, activeToggle === 'events' && styles.toggleButtonActive]}
            onPress={() => handleToggleChange('events')}
          >
            <Text style={[styles.toggleText, activeToggle === 'events' && styles.toggleTextActive]}>
              러닝모임
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeToggle === 'cafes' && styles.toggleButtonActive]}
            onPress={() => handleToggleChange('cafes')}
          >
            <Text style={[styles.toggleText, activeToggle === 'cafes' && styles.toggleTextActive]}>
              러닝카페
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeToggle === 'foods' && styles.toggleButtonActive]}
            onPress={() => handleToggleChange('foods')}
          >
            <Text style={[styles.toggleText, activeToggle === 'foods' && styles.toggleTextActive]}>
              러닝푸드
            </Text>
          </TouchableOpacity>
          </View>
        )}

        {!isSearchMode && (
          <TouchableOpacity style={styles.runningStartFab} onPress={handleRunningStart}>
            <Ionicons name="play" size={18} color="#000000" />
            <Text style={styles.runningStartFabText}>러닝 시작</Text>
          </TouchableOpacity>
        )}
        
        {!isSearchMode && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            showsScale={false}
            showsTraffic={false}
            toolbarEnabled={false}
            mapType="standard"
            onPress={handleMapInteraction}
            onPanDrag={handleMapInteraction}
            onMapReady={() => setIsLoading(false)}
          >
            {activeToggle === 'events' && events.map((event) => {
              const coords = getMarkerCoords(event);
              if (!coords) return null;
              return (
                <Marker
                  key={event.id}
                  coordinate={coords}
                  onPress={() => handleEventClick(event)}
                  tracksViewChanges={false}
                >
                  <PinMarker color="#3AF8FF" />
                </Marker>
              );
            })}
            {activeToggle === 'cafes' && cafes.map((cafe) => {
              const coords = getMarkerCoords(cafe);
              if (!coords) return null;
              return (
                <Marker
                  key={cafe.id}
                  coordinate={coords}
                  onPress={() => handleCafeClick(cafe)}
                  tracksViewChanges={false}
                >
                  <PinMarker color="#FF0073" />
                </Marker>
              );
            })}
            {activeToggle === 'foods' && foods.map((food) => {
              const coords = getMarkerCoords(food);
              if (!coords) return null;
              return (
                <Marker
                  key={food.id}
                  coordinate={coords}
                  onPress={() => handleFoodClick(food)}
                  tracksViewChanges={false}
                >
                  <PinMarker color="#FF0073" />
                </Marker>
              );
            })}
          </MapView>
        )}
        
        {/* Bottom Sheet */}
        {!isSearchMode && (
          <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={false}
          enableContentPanningGesture={true}
          backgroundStyle={styles.bottomSheetBackground}
          containerStyle={{ zIndex: 500 }}
          handleComponent={renderHandle}
          maxDynamicContentSize={maxDynamicContentSize}
          topInset={0}
          footerComponent={renderFooter}
        >
          {/* 단일 BottomSheetScrollView: 모임 상세·카페 상세·목록 모두 같은 스크롤 (튕김 방지) */}
          <BottomSheetScrollView
            style={[styles.bottomSheetContent, styles.scrollView]}
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: insets.bottom + 80,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={true}
          >
            {activeToggle === 'events' && selectedEvent ? (
              // 러닝모임 상세 (외부 스크롤에 포함되어 튕김 없음)
              <EventDetailScreen
                ref={eventDetailScreenRef}
                embedInExternalScrollView={true}
                route={{
                  params: {
                    event: selectedEvent,
                    isJoined: false,
                    returnToScreen: 'MapScreen'
                  }
                }}
                onBottomButtonPropsChange={setBottomButtonProps}
                navigation={{
                  ...navigation,
                  goBack: handleCloseEventDetail
                }}
              />
            ) : activeToggle === 'cafes' && selectedCafe ? (
              // 카페 상세 화면
              <View style={styles.cafeDetailContainer}>
                  <View style={styles.cafeDetailHeader}>
                    <View style={styles.cafeDetailHeaderLeft}>
                      <Text style={styles.cafeDetailName}>{selectedCafe.name || '카페'}</Text>
                      {(() => {
                        const instagramUrl = getInstagramUrl(selectedCafe);
                        if (!instagramUrl) return null;
                        return (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(instagramUrl)}
                            style={styles.cafeDetailInstagramButton}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          >
                            <Ionicons name="logo-instagram" size={22} color="#FF4FA3" />
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                    <TouchableOpacity
                      onPress={handleCloseCafeDetail}
                      style={styles.cafeDetailCloseButton}
                    >
                      <Ionicons name="close" size={24} color={COLORS.SECONDARY} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* 카페 설명 (상호명 바로 아래) */}
                  {selectedCafe.description && (
                    <Text style={styles.cafeDetailDescription}>{selectedCafe.description}</Text>
                  )}
                  
                  {/* 카페 이미지 캐러셀 (관리자 대시보드에서 등록한 이미지들) */}
                  {(() => {
                    // 관리자 대시보드에서 등록한 이미지 필드들 수집
                    const cafeImages = [];
                    if (selectedCafe.representativeImage) {
                      cafeImages.push(selectedCafe.representativeImage);
                    }
                    if (selectedCafe.defaultImage) {
                      cafeImages.push(selectedCafe.defaultImage);
                    }
                    if (selectedCafe.runningCertImage) {
                      cafeImages.push(selectedCafe.runningCertImage);
                    }
                    // 기존 images 배열도 확인 (하위 호환성)
                    if (selectedCafe.images && Array.isArray(selectedCafe.images)) {
                      selectedCafe.images.forEach(img => {
                        if (img && !cafeImages.includes(img)) {
                          cafeImages.push(img);
                        }
                      });
                    }
                    
                    return cafeImages.length > 0 ? (
                      <View>
                        <ScrollView
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          style={styles.cafeImageSlider}
                          contentContainerStyle={styles.cafeImageSliderContent}
                          onMomentumScrollEnd={(event) => {
                            const contentOffsetX = event.nativeEvent.contentOffset.x;
                            const imageWidth = Dimensions.get('window').width - 32;
                            const currentIndex = Math.round(contentOffsetX / imageWidth);
                            setCafeImageIndex(currentIndex);
                          }}
                        >
                          {cafeImages.map((imageUri, index) => (
                            <TouchableOpacity
                              key={index}
                              activeOpacity={0.95}
                              onPress={() => handleOpenImageViewer(cafeImages, index)}
                              style={styles.cafeDetailImageTouchable}
                            >
                              <Image
                                source={{ uri: imageUri }}
                                style={styles.cafeDetailImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {/* 페이지 인디케이터 */}
                        {cafeImages.length > 1 && (
                          <View style={styles.cafeImagePagination}>
                            {cafeImages.map((_, index) => (
                              <View
                                key={index}
                                style={[
                                  styles.cafeImagePaginationDot,
                                  index === cafeImageIndex && styles.cafeImagePaginationDotActive
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    ) : null;
                  })()}
                  
                  {/* 러닝인증 혜택 */}
                  {selectedCafe.runningCertificationBenefit && (
                    <View style={styles.cafeDetailSection}>
                      <View style={styles.cafeDetailSectionTitleRow}>
                        <Ionicons name="gift-outline" size={18} color="#FFFFFF" style={styles.cafeDetailSectionTitleIcon} />
                        <Text style={styles.cafeDetailSectionTitle}>러닝인증 혜택</Text>
                      </View>
                      <View style={[styles.cafeDetailSectionContent, styles.cafeBenefit]}>
                        <Text style={styles.cafeDetailBenefitText}>
                          {selectedCafe.runningCertificationBenefit}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* 주소 */}
                  {selectedCafe.address && (
                    <View style={styles.cafeDetailSection}>
                      <View style={styles.cafeDetailAddressRow}>
                        <View style={[styles.cafeDetailSectionTitleRow, { marginBottom: 0, marginRight: 8 }]}>
                          <Ionicons name="location-outline" size={18} color="#FFFFFF" style={styles.cafeDetailSectionTitleIcon} />
                          <Text style={[styles.cafeDetailSectionTitle, { marginBottom: 0 }]}>주소</Text>
                        </View>
                        <Text style={styles.cafeDetailText}>{selectedCafe.address}</Text>
                      </View>
                    </View>
                  )}

                  {/* 운영시간 */}
                  {selectedCafe.operatingHours && (
                    <View style={styles.cafeDetailSection}>
                      <View style={[styles.cafeDetailSectionTitleRow, { marginBottom: 8 }]}>
                        <Ionicons name="time-outline" size={18} color="#FFFFFF" style={styles.cafeDetailSectionTitleIcon} />
                        <Text style={styles.cafeDetailSectionTitle}>운영시간</Text>
                      </View>
                      <View style={styles.cafeDetailSectionContent}>
                        {(() => {
                          const dayOrder = getDaysOrderFromToday();
                          return dayOrder.map((dayKey, index) => {
                            const hours = selectedCafe.operatingHours[dayKey];
                            const dayLabel = OPERATING_HOURS_DAY_LABELS[dayKey] ?? dayKey;
                            const dateLabel = getDateLabelForPosition(index);
                            const timeText = getOperatingHoursDisplayText(hours);
                            return (
                              <View key={dayKey} style={styles.operatingHoursRow}>
                                {dateLabel ? <Text style={styles.operatingHoursDate}>{dateLabel}</Text> : null}
                                <Text style={styles.operatingHoursDay}>{dayLabel}</Text>
                                <Text style={styles.operatingHoursTime}>{timeText}</Text>
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </View>
                  )}
              </View>
            ) : activeToggle === 'foods' && selectedFood ? (
              // 러닝푸드 상세 화면
              <View style={styles.cafeDetailContainer}>
                  <View style={styles.cafeDetailHeader}>
                    <View style={styles.cafeDetailHeaderLeft}>
                      <Text style={styles.cafeDetailName}>{selectedFood.name || '러닝푸드'}</Text>
                      {(() => {
                        const instagramUrl = getInstagramUrl(selectedFood);
                        if (!instagramUrl) return null;
                        return (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(instagramUrl)}
                            style={styles.cafeDetailInstagramButton}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          >
                            <Ionicons name="logo-instagram" size={22} color="#FF4FA3" />
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                    <TouchableOpacity
                      onPress={handleCloseFoodDetail}
                      style={styles.cafeDetailCloseButton}
                    >
                      <Ionicons name="close" size={24} color={COLORS.SECONDARY} />
                    </TouchableOpacity>
                  </View>
                  
                  {selectedFood.description && (
                    <Text style={styles.cafeDetailDescription}>{selectedFood.description}</Text>
                  )}
                  
                  {(() => {
                    const foodImages = [];
                    if (selectedFood.representativeImage) {
                      foodImages.push(selectedFood.representativeImage);
                    }
                    if (selectedFood.defaultImage) {
                      foodImages.push(selectedFood.defaultImage);
                    }
                    if (selectedFood.runningCertImage) {
                      foodImages.push(selectedFood.runningCertImage);
                    }
                    if (selectedFood.images && Array.isArray(selectedFood.images)) {
                      selectedFood.images.forEach(img => {
                        if (img && !foodImages.includes(img)) {
                          foodImages.push(img);
                        }
                      });
                    }
                    
                    return foodImages.length > 0 ? (
                      <View>
                        <ScrollView
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          style={styles.cafeImageSlider}
                          contentContainerStyle={styles.cafeImageSliderContent}
                          onMomentumScrollEnd={(event) => {
                            const contentOffsetX = event.nativeEvent.contentOffset.x;
                            const imageWidth = Dimensions.get('window').width - 32;
                            const currentIndex = Math.round(contentOffsetX / imageWidth);
                            setCafeImageIndex(currentIndex);
                          }}
                        >
                          {foodImages.map((imageUri, index) => (
                            <TouchableOpacity
                              key={index}
                              activeOpacity={0.95}
                              onPress={() => handleOpenImageViewer(foodImages, index)}
                              style={styles.cafeDetailImageTouchable}
                            >
                              <Image
                                source={{ uri: imageUri }}
                                style={styles.cafeDetailImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {foodImages.length > 1 && (
                          <View style={styles.cafeImagePagination}>
                            {foodImages.map((_, index) => (
                              <View
                                key={index}
                                style={[
                                  styles.cafeImagePaginationDot,
                                  index === cafeImageIndex && styles.cafeImagePaginationDotActive
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    ) : null;
                  })()}
                  
                  {selectedFood.runningCertificationBenefit && (
                    <View style={styles.cafeDetailSection}>
                      <View style={styles.cafeDetailSectionTitleRow}>
                        <Ionicons name="gift-outline" size={18} color="#FFFFFF" style={styles.cafeDetailSectionTitleIcon} />
                        <Text style={styles.cafeDetailSectionTitle}>러닝인증 혜택</Text>
                      </View>
                      <View style={[styles.cafeDetailSectionContent, styles.cafeBenefit]}>
                        <Text style={styles.cafeDetailBenefitText}>
                          {selectedFood.runningCertificationBenefit}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedFood.address && (
                    <View style={styles.cafeDetailSection}>
                      <View style={styles.cafeDetailAddressRow}>
                        <View style={[styles.cafeDetailSectionTitleRow, { marginBottom: 0, marginRight: 8 }]}>
                          <Ionicons name="location-outline" size={18} color="#FFFFFF" style={styles.cafeDetailSectionTitleIcon} />
                          <Text style={[styles.cafeDetailSectionTitle, { marginBottom: 0 }]}>주소</Text>
                        </View>
                        <Text style={styles.cafeDetailText}>{selectedFood.address}</Text>
                      </View>
                    </View>
                  )}

                  {selectedFood.operatingHours && (
                    <View style={styles.cafeDetailSection}>
                      <View style={[styles.cafeDetailSectionTitleRow, { marginBottom: 8 }]}>
                        <Ionicons name="time-outline" size={18} color="#FFFFFF" style={styles.cafeDetailSectionTitleIcon} />
                        <Text style={styles.cafeDetailSectionTitle}>운영시간</Text>
                      </View>
                      <View style={styles.cafeDetailSectionContent}>
                        {(() => {
                          const dayOrder = getDaysOrderFromToday();
                          return dayOrder.map((dayKey, index) => {
                            const hours = selectedFood.operatingHours[dayKey];
                            const dayLabel = OPERATING_HOURS_DAY_LABELS[dayKey] ?? dayKey;
                            const dateLabel = getDateLabelForPosition(index);
                            const timeText = getOperatingHoursDisplayText(hours);
                            return (
                              <View key={dayKey} style={styles.operatingHoursRow}>
                                {dateLabel ? <Text style={styles.operatingHoursDate}>{dateLabel}</Text> : null}
                                <Text style={styles.operatingHoursDay}>{dayLabel}</Text>
                                <Text style={styles.operatingHoursTime}>{timeText}</Text>
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </View>
                  )}
              </View>
            ) : (
              // 모임/카페 목록 화면 (같은 BottomSheetScrollView 안에서 스크롤)
              <>
                <View style={styles.bottomSheetHeader}>
                  {activeToggle === 'events' && (
                    <View style={styles.bottomSheetSearchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.SECONDARY} style={styles.searchIcon} />
                      <TextInput
                        style={styles.bottomSheetSearchInput}
                        placeholder="모임 제목, 태그로 검색..."
                        placeholderTextColor={COLORS.SECONDARY}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {activeToggle === 'cafes' && (
                    <View style={styles.bottomSheetSearchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.SECONDARY} style={styles.searchIcon} />
                      <TextInput
                        style={styles.bottomSheetSearchInput}
                        placeholder="카페 상호명으로 검색..."
                        placeholderTextColor={COLORS.SECONDARY}
                        value={cafeSearchQuery}
                        onChangeText={setCafeSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {cafeSearchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setCafeSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {activeToggle === 'foods' && (
                    <View style={styles.bottomSheetSearchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.SECONDARY} style={styles.searchIcon} />
                      <TextInput
                        style={styles.bottomSheetSearchInput}
                        placeholder="러닝푸드 상호명으로 검색..."
                        placeholderTextColor={COLORS.SECONDARY}
                        value={foodSearchQuery}
                        onChangeText={setFoodSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {foodSearchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setFoodSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                {activeToggle === 'events' && (
                  <View style={styles.listContent}>
                        {filteredEvents.length > 0 ? (
                          <>
                            <View style={styles.mapEventFeedList}>
                              {(showAllEvents ? filteredEvents : filteredEvents.slice(0, 5)).map((event, index, arr) => {
                                const isLastItem = index === arr.length - 1;
                                const typeBadge =
                                  (event.type && String(event.type).trim()) ||
                                  (event.eventType && String(event.eventType).trim()) ||
                                  '러닝모임';
                                return (
                                  <TouchableOpacity
                                    key={event.id || index}
                                    onPress={() => handleEventClick(event)}
                                    style={[
                                      styles.mapEventFeedItem,
                                      !isLastItem && styles.mapEventFeedItemDivider,
                                    ]}
                                    activeOpacity={0.85}
                                  >
                                    <View style={styles.mapEventFeedHeader}>
                                      <View style={styles.mapEventFeedHeaderLeft}>
                                        <Text style={styles.mapEventFeedDate}>
                                          {formatMapEventDateLabel(event.date)}
                                        </Text>
                                        <View style={styles.mapEventFeedBadge}>
                                          <Text style={styles.mapEventFeedBadgeText} numberOfLines={1}>
                                            {typeBadge}
                                          </Text>
                                        </View>
                                      </View>
                                      <Text style={styles.mapEventFeedTime}>{event.time || '-'}</Text>
                                    </View>

                                    <Text style={styles.mapEventFeedTitle} numberOfLines={2}>
                                      {event.title || '제목 없음'}
                                    </Text>

                                    <View style={styles.mapEventFeedStatRow}>
                                      <View style={styles.mapEventFeedStatItem}>
                                        <Text style={styles.mapEventFeedStatLabel}>거리</Text>
                                        <Text style={styles.mapEventFeedStatValue}>
                                          {mapEventDistanceLabel(event)}
                                        </Text>
                                      </View>
                                      <View style={styles.mapEventFeedStatItem}>
                                        <Text style={styles.mapEventFeedStatLabel}>페이스</Text>
                                        <Text style={styles.mapEventFeedStatValue}>
                                          {event.pace || '-'}
                                        </Text>
                                      </View>
                                      <View style={styles.mapEventFeedStatItem}>
                                        <Text style={styles.mapEventFeedStatLabel}>인원</Text>
                                        <Text style={styles.mapEventFeedStatValue}>
                                          {mapEventParticipantLabel(event)}
                                        </Text>
                                      </View>
                                    </View>

                                    {event.location ? (
                                      <View style={styles.mapEventFeedLocationRow}>
                                        <Ionicons name="location-outline" size={14} color={COLORS.PRIMARY} />
                                        <Text style={styles.mapEventFeedLocationText} numberOfLines={1}>
                                          {event.location}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            {!showAllEvents && filteredEvents.length > 5 && (
                              <TouchableOpacity
                                onPress={handleShowAllEvents}
                                style={styles.showMoreButton}
                              >
                                <Text style={styles.showMoreButtonText}>더보기</Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.PRIMARY} />
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                              {searchQuery.trim() 
                                ? '검색 결과가 없습니다'
                                : '주변에 러닝모임이 없습니다'}
                            </Text>
                          </View>
                        )}
                  </View>
                )}
                {activeToggle === 'cafes' && (
                  <View style={styles.listContent}>
                        {filteredCafes.length > 0 ? (
                          <>
                            {(showAllCafes ? filteredCafes : filteredCafes.slice(0, 5)).map((cafe, index) => (
                              <TouchableOpacity
                                key={cafe.id || index}
                                onPress={() => handleCafeClick(cafe)}
                                style={styles.cafeCardContainer}
                              >
                                <View style={styles.cafeCard}>
                                  {/* 카페 이미지 */}
                                  {cafe.images && cafe.images.length > 0 && (
                                    <Image
                                      source={{ uri: cafe.images[0] }}
                                      style={styles.cafeImage}
                                      resizeMode="cover"
                                    />
                                  )}
                                  <View style={styles.cafeCardContent}>
                                    <Text style={styles.cafeName}>{cafe.name || '카페'}</Text>
                                    {cafe.description && (
                                      <Text style={styles.cafeDescription} numberOfLines={2}>
                                        {cafe.description}
                                      </Text>
                                    )}
                                    {cafe.runningCertificationBenefit && (
                                      <View style={styles.cafeBenefit}>
                                        <Ionicons name="gift" size={14} color={COLORS.PRIMARY} />
                                        <Text style={styles.cafeBenefitText}>
                                          {cafe.runningCertificationBenefit}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                            {!showAllCafes && filteredCafes.length > 5 && (
                              <TouchableOpacity
                                onPress={handleShowAllCafes}
                                style={styles.showMoreButton}
                              >
                                <Text style={styles.showMoreButtonText}>더보기</Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.PRIMARY} />
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                              {cafeSearchQuery.trim() 
                                ? '검색 결과가 없습니다'
                                : '주변에 러닝카페가 없습니다'}
                            </Text>
                          </View>
                        )}
                  </View>
                )}
                {activeToggle === 'foods' && (
                  <View style={styles.listContent}>
                        {filteredFoods.length > 0 ? (
                          <>
                            {(showAllFoods ? filteredFoods : filteredFoods.slice(0, 5)).map((food, index) => (
                              <TouchableOpacity
                                key={food.id || index}
                                onPress={() => handleFoodClick(food)}
                                style={styles.cafeCardContainer}
                              >
                                <View style={styles.cafeCard}>
                                  {food.images && food.images.length > 0 && (
                                    <Image
                                      source={{ uri: food.images[0] }}
                                      style={styles.cafeImage}
                                      resizeMode="cover"
                                    />
                                  )}
                                  <View style={styles.cafeCardContent}>
                                    <Text style={styles.cafeName}>{food.name || '러닝푸드'}</Text>
                                    {food.description && (
                                      <Text style={styles.cafeDescription} numberOfLines={2}>
                                        {food.description}
                                      </Text>
                                    )}
                                    {food.runningCertificationBenefit && (
                                      <View style={styles.cafeBenefit}>
                                        <Ionicons name="gift" size={14} color={COLORS.PRIMARY} />
                                        <Text style={styles.cafeBenefitText}>
                                          {food.runningCertificationBenefit}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                            {!showAllFoods && filteredFoods.length > 5 && (
                              <TouchableOpacity
                                onPress={handleShowAllFoods}
                                style={styles.showMoreButton}
                              >
                                <Text style={styles.showMoreButtonText}>더보기</Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.PRIMARY} />
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                              {foodSearchQuery.trim()
                                ? '검색 결과가 없습니다'
                                : '주변에 러닝푸드가 없습니다'}
                            </Text>
                          </View>
                        )}
                  </View>
                )}
              </>
            )}
          </BottomSheetScrollView>
          </BottomSheet>
        )}

        <Modal
          visible={isImageViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseImageViewer}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              onPress={handleCloseImageViewer}
              style={styles.imageViewerCloseButton}
              accessibilityRole="button"
              accessibilityLabel="이미지 전체보기 닫기"
            >
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            <FlatList
              data={imageViewerImages}
              key={`image-viewer-${imageViewerInitialIndex}-${imageViewerImages.length}`}
              horizontal
              pagingEnabled
              initialScrollIndex={imageViewerInitialIndex}
              getItemLayout={(_, index) => ({
                length: Dimensions.get('window').width,
                offset: Dimensions.get('window').width * index,
                index,
              })}
              onScrollToIndexFailed={() => {}}
              onMomentumScrollEnd={(event) => {
                const contentOffsetX = event.nativeEvent.contentOffset.x;
                const imageWidth = Dimensions.get('window').width;
                const currentIndex = Math.round(contentOffsetX / imageWidth);
                setImageViewerCurrentIndex(currentIndex);
              }}
              keyExtractor={(_, index) => `image-viewer-item-${index}`}
              renderItem={({ item }) => (
                <View style={styles.imageViewerSlide}>
                  <Image
                    source={{ uri: item }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
            />

            {imageViewerImages.length > 1 && (
              <View style={styles.imageViewerCounter}>
                <Text style={styles.imageViewerCounterText}>
                  {`${imageViewerCurrentIndex + 1} / ${imageViewerImages.length}`}
                </Text>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  toggleContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    gap: 8,
    zIndex: 201,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleButton: {
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#3AF8FF',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  runningStartFab: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    zIndex: 220,
    backgroundColor: '#3AF8FF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 7,
  },
  runningStartFabText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSheetBackground: {
    backgroundColor: '#1F1F24', // bottombar 배경색과 동일 (COLORS.SURFACE)
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    // Android 그림자
    elevation: 8,
  },
  bottomSheetHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1F1F24', // bottombar 배경색과 동일 (COLORS.SURFACE)
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: '#666666',
    width: 50,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  bottomSheetSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171719',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
  },
  bottomSheetSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  bottomSheetBody: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    minHeight: 0, // flexbox에서 스크롤 가능하도록
  },
  listContent: {
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
    minHeight: 0, // flexbox에서 스크롤 가능하도록
  },
  bottomSheetScrollContent: {
    // flexGrow 제거: 콘텐츠 길이에 따라 스크롤 범위가 자동으로 결정되도록
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#1F1F24', // COLORS.SURFACE
    borderRadius: 12,
    marginHorizontal: 16,
  },
  showMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3AF8FF', // COLORS.PRIMARY
    marginRight: 8,
  },
  bottomSheetPlaceholder: {
    color: '#999999',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171719',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  mapEventFeedList: {
    marginBottom: 8,
    marginHorizontal: 20,
    backgroundColor: '#171719',
  },
  mapEventFeedItem: {
    backgroundColor: '#171719',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  mapEventFeedItemDivider: {
    borderBottomWidth: 7,
    borderBottomColor: '#000000',
  },
  mapEventFeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mapEventFeedHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  mapEventFeedDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapEventFeedBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: '#3A3A40',
    maxWidth: '100%',
  },
  mapEventFeedBadgeText: {
    fontSize: 11,
    color: '#D4D4D8',
    fontWeight: '600',
  },
  mapEventFeedTime: {
    fontSize: 13,
    color: '#A7A7AA',
  },
  mapEventFeedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  mapEventFeedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapEventFeedStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mapEventFeedStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  mapEventFeedStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapEventFeedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  mapEventFeedLocationText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
  },
  cafeCardContainer: {
    marginBottom: 12,
    marginHorizontal: 20,
  },
  cafeCard: {
    backgroundColor: '#171719',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cafeImage: {
    width: 100,
    height: 100,
    backgroundColor: '#333333',
  },
  cafeCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cafeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cafeDescription: {
    color: '#999999',
    fontSize: 12,
    marginBottom: 8,
  },
  cafeBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cafeBenefitText: {
    color: '#3AF8FF', // COLORS.PRIMARY
    fontSize: 12,
    marginLeft: 4,
  },
  cafeDetailBenefitText: {
    color: '#3AF8FF',
    fontSize: 16,
    marginLeft: 0,
  },
  cafeDetailContainer: {
    padding: 20,
  },
  cafeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cafeDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  cafeDetailName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    flexShrink: 1,
  },
  cafeDetailInstagramButton: {
    marginLeft: 8,
    padding: 2,
  },
  cafeDetailCloseButton: {
    padding: 4,
  },
  cafeImageSlider: {
    marginBottom: 12,
    height: Dimensions.get('window').width - 32,
  },
  cafeImageSliderContent: {
    paddingHorizontal: 0,
  },
  cafeDetailImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').width - 32,
    borderRadius: 12,
    backgroundColor: '#333333',
  },
  cafeDetailImageTouchable: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').width - 32,
  },
  cafeImagePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  cafeImagePaginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666666',
  },
  cafeImagePaginationDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3AF8FF', // COLORS.PRIMARY
  },
  cafeDetailSection: {
    marginBottom: 20,
  },
  cafeDetailDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  cafeDetailSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 0,
  },
  cafeDetailSectionTitleIcon: {
    opacity: 0.2,
  },
  cafeDetailSectionContent: {
    paddingLeft: 24,
  },
  cafeDetailSectionTitle: {
    color: '#FFFFFF', // 흰색
    fontSize: 18,
    fontWeight: '700',
    marginRight: 0, // 주소 타이틀 옆에 내용이 오도록
  },
  cafeDetailText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
  },
  cafeDetailAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  operatingHoursRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  operatingHoursDate: {
    color: '#999999',
    fontSize: 16,
    minWidth: 36,
  },
  operatingHoursDay: {
    color: '#999999',
    fontSize: 16,
    minWidth: 48,
  },
  operatingHoursTime: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  mapSearchWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 200,
  },
  mapSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 52,
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  mapSearchIcon: {
    marginRight: 10,
  },
  mapSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  currentLocationButton: {
    height: 52,
    borderRadius: 26,
    // overflow는 width가 0일 때만 필요하므로 조건부로 처리하지 않음
    // 그림자가 보이도록 overflow 제거
  },
  currentLocationButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  currentLocationIcon: {
    width: 23,
    height: 23,
    // 아이콘 위치 수동 조절을 위한 속성 (필요시 조정)
    marginTop: 5, // 위로 이동하려면 음수 값 (예: -2)
    marginLeft: -2, // 오른쪽으로 이동하려면 양수 값 (예: 1)
  },
  mapSearchLoading: {
    marginLeft: 8,
  },
  mapSearchClearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResultsDropdown: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 8,
    maxHeight: 300,
    zIndex: 199,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  searchResultIcon: {
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultSubtitle: {
    color: '#999999',
    fontSize: 12,
  },
  searchResultCategory: {
    color: '#666666',
    fontSize: 11,
    marginTop: 2,
  },
  // 검색 전용 화면 스타일
  searchModeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 300,
  },
  searchModeHeader: {
    backgroundColor: '#1F1F24',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  searchModeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 52,
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
  },
  searchModeBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchModeInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchModeLoading: {
    marginLeft: 8,
  },
  searchModeClearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchModeResultsList: {
    flex: 1,
    paddingTop: 16,
  },
  searchModeResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchModeResultIcon: {
    marginRight: 12,
  },
  searchModeResultContent: {
    flex: 1,
  },
  searchModeResultTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchModeResultSubtitle: {
    color: '#999999',
    fontSize: 14,
  },
  searchModeResultCategory: {
    color: '#3AF8FF',
    fontSize: 12,
    marginTop: 4,
  },
  searchModeEmptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModeEmptyText: {
    color: '#999999',
    fontSize: 14,
  },
  searchBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  imageViewerSlide: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  imageViewerImage: {
    width: Dimensions.get('window').width - 24,
    height: Dimensions.get('window').height - 120,
  },
  imageViewerCounter: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageViewerCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default MapScreen;
