import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import AppBar from '../components/AppBar';
import InsightCard from '../components/InsightCard';
import RecommendationCard from '../components/RecommendationCard';
import WeatherCard from '../components/WeatherCard';
import HanRiverMap from '../components/HanRiverMap';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Runon 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719', // 카드 컴포넌트용 더 짙은 색상
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isTabEnabled, isNotificationTypeEnabled } = useNotificationSettings();
  const scrollViewRef = useRef(null);
  
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
    fetchCommunityActivity();
    fetchUserProfile();
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
        setUserProfile(processedData);
      } else {
        // 프로필 데이터가 없는 경우 기본 데이터 설정
        setUserProfile({
          displayName: user.displayName || '사용자',
          bio: '자기소개를 입력해주세요.',
          runningProfile: {
            level: 'beginner',
            pace: '6:00',
            preferredCourses: ['banpo'],
            preferredTimes: ['morning'],
            runningStyles: ['steady'],
            favoriteSeasons: ['spring'],
            currentGoals: ['habit']
          }
        });
      }
    } catch (error) {
      console.error('사용자 프로필 데이터 가져오기 실패:', error);
      // 에러 시에도 기본 데이터 설정
      setUserProfile({
        displayName: user.displayName || '사용자',
        bio: '자기소개를 입력해주세요.',
        runningProfile: {
          level: 'beginner',
          pace: '6:00',
          preferredCourses: ['banpo'],
          preferredTimes: ['morning'],
          runningStyles: ['steady'],
          favoriteSeasons: ['spring'],
          currentGoals: ['habit']
        }
      });
    }
  };

  // 사용자 데이터를 카드에서 사용할 수 있는 형태로 변환
  const getUserDataForCards = () => {
    if (!userProfile) return null;
    
    const runningProfile = userProfile.runningProfile || {};
    
    return {
      displayName: userProfile.displayName || '사용자',
      level: runningProfile.level || 'beginner',
      goal: runningProfile.currentGoals?.[0] || 'habit',
      course: runningProfile.preferredCourses?.[0] || 'banpo',
      preferredCourses: runningProfile.preferredCourses || ['banpo'],
      time: runningProfile.preferredTimes?.[0] || 'morning',
      pace: runningProfile.pace || '7:00/km',
      bio: userProfile.bio || '',
      profileImage: userProfile.profileImage || null,
      communityActivity,
    };
  };

  // WeatherCard에서 날씨 데이터를 받아오는 함수
  const handleWeatherDataUpdate = (weather) => {
    setWeatherData(weather);
  };

  // 새로고침 함수
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // 새로고침 시 수행할 작업들
      console.log('🔄 홈화면 새로고침 시작');
      
      // 커뮤니티 활동 데이터 새로고침
      await fetchCommunityActivity();
      
      // 사용자 프로필 데이터 새로고침
      await fetchUserProfile();
      
      // 날씨 데이터 새로고침 (WeatherCard에서 자동으로 업데이트됨)
      // 사용자 데이터 새로고침 (AuthContext에서 자동으로 업데이트됨)
      // 이벤트 데이터 새로고침 (EventContext에서 자동으로 업데이트됨)
      
      // 새로고침 완료를 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ 홈화면 새로고침 완료');
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

  const getTotalUnreadCount = () => {
    return Object.keys(notifications).reduce((total, tabType) => {
      return total + getUnreadCount(tabType);
    }, 0);
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
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

  return (
    <View style={styles.container}>
      {/* AppBar */}
      <AppBar
        user={user}
        profile={userProfile}
        hideProfile={false}
        onProfilePress={handleProfilePress}
        onNotificationPress={handleNotificationPress}
        onSettingsPress={handleSettingsPress}
        onSearchPress={handleSearchPress}
        unreadCount={getTotalUnreadCount()}
      />

      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 0 }}
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
          user={getUserDataForCards() || {
            displayName: '사용자',
            level: 'beginner',
            goal: 'habit',
            course: 'banpo',
            preferredCourses: ['banpo'],
            time: 'morning',
            pace: '7:00/km',
            bio: '',
            profileImage: null,
            communityActivity,
          }}
          weather={weatherData}
        />

        {/* 개인 맞춤 러닝 추천 카드 */}
        <RecommendationCard
          user={getUserDataForCards() || {
            displayName: '사용자',
            level: 'beginner',
            goal: 'habit',
            course: 'banpo',
            preferredCourses: ['banpo'],
            time: 'morning',
            pace: '7:00/km',
            bio: '',
            profileImage: null,
            communityActivity,
          }}
          weather={weatherData}
        />

        {/* 날씨 정보 섹션 */}
        <WeatherCard 
          onWeatherDataUpdate={handleWeatherDataUpdate} 
          isRefreshing={refreshing}
        />

        {/* 한강 지도 섹션 */}
        <HanRiverMap navigation={navigation} />

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
  moreButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 100, // BottomTab 네비게이션을 위한 여백
  },
  testSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  testButton: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default HomeScreen; 