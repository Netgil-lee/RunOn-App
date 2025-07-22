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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'phone' | 'verification' | 'network'
  const [showPhoneInput, setShowPhoneInput] = useState(false); // 휴대폰번호 입력 화면 표시 여부
  const { sendPhoneVerification, verifyPhoneCode, setConfirmationResult, confirmationResult, setTestUser, error: authError, clearError } = useAuth();
  const { isOnline } = useNetwork();

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

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

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

  // 에러 표시
  const showErrorAnimation = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
  };

  // 에러 해제 함수
  const handleClearError = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setLocalError(null);
    setErrorType(null);
    if (clearError) {
      clearError();
    }
  };

  // 사용자 친화적 에러 메시지 변환
  const getFriendlyErrorMessage = (error, type) => {
    if (!error) return null;

    const errorString = error.toString().toLowerCase();

    // 네트워크 관련 에러
    if (!isOnline || errorString.includes('network') || errorString.includes('연결')) {
      return {
        title: '인터넷 연결 확인',
        message: '인터넷 연결을 확인하고 다시 시도해주세요.',
        icon: '🌐',
        actionText: '확인'
      };
    }

    // 휴대폰번호 관련 에러
    if (type === 'phone') {
      if (errorString.includes('기존 회원이 아닙')) {
        return {
          title: '기존 회원이 아닙니다',
          message: '입력하신 휴대폰번호로 가입된 계정이 없습니다.',
          icon: '📱',
          actionText: '회원가입하기'
        };
      }
      if (errorString.includes('휴대폰번호') || errorString.includes('올바른')) {
        return {
          title: '휴대폰번호 확인',
          message: '올바른 휴대폰번호 형식을 입력해주세요.',
          icon: '📱',
          actionText: '확인'
        };
      }
    }

    // 인증번호 관련 에러
    if (type === 'verification') {
      if (errorString.includes('인증번호') || errorString.includes('올바르지 않')) {
        return {
          title: '인증번호 확인',
          message: '인증번호를 다시 확인해주세요.',
          icon: '🔢',
          actionText: '확인'
        };
      }
      if (errorString.includes('만료') || errorString.includes('세션')) {
        return {
          title: '인증 세션 만료',
          message: '인증 세션이 만료되었습니다. 다시 시도해주세요.',
          icon: '⏰',
          actionText: '확인'
        };
      }
    }

    // 기본 에러 메시지
    return {
      title: '로그인 실패',
      message: '로그인 중 문제가 발생했습니다. 다시 시도해주세요.',
      icon: '⚠️',
      actionText: '확인'
    };
  };

  // 1단계: 휴대폰번호 확인 및 기존 회원 여부 확인
  const checkExistingUser = async (phoneNumber) => {
    try {
      // 테스트 모드 확인
      if (phoneNumber === '010-0000-0000') {
        return true; // 테스트 번호는 항상 기존 회원으로 처리
      }

      // 실제 구현에서는 Firestore에서 해당 휴대폰번호로 가입된 사용자를 찾아야 합니다
      // 현재는 인증번호 확인 단계에서 실제 사용자 여부를 판단하도록 처리
      
      // 임시로 모든 유효한 휴대폰번호를 허용 (실제로는 데이터베이스 조회 필요)
      return true;
    } catch (error) {
      console.error('기존 회원 확인 중 오류:', error);
      return false;
    }
  };

  // 로그인 버튼 클릭 시 휴대폰번호 입력 화면 표시
  const handleLoginButtonClick = () => {
    setShowPhoneInput(true);
    handleClearError();
  };

  // 뒤로가기 버튼 클릭 시 첫 화면으로 돌아가기
  const handleBackButtonClick = () => {
    setShowPhoneInput(false);
    setPhoneNumber('');
    handleClearError();
  };

  // 로그인 처리
  const handleLogin = async () => {
    handleClearError();

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

      // 1단계: 기존 회원 여부 확인
      const isExistingUser = await checkExistingUser(phoneNumber);
      
      if (!isExistingUser) {
        setErrorType('phone');
        setLocalError('기존 회원이 아닙니다. 회원가입을 먼저 해주세요.');
        showErrorAnimation();
        return;
      }

      // 2단계: 인증번호 발송
      const confirmationResult = await sendPhoneVerification(phoneNumber);
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

  // 회원가입으로 이동
  const handleSignup = () => {
    handleClearError();
    navigation.navigate('VerificationIntro');
  };

  // 에러 액션 처리
  const handleErrorAction = () => {
    const errorInfo = getFriendlyErrorMessage(localError, errorType);
    
    if (errorInfo?.actionText === '회원가입하기') {
      handleClearError();
      setTimeout(() => {
        navigation.navigate('PhoneAuth');
      }, 100);
    } else {
      handleClearError();
    }
  };

  const errorInfo = getFriendlyErrorMessage(localError, errorType);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
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
              {/* 앱 이름 - 상단 */}
              <View style={styles.appNameContainer}>
                <Text style={styles.appName}>NetGill</Text>
              </View>

              {/* 중앙 영역 */}
              <View style={styles.centerContainer}>
                {/* 로고 이미지가 들어갈 공간 */}
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>브랜드 로고 또는 이미지</Text>
                </View>
                
                {/* 서브 타이틀 */}
                <View style={styles.subtitleContainer}>
                  <Text style={styles.subtitle}>너와 나의{'\n'}러닝커뮤니티</Text>
                </View>
              </View>

              {/* 힌트 문구 */}
              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>가입 시 이용약관 및 개인정보 취급방침에 동의하게 됩니다.</Text>
              </View>

              {/* 버튼들 */}
              <View style={styles.buttonContainer}>
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
              </View>
            </>
          ) : (
            // 두 번째 화면: 휴대폰번호 입력
            <>
              <Text style={styles.title}>로그인</Text>
              <Text style={styles.subtitle}>가입 시 사용한 휴대폰번호를 입력하세요</Text>

              {/* 에러 표시 영역 */}
              {errorInfo && localError && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorContent}>
                    <Text style={styles.errorIcon}>{errorInfo.icon}</Text>
                    <View style={styles.errorTextContainer}>
                      <Text style={styles.errorTitle}>{errorInfo.title}</Text>
                      <Text style={styles.errorMessage}>{errorInfo.message}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.errorActionButton}
                    onPress={handleErrorAction}
                  >
                    <Text style={styles.errorActionText}>{errorInfo.actionText}</Text>
                  </TouchableOpacity>
                </View>
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

              {/* 로그인 버튼 */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.loginButtonText}>로그인</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  },
  appNameContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Pretendard-Bold',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoPlaceholderText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 20,
  },
  subtitleContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 26,
  },
  hintContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingBottom: 50,
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
  // 에러 관련 스타일
  errorContainer: {
    backgroundColor: '#2a1f1f',
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
    overflow: 'hidden',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  errorIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Pretendard-SemiBold',
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
  },
  errorActionButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  inputContainer: {
    marginBottom: 20,
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
    borderColor: '#ff6b6b',
    backgroundColor: '#2a1f1f',
  },
  signupButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
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
});

export default LoginScreen; 