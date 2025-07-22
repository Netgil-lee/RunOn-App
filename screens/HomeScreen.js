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

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719', // 카드 컴포넌트용 더 짙은 색상
};

const HomeScreen = ({ navigation }) => {
  const { user, testUserProfile } = useAuth();
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
      // 테스트 모드인 경우 기본값 사용
      if (user.uid === 'test-user-id') {
        setCommunityActivity({
          totalParticipated: 0,
          thisMonth: 0,
          hostedEvents: 0,
          mannerScore: 5.0,
        });
        return;
      }

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
  }, [user, testUserProfile]);

  // 사용자 프로필 데이터 상태
  const [userProfile, setUserProfile] = useState(null);

  // 사용자 프로필 데이터 가져오기
  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      // 테스트 모드인 경우
      if (user.uid === 'test-user-id') {
        if (testUserProfile) {
          setUserProfile(testUserProfile);
        } else {
          setUserProfile({
            displayName: '테스트 사용자',
            bio: '테스트 모드 사용자입니다.',
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
        return;
      }

      // 실제 사용자인 경우 Firestore에서 프로필 데이터 가져오기
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
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
    general: [
      {
        id: 1,
        type: 'system',
        title: '냇길 앱 업데이트',
        message: '새로운 기능이 추가되었습니다. 한강 러닝 코스 지도와 실시간 날씨 정보를 확인해보세요!',
        time: '1시간 전',
        isRead: false,
        icon: 'refresh-circle',
        action: 'update'
      },
      {
        id: 2,
        type: 'weather',
        title: '오늘은 러닝하기 좋은 날씨!',
        message: '기온 18도, 습도 60%로 러닝하기 최적의 날씨입니다. 한강공원에서 러닝을 즐겨보세요.',
        time: '3시간 전',
        isRead: false,
        icon: 'partly-sunny',
        action: 'weather'
      },
      {
        id: 3,
        type: 'event',
        title: '봄맞이 러닝 챌린지 시작!',
        message: '3월 한 달간 100km 달성 챌린지에 참여하고 특별한 뱃지를 받아보세요.',
        time: '1일 전',
        isRead: true,
        icon: 'trophy',
        action: 'challenge'
      },
      {
        id: 4,
        type: 'tip',
        title: '러닝 팁: 올바른 자세',
        message: '러닝 시 허리를 펴고 팔꿈치를 90도로 유지하면 더 효율적으로 달릴 수 있습니다.',
        time: '2일 전',
        isRead: true,
        icon: 'fitness',
        action: 'tip'
      },
      {
        id: 5,
        type: 'safety',
        title: '한강 주변 안전 주의',
        message: '오늘 밤 한강 주변에 안개가 발생할 예정입니다. 러닝 시 주의하세요.',
        time: '30분 전',
        isRead: false,
        icon: 'warning',
        action: 'safety'
      }
    ],
    meeting: [
      {
        id: 6,
        type: 'reminder',
        title: '잠실한강공원 러닝 모임',
        message: '오늘 오후 7시 잠실한강공원에서 러닝 모임이 시작됩니다. 미리 준비해주세요!',
        time: '30분 전',
        isRead: false,
        icon: 'time',
        action: 'meeting',
        meetingId: 'meeting_001'
      },
      {
        id: 7,
        type: 'rating',
        title: '러닝매너점수 작성 요청',
        message: '어제 참여한 반포한강공원 러닝 모임의 러닝매너점수를 작성해주세요.',
        time: '1일 전',
        isRead: false,
        icon: 'star',
        action: 'rating',
        meetingId: 'meeting_002'
      },
      {
        id: 8,
        type: 'cancel',
        title: '망원한강공원 러닝 모임 취소',
        message: '날씨 악화로 인해 오늘 예정된 망원한강공원 러닝 모임이 취소되었습니다.',
        time: '2일 전',
        isRead: true,
        icon: 'close-circle',
        action: 'cancel',
        meetingId: 'meeting_003'
      },

    ],
    chat: [
      {
        id: 10,
        type: 'message',
        title: '잠실한강공원 러닝 모임',
        message: '김러너님이 "내일 날씨가 좋을 것 같아요!" 메시지를 보냈습니다.',
        time: '10분 전',
        isRead: false,
        icon: 'chatbubble',
        action: 'chat',
        chatId: 'chat_001'
      },
      {
        id: 11,
        type: 'like',
        title: '게시글 좋아요',
        message: '러닝매니아님이 당신의 "한강 러닝 후기" 게시글에 좋아요를 눌렀습니다.',
        time: '1시간 전',
        isRead: false,
        icon: 'heart',
        action: 'like',
        postId: 'post_001'
      },
      {
        id: 12,
        type: 'comment',
        title: '게시글 댓글',
        message: '초보러너님이 당신의 "러닝화 추천" 게시글에 댓글을 남겼습니다.',
        time: '2시간 전',
        isRead: false,
        icon: 'chatbubble-ellipses',
        action: 'comment',
        postId: 'post_002'
      },
      {
        id: 13,
        type: 'mention',
        title: '게시글에서 언급',
        message: '박러너님이 "오늘 러닝 팁" 게시글에서 당신을 언급했습니다.',
        time: '1일 전',
        isRead: true,
        icon: 'at',
        action: 'mention',
        postId: 'post_003'
      }
    ]
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
        title="홈"
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