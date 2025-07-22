import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Modal,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import OnboardingTimeSelector from '../components/OnboardingTimeSelector';
import OnboardingStyleSelector from '../components/OnboardingStyleSelector';
import OnboardingSeasonSelector from '../components/OnboardingSeasonSelector';
import OnboardingGoalSelector from '../components/OnboardingGoalSelector';
import OnboardingBioInput from '../components/OnboardingBioInput';
import { 
  HAN_RIVER_PARKS, 
  RIVER_SIDES, 
  RUNNING_LEVELS 
} from '../constants/onboardingOptions';
import OnboardingLevelSelector from '../components/OnboardingLevelSelector';
import OnboardingCourseSelector from '../components/OnboardingCourseSelector';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  ERROR: '#FF4444',
  SUCCESS: '#00FF88',
};

const { width: screenWidth } = Dimensions.get('window');

const OnboardingScreen = ({ onComplete, navigation, route }) => {
  const isFromSignup = route?.params?.isFromSignup || false;
  const isCarrierVerified = route?.params?.isCarrierVerified || false;
  const carrierUserInfo = route?.params?.userInfo || null;
  const [currentStep, setCurrentStep] = useState(1);
  const scrollViewRef = useRef(null);
  const bioInputRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    profileImage: null,
    nickname: '',
    bio: '',
    runningLevel: '',
    averagePace: '',
    preferredCourses: [],
    preferredTimes: [],
    runningStyles: [],
    favoriteSeasons: [],
    currentGoals: [], // 단일 선택에서 배열로 변경
    // 통신사 본인인증 정보
    birthDate: carrierUserInfo?.birthDate || '',
    gender: carrierUserInfo?.gender || '',
    age: carrierUserInfo?.age || '',
    carrierVerified: isCarrierVerified,
    carrierVerifiedAt: carrierUserInfo?.carrierVerifiedAt || '',
  });

  const { user, updateUserProfile, setOnboardingCompleted } = useAuth();

  // 키보드 이벤트 리스너 추가
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      
      // 키보드가 나타나면 자동으로 스크롤
      if (scrollViewRef.current && currentStep === 1) {
        setTimeout(() => {
          // 1단계: 자기소개 입력칸으로 스크롤
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: 100,
              animated: true,
            });
          }
        }, 10);
      }
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      // 키보드가 사라지면 맨 위로 스크롤
      if (scrollViewRef.current) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: 0,
              animated: true,
            });
          }
        }, 100);
      }
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [currentStep]);





  // 프로필 이미지 선택
  const pickImage = async () => {
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

    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        profileImage: result.assets[0].uri
      }));
    }
  };

  // 카메라로 사진 찍기
  const takePhoto = async () => {
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

    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        profileImage: result.assets[0].uri
      }));
    }
  };

  // 이미지 선택 모달
  const showImagePicker = () => {
    Alert.alert(
      '프로필 사진 선택',
      '어떤 방법으로 사진을 선택하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '갤러리', onPress: pickImage },
        { text: '카메라', onPress: takePhoto },
      ]
    );
  };

  // 다음 단계로 이동
  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep(prev => prev + 1);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }
  };

  // 이전 단계로 이동
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }
  };

  // 진행 가능 여부 확인
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.nickname.trim().length > 0;
      case 2:
        return formData.runningLevel !== '';
      case 3:
        return formData.preferredCourses.length > 0;
      case 4:
        return formData.preferredTimes.length > 0;
      case 5:
        return formData.runningStyles.length > 0;
      case 6:
        return formData.favoriteSeasons.length > 0;
      case 7:
        return formData.currentGoals.length > 0;
      default:
        return false;
    }
  };

  // 온보딩 완료
  const handleComplete = async () => {
    const finalData = {
      ...formData,
      currentGoals: formData.currentGoals,
    };
    
    try {
      // 테스트 모드 확인
      if (user?.uid === 'test-user-id') {
        console.log('🧪 테스트 모드: 온보딩 완료 처리');
        
        // 테스트 모드에서도 프로필 데이터 저장
        if (updateUserProfile) {
          await updateUserProfile({
            displayName: formData.nickname,
            bio: formData.bio,
            profileImage: formData.profileImage,
            // 통신사 본인인증 정보
            birthDate: formData.birthDate,
            gender: formData.gender,
            age: formData.age,
            carrierVerified: formData.carrierVerified,
            carrierVerifiedAt: formData.carrierVerifiedAt,
            runningProfile: {
              level: formData.runningLevel,
              pace: formData.averagePace,
              preferredCourses: formData.preferredCourses,
              preferredTimes: formData.preferredTimes,
              runningStyles: formData.runningStyles,
              favoriteSeasons: formData.favoriteSeasons,
              currentGoals: finalData.currentGoals,
            },
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
          });
        }
        
        setOnboardingCompleted(true);
        setShowWelcome(true);
        setTimeout(() => {
          navigation.navigate('AppIntro');
        }, 1500);
        return;
      }
      
      if (user && updateUserProfile) {
        await updateUserProfile({
          displayName: formData.nickname,
          bio: formData.bio,
          profileImage: formData.profileImage,
          // 통신사 본인인증 정보
          birthDate: formData.birthDate,
          gender: formData.gender,
          age: formData.age,
          carrierVerified: formData.carrierVerified,
          carrierVerifiedAt: formData.carrierVerifiedAt,
          runningProfile: {
            level: formData.runningLevel,
            pace: formData.averagePace,
            preferredCourses: formData.preferredCourses,
            preferredTimes: formData.preferredTimes,
            runningStyles: formData.runningStyles,
            favoriteSeasons: formData.favoriteSeasons,
            currentGoals: finalData.currentGoals,
          },
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        });
      }
      
      // 온보딩 완료 상태 설정
      setOnboardingCompleted(true);
      
      setShowWelcome(true);
      setTimeout(() => {
        navigation.navigate('AppIntro');
      }, 1500);
    } catch (error) {
      console.error('온보딩 완료 처리 중 오류:', error);
      Alert.alert('오류', '프로필 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 배열 토글 헬퍼 함수
  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  // 진행률 계산
  const progress = (currentStep / 7) * 100;

  // 1단계: 기본 정보
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>반가워요! 🎉</Text>
      <Text style={styles.stepSubtitle}>기본 정보를 입력해주세요</Text>



      {/* 프로필 사진 */}
      <View style={styles.profileImageSection}>
        <TouchableOpacity style={styles.profileImageButton} onPress={showImagePicker}>
          {formData.profileImage ? (
            <Image source={{ uri: formData.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="camera" size={32} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.profileImageText}>프로필 사진</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profileImageHint}>프로필 사진을 추가해보세요 (선택사항)</Text>
      </View>

      {/* 닉네임/자기소개 입력 */}
      <OnboardingBioInput
        nickname={formData.nickname}
        bio={formData.bio}
        onChangeNickname={nickname => setFormData(prev => ({ ...prev, nickname }))}
        onChangeBio={bio => setFormData(prev => ({ ...prev, bio }))}
        colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
      />
    </View>
  );

  // 2단계: 러닝 레벨
  const renderStep2 = () => (
    <OnboardingLevelSelector
      value={formData.runningLevel}
      onChange={levelId => setFormData(prev => ({ ...prev, runningLevel: levelId, averagePace: (RUNNING_LEVELS.find(l => l.id === levelId)?.pace || '') }))}
      colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
      levels={RUNNING_LEVELS}
    />
  );

  // 3단계: 선호 코스
  const renderStep3 = () => (
    <OnboardingCourseSelector
      value={formData.preferredCourses}
      onChange={courses => setFormData(prev => ({ ...prev, preferredCourses: courses }))}
      colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
    />
  );

  // 4단계: 선호 시간
  const renderStep4 = () => (
    <OnboardingTimeSelector 
      value={formData.preferredTimes}
      onChange={(value) => setFormData(prev => ({ ...prev, preferredTimes: value }))}
      colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
    />
  );

  // 5단계: 러닝 스타일
  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <OnboardingStyleSelector 
        value={formData.runningStyles}
        onChange={(value) => setFormData(prev => ({ ...prev, runningStyles: value }))}
      />
    </View>
  );

  // 6단계: 선호 계절
  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <OnboardingSeasonSelector 
        value={formData.favoriteSeasons}
        onChange={(value) => setFormData(prev => ({ ...prev, favoriteSeasons: value }))}
      />
    </View>
  );

  // 7단계: 현재 목표
  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <OnboardingGoalSelector 
        value={formData.currentGoals}
        onChange={(value) => setFormData(prev => ({ ...prev, currentGoals: value }))}
      />
    </View>
  );

  if (showWelcome) {
    return (
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeEmoji}>🎉</Text>
        <Text style={styles.welcomeTitle}>환영합니다!</Text>
        <Text style={styles.welcomeSubtitle}>NetGill과 함께 러닝을 시작해보세요.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={currentStep === 1}
          >
            <Ionicons 
              name="chevron-back" 
              size={24} 
              color={currentStep === 1 ? COLORS.TEXT_SECONDARY : COLORS.TEXT} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필 설정</Text>
          <Text style={styles.stepIndicator}>{currentStep}/7</Text>
        </View>

        {/* 진행률 바 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <LinearGradient
              colors={[COLORS.PRIMARY, '#66FAFF']}
              style={[styles.progressBar, { width: `${progress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>

      {/* 콘텐츠 */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled
          ]}
          onPress={currentStep === 7 ? handleComplete : handleNext}
          disabled={!canProceed()}
        >
          <LinearGradient
            colors={canProceed() ? [COLORS.PRIMARY, '#66FAFF'] : ['#333333', '#555555']}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[
              styles.nextButtonText,
              !canProceed() && styles.nextButtonTextDisabled
            ]}>
              {currentStep === 7 ? '시작하기 🚀' : '다음'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.PRIMARY,
  },
  progressContainer: {
    height: 4,
  },
  progressBackground: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },


  // 1단계: 프로필 사진 및 기본 정보
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.TEXT_SECONDARY,
    borderStyle: 'dashed',
  },
  profileImageText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  profileImageHint: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.TEXT,
    borderWidth: 1,
    borderColor: '#333333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: 4,
  },

  // 공통 카드 스타일
  optionsContainer: {
    gap: 16,
  },
  selectedCard: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },

  // 하단 버튼
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: COLORS.TEXT,
    textAlign: 'center',
  },
});

export default OnboardingScreen; 