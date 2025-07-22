import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import AppBar from '../components/AppBar';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingTimeSelector from '../components/OnboardingTimeSelector';
import OnboardingStyleSelector from '../components/OnboardingStyleSelector';
import OnboardingSeasonSelector from '../components/OnboardingSeasonSelector';
import OnboardingGoalSelector from '../components/OnboardingGoalSelector';
import OnboardingBioInput from '../components/OnboardingBioInput';
import OnboardingLevelSelector from '../components/OnboardingLevelSelector';
import OnboardingCourseSelector from '../components/OnboardingCourseSelector';
import evaluationService from '../services/evaluationService';
import { 
  HAN_RIVER_PARKS, 
  RIVER_SIDES, 
  RUNNING_LEVELS, 
  getCourseName, 
  getSeasonTitle, 
  getGoalTitle,
  getLevelInfo,
  getTimeTitle,
  getStyleTitle
} from '../constants/onboardingOptions';

// NetGill 디자인 시스템 - 홈화면과 동일한 색상 팔레트
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  TAG_GREEN: '#B6F5C9',
  TAG_YELLOW: '#FFF6B2',
  TAG_PURPLE: '#E2D6FF',
  TAG_PINK: '#FFD6E7',
  TAG_BLUE: '#B6E6F5',
  BADGE: '#1EB8C6',
};







// 안전한 가입일 포맷 함수
const getJoinDate = (createdAt) => {
  if (!createdAt) return '-';
  let dateObj;
  if (typeof createdAt === 'string') {
    dateObj = new Date(createdAt);
  } else if (createdAt.toDate) {
    dateObj = createdAt.toDate();
  } else {
    dateObj = createdAt;
  }
  if (!dateObj || isNaN(dateObj)) return '-';
  return `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
};




const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUserProfile, testUserProfile, setTestUser } = useAuth();
  const { isTabEnabled, isNotificationTypeEnabled } = useNotificationSettings();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    vibration: false,
    darkMode: false,
    accountEmail: user?.email || '',
  });
  const [editBtnPressed, setEditBtnPressed] = useState(false);
  const [profileImagePressed, setProfileImagePressed] = useState(false);

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

  // 커뮤니티 이력(실제 데이터)
  const [activity, setActivity] = useState({
    totalParticipated: 0,
    thisMonth: 0,
    hostedEvents: 0,
    mannerScore: 5.0, // 초기값 5.0
    tags: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('🔄 ProfileScreen: fetchProfile 호출됨', { 
        user: !!user, 
        userUid: user?.uid,
        testUserProfile: !!testUserProfile 
      });
      
      if (!user) {
        console.log('❌ ProfileScreen: 사용자가 없습니다. 기본 프로필 설정');
        setProfile({
          displayName: '사용자',
          bio: '자기소개를 입력해주세요.',
          runningProfile: {
            level: 'beginner',
            pace: '6:00',
            preferredCourses: [],
            preferredTimes: [],
            runningStyles: [],
            favoriteSeasons: [],
            currentGoals: []
          }
        });
        setActivity({
          totalParticipated: 0,
          thisMonth: 0,
          hostedEvents: 0,
          mannerScore: 5.0,
          tags: [],
        });
        setLoading(false);
        return;
      }
      
      console.log('🔄 ProfileScreen: 프로필 데이터 로딩 시작', { 
        uid: user.uid, 
        testUserProfile: !!testUserProfile,
        isTestUser: user.uid === 'test-user-id'
      });
      
      setLoading(true);
      
      // 테스트 모드 확인
      if (user.uid === 'test-user-id') {
        console.log('🧪 테스트 모드: 프로필 데이터 처리');
        if (testUserProfile) {
          console.log('🧪 테스트 모드: 로컬 프로필 데이터 사용', testUserProfile);
          setProfile(testUserProfile);
        } else {
          console.log('🧪 테스트 모드: 기본 프로필 데이터 사용');
          setProfile({
            displayName: '테스트 사용자',
            bio: '테스트 모드 사용자입니다.',
            runningProfile: {
              level: 'beginner',
              pace: '6:00',
              preferredCourses: [],
              preferredTimes: [],
              runningStyles: [],
              favoriteSeasons: [],
              currentGoals: []
            }
          });
        }
        
        // 테스트 모드용 기본 활동 데이터
        setActivity({
          totalParticipated: 0,
          thisMonth: 0,
          hostedEvents: 0,
          mannerScore: 5.0,
          tags: [],
        });
        console.log('✅ 테스트 모드: 프로필 데이터 로딩 완료');
        setLoading(false);
        return;
      }
      
      try {
        console.log('📊 실제 사용자: Firestore에서 프로필 데이터 가져오기 시작');
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const profileData = snap.data();
          console.log('✅ 실제 사용자: Firestore에서 프로필 데이터 가져옴', profileData);
          setProfile(profileData);
        } else {
          // 프로필 데이터가 없는 경우 기본 데이터 설정
          console.log('⚠️ 실제 사용자: 프로필 데이터가 없습니다. 기본 데이터를 설정합니다.');
          const defaultProfile = {
            displayName: user.displayName || '사용자',
            bio: '자기소개를 입력해주세요.',
            runningProfile: {
              level: 'beginner',
              pace: '6:00',
              preferredCourses: [],
              preferredTimes: [],
              runningStyles: [],
              favoriteSeasons: [],
              currentGoals: []
            }
          };
          console.log('📝 실제 사용자: 기본 프로필 데이터 설정', defaultProfile);
          setProfile(defaultProfile);
        }

        // 커뮤니티 통계 가져오기
        console.log('📊 실제 사용자: 커뮤니티 통계 가져오기 시작');
        const communityStats = await evaluationService.getUserCommunityStats(user.uid);
        
        // 태그를 형식에 맞게 변환
        const formattedTags = Object.entries(communityStats.receivedTags || {})
          .map(([tag, count]) => `[${count} #${tag}]`)
          .sort((a, b) => {
            const countA = parseInt(a.match(/\[(\d+)/)[1]);
            const countB = parseInt(b.match(/\[(\d+)/)[1]);
            return countB - countA; // 내림차순 정렬
          });

        setActivity({
          totalParticipated: communityStats.totalParticipated || 0,
          thisMonth: communityStats.thisMonthParticipated || 0,
          hostedEvents: communityStats.hostedEvents || 0,
          mannerScore: communityStats.averageMannerScore || 5.0, // 기본값 5.0
          tags: formattedTags,
        });
      } catch (e) {
        console.error('❌ 실제 사용자: 프로필 로딩 오류:', e);
        Alert.alert('오류', '프로필 정보를 불러오지 못했습니다.');
        
        // 에러 시에도 기본 프로필 데이터 설정
        const errorProfile = {
          displayName: user.displayName || '사용자',
          bio: '자기소개를 입력해주세요.',
          runningProfile: {
            level: 'beginner',
            pace: '6:00',
            preferredCourses: [],
            preferredTimes: [],
            runningStyles: [],
            favoriteSeasons: [],
            currentGoals: []
          }
        };
        console.log('🔄 실제 사용자: 에러 시 기본 프로필 데이터 설정', errorProfile);
        setProfile(errorProfile);
      } finally {
        console.log('🏁 ProfileScreen: 프로필 데이터 로딩 완료, loading = false');
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, testUserProfile]);

  const handleMenuPress = () => {
    Alert.alert('메뉴', '메뉴 기능이 곧 추가됩니다!');
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notification');
  };

  const handleProfilePress = () => {
    // 이미 프로필 화면에 있으므로 아무것도 하지 않음
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // 테스트용: 테스트 사용자 설정
  const handleSetTestUser = () => {
    const testUser = {
      uid: 'test-user-id',
      phoneNumber: '+821000000000',
      email: null,
      displayName: '테스트 사용자',
      emailVerified: false,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      },
      getIdToken: async () => 'test-id-token',
      getIdTokenResult: async () => ({
        token: 'test-id-token',
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        signInProvider: 'phone',
        claims: {}
      }),
      reload: async () => Promise.resolve(),
      toJSON: () => ({
        uid: 'test-user-id',
        phoneNumber: '+821000000000'
      })
    };
    setTestUser(testUser);
    
    // 테스트용 프로필 데이터도 함께 설정 (통신사 인증 정보 포함)
    const testProfileData = {
      displayName: '테스트 사용자',
      bio: '통신사 본인인증 테스트 사용자입니다.',
      birthDate: '1990-01-01',
      gender: '남성',
      age: 35,
      carrierVerified: true,
      carrierVerifiedAt: new Date().toISOString(),
      runningProfile: {
        level: 'beginner',
        pace: '6:00',
        preferredCourses: ['잠실한강공원'],
        preferredTimes: ['morning'],
        runningStyles: ['steady'],
        favoriteSeasons: ['spring'],
        currentGoals: ['weight_loss']
      },
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
    };
    
    // AuthContext의 updateUserProfile을 통해 테스트 프로필 데이터 저장
    setTimeout(() => {
      updateUserProfile(testProfileData);
      console.log('🧪 테스트 프로필 데이터 설정 완료:', testProfileData);
    }, 100);
    
    console.log('🧪 테스트 사용자 설정 완료');
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('🚪 ProfileScreen: 로그아웃 시작');
      await logout();
      console.log('✅ ProfileScreen: 로그아웃 완료');
      // 로그아웃 성공 시 별도 알림 없이 자동으로 로그인 화면으로 이동
    } catch (error) {
      console.error('❌ ProfileScreen: 로그아웃 실패:', error);
      Alert.alert('로그아웃 실패', error.message || '로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEdit = () => {
    if (profile) {
      setEditData({
        nickname: profile.displayName || '',
        bio: profile.bio || '',
        birthDate: profile.birthDate || '',
        gender: profile.gender || '',
        age: profile.age || '',
        runningProfile: {
          level: profile.runningProfile?.level || '',
          pace: profile.runningProfile?.pace || '',
          preferredCourses: profile.runningProfile?.preferredCourses || [],
          preferredTimes: profile.runningProfile?.preferredTimes || [],
          runningStyles: profile.runningProfile?.runningStyles || [],
          favoriteSeasons: profile.runningProfile?.favoriteSeasons || [],
          currentGoals: profile.runningProfile?.currentGoals || [],
        }
      });
      setEditModalVisible(true);
    }
  };

  const handleProfileImageEdit = () => {
    Alert.alert(
      '프로필 사진 편집',
      '프로필 사진을 변경하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '갤러리에서 선택', onPress: () => selectImageFromGallery() },
        { text: '카메라로 촬영', onPress: () => takePhotoWithCamera() },
      ]
    );
  };

  const selectImageFromGallery = () => {
    Alert.alert('갤러리', '갤러리에서 이미지 선택 기능이 곧 추가됩니다!');
  };

  const takePhotoWithCamera = () => {
    Alert.alert('카메라', '카메라 촬영 기능이 곧 추가됩니다!');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateUserProfile({
        displayName: editData.nickname,
        bio: editData.bio,
        birthDate: editData.birthDate,
        gender: editData.gender,
        age: editData.age,
        runningProfile: editData.runningProfile,
      });
      setProfile((prev) => ({
        ...prev,
        displayName: editData.nickname,
        bio: editData.bio,
        birthDate: editData.birthDate,
        gender: editData.gender,
        age: editData.age,
        runningProfile: editData.runningProfile,
      }));
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('오류', '프로필 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  console.log('🔄 ProfileScreen 렌더링:', { 
    loading, 
    profile: !!profile, 
    user: !!user,
    userUid: user?.uid,
    userEmail: user?.email,
    profileAge: profile?.age,
    profileGender: profile?.gender,
    testUserProfile: !!testUserProfile
  });
  
  if (loading && !profile) {
    console.log('⏳ ProfileScreen: 로딩 중...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.PRIMARY} size="large" />
        <Text style={styles.loadingText}>프로필 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AppBar */}
      <AppBar
        user={user}
        title="프로필"
        onProfilePress={handleProfilePress}
        onNotificationPress={handleNotificationPress}
        onSettingsPress={handleSettingsPress}
        onSearchPress={handleSearchPress}
        hideProfile={true}
        unreadCount={getTotalUnreadCount()}
      />

      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
      >
        {/* 상단 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardContentRow}>
            <View style={styles.profileImageWrapWithEdit}>
              <TouchableOpacity
                style={[styles.profileImageWrap, profileImagePressed && styles.profileImageWrapPressed]}
                onPress={handleProfileImageEdit}
                onPressIn={() => setProfileImagePressed(true)}
                onPressOut={() => setProfileImagePressed(false)}
                activeOpacity={0.8}
              >
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                )}
                <View style={styles.profileImageEditIcon}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profileEditBtnMini, editBtnPressed && styles.profileEditBtnMiniActive]}
                onPress={handleEdit}
                onPressIn={() => setEditBtnPressed(true)}
                onPressOut={() => setEditBtnPressed(false)}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.TEXT} />
                <Text style={styles.profileEditTextMini}>프로필 편집</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileTextCol}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{profile?.displayName || '닉네임 없음'}</Text>
                <View style={styles.levelBadgeOutline}>
                  <Text style={styles.levelBadgeText}>{getLevelInfo(profile?.runningProfile?.level).title}</Text>
                </View>
              </View>
              <Text style={styles.profileJoin}>가입일: {getJoinDate(profile?.createdAt)}</Text>
              <View style={styles.profileInfoRow}>
                {profile?.age && (
                  <Text style={styles.profileInfo}>나이: {profile.age}세</Text>
                )}
                {profile?.gender && (
                  <Text style={styles.profileInfo}>성별: {profile.gender}</Text>
                )}
              </View>
              <Text style={styles.profileBio}>{profile?.bio || '자기소개가 없습니다.'}</Text>
            </View>
          </View>
        </View>

        {/* 테스트용 버튼 (개발 완료 후 제거) */}
        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={handleSetTestUser}
          >
            <Text style={styles.testButtonText}>🧪 테스트 사용자 설정</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.testButton, { marginTop: 8, backgroundColor: '#FF6B6B' }]} 
            onPress={handleLogout}
          >
            <Text style={styles.testButtonText}>🚪 로그아웃 테스트</Text>
          </TouchableOpacity>
        </View>

        {/* 커뮤니티 활동 */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTitleRow}>
            <Ionicons name="people" size={22} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
            <Text style={styles.infoCardTitle}>커뮤니티 활동</Text>
          </View>
          <View style={styles.activityRowGrid}>
            <View style={styles.activityItemGrid}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="heart" size={22} color="#FF0073" style={{ marginRight: 2 }} />
                <Text style={styles.activityNumPrimary}>{activity.mannerScore}</Text>
              </View>
              <Text style={styles.activityLabel}>러닝 매너</Text>
            </View>
            <View style={styles.activityItemGrid}>
              <Text style={styles.activityNumWhite}>{activity.totalParticipated}</Text>
              <Text style={styles.activityLabel}>총 참여</Text>
            </View>
            <View style={styles.activityItemGrid}>
              <Text style={styles.activityNumWhite}>{activity.thisMonth}</Text>
              <Text style={styles.activityLabel}>이번 달</Text>
            </View>
            <View style={styles.activityItemGrid}>
              <Text style={styles.activityNumWhite}>{activity.hostedEvents}</Text>
              <Text style={styles.activityLabel}>주최 모임</Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            {activity.tags.map((tag, i) => (
              <View key={i} style={styles.tagOutline}> 
                <Text style={styles.tagTextOutline}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 러닝 매칭 정보 */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTitleRow}>
            <Ionicons name="extension-puzzle" size={22} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
            <Text style={styles.infoCardTitle}>러닝 매칭 정보</Text>
          </View>
          {/* 선호 코스 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="location-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 코스</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.preferredCourses || ['-']).map((c, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getCourseName(c)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 선호 시간 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="time-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 시간</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.preferredTimes || ['-']).map((t, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getTimeTitle(t)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 러닝 스타일 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="flash-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>러닝 스타일</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.runningStyles || ['-']).map((s, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getStyleTitle(s)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 선호 계절 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="cloud-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 계절</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.favoriteSeasons || ['-']).map((s, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getSeasonTitle(s)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 러닝 목표 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="trophy-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>러닝 목표</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.currentGoals || ['-']).map((g, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getGoalTitle(g)}</Text>
                </View>
              ))}
            </View>
          </View>
          </View>



        {/* 프로필 수정 모달 */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* 모달 헤더 */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.modalBackButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Ionicons name="chevron-back" size={24} color={COLORS.TEXT} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>프로필 수정</Text>
              </View>
              <ScrollView
                style={{ 
                  flexGrow: 1,
                  marginRight: -20,
                  paddingRight: 20,
                }}
                contentContainerStyle={{ 
                  paddingBottom: 40, 
                  minHeight: '100%',
                  paddingHorizontal: 0,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
              >
                <View style={styles.stepContainer}>
                  <OnboardingBioInput
                    nickname={editData.nickname}
                    bio={editData.bio}
                    onChangeNickname={text => setEditData(d => ({ ...d, nickname: text }))}
                    onChangeBio={text => setEditData(d => ({ ...d, bio: text }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                  />
                </View>
                
                {/* 나이와 성별 정보 표시 (읽기 전용) */}
                {(editData.age || editData.gender) && (
                  <View style={styles.stepContainer}>
                    <Text style={[styles.inputLabel, styles.stepTitle]}>본인인증 정보</Text>
                    <View style={styles.verifiedInfoContainer}>
                      {editData.age && (
                        <View style={styles.verifiedInfoRow}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
                          <Text style={styles.verifiedInfoText}>나이: {editData.age}세</Text>
                        </View>
                      )}
                      {editData.gender && (
                        <View style={styles.verifiedInfoRow}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
                          <Text style={styles.verifiedInfoText}>성별: {editData.gender}</Text>
                        </View>
                      )}
                      <Text style={styles.verifiedInfoNote}>통신사 본인인증으로 확인된 정보입니다</Text>
                    </View>
                  </View>
                )}
                <View style={styles.stepContainer}>
                  <OnboardingLevelSelector
                    value={editData.runningProfile?.level}
                    onChange={levelId => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, level: levelId, pace: (RUNNING_LEVELS.find(l => l.id === levelId)?.pace || '') } }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                    levels={RUNNING_LEVELS}
                  />
                </View>
                <View style={styles.stepContainer}>
                  <OnboardingCourseSelector
                    value={editData.runningProfile?.preferredCourses || []}
                    onChange={courses => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, preferredCourses: courses } }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                  />
                </View>
                <View style={styles.stepContainer}>
                  <OnboardingTimeSelector 
                    value={editData.runningProfile?.preferredTimes || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, preferredTimes: value } }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                  />
                </View>
                <Text style={styles.inputLabel}>러닝 스타일을 선택해주세요.</Text>
                <Text style={styles.inputHint}>여러 개 선택 가능해요</Text>
                <View style={{ marginBottom: 12 }}>
                  <OnboardingStyleSelector 
                    value={editData.runningProfile?.runningStyles || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, runningStyles: value } }))}
                  />
                </View>
                <Text style={styles.inputLabel}>선호하는 계절을 선택해주세요.</Text>
                <Text style={styles.inputHint}>여러 개 선택 가능해요</Text>
                <View style={{ marginBottom: 12 }}>
                  <OnboardingSeasonSelector 
                    value={editData.runningProfile?.favoriteSeasons || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, favoriteSeasons: value } }))}
                  />
                </View>
                <Text style={styles.inputLabel}>러닝 목표를 선택해주세요.</Text>
                <Text style={styles.inputHint}>여러 개 선택 가능해요</Text>
                <View style={{ marginBottom: 12 }}>
                  <OnboardingGoalSelector 
                    value={editData.runningProfile?.currentGoals || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, currentGoals: value } }))}
                  />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
      {/* 설정 모달 */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>설정</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>알림</Text>
              <Switch value={settings.notifications} onValueChange={v => setSettings(s => ({ ...s, notifications: v }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>진동</Text>
              <Switch value={settings.vibration} onValueChange={v => setSettings(s => ({ ...s, vibration: v }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>다크모드</Text>
              <Switch value={settings.darkMode} onValueChange={v => setSettings(s => ({ ...s, darkMode: v }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>계정 이메일</Text>
              <Text style={styles.settingValue}>{settings.accountEmail}</Text>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.cancelButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    color: COLORS.TEXT,
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Pretendard-Regular',
  },
  profileCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginTop: 18,
    marginBottom: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImageWrapWithEdit: {
    alignItems: 'center',
    marginRight: 18,
    justifyContent: 'flex-start',
  },
  profileImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileImageWrapPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  profileImageEditIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.CARD,
  },
  profileTextCol: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginRight: 12,
    textAlign: 'left',
    fontFamily: 'Pretendard-Bold',
  },
  levelBadgeOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginRight: 8,
  },
  levelBadgeText: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
  },
  levelSubtitleWhite: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Pretendard-Regular',
  },
  profileJoin: {
    fontSize: 15,
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'left',
    fontFamily: 'Pretendard-Regular',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  profileInfo: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Pretendard-Regular',
  },
  profileBio: {
    fontSize: 17,
    color: COLORS.TEXT,
    textAlign: 'left',
    marginBottom: 0,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
  profileEditBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.TEXT,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 17,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  profileEditBtnMiniActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  profileEditTextMini: {
    color: COLORS.TEXT,
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 13,
    fontFamily: 'Pretendard-Medium',
  },
  levelSelectBtn: {
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  levelSelectBtnActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  levelSelectText: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'Pretendard-Bold',
  },
  levelSelectTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'Pretendard-Bold',
  },
  inputLabel: {
    color: COLORS.TEXT,
    fontSize: 20,
    marginBottom: 4,
    marginTop: 8,
    fontFamily: 'Pretendard-Bold',
  },
  inputHint: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 18,
    marginBottom: 16,
    fontFamily: 'Pretendard-Regular',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  settingLabel: {
    color: COLORS.TEXT,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  settingValue: {
    color: COLORS.PRIMARY,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  infoCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginBottom: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Bold',
  },
  infoRowCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Pretendard-SemiBold',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOutline: {
    borderWidth: 1,
    borderColor: '#97DCDE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  tagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#fff',
    fontFamily: 'Pretendard-Light',
  },
  activityRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    marginTop: 8,
    width: '100%',
  },
  activityItemGrid: {
    alignItems: 'center',
    flex: 1,
    marginBottom: 10,
    minWidth: 60,
    maxWidth: 80,
  },
  activityNumWhite: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    fontFamily: 'Pretendard-Bold',
  },
  activityLabel: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
    fontFamily: 'Pretendard-Regular',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    minHeight: 400,
    maxHeight: '90%',
    height: '80%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    position: 'relative',
    height: 50,
  },
  modalBackButton: {
    padding: 5,
    position: 'absolute',
    left: 5,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    flex: 1,
    fontFamily: 'Pretendard-Bold',
  },
  input: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: 12,
    color: COLORS.TEXT,
    fontSize: 15,
    marginBottom: 12,
    fontFamily: 'Pretendard-Regular',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
  },
  cancelButton: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
  },
  infoRowIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabelWhite: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  activityNumPrimary: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 2,
    fontFamily: 'Pretendard-Bold',
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Pretendard-Bold',
  },
  stepContainer: {
    marginBottom: 18,
  },
  verifiedInfoContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  verifiedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedInfoText: {
    color: COLORS.TEXT,
    fontSize: 15,
    marginLeft: 8,
    fontFamily: 'Pretendard-Regular',
  },
  verifiedInfoNote: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    fontFamily: 'Pretendard-Regular',
  },
  testButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'Pretendard-Bold',
  },
});

export default ProfileScreen; 