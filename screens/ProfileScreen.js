import React, { useEffect, useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import AppBar from '../components/AppBar';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import OnboardingTimeSelector from '../components/OnboardingTimeSelector';
import OnboardingStyleSelector from '../components/OnboardingStyleSelector';
import OnboardingSeasonSelector from '../components/OnboardingSeasonSelector';
import OnboardingGoalSelector from '../components/OnboardingGoalSelector';
import OnboardingBioInput from '../components/OnboardingBioInput';
import OnboardingLevelSelector from '../components/OnboardingLevelSelector';
import OnboardingCourseSelector from '../components/OnboardingCourseSelector';
import evaluationService from '../services/evaluationService';
import storageService from '../services/storageService';
import updateService from '../services/updateService';
import mannerDistanceService from '../services/mannerDistanceService';
import MannerDistanceDisplay from '../components/MannerDistanceDisplay';
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

// Runon 디자인 시스템 - 홈화면과 동일한 색상 팔레트
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

// 주민등록번호 6자리를 나이로 계산하는 함수
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  try {
    // 기존 YYYY-MM-DD 형식인지 확인
    if (birthDate.length === 10 && birthDate.includes('-')) {
      const [year, month, day] = birthDate.split('-').map(Number);
      const birth = new Date(year, month - 1, day);
      const today = new Date();
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    }
    
    // 새로운 YYMMDD 형식 처리
    if (birthDate.length === 6) {
      const year = parseInt(birthDate.substring(0, 2));
      const month = parseInt(birthDate.substring(2, 4));
      const day = parseInt(birthDate.substring(4, 6));
      
      // 한국 주민등록번호 기준: 실제 나이 계산을 위한 보정
      let fullYear;
      const currentYear = new Date().getFullYear();
      const currentYearLastTwo = currentYear % 100; // 2024 → 24
      
      // 간단한 규칙: 00-24는 2000년대, 25-99는 1900년대
      if (year >= 0 && year <= currentYearLastTwo) {
        // 00-24: 2000년대로 처리 (2000-2024)
        fullYear = 2000 + year;
      } else {
        // 25-99: 1900년대로 처리 (1925-1999)
        fullYear = 1900 + year;
      }
      
      const birth = new Date(fullYear, month - 1, day);
      const today = new Date();
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const normalizeInstagramId = (value = '') => {
  return value
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
};




const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUserProfile } = useAuth();
  const { isTabEnabled, isNotificationTypeEnabled } = useNotificationSettings();
  const { hasMeetingNotification, hasUpdateNotification } = useEvents();
  const { hasCommunityNotification } = useCommunity();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  // 모달 오버레이 페이드 애니메이션
  const editModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const settingsModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const [settings, setSettings] = useState({
    notifications: true,
    vibration: false,
    darkMode: false,
    accountEmail: user?.email || '',
  });
  const [editBtnPressed, setEditBtnPressed] = useState(false);
  const [profileImagePressed, setProfileImagePressed] = useState(false);
  const [activeTab, setActiveTab] = useState('runningProfile'); // 'runningProfile' 또는 'community'
  const [mannerDistance, setMannerDistance] = useState(null);
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialAccountInput, setSocialAccountInput] = useState('');
  const [isSavingSocialAccount, setIsSavingSocialAccount] = useState(false);

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

  const getTotalUnreadCount = () => {
    // Context 상태를 사용하여 알림 카운트 계산
    let totalCount = 0;
    
    // 모임 알림
    if (hasMeetingNotification || hasUpdateNotification) {
      totalCount += 1;
    }
    
    // 커뮤니티 알림
    if (hasCommunityNotification) {
      totalCount += 1;
    }
    
    return totalCount;
  };

  // 커뮤니티 이력(실제 데이터)
  const [activity, setActivity] = useState({
    totalParticipated: 0,
    thisMonth: 0,
    hostedEvents: 0,
    mannerScore: 5.0, // 초기값 5.0
    tags: [],
  });

  // 매너거리 데이터 가져오기
  const fetchMannerDistance = async () => {
    if (!user?.uid) return;
    
    try {
      const distanceData = await mannerDistanceService.getUserMannerDistance(user.uid);
      
      if (distanceData) {
        setMannerDistance(distanceData);
      } else {
        // 매너거리 데이터가 없으면 마이그레이션 시도
        console.log('매너거리 데이터가 없음, 마이그레이션 시도');
        const migratedData = await mannerDistanceService.migrateUserToMannerDistance(user.uid);
        if (migratedData) {
          setMannerDistance(migratedData);
        }
      }
    } catch (error) {
      console.error('매너거리 데이터 가져오기 실패:', error);
    }
  };

  // 모달 애니메이션 효과
  useEffect(() => {
    if (editModalVisible) {
      Animated.timing(editModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(editModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [editModalVisible, editModalBackdropOpacity]);

  useEffect(() => {
    if (settingsVisible) {
      Animated.timing(settingsModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(settingsModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [settingsVisible, settingsModalBackdropOpacity]);

  useEffect(() => {
    const fetchProfile = async () => {
      // if (__DEV__) {
      //   console.log('🔄 ProfileScreen: fetchProfile 호출됨', { 
      //     user: !!user, 
      //     userUid: user?.uid
      //   });
      // }
      
      if (!user) {
        // if (__DEV__) {
        //   console.log('❌ ProfileScreen: 사용자가 없습니다. 기본 프로필 설정');
        // }
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
      
      // console.log('🔄 ProfileScreen: 프로필 데이터 로딩 시작', { 
      //   uid: user.uid
      // });
      
      setLoading(true);
      
      try {
        // console.log('📊 실제 사용자: Firestore에서 프로필 데이터 가져오기 시작');
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const profileData = snap.data();
          // console.log('✅ 실제 사용자: Firestore에서 프로필 데이터 가져옴', profileData);
          
          // 온보딩 데이터가 있는지 확인
          const onboardingProfile = profileData.profile;
          // console.log('🔍 온보딩 프로필 데이터:', onboardingProfile);
          
          // Firestore Timestamp 객체를 안전하게 처리하고 온보딩 데이터 매핑
          const processedProfile = {
            ...profileData,
            // 온보딩에서 저장한 프로필 데이터가 있으면 우선 사용
            displayName: onboardingProfile?.nickname || profileData.displayName || user.displayName,
            bio: onboardingProfile?.bio || profileData.bio || '자기소개를 입력해주세요.',
            gender: onboardingProfile?.gender || profileData.gender || '',
            birthDate: onboardingProfile?.birthDate || profileData.birthDate || '',
            instagramId: onboardingProfile?.instagramId || profileData.instagramId || '',
            profileImage: onboardingProfile?.profileImage || profileData.profileImage,
            // 러닝 프로필 데이터 매핑
            runningProfile: {
              level: onboardingProfile?.runningLevel || profileData.runningProfile?.level || 'beginner',
              pace: onboardingProfile?.averagePace || profileData.runningProfile?.pace || '6:00',
              preferredCourses: onboardingProfile?.preferredCourses || profileData.runningProfile?.preferredCourses || [],
              preferredTimes: onboardingProfile?.preferredTimes || profileData.runningProfile?.preferredTimes || [],
              runningStyles: onboardingProfile?.runningStyles || profileData.runningProfile?.runningStyles || [],
              favoriteSeasons: onboardingProfile?.favoriteSeasons || profileData.runningProfile?.favoriteSeasons || [],
              currentGoals: onboardingProfile?.currentGoals || profileData.runningProfile?.currentGoals || []
            },
            createdAt: profileData.createdAt?.toDate?.() || profileData.createdAt,
            onboardingCompletedAt: profileData.onboardingCompletedAt?.toDate?.() || profileData.onboardingCompletedAt,
          };
          
          // console.log('📝 처리된 프로필 데이터:', processedProfile);
          setProfile(processedProfile);
        } else {
          // 프로필 데이터가 없는 경우 기본 데이터 설정
          // console.log('⚠️ 실제 사용자: 프로필 데이터가 없습니다. 기본 데이터를 설정합니다.');
          const defaultProfile = {
            displayName: user.displayName,
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
          // console.log('📝 실제 사용자: 기본 프로필 데이터 설정', defaultProfile);
          setProfile(defaultProfile);
        }

        // 커뮤니티 통계 가져오기
        // console.log('📊 실제 사용자: 커뮤니티 통계 가져오기 시작');
        const communityStats = await evaluationService.getUserCommunityStats(user.uid);
        
        // 긍정적 태그를 형식에 맞게 변환
        const formattedTags = Object.entries(communityStats.receivedTags || {})
          .map(([tag, count]) => `[${count} #${tag}]`)
          .sort((a, b) => {
            const countA = parseInt(a.match(/\[(\d+)/)[1]);
            const countB = parseInt(b.match(/\[(\d+)/)[1]);
            return countB - countA; // 내림차순 정렬
          });

        // 부정적 태그를 형식에 맞게 변환
        const formattedNegativeTags = Object.entries(communityStats.receivedNegativeTags || {})
          .map(([tag, count]) => `[${count} #${tag}]`)
          .sort((a, b) => {
            const countA = parseInt(a.match(/\[(\d+)/)[1]);
            const countB = parseInt(b.match(/\[(\d+)/)[1]);
            return countB - countA; // 내림차순 정렬
          });

        // 특별상황을 형식에 맞게 변환
        const formattedSpecialSituations = Object.entries(communityStats.receivedSpecialSituations || {})
          .map(([situation, count]) => `[${count} #${situation}]`)
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
          negativeTags: formattedNegativeTags,
          specialSituations: formattedSpecialSituations,
        });

        // 매너거리 데이터 가져오기
        await fetchMannerDistance();
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
        // console.log('🔄 실제 사용자: 에러 시 기본 프로필 데이터 설정', errorProfile);
        setProfile(errorProfile);
      } finally {
        // console.log('🏁 ProfileScreen: 프로필 데이터 로딩 완료, loading = false');
        setLoading(false);
      }
    };
    fetchProfile();
    fetchUpdateNotification();
  }, [user]);

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
      // 닉네임은 profile.nickname 또는 profile.displayName에서 가져오기
      const currentNickname = profile.profile?.nickname || profile.displayName || '';
      
      setEditData({
        nickname: currentNickname,
        bio: profile.bio || '',
        birthDate: profile.birthDate || '',
        gender: profile.gender || '',
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

  const handleOpenSocialModal = () => {
    setSocialAccountInput(profile?.instagramId || '');
    setSocialModalVisible(true);
  };

  const handleSaveSocialAccount = async () => {
    if (!user) return;

    try {
      setIsSavingSocialAccount(true);
      const normalizedInstagramId = normalizeInstagramId(socialAccountInput);

      await updateUserProfile({
        instagramId: normalizedInstagramId
      });

      setProfile(prev => ({
        ...prev,
        instagramId: normalizedInstagramId
      }));

      setSocialModalVisible(false);
    } catch (error) {
      console.error('인스타그램 계정 저장 실패:', error);
      Alert.alert('오류', '소셜 계정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSocialAccount(false);
    }
  };

  // 갤러리에서 이미지 선택
  const selectImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('갤러리에서 이미지 선택 실패:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 카메라로 사진 촬영
  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('카메라 촬영 실패:', error);
      Alert.alert('오류', '카메라 촬영 중 오류가 발생했습니다.');
    }
  };

  // 프로필 이미지 업로드
  const uploadProfileImage = async (imageUri) => {
    try {
      setLoading(true);
      
      // 파일 객체 생성
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile_${user.uid}_${Date.now()}.jpg`
      };

      // 파일 검증
      const sizeValidation = storageService.validateFileSize(imageFile);
      if (!sizeValidation.valid) {
        Alert.alert('오류', sizeValidation.error);
        return;
      }

      const typeValidation = storageService.validateFileType(imageFile);
      if (!typeValidation.valid) {
        Alert.alert('오류', typeValidation.error);
        return;
      }

      // Firebase Storage에 업로드
      const uploadResult = await storageService.uploadProfileImage(user.uid, imageFile);
      
      if (uploadResult.success) {
        if (__DEV__) {
          console.log('✅ Storage 업로드 성공, Firestore 업데이트 시작:', uploadResult.url);
        }
        
        // 프로필 정보 업데이트
        await updateUserProfile({
          profileImage: uploadResult.url
        });

        if (__DEV__) {
          console.log('✅ Firestore 업데이트 완료');
        }

        // 로컬 상태 업데이트
        setProfile(prev => ({
          ...prev,
          profileImage: uploadResult.url
        }));

        Alert.alert('성공', '프로필 사진이 업로드되었습니다.');
      } else {
        Alert.alert('오류', '이미지 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
      Alert.alert('오류', '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('💾 프로필 저장 시작 (시도:', retryCount + 1, ')');
        setLoading(true);
        
        // 닉네임 변경 방지: 기존 닉네임과 다르면 원래 닉네임으로 복원
        const originalNickname = profile?.profile?.nickname || profile?.displayName;
        if (editData.nickname !== originalNickname) {
          console.log('⚠️ 닉네임 변경 시도 감지, 원래 닉네임으로 복원:', {
            original: originalNickname,
            attempted: editData.nickname
          });
          setEditData(prev => ({ ...prev, nickname: originalNickname }));
        }
        
        // undefined 값 제거하고 프로필 업데이트 시도 (닉네임 제외)
        const profileUpdateData = {
          // nickname: editData.nickname, // 닉네임은 변경하지 않음
          bio: editData.bio,
          birthDate: editData.birthDate,
          gender: editData.gender,
          runningLevel: editData.runningProfile?.level,
          averagePace: editData.runningProfile?.pace,
          preferredCourses: editData.runningProfile?.preferredCourses,
          preferredTimes: editData.runningProfile?.preferredTimes,
          runningStyles: editData.runningProfile?.runningStyles,
          favoriteSeasons: editData.runningProfile?.favoriteSeasons,
          currentGoals: editData.runningProfile?.currentGoals,
        };
        
        // age는 유효한 값일 때만 추가
        if (editData.age !== undefined && editData.age !== null) {
          profileUpdateData.age = editData.age;
        }
        
        await updateUserProfile(profileUpdateData);
        
        console.log('✅ 프로필 업데이트 성공 (시도:', retryCount + 1, ')');
        
        // 로컬 상태 업데이트 (닉네임은 변경하지 않음)
        setProfile((prev) => ({
          ...prev,
          // displayName: editData.nickname, // 닉네임은 변경하지 않음
          bio: editData.bio,
          birthDate: editData.birthDate,
          gender: editData.gender,
          age: editData.age,
          runningProfile: {
            level: editData.runningProfile?.level,
            pace: editData.runningProfile?.pace,
            preferredCourses: editData.runningProfile?.preferredCourses,
            preferredTimes: editData.runningProfile?.preferredTimes,
            runningStyles: editData.runningProfile?.runningStyles,
            favoriteSeasons: editData.runningProfile?.favoriteSeasons,
            currentGoals: editData.runningProfile?.currentGoals,
          },
        }));
        
        setEditModalVisible(false);
        console.log('✅ 프로필 저장 완료');
        return; // 성공 시 함수 종료
        
      } catch (error) {
        retryCount++;
        console.error('❌ 프로필 저장 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          Alert.alert(
            '프로필 저장 실패', 
            '네트워크 연결을 확인하고 다시 시도해주세요.',
            [
              { text: '다시 시도', onPress: handleSave },
              { text: '취소', style: 'cancel' }
            ]
          );
          return;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } finally {
        if (retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    }
  };

  // console.log('🔄 ProfileScreen 렌더링:', { 
  //   loading, 
  //   profile: !!profile, 
  //   user: !!user,
  //   userUid: user?.uid,
  //   userEmail: user?.email,
  //   profileAge: profile?.age,
  //   profileGender: profile?.gender
  // });
  const currentInstagramId = normalizeInstagramId(profile?.instagramId || '');
  const profileImageUri = [
    user?.photoURL,
    profile?.profileImage,
    profile?.profile?.profileImage
  ].find((url) => typeof url === 'string' && url.startsWith('http')) || null;
  
  if (loading && !profile) {
    // console.log('⏳ ProfileScreen: 로딩 중...');
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
        transparent={true}
      />

      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
        scrollEventThrottle={100}
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
                {profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                )}

                <View style={styles.profileImageEditIcon}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.socialAccountSlot}>
                {currentInstagramId ? (
                  <TouchableOpacity onPress={handleOpenSocialModal} activeOpacity={0.8}>
                    <View style={styles.socialHandleContainer}>
                      <Ionicons name="logo-instagram" size={12} color={COLORS.TEXT} style={styles.socialHandleIcon} />
                      <Text style={styles.socialHandleText}>{currentInstagramId}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.socialAddButton}
                    onPress={handleOpenSocialModal}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-instagram" size={13} color={COLORS.PRIMARY} style={styles.socialAddIcon} />
                    <Text style={styles.socialAddButtonText}>소셜계정 +</Text>
                  </TouchableOpacity>
                )}
              </View>
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
                {profile?.birthDate && calculateAge(profile.birthDate) && (
                  <Text style={styles.profileInfo}>나이: {calculateAge(profile.birthDate)}세</Text>
                )}
                {profile?.gender && (
                  <Text style={styles.profileInfo}>성별: {profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : profile.gender}</Text>
                )}
              </View>
              <Text style={styles.profileBio}>{profile?.bio || '자기소개가 없습니다.'}</Text>
            </View>
          </View>
        </View>



        {/* 탭 네비게이션 */}
        <View style={styles.tabNavigationContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'runningProfile' && styles.activeTabButton]}
              onPress={() => setActiveTab('runningProfile')}
            >
              <Text style={[styles.tabText, activeTab === 'runningProfile' && styles.activeTabText]}>
                러닝 프로필
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'community' && styles.activeTabButton]}
              onPress={() => setActiveTab('community')}
            >
              <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>
                커뮤니티 활동
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 러닝 프로필 탭 */}
        {activeTab === 'runningProfile' && (
          <View style={styles.tabContent}>
            {/* 매너거리 카드 */}
            {mannerDistance && (
              <View style={styles.mannerDistanceCard}>
                <MannerDistanceDisplay 
                  currentDistance={mannerDistance.currentDistance}
                  animated={true}
                  showGoal={true}
                  size="medium"
                />
              </View>
            )}

            {/* 선호 코스 카드 */}
            <View style={styles.runningProfileCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="location-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>선호 코스</Text>
              </View>
              <View style={styles.tagRow}>
                {(profile?.runningProfile?.preferredCourses || ['-']).map((c, i) => (
                  <View key={i} style={styles.tagOutline}> 
                    <Text style={styles.tagTextOutline}>{getCourseName(c)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 선호 시간 카드 */}
            <View style={styles.runningProfileCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="time-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>선호 시간</Text>
              </View>
              <View style={styles.tagRow}>
                {(profile?.runningProfile?.preferredTimes || ['-']).map((t, i) => (
                  <View key={i} style={styles.tagOutline}> 
                    <Text style={styles.tagTextOutline}>{getTimeTitle(t)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 러닝 스타일 카드 */}
            <View style={styles.runningProfileCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="flash-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>러닝 스타일</Text>
              </View>
              <View style={styles.tagRow}>
                {(profile?.runningProfile?.runningStyles || ['-']).map((s, i) => (
                  <View key={i} style={styles.tagOutline}> 
                    <Text style={styles.tagTextOutline}>{getStyleTitle(s)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 선호 계절 카드 */}
            <View style={styles.runningProfileCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="cloud-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>선호 계절</Text>
              </View>
              <View style={styles.tagRow}>
                {(profile?.runningProfile?.favoriteSeasons || ['-']).map((s, i) => (
                  <View key={i} style={styles.tagOutline}> 
                    <Text style={styles.tagTextOutline}>{getSeasonTitle(s)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 러닝 목표 카드 */}
            <View style={styles.runningProfileCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="trophy-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>러닝 목표</Text>
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
        )}

        {/* 커뮤니티 활동 탭 */}
        {activeTab === 'community' && (
          <View style={styles.tabContent}>
            {/* 2x2 통계 그리드 */}
            <View style={styles.statsGrid}>
              {/* 러닝 매너 카드 */}
              <View style={styles.statCard}>
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="heart" size={20} color="#FF0073" />
                  </View>
                  <Text style={styles.statNumber}>{activity.mannerScore}</Text>
                </View>
                <Text style={styles.statLabel}>러닝 매너</Text>
                {/* 프로그레스 바 */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${(activity.mannerScore / 5) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>

              {/* 총 참여 카드 */}
              <View style={styles.statCard}>
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="people" size={20} color={COLORS.TEXT} />
                  </View>
                  <Text style={styles.statNumberWhite}>{activity.totalParticipated}</Text>
                </View>
                <Text style={styles.statLabel}>총 참여</Text>
              </View>

              {/* 이번 달 카드 */}
              <View style={styles.statCard}>
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar" size={20} color={COLORS.TEXT} />
                  </View>
                  <Text style={styles.statNumberWhite}>{activity.thisMonth}</Text>
                </View>
                <Text style={styles.statLabel}>이번 달</Text>
              </View>

              {/* 주최 모임 카드 */}
              <View style={styles.statCard}>
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="trophy" size={20} color={COLORS.TEXT} />
                  </View>
                  <Text style={styles.statNumberWhite}>{activity.hostedEvents}</Text>
                </View>
                <Text style={styles.statLabel}>주최 모임</Text>
              </View>
            </View>

            {/* 긍정적 매너 태그 카드 */}
            <View style={styles.mannerTagsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="star" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>좋았던 점</Text>
                <Text style={styles.tagCountText}>({activity.tags.length}개)</Text>
              </View>
              <View style={styles.tagRow}>
                {activity.tags.length > 0 ? (
                  activity.tags.map((tag, i) => {
                    // [1 #태그명] 형태에서 태그명과 개수 추출
                    const match = tag.match(/^\[(\d+)\s*#\s*(.+)\]$/);
                    const count = match ? match[1] : '1';
                    const cleanTag = match ? match[2] : tag.replace(/^\[\d+\s*#\s*/, '').replace(/\]$/, '');
                    return (
                      <View key={i} style={styles.tagOutline}> 
                        <Text style={styles.tagTextOutline}>{cleanTag}</Text>
                        <Text style={styles.tagCountBadge}>{count}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noTagsText}>아직 받은 긍정적 태그가 없습니다.</Text>
                )}
              </View>
            </View>

            {/* 부정적 태그 카드 */}
            {activity.negativeTags && activity.negativeTags.length > 0 && (
              <View style={styles.mannerTagsCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                  <Text style={styles.cardTitle}>아쉬웠던 점</Text>
                </View>
                <View style={styles.tagRow}>
                  {activity.negativeTags.map((tag, i) => {
                    // [1 #태그명] 형태에서 태그명만 추출
                    const cleanTag = tag.replace(/^\[\d+\s*#\s*/, '').replace(/\]$/, '');
                    return (
                      <View key={i} style={styles.negativeTagOutline}> 
                        <Text style={styles.negativeTagTextOutline}>{cleanTag}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 특별상황 카드 */}
            {activity.specialSituations && activity.specialSituations.length > 0 && (
              <View style={styles.mannerTagsCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="warning" size={20} color="#FFA500" />
                  <Text style={styles.cardTitle}>특별 상황</Text>
                </View>
                <View style={styles.tagRow}>
                  {activity.specialSituations.map((situation, i) => {
                    // [1 #상황명] 형태에서 상황명만 추출
                    const cleanSituation = situation.replace(/^\[\d+\s*#\s*/, '').replace(/\]$/, '');
                    return (
                      <View key={i} style={styles.specialSituationTagOutline}> 
                        <Text style={styles.specialSituationTagTextOutline}>{cleanSituation}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}



        {/* 소셜 계정 입력 모달 */}
        <Modal visible={socialModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBackdrop} />
            <View style={styles.socialModalContent}>
              <Text style={styles.socialModalTitle}>인스타 계정 입력</Text>

              <View style={styles.socialInputRow}>
                <Ionicons name="logo-instagram" size={16} color={COLORS.TEXT_SECONDARY} style={styles.socialInputPrefixIcon} />
                <TextInput
                  style={styles.socialInput}
                  placeholder="instagram_id"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  value={socialAccountInput}
                  onChangeText={setSocialAccountInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                />
              </View>

              <View style={styles.modalBottomNavigator}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setSocialModalVisible(false)}
                  disabled={isSavingSocialAccount}
                >
                  <Text style={styles.modalCancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSaveSocialAccount}
                  disabled={isSavingSocialAccount}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {isSavingSocialAccount ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 프로필 수정 모달 */}
        <Modal visible={editModalVisible} animationType="none" transparent>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: editModalBackdropOpacity,
                },
              ]}
            />
            <View style={styles.modalContent}>
              {/* 모달 헤더 */}
              <View style={styles.modalHeader}>
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
                    isNicknameImmutable={true} // 기존 사용자는 닉네임 변경 불가능
                    isProfileEdit={true} // 프로필 편집 모달임을 표시
                    onChangeNickname={text => setEditData(d => ({ ...d, nickname: text }))}
                    onChangeBio={text => setEditData(d => ({ ...d, bio: text }))}
                    colors={{ 
                      TEXT: COLORS.TEXT, 
                      PRIMARY: COLORS.PRIMARY, 
                      CARD: COLORS.CARD, 
                      TEXT_SECONDARY: COLORS.TEXT_SECONDARY,
                      ERROR: COLORS.ERROR,
                      SUCCESS: COLORS.SUCCESS
                    }}
                  />
                </View>
                
                {/* 나이와 성별 정보 표시 (읽기 전용) */}
                {(editData.birthDate || editData.gender) && (
                  <View style={styles.stepContainer}>
                    <Text style={[styles.inputLabel, styles.stepTitle]}>본인인증 정보</Text>
                    <View style={styles.verifiedInfoContainer}>
                      {editData.birthDate && calculateAge(editData.birthDate) && (
                        <View style={styles.verifiedInfoRow}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
                          <Text style={styles.verifiedInfoText}>나이: {calculateAge(editData.birthDate)}세</Text>
                        </View>
                      )}
                      {editData.gender && (
                        <View style={styles.verifiedInfoRow}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
                          <Text style={styles.verifiedInfoText}>성별: {editData.gender}</Text>
                        </View>
                      )}
                      <Text style={styles.verifiedInfoNote}>확인된 정보입니다</Text>
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

              </ScrollView>
              
              {/* 하단 네비게이터 */}
              <View style={styles.modalBottomNavigator}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalSaveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.modalSaveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#0A0A0A',
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
  // 상단 프로필 카드 스타일
  profileCard: {
    backgroundColor: 'transparent', // 완전 투명
    borderRadius: 18,
    marginHorizontal: 0,
    marginTop: 18, // 상단 프로필 카드만의 여백
    marginBottom: 10, // 상단 프로필 카드만의 하단 여백
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // 러닝 프로필 항목 카드 스타일
  runningProfileCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginTop: 0, // 러닝 프로필 카드들만의 상단 여백
    marginBottom: 2, // 러닝 프로필 카드들 사이의 여백
    padding: 12,
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
    flexWrap: 'wrap',
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
  socialAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  socialAddIcon: {
    marginRight: 4,
  },
  socialAddButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    fontFamily: 'Pretendard-Medium',
  },
  socialHandleText: {
    color: COLORS.TEXT,
    fontSize: 12,
    fontFamily: 'Pretendard-Regular',
  },
  socialAccountSlot: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 18,
  },
  socialHandleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialHandleIcon: {
    marginRight: 4,
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
    marginTop: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  negativeTagOutline: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  negativeTagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#FF6B6B',
    fontFamily: 'Pretendard-Light',
  },
  specialSituationTagOutline: {
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  specialSituationTagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#FFA500',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  socialModalContent: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    alignSelf: 'center',
  },
  socialModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.SURFACE,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  socialInputPrefixIcon: {
    marginRight: 8,
  },
  socialInput: {
    flex: 1,
    color: COLORS.TEXT,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.SURFACE,
  },
  modalBottomNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.SURFACE,
    backgroundColor: COLORS.CARD,
  },
  modalCancelButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  modalSaveButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    flex: 1,
    fontFamily: 'Pretendard-Bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Pretendard-Regular',
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
  // 탭 네비게이션 스타일
  tabNavigationContainer: {
    marginTop: 2, // 액티브 탭 위 여백 조정 가능
    marginBottom: 12, // 액티브 탭 하단 여백 통일
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginHorizontal: 2,
  },
  activeTabButton: {
    backgroundColor: COLORS.PRIMARY + '20',
  },
  tabText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Pretendard-SemiBold',
  },
  activeTabText: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
  tabContent: {
    // marginBottom 제거하여 tabNavigationContainer의 marginBottom으로 통일
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginLeft: 8,
    fontFamily: 'Pretendard-Bold',
  },
  noTagsText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
    fontFamily: 'Pretendard-Regular',
  },
  tagCountText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
    fontFamily: 'Pretendard-Regular',
  },
  tagCountBadge: {
    fontSize: 10,
    color: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
  // 매너거리 카드 스타일
  mannerDistanceCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 2,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // 매너 태그 카드 전용 스타일 (불투명)
  mannerTagsCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 0,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // 통계 카드 스타일
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '49%',
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  statCardContent: {
    flexDirection: 'row', // 가로 배치
    alignItems: 'center', // 세로 중앙 정렬
    justifyContent: 'flex-start', // 왼쪽 정렬
    marginBottom: 8, // 레이블과의 여백
  },
  statIconContainer: {
    marginRight: 8, // 아이콘과 수치 사이 여백
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 4,
    fontFamily: 'Pretendard-Bold',
  },
  statNumberWhite: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'Pretendard-Bold',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Pretendard-Regular',
    textAlign: 'left',
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.TEXT_SECONDARY + '30',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0073',
    borderRadius: 2,
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

});

export default ProfileScreen; 