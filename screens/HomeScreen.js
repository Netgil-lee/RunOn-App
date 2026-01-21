import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import AppBar from '../components/AppBar';
import InsightCard from '../components/InsightCard';
import RecommendationCard from '../components/RecommendationCard';
import WeatherCard from '../components/WeatherCard';
import HanRiverMap from '../components/HanRiverMap';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import updateService from '../services/updateService';
import storageService from '../services/storageService';

// Runon 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719', // 카드 컴포넌트용 더 짙은 색상
};

const HomeScreen = ({ navigation }) => {
  // Safe Area insets 가져오기
  const insets = useSafeAreaInsets();
  
  // Context 안전장치 추가
  const authContext = useAuth();
  const notificationContext = useNotificationSettings();
  const eventsContext = useEvents();
  const communityContext = useCommunity();
  
  // Context가 완전히 초기화되지 않은 경우 조기 반환
  if (!authContext || !notificationContext || !eventsContext || !communityContext) {
    return null;
  }
  
  const { user } = authContext;
  const { isTabEnabled, isNotificationTypeEnabled } = notificationContext;
  const { hasMeetingNotification, hasUpdateNotification } = eventsContext;
  const { hasCommunityNotification } = communityContext;
  const scrollViewRef = useRef(null);
  const MapRef = useRef(null);
  const weatherCardRef = useRef(null);
  
  // 알림 유무만 체크 (빨간색 점 표시용)
  const unreadCount = useMemo(() => {
    // 모임 알림이나 커뮤니티 알림이 있으면 1, 없으면 0
    const hasAnyNotification = hasMeetingNotification || hasUpdateNotification || hasCommunityNotification;
    return hasAnyNotification ? 1 : 0;
  }, [hasMeetingNotification, hasUpdateNotification, hasCommunityNotification]);
  
  // 로딩 상태 추가
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // 스크롤 위치 추적
  const [currentScrollOffset, setCurrentScrollOffset] = useState(0);
  
  // 광나루한강공원 클릭 핸들러
  const handleLocationClick = () => {
    // 가이드 관련 로직 제거, 기본 기능만 유지
  };
  
  // 날씨 데이터 상태
  const [weatherData, setWeatherData] = useState(null);
  
  // 새로고침 상태
  const [refreshing, setRefreshing] = useState(false);
  
  // 커뮤니티 활동 데이터 상태
  const [communityActivity, setCommunityActivity] = useState({
    totalParticipated: 0,
    thisMonth: 0,
    hostedEvents: 0,
    mannerScore: 5.0,
  });

  // 커뮤니티 활동 데이터 가져오기
  const fetchCommunityActivity = async () => {
    if (!user) return;

    try {


      // 실제 사용자인 경우 Firestore에서 데이터 가져오기
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const communityStats = userData.communityStats || {};
        
        setCommunityActivity({
          totalParticipated: communityStats.totalParticipated || 0,
          thisMonth: communityStats.thisMonthParticipated || 0,
          hostedEvents: communityStats.hostedEvents || 0,
          mannerScore: communityStats.averageMannerScore || 5.0,
        });
      }
    } catch (error) {
      console.error('커뮤니티 활동 데이터 가져오기 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    const initializeData = async () => {
      // 사용자가 없으면 초기화하지 않음
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);
        
        await Promise.all([
          fetchCommunityActivity(),
          fetchUserProfile(),
          fetchUpdateNotification()
        ]);
        
      } catch (error) {
        console.error('❌ HomeScreen: 데이터 초기화 실패:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [user]);

  // 사용자 프로필 데이터 상태
  const [userProfile, setUserProfile] = useState(null);

  // 사용자 프로필 데이터 가져오기
  const fetchUserProfile = async () => {
    if (!user) return;

    try {

      // 실제 사용자인 경우 Firestore에서 프로필 데이터 가져오기
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Firestore Timestamp 객체를 안전하게 처리
        const processedData = {
          ...userData,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          onboardingCompletedAt: userData.onboardingCompletedAt?.toDate?.() || userData.onboardingCompletedAt,
        };
        
        
        // profileImage를 profile 필드에서 가져오기
        if (processedData.profile?.profileImage) {
          processedData.profileImage = processedData.profile.profileImage;
        }
        
        // Firestore에 profileImage가 없으면 Storage에서 직접 확인
        if (!processedData.profileImage) {
          
          try {
            const storageImageUrl = await storageService.getProfileImageURLWithFallback(user.uid);
            if (storageImageUrl) {
              processedData.profileImage = storageImageUrl;
            }
          } catch (error) {
          }
        }
        
        setUserProfile(processedData);
      } else {
        // 프로필 데이터가 없는 경우 기본 데이터 설정
        const defaultProfile = {
          displayName: user.displayName || '사용자',
          bio: '자기소개를 입력해주세요.',
          profileImage: null, // 프로필 이미지 없음
          runningProfile: {
            level: 'beginner',
            pace: '6:00',
            preferredCourses: ['banpo'],
            preferredTimes: ['morning'],
            runningStyles: ['steady'],
            favoriteSeasons: ['spring'],
            currentGoals: ['habit']
          }
        };
        
        // Storage에서 프로필 이미지 확인
        try {
          const storageImageUrl = await storageService.getProfileImageURLWithFallback(user.uid);
          if (storageImageUrl) {
            defaultProfile.profileImage = storageImageUrl;
          }
        } catch (error) {
        }
        
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('사용자 프로필 데이터 가져오기 실패:', error);
      // 에러 시에도 기본 데이터 설정
      const errorProfile = {
        displayName: user.displayName || '사용자',
        bio: '자기소개를 입력해주세요.',
        profileImage: null, // 프로필 이미지 없음
        runningProfile: {
          level: 'beginner',
          pace: '6:00',
          preferredCourses: ['banpo'],
          preferredTimes: ['morning'],
          runningStyles: ['steady'],
          favoriteSeasons: ['spring'],
          currentGoals: ['habit']
        }
      };
      
      // Storage에서 프로필 이미지 확인
      try {
        const storageImageUrl = await storageService.getProfileImageURLWithFallback(user.uid);
        if (storageImageUrl) {
          errorProfile.profileImage = storageImageUrl;
        }
      } catch (storageError) {
      }
      
      setUserProfile(errorProfile);
    }
  };

  // 사용자 데이터를 카드에서 사용할 수 있는 형태로 변환
  const getUserDataForCards = () => {
    const runningProfile = userProfile?.runningProfile || {};
    
    return {
      displayName: userProfile?.displayName || user?.displayName,
      level: runningProfile.level || 'beginner',
      goal: runningProfile.currentGoals?.[0] || 'habit',
      course: runningProfile.preferredCourses?.[0] || 'banpo',
      preferredCourses: runningProfile.preferredCourses || ['banpo'],
      time: runningProfile.preferredTimes?.[0] || 'morning',
      pace: runningProfile.pace || '7:00/km',
      bio: userProfile?.bio || '',
      profileImage: userProfile?.profileImage,
      communityActivity,
    };
  };

  // WeatherCard에서 날씨 데이터를 받아오는 함수
  const handleWeatherDataUpdate = (weather) => {
    setWeatherData(weather);
  };

  // 업데이트 알림 가져오기
  const fetchUpdateNotification = async () => {
    try {
      const updateResult = await updateService.checkForUpdate();
      
      if (updateResult && updateResult.showNotification) {
        const notification = {
          id: 'update',
          type: 'update',
          title: '앱 업데이트',
          message: updateResult.message,
          timestamp: new Date(),
          isRead: false,
        };
        setUpdateNotification(notification);
      } else {
        setUpdateNotification(null);
      }
    } catch (error) {
      console.error('업데이트 알림 가져오기 실패:', error);
    }
  };

  // 새로고침 함수
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // 새로고침 시 수행할 작업들
      
      // 커뮤니티 활동 데이터 새로고침
      await fetchCommunityActivity();
      
      // 사용자 프로필 데이터 새로고침
      await fetchUserProfile();
      
      // 업데이트 알림 새로고침
      await fetchUpdateNotification();
      
      // 날씨 데이터 새로고침 (WeatherCard에서 자동으로 업데이트됨)
      // 사용자 데이터 새로고침 (AuthContext에서 자동으로 업데이트됨)
      // 이벤트 데이터 새로고침 (EventContext에서 자동으로 업데이트됨)
      
      // 새로고침 완료를 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ 홈화면 새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // 실제 알림 데이터 (NotificationScreen과 동일)
  const [notifications] = useState({
    general: [],
    meeting: [],
    chat: []
  });

  // 업데이트 알림 상태
  const [updateNotification, setUpdateNotification] = useState(null);

  // 설정에 따라 필터링된 알림 가져오기
  const getFilteredNotifications = (tabType) => {
    if (!isTabEnabled(tabType)) {
      return [];
    }
    
    return notifications[tabType].filter(notif => 
      isNotificationTypeEnabled(notif.type)
    );
  };

  // 읽지 않은 알림 카운트 계산 (필터링된 알림 기준)
  const getUnreadCount = (tabType) => {
    return getFilteredNotifications(tabType).filter(notif => !notif.isRead).length;
  };





  const handleProfilePress = () => {
    navigation.navigate('ProfileTab');
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notification');
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };


  const handleViewAllEventsPress = () => {
    Alert.alert('러닝 일정', '전체 일정 보기가 곧 추가됩니다!');
  };



  const handleRecommendationPress = () => {
    Alert.alert('러닝 시작', '러닝 추적 기능이 곧 추가됩니다!');
  };

  // 로딩 중이거나 에러가 있는 경우 처리
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.TEXT, fontSize: 16 }}>홈 화면을 불러오는 중...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.ERROR, fontSize: 16 }}>데이터를 불러오는데 실패했습니다.</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: COLORS.PRIMARY, borderRadius: 8 }}
          onPress={() => {
            setIsLoading(true);
            setHasError(false);
            fetchCommunityActivity();
            fetchUserProfile();
          }}
        >
          <Text style={{ color: COLORS.BACKGROUND }}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 데모 모드 인디케이터 */}
      {user && user.isDemo && (
        <View style={styles.demoIndicator}>
          <Text style={styles.demoText}>🎭 데모 모드</Text>
        </View>
      )}
      
      {/* AppBar */}
      <AppBar
        user={user}
        profile={userProfile}
        hideProfile={false}
        onProfilePress={handleProfilePress}
        onNotificationPress={handleNotificationPress}
        onSettingsPress={handleSettingsPress}
        onSearchPress={handleSearchPress}
        unreadCount={unreadCount}
      />


      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0, paddingHorizontal: 0 }}
        decelerationRate="normal"
        bounces={true}
        alwaysBounceVertical={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          setCurrentScrollOffset(offsetY);
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {/* 개인화된 러닝 인사이트 카드 */}
        <InsightCard
          user={getUserDataForCards()}
          weather={weatherData}
        />

        {/* 개인 맞춤 러닝 추천 카드 */}
        <RecommendationCard
          user={getUserDataForCards()}
          weather={weatherData}
        />

        {/* 날씨 정보 섹션 */}
        <View ref={weatherCardRef}>
          <WeatherCard 
            onWeatherDataUpdate={handleWeatherDataUpdate} 
            isRefreshing={refreshing}
          />
        </View>

        {/* 한강 지도 섹션 */}
        <View ref={MapRef}>
          <HanRiverMap 
            navigation={navigation}
            initialActiveTab="hanriver"
            onHanriverLocationClick={handleLocationClick}
          />
        </View>


        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
        
      </ScrollView>
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
  demoIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF0073',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1000,
  },
  demoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 100, // BottomTab을 위한 여백
  },
  eventsSection: {
    marginTop: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 80, // BottomTab 네비게이션을 위한 여백 (적절한 크기로 조정)
  },
  // 개발자 도구 툴바 스타일
  devToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  devToolbarButton: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  devToolbarButtonDanger: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  devToolbarButtonText: {
    fontSize: 10,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
});

export default HomeScreen; 