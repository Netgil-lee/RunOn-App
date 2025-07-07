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
  Image,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';

// 이미지 import 수정
const googleLogo = require('@assets/google-logo.png');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'email' | 'google' | 'network'
  const { signIn, signInWithGoogle, error: authError, clearError } = useAuth();
  const { isOnline } = useNetwork();

  // 애니메이션 refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
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

  // 에러 처리 - AuthContext의 에러와 로컬 에러 통합
  useEffect(() => {
    if (authError) {
  
      setLocalError(authError);
      setErrorType('email'); // AuthContext 에러는 주로 이메일 로그인 관련
      showErrorAnimation();
      
      // 에러 발생 시 확실히 LoginScreen에 머물도록
      setIsLoading(false);
      
    } else if (!authError && localError) {
      // AuthContext 에러가 클리어되면 로컬 에러도 클리어
      
      handleClearError();
    }
  }, [authError]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // 에러 표시 (자동 숨김 타이머 제거)
  const showErrorAnimation = () => {
    // 기존 타이머가 있다면 제거
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    // 자동 숨김 타이머 제거 - 확인 버튼을 눌러야만 사라짐
    
  };

  // 숨김 애니메이션 삭제 - 즉시 사라지도록 변경

  // 에러 해제 함수
  const handleClearError = () => {
    
    
    // 자동 숨김 타이머 제거
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
      
    }

    // 즉시 에러 상태 클리어 (애니메이션 없이)
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

    // 이메일 로그인 관련 에러
    if (type === 'email') {
      if (errorString.includes('invalid-email') || errorString.includes('유효하지 않은 이메일') || errorString.includes('이메일 주소')) {
        return {
          title: '이메일 확인',
          message: '올바른 이메일 주소를 입력해주세요.',
          icon: '📧',
          actionText: '확인'
        };
      }
      if (errorString.includes('wrong-password') || errorString.includes('잘못된 비밀번호') || errorString.includes('비밀번호')) {
        return {
          title: '비밀번호 확인',
          message: '비밀번호가 올바르지 않습니다.',
          icon: '🔒',
          actionText: '확인'
        };
      }
      if (errorString.includes('user-not-found') || errorString.includes('존재하지 않는 계정') || errorString.includes('계정')) {
        return {
          title: '계정을 찾을 수 없음',
          message: '등록되지 않은 이메일입니다. 회원가입을 해주세요.',
          icon: '👤',
          actionText: '회원가입하기'
        };
      }
      if (errorString.includes('too-many-requests') || errorString.includes('너무 많은 요청')) {
        return {
          title: '잠시 후 다시 시도',
          message: '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
          icon: '⏰',
          actionText: '확인'
        };
      }
      if (errorString.includes('email-already-in-use') || errorString.includes('이미 사용 중인 이메일')) {
        return {
          title: '이미 가입된 계정',
          message: '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
          icon: '👤',
          actionText: '확인'
        };
      }
    }

    // Google 로그인 관련 에러
    if (type === 'google') {
      if (errorString.includes('popup-closed') || errorString.includes('취소')) {
        return null; // 사용자 취소는 에러로 표시하지 않음
      }
      if (errorString.includes('oauth') || errorString.includes('authorization')) {
        return {
          title: 'Google 로그인 문제',
          message: 'Google 로그인에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          icon: '🔐',
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

  const handleLogin = async () => {
    // 기존 에러 클리어
    handleClearError();

    if (!isOnline) {
      setErrorType('network');
      setLocalError('인터넷 연결을 확인해주세요.');
      showErrorAnimation();
      return;
    }

    if (!email || !password) {
      setErrorType('email');
      setLocalError('이메일과 비밀번호를 모두 입력해주세요.');
      showErrorAnimation();
      return;
    }

    try {
      setIsLoading(true);
      const result = await signIn(email, password);
      
      if (result) {

        // 성공 시 입력 필드 초기화
        setEmail('');
        setPassword('');
        handleClearError();
      }
      
    } catch (error) {
      
      
      // 에러 발생 시 반드시 LoginScreen에 머물도록 처리
      setIsLoading(false); // 로딩 상태를 먼저 해제
      setErrorType('email');
      setLocalError(error.message || '로그인 중 오류가 발생했습니다.');
      showErrorAnimation();
      
      // LoginScreen에 머물도록 명시적으로 처리
      
      return; // 여기서 함수 종료
    } finally {
      // try 블록에서 성공한 경우에만 로딩 해제
      if (!localError) {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    // 기존 에러 클리어
    handleClearError();

    if (!isOnline) {
      setErrorType('network');
      setLocalError('인터넷 연결을 확인해주세요.');
      showErrorAnimation();
      return;
    }



    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      
      if (result === null || result === undefined) {
        // 사용자가 로그인을 취소한 경우

        return;
      }
      
      // 성공적으로 로그인한 경우, AuthContext의 user 상태가 변경되어 자동으로 Home으로 이동
      
      handleClearError();
      
    } catch (error) {
      // 실제 에러가 발생한 경우만 처리
      
      
      // 사용자 취소와 관련된 에러는 조용히 처리
      if (error.message && (
        error.message.includes('취소') || 
        error.message.includes('cancel') ||
        error.message.includes('사용자가') ||
        error.message.includes('User cancelled') ||
        error.message.includes('popup-closed-by-user')
      )) {

        return;
      }
      
      // 실제 에러인 경우 표시
      setErrorType('google');
      setLocalError(error.message);
      showErrorAnimation();
      
      if (error.message && error.message.includes('직접 AuthSession 실패')) {

      }
    } finally {
      setIsLoading(false);
    }
  };

  // 에러 액션 처리
  const handleErrorAction = () => {
    const errorInfo = getFriendlyErrorMessage(localError, errorType);
    
    
    
    if (errorInfo?.actionText === '회원가입하기') {
      handleClearError(); // 에러 클리어 후 이동
      setTimeout(() => {
        navigation.navigate('Signup');
      }, 100);
    } else {
      // "확인" 버튼을 누르면 에러 메시지가 사라짐
      handleClearError();
      
    }
  };

  const errorInfo = getFriendlyErrorMessage(localError, errorType);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.title}>NetGill</Text>
          <Text style={styles.subtitle}>너와 나의 러닝 커뮤니티</Text>

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

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                errorType === 'email' && styles.inputError
              ]}
              placeholder="이메일"
              placeholderTextColor="#666"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorType === 'email') {
                  handleClearError();
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
            <TextInput
              style={[
                styles.input,
                errorType === 'email' && styles.inputError
              ]}
              placeholder="비밀번호"
              placeholderTextColor="#666"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorType === 'email') {
                  handleClearError();
                }
              }}
              secureTextEntry
              autoComplete="password"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.disabledButton]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Image
                  source={googleLogo}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Google로 로그인</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}
            disabled={isLoading}
          >
            <Text style={styles.signupText}>
              계정이 없으신가요? <Text style={styles.signupTextBold}>회원가입</Text>
            </Text>
          </TouchableOpacity>


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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
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
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
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
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#2a1f1f',
  },
  loginButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 10,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupTextBold: {
    color: '#3AF8FF',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#3AF8FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: '#3AF8FF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen; 