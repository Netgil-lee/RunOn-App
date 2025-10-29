import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebaseService from '../config/firebase';
import firestoreService from '../services/firestoreService';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'phone' | 'verification' | 'network'
  const [showPhoneInput, setShowPhoneInput] = useState(false); // 휴대폰번호 입력 화면 표시 여부
  const [isSignupMode, setIsSignupMode] = useState(false); // 회원가입 모드 여부
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('privacy'); // 'privacy' or 'terms'
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [nextSlideIndex, setNextSlideIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const backgroundFadeAnim = useRef(new Animated.Value(1)).current;
  const errorFadeAnim = useRef(new Animated.Value(0)).current;
  const errorSlideAnim = useRef(new Animated.Value(-20)).current;
  const { sendPhoneVerification, verifyPhoneCode, setConfirmationResult, confirmationResult, error: authError, clearError } = useAuth();
  const { isOnline } = useNetwork();
  const recaptchaVerifierRef = useRef(null);

  // 배경 이미지 배열
  const backgroundImages = [
    require('../assets/images/riverside/running-bg-1.png'),
    require('../assets/images/riverside/running-bg-2.png'),
    require('../assets/images/riverside/running-bg-3.png'),
    require('../assets/images/riverside/running-bg-4.png'),
  ];

  const { width: screenWidth } = Dimensions.get('window');

  // 애니메이션 refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const phoneInputAnim = useRef(new Animated.Value(0)).current;
  const errorTimeoutRef = useRef(null);

  // 진입 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
    ]).start(() => {
      
    });
  }, [fadeAnim, slideAnim]);

  // 휴대폰번호 입력 화면 애니메이션
  useEffect(() => {
    if (showPhoneInput) {
      Animated.timing(phoneInputAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start();
    } else {
      phoneInputAnim.setValue(0);
    }
  }, [showPhoneInput, phoneInputAnim]);

  // 에러 처리 - AuthContext의 에러와 로컬 에러 통합
  useEffect(() => {
    if (authError) {
      setLocalError(authError);
      setErrorType('verification'); // AuthContext 에러는 주로 인증 관련
      showErrorAnimation();
      setIsLoading(false);
    } else if (!authError && localError) {
      handleClearError();
    }
  }, [authError]);

  // 컴포넌트 마운트 시 초기 상태 리셋
  useEffect(() => {
    // 로그인 화면 진입 시 항상 첫 화면으로 리셋
    setShowPhoneInput(false);
    setPhoneNumber('');
    setLocalError(null);
    setErrorType(null);
    setIsLoading(false);
  }, []);

  // 자동 슬라이드 로직
  useEffect(() => {
    const slideInterval = setInterval(() => {
      const nextIndex = (currentSlideIndex + 1) % backgroundImages.length;
      setNextSlideIndex(nextIndex);
      setIsTransitioning(true);
      
      // 부드러운 전환을 위한 애니메이션
      Animated.timing(backgroundFadeAnim, {
        toValue: 0,
        duration: 1000, // 1초로 늘림
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }).start(() => {
        setCurrentSlideIndex(nextIndex);
        setIsTransitioning(false);
        Animated.timing(backgroundFadeAnim, {
          toValue: 1,
          duration: 1000, // 1초로 늘림
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }).start();
      });
    }, 5000); // 5초마다 슬라이드

    return () => {
      clearInterval(slideInterval);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [currentSlideIndex, backgroundImages.length, backgroundFadeAnim]);

  // 휴대폰번호 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 유효성 검사
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneNumberChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    if (errorType === 'phone') {
      handleClearError();
    }
  };

  // 에러 표시 애니메이션
  const showErrorAnimation = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // 오류 메시지 등장 애니메이션
    Animated.parallel([
      Animated.timing(errorFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(errorSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 에러 해제 함수
  const handleClearError = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    // 오류 메시지 사라짐 애니메이션
    Animated.parallel([
      Animated.timing(errorFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(errorSlideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLocalError(null);
      setErrorType(null);
      if (clearError) {
        clearError();
      }
    });
  };

  // 모달 관련 함수들
  const openModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  // 사용자 친화적 에러 메시지 변환
  const getFriendlyErrorMessage = (error, type) => {
    if (!error) return null;

    const errorString = error.toString().toLowerCase();

    // 네트워크 관련 에러
    if (!isOnline || errorString.includes('network') || errorString.includes('연결')) {
      return {
        title: '인터넷 연결을 확인해주세요',
        actionText: '확인'
      };
    }

    // 휴대폰번호 관련 에러
    if (type === 'phone') {
      if (errorString.includes('이미 가입된') || errorString.includes('중복')) {
        return {
          title: '이미 가입된 휴대전화번호입니다',
          actionText: '확인'
        };
      }
      if (errorString.includes('회원가입한 휴대전화번호가 아닙') || errorString.includes('다시 확인해주세요') || errorString.includes('가입된 계정이 없습니다')) {
        return {
          title: '회원가입한 휴대전화번호가 아닙니다',
          actionText: '회원가입하기'
        };
      }
      if (errorString.includes('기존 회원이 아닙')) {
        return {
          title: '가입된 계정이 없습니다',
          actionText: '회원가입하기'
        };
      }
      if (errorString.includes('휴대폰번호') || errorString.includes('올바른')) {
        return {
          title: '올바른 휴대폰번호 형식을 입력해주세요',
          actionText: '확인'
        };
      }
    }

    // 인증번호 관련 에러
    if (type === 'verification') {
      if (errorString.includes('인증번호') || errorString.includes('올바르지 않')) {
        return {
          title: '인증번호를 다시 확인해주세요',
          actionText: '확인'
        };
      }
      if (errorString.includes('만료') || errorString.includes('세션')) {
        return {
          title: '인증 세션이 만료되었습니다',
          actionText: '확인'
        };
      }
    }

    // 기본 에러 메시지
    return {
      title: '로그인 중 문제가 발생했습니다',
      actionText: '확인'
    };
  };

  // 1단계: 휴대폰번호 확인 및 기존 회원 여부 확인
  const checkExistingUser = async (phoneNumber) => {
    try {
      // Firestore에서 해당 휴대폰번호로 가입된 사용자 확인
      const phoneCheckResult = await firestoreService.checkPhoneNumberExists(phoneNumber);
      
      if (!phoneCheckResult.exists) {
        // 회원가입하지 않은 번호인 경우
        setErrorType('phone');
        setLocalError(phoneCheckResult.reason);
        showErrorAnimation();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('기존 회원 확인 중 오류:', error);
      setErrorType('phone');
      setLocalError('휴대폰번호 확인 중 오류가 발생했습니다.');
      showErrorAnimation();
      return false;
    }
  };

  // 로그인 버튼 클릭 시 휴대폰번호 입력 화면 표시
  const handleLoginButtonClick = () => {
    setIsSignupMode(false);
    setShowPhoneInput(true);
    handleClearError();
  };

  // 뒤로가기 버튼 클릭 시 첫 화면으로 돌아가기
  const handleBackButtonClick = () => {
    setShowPhoneInput(false);
    setIsSignupMode(false);
    setPhoneNumber('');
    handleClearError();
  };

  // 로그인 처리
  const handleLogin = async () => {
    // 입력값 검증 전에만 에러 클리어
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      handleClearError();
    }

    if (!isOnline) {
      setErrorType('network');
      setLocalError('인터넷 연결을 확인해주세요.');
      showErrorAnimation();
      return;
    }

    if (!phoneNumber) {
      setErrorType('phone');
      setLocalError('휴대폰번호를 입력해주세요.');
      showErrorAnimation();
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setErrorType('phone');
      setLocalError('올바른 휴대폰번호 형식이 아닙니다.');
      showErrorAnimation();
      return;
    }

    // 데모모드 체크: 010-0000-0000 번호인 경우 바로 홈화면으로 이동
    if (phoneNumber === '010-0000-0000') {
      try {
        setIsLoading(true);
        // 데모모드: Firebase 인증 없이 바로 홈화면으로 이동
        navigation.navigate('Home');
        setIsLoading(false);
        return;
      } catch (error) {
        setIsLoading(false);
        setErrorType('verification');
        setLocalError('데모모드 로그인 중 오류가 발생했습니다.');
        showErrorAnimation();
        return;
      }
    }

    try {
      setIsLoading(true);

      // 1단계: 기존 회원 여부 확인
      const isExistingUser = await checkExistingUser(phoneNumber);
      
      if (!isExistingUser) {
        setIsLoading(false);
        return;
      }

      // 2단계: 인증번호 발송
      const confirmationResult = await sendPhoneVerification(phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(confirmationResult);
      
      // VerificationScreen으로 이동
      navigation.navigate('Verification', { 
        phoneNumber: phoneNumber,
        isLogin: true // 로그인 모드임을 표시
      });
      
    } catch (error) {
      setIsLoading(false);
      setErrorType('verification');
      setLocalError(error.message || '로그인 중 오류가 발생했습니다.');
      showErrorAnimation();
    } finally {
      if (!localError) {
        setIsLoading(false);
      }
    }
  };

  // 회원가입 처리
  const handleSignupProcess = async () => {
    // 입력값 검증 전에만 에러 클리어
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      handleClearError();
    }

    if (!isOnline) {
      setErrorType('network');
      setLocalError('인터넷 연결을 확인해주세요.');
      showErrorAnimation();
      return;
    }

    if (!phoneNumber) {
      setErrorType('phone');
      setLocalError('휴대폰번호를 입력해주세요.');
      showErrorAnimation();
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setErrorType('phone');
      setLocalError('올바른 휴대폰번호 형식이 아닙니다.');
      showErrorAnimation();
      return;
    }

    try {
      setIsLoading(true);

      // 휴대전화번호 중복 체크
      const phoneCheckResult = await firestoreService.checkPhoneNumberAvailability(phoneNumber);
      
      if (!phoneCheckResult.available) {
        setErrorType('phone');
        setLocalError(phoneCheckResult.reason);
        showErrorAnimation();
        return;
      }

      // 회원가입: 중복 체크 통과 후 인증번호 발송
      const confirmationResult = await sendPhoneVerification(phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(confirmationResult);
      
      // VerificationScreen으로 이동
      navigation.navigate('Verification', { 
        phoneNumber: phoneNumber,
        isLogin: false // 회원가입 모드임을 표시
      });
      
    } catch (error) {
      setIsLoading(false);
      setErrorType('verification');
      setLocalError(error.message || '회원가입 중 오류가 발생했습니다.');
      showErrorAnimation();
    } finally {
      if (!localError) {
        setIsLoading(false);
      }
    }
  };

  // 회원가입으로 이동 - 휴대폰번호 입력 화면 표시
  const handleSignup = () => {
    handleClearError();
    setIsSignupMode(true);
    setShowPhoneInput(true);
  };



  const errorInfo = getFriendlyErrorMessage(localError, errorType);

  // 에러 액션 버튼 처리
  const handleErrorAction = () => {
    if (errorInfo.actionText === '회원가입하기') {
      // 회원가입 모드로 전환
      setIsSignupMode(true);
      setErrorType(null);
      setLocalError(null);
    } else {
      // 일반적인 에러 확인 (에러 메시지 숨기기)
      handleClearError();
    }
  };

  // 배경 이미지 렌더링 함수
  const renderBackgroundImage = (imageSource) => (
    <View style={styles.backgroundImageContainer}>
      <Image 
        source={imageSource} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.backgroundOverlay} />
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifierRef}
          firebaseConfig={firebaseService.getApp().options}
        />
        {/* 배경 슬라이드 */}
        <View style={styles.backgroundContainer}>
          <Animated.View style={[styles.backgroundImageContainer, { opacity: backgroundFadeAnim }]}>
            <Image 
              source={backgroundImages[currentSlideIndex]} 
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            <View style={styles.backgroundOverlay} />
          </Animated.View>
        </View>

        {/* 뒤로가기 버튼 */}
        {showPhoneInput && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackButtonClick}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {!showPhoneInput ? (
            // 첫 화면: 로고와 버튼들
            <>
              {/* 중앙 영역 */}
              <View style={styles.centerContainer}>
                {/* 로고 이미지 */}
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              {/* 힌트 문구 */}
              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>가입 시 </Text>
                <Text 
                  style={styles.linkText}
                  onPress={() => openModal('terms')}
                >
                  이용약관
                </Text>
                <Text style={styles.hintText}> 및 </Text>
                <Text 
                  style={styles.linkText}
                  onPress={() => openModal('privacy')}
                >
                  개인정보 취급방침
                </Text>
                <Text style={styles.hintText}>에 동의하게 됩니다.</Text>
              </View>

              {/* 시작하기 버튼 */}
              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignup}
              >
                <Text style={styles.signupButtonText}>시작하기</Text>
              </TouchableOpacity>

              {/* 로그인 버튼 */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLoginButtonClick}
              >
                <Text style={styles.loginButtonText}>로그인</Text>
              </TouchableOpacity>
            </>
          ) : (
            // 두 번째 화면: 휴대폰번호 입력
            <>
              <Text style={styles.title}>{isSignupMode ? '회원가입' : '로그인'}</Text>
              
              {/* 제목과 라벨 사이 여백 */}
              <View style={{ height: 40 }} />

              {/* 에러 표시 영역 */}
              {errorInfo && localError && (
                <Animated.View 
                  style={[
                    styles.errorContainer,
                    {
                      opacity: errorFadeAnim,
                      transform: [{ translateY: errorSlideAnim }]
                    }
                  ]}
                >
                  <View style={styles.errorContent}>
                    <Text style={styles.errorTitle}>{errorInfo.title}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[
                      styles.errorActionButton,
                      isButtonHovered && styles.errorActionButtonHovered
                    ]}
                    onPress={handleErrorAction}
                    onPressIn={() => setIsButtonHovered(true)}
                    onPressOut={() => setIsButtonHovered(false)}
                  >
                    <Text style={[
                      styles.errorActionText,
                      isButtonHovered && styles.errorActionTextHovered
                    ]}>
                      {errorInfo.actionText}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              <Animated.View 
                style={[
                  styles.inputContainer,
                  {
                    opacity: phoneInputAnim,
                    transform: [{ translateY: phoneInputAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })}]
                  }
                ]}
              >
                <Text style={styles.label}>휴대폰번호를 입력해주세요</Text>
                
                <TextInput
                  style={[
                    styles.input,
                    errorType === 'phone' && styles.inputError
                  ]}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#666"
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  keyboardType="phone-pad"
                  maxLength={13}
                  editable={!isLoading}
                />
              </Animated.View>

              {/* 로그인/회원가입 버튼 */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.disabledButton]}
                onPress={isSignupMode ? handleSignupProcess : handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {isSignupMode ? '회원가입' : '로그인'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
        
        {/* 모달 */}
        <TermsPrivacyModal
          visible={modalVisible}
          onClose={closeModal}
          type={modalType}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImageContainer: {
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // 어두운 오버레이
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    zIndex: 1, // 배경 위에 표시되도록
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 250,
    height: 65,
    marginBottom: 0,
  },
  hintContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Pretendard-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Pretendard-Regular',
  },
  // 에러 관련 스타일 (앱 테마와 일치)
  errorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 20,
    width: '85%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  errorContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'Pretendard-Medium',
    textAlign: 'center',
  },
  errorActionButton: {
    backgroundColor: '#3AF8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 4,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    minHeight: 48,
    shadowColor: '#3AF8FF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorActionButtonHovered: {
    backgroundColor: '#2EE5E5',
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  errorActionText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  errorActionTextHovered: {
    color: '#000',
  },
  inputContainer: {
    marginBottom: 20,
    width: '85%',
    alignSelf: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Pretendard-SemiBold',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    fontFamily: 'Pretendard-Regular',
  },
  inputError: {
    borderColor: '#3AF8FF',
    backgroundColor: '#1a1a1a',
  },
  signupButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    width: '85%',
    alignSelf: 'center',
  },
  signupButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  loginButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#3AF8FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    width: '85%',
    alignSelf: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#3AF8FF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  linkText: {
    color: '#ffffff',
    textDecorationLine: 'underline',
    fontSize: 12,
    fontFamily: 'Pretendard-Regular',
  },

});

export default LoginScreen; 