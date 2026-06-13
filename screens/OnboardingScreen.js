import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import firestoreService from '../services/firestoreService';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const OnboardingScreen = ({ onComplete, navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isFromSignup = route?.params?.isFromSignup || false;
  const insets = useSafeAreaInsets();

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
    gender: '',
    birthDate: '',
    runningLevel: '',
    averagePace: '',
    preferredCourses: [],
    preferredTimes: [],
    runningStyles: [],
    favoriteSeasons: [],
    currentGoals: [], // 단일 선택에서 배열로 변경

  });

  const { user, updateUserProfile, setOnboardingCompleted, completeOnboarding } = useAuth();

  // 개발용 로그아웃 기능
  const handleDevLogout = async () => {
    try {
      const { logout } = useAuth();
      await logout();
      if (__DEV__) {
      console.log('🧪 개발용 로그아웃 완료');
    }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 키보드 이벤트 리스너 추가
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);

      // 키보드가 나타나면 입력칸이 가려지지 않도록 스크롤
      if (scrollViewRef.current && currentStep === 1) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: 300, // 더 아래로 스크롤하여 입력칸이 키보드 위에 위치하도록
              animated: true,
            });
          }
        }, 100);
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

  // formData 변경 시 canProceed 상태 로깅 (성능 최적화)
  useEffect(() => {
    if (__DEV__) {
      console.log('✅ canProceed 결과:', canProceed);
    }
  }, [canProceed]);




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
    if (canProceed) {
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

  // 주민등록번호 6자리를 나이로 계산하는 함수
  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate.length !== 6) {
      // 6자리가 아닐 때는 로그 출력하지 않음 (입력 중이므로 정상)
      return null;
    }

    try {
      const year = parseInt(birthDate.substring(0, 2));
      const month = parseInt(birthDate.substring(2, 4));
      const day = parseInt(birthDate.substring(4, 6));

      // 2000년 기준으로 년도 판단 (00-99는 2000년대로, 그 외는 1900년대로)
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

      // console.log(`🔍 나이 계산: ${birthDate} → ${year}년 → ${fullYear}년`);

      const birth = new Date(fullYear, month - 1, day);
      const today = new Date();

      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      // console.log(`🎂 나이 계산 결과: ${fullYear}년 ${month}월 ${day}일 → ${age}세`);
      return age;
    } catch (error) {
      console.error('❌ 나이 계산 오류:', error);
      return null;
    }
  };

  // 주민등록번호 6자리 유효성 검사
  const isValidBirthDate = (birthDate) => {
    if (!birthDate || birthDate.length !== 6) {
      // 6자리가 아닐 때는 로그 출력하지 않음 (입력 중이므로 정상)
      return false;
    }

    try {
      const year = parseInt(birthDate.substring(0, 2));
      const month = parseInt(birthDate.substring(2, 4));
      const day = parseInt(birthDate.substring(4, 6));

      // console.log('🔍 생년월일 파싱:', { birthDate, year, month, day });

      // 월과 일 유효성 검사
      if (month < 1 || month > 12) {
        console.log('❌ 월 유효성 검사 실패:', month);
        return false;
      }
      if (day < 1 || day > 31) {
        console.log('❌ 일 유효성 검사 실패:', day);
        return false;
      }

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

      // console.log('🔍 년도 계산:', { year, currentYear, currentYearLastTwo, fullYear });

      // 현재 년도보다 미래인지 확인
      if (fullYear > new Date().getFullYear()) {
        console.log('❌ 미래 년도:', fullYear);
        return false;
      }

      // 실제 날짜인지 확인
      const date = new Date(fullYear, month - 1, day);
      const isValidDate = date.getFullYear() === fullYear &&
                          date.getMonth() === month - 1 &&
                          date.getDate() === day;

      // console.log('🔍 날짜 유효성:', { fullYear, month, day, date, isValidDate });

      return isValidDate;
    } catch (error) {
      console.error('❌ 생년월일 유효성 검사 오류:', error);
      return false;
    }
  };

  // 진행 가능 여부 확인 (useMemo로 최적화)
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        const nicknameValid = formData.nickname.trim().length > 0;
        const genderValid = formData.gender !== '';
        const birthDateValid = isValidBirthDate(formData.birthDate);

        // 성능 최적화를 위해 로그 제거
        // console.log('🔍 1단계 검증:', {
        //   nickname: formData.nickname,
        //   nicknameValid,
        //   gender: formData.gender,
        //   genderValid,
        //   birthDate: formData.birthDate,
        //   birthDateValid,
        //   canProceed: nicknameValid && genderValid && birthDateValid
        // });

        return nicknameValid && genderValid && birthDateValid;
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
        console.log('🔍 7단계 검증 - currentGoals:', formData.currentGoals, 'length:', formData.currentGoals.length);
        return formData.currentGoals.length > 0;
      default:
        return false;
    }
  }, [currentStep, formData.nickname, formData.gender, formData.birthDate, formData.runningLevel, formData.preferredCourses, formData.preferredTimes, formData.runningStyles, formData.favoriteSeasons, formData.currentGoals]);

  // 온보딩 완료
  const handleComplete = async () => {
    // 닉네임 최종 검증
    if (!formData.nickname || formData.nickname.trim().length < 2) {
      Alert.alert('닉네임 오류', '닉네임을 2자 이상 입력해주세요.');
      return;
    }

    try {
      // 닉네임 중복 최종 체크
      const nicknameCheck = await firestoreService.checkNicknameAvailability(formData.nickname.trim());
      if (!nicknameCheck.available) {
        Alert.alert('닉네임 중복', nicknameCheck.reason || '이미 사용 중인 닉네임입니다.');
        return;
      }

      // 온보딩 데이터를 AsyncStorage에 저장 (AppIntroScreen에서 사용할 수 있도록)
      const onboardingData = {
        timestamp: new Date().toISOString(),
        step: 7,
        formData: formData,
        currentGoals: formData.currentGoals,
        canProceed: canProceed, // 이미 값이므로 함수 호출 불필요
        message: 'handleComplete 함수 실행됨'
      };

      // 온보딩 데이터를 저장 (completeOnboarding에서 Firestore에 업로드할 수 있도록)
      await AsyncStorage.setItem('onboarding_form_data', JSON.stringify(formData));
      await AsyncStorage.setItem('onboarding_debug_log', JSON.stringify(onboardingData));

      console.log('🚀 온보딩 완료 버튼 클릭됨');
      console.log('📊 현재 formData:', formData);
      console.log('🎯 선택된 목표들:', formData.currentGoals);
      console.log('✅ 진행 가능 여부:', canProceed);
      console.log('💾 온보딩 데이터 AsyncStorage 저장 완료');

      setShowWelcome(true);

      // 지연 시간을 단축하고 더 안정적인 네비게이션 사용
      setTimeout(() => {
        console.log('🚀 AppIntroScreen으로 네비게이션 시작');
        console.log('🧭 네비게이션 객체:', navigation);
        console.log('🧭 사용 가능한 라우트:', navigation.getState()?.routes?.map(r => r.name) || []);

        try {
          // navigate 대신 replace 사용으로 더 안정적인 화면 전환
          navigation.replace('AppIntro');
          console.log('✅ AppIntro 네비게이션 성공');
        } catch (error) {
          console.error('❌ AppIntro 네비게이션 실패:', error);
          // 네비게이션 실패 시 대안 처리 - 더 구체적인 에러 메시지
          Alert.alert(
            '화면 전환 오류',
            '앱 인트로 화면으로 이동할 수 없습니다. 앱을 다시 시작해주세요.',
            [{ text: '확인' }]
          );
        }
      }, 800); // 지연 시간을 1.5초에서 0.8초로 단축
    } catch (error) {
      console.error('디버깅 정보 저장 실패:', error);
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
              <Ionicons name="camera" size={32} color={colors.TEXT_SECONDARY} />
              <Text style={styles.profileImageText}>프로필 사진</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profileImageHint}>프로필 사진을 추가해보세요 (선택사항)</Text>
      </View>

      {/* 성별 선택 */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { fontSize: 20 }]}>성별 *</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              formData.gender === 'male' && styles.genderButtonActive
            ]}
            onPress={() => {
              setFormData(prev => ({ ...prev, gender: 'male' }));
            }}
          >
            <Ionicons
              name="male"
              size={20}
              color={formData.gender === 'male' ? colors.TEXT : colors.TEXT_SECONDARY}
            />
            <Text style={[
              styles.genderText,
              formData.gender === 'male' && styles.genderTextActive
            ]}>남성</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderButton,
              formData.gender === 'female' && styles.genderButtonActive
            ]}
            onPress={() => {
              setFormData(prev => ({ ...prev, gender: 'female' }));
            }}
          >
            <Ionicons
              name="female"
              size={20}
              color={formData.gender === 'female' ? colors.TEXT : colors.TEXT_SECONDARY}
            />
            <Text style={[
              styles.genderText,
              formData.gender === 'female' && styles.genderTextActive
            ]}>여성</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 생년월일 입력 */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { fontSize: 20 }]}>생년월일 *</Text>
        <Text style={styles.inputHint}>주민등록번호 앞 6자리를 입력해주세요</Text>
        <TextInput
          style={styles.birthDateInput}
          value={formData.birthDate}
          onChangeText={(text) => {
            // 숫자만 입력받고 최대 6자리로 제한
            const cleaned = text.replace(/[^0-9]/g, '');
            const formatted = cleaned.slice(0, 6);

            setFormData(prev => ({ ...prev, birthDate: formatted }));
          }}
          placeholder="YYMMDD (예: 920101)"
          placeholderTextColor={colors.TEXT_SECONDARY}
          keyboardType="numeric"
          maxLength={6}
        />
        {formData.birthDate.length === 6 && calculateAge(formData.birthDate) && (
          <Text style={styles.ageText}>만 {calculateAge(formData.birthDate)}세</Text>
        )}
      </View>

      {/* 닉네임/자기소개 입력 */}
      <OnboardingBioInput
        nickname={formData.nickname}
        bio={formData.bio}
        isNicknameImmutable={false} // 온보딩에서는 닉네임 입력 가능
        onChangeNickname={nickname => {
          setFormData(prev => ({ ...prev, nickname }));
        }}
        onChangeBio={bio => setFormData(prev => ({ ...prev, bio }))}
        colors={{
          TEXT: colors.TEXT,
          PRIMARY: colors.PRIMARY,
          CARD: colors.CARD,
          TEXT_SECONDARY: colors.TEXT_SECONDARY,
          ERROR: colors.ERROR,
          SUCCESS: colors.SUCCESS
        }}
      />
    </View>
  );

  // 2단계: 러닝 레벨
  const renderStep2 = () => (
    <OnboardingLevelSelector
      value={formData.runningLevel}
      onChange={levelId => setFormData(prev => ({ ...prev, runningLevel: levelId, averagePace: (RUNNING_LEVELS.find(l => l.id === levelId)?.pace || '') }))}
      colors={{ TEXT: colors.TEXT, PRIMARY: colors.PRIMARY, CARD: colors.CARD, TEXT_SECONDARY: colors.TEXT_SECONDARY }}
      levels={RUNNING_LEVELS}
    />
  );

  // 3단계: 선호 코스
  const renderStep3 = () => (
    <OnboardingCourseSelector
      value={formData.preferredCourses}
      onChange={courses => setFormData(prev => ({ ...prev, preferredCourses: courses }))}
      colors={{ TEXT: colors.TEXT, PRIMARY: colors.PRIMARY, CARD: colors.CARD, TEXT_SECONDARY: colors.TEXT_SECONDARY }}
    />
  );

  // 4단계: 선호 시간
  const renderStep4 = () => (
    <OnboardingTimeSelector
      value={formData.preferredTimes}
      onChange={(value) => setFormData(prev => ({ ...prev, preferredTimes: value }))}
      colors={{ TEXT: colors.TEXT, PRIMARY: colors.PRIMARY, CARD: colors.CARD, TEXT_SECONDARY: colors.TEXT_SECONDARY }}
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
                        <Text style={styles.welcomeSubtitle}>RunOn과 함께 러닝을 시작해보세요.</Text>
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
              color={currentStep === 1 ? colors.TEXT_SECONDARY : colors.TEXT}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필 설정</Text>
          <View style={styles.headerRight}>
            <Text style={styles.stepIndicator}>{currentStep}/7</Text>
          </View>
        </View>

        {/* 진행률 바 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <LinearGradient
              colors={[colors.PRIMARY, '#66FAFF']}
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
      <View style={[styles.footer, { paddingBottom: (Platform.OS === 'ios' ? 34 : 20) + insets.bottom }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed && styles.nextButtonDisabled
          ]}
          onPress={currentStep === 7 ? handleComplete : handleNext}
          disabled={!canProceed}
        >
          <LinearGradient
            colors={canProceed ? [colors.PRIMARY, '#66FAFF'] : ['#333333', '#555555']}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[
              styles.nextButtonText,
              !canProceed && styles.nextButtonTextDisabled
            ]}>
              {currentStep === 7 ? '시작하기 🚀' : '다음'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
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
    color: colors.TEXT,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.PRIMARY,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devLogoutButton: {
    marginLeft: 10,
  },
  devLogoutText: {
    fontSize: 20,
  },
  progressContainer: {
    height: 4,
  },
  progressBackground: {
    flex: 1,
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },


  // 1단계: 프로필 사진 및 기본 정보
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '85%',
    alignSelf: 'center',
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
    backgroundColor: colors.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginTop: 4,
  },
  profileImageHint: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.TEXT,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  characterCount: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: 4,
  },

  // 공통 카드 스타일
  optionsContainer: {
    gap: 16,
  },
  selectedCard: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
  },

  // 성별 및 나이 입력 스타일
  inputSection: {
    marginBottom: 24,
    width: '85%',
    alignSelf: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.BORDER,
    gap: 8,
  },
  genderButtonActive: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.PRIMARY + '20',
  },
  genderText: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
  },
  genderTextActive: {
    color: colors.TEXT,
    fontWeight: '600',
  },
  birthDateInput: {
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    color: colors.TEXT,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  inputHint: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    marginTop: 0,
    marginBottom: 8,
  },
  ageText: {
    fontSize: 14,
    color: colors.PRIMARY,
    marginTop: 4,
    fontWeight: '600',
  },

  // 하단 버튼
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.BACKGROUND,
    paddingHorizontal: 20,
    paddingVertical: 16,
    // paddingBottom은 JSX에서 insets.bottom과 함께 지정(StyleSheet에서 Platform 사용 금지)
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '85%',
    alignSelf: 'center',
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
    color: colors.TEXT_SECONDARY,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.BACKGROUND,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.PRIMARY,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: colors.TEXT,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
