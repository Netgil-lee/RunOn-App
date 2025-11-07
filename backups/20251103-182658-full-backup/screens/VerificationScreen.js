import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebaseService from '../config/firebase';


const VerificationScreen = ({ navigation, route }) => {
  const { phoneNumber, isLogin = false } = route.params;
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(180); // 3분 타이머
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [recaptchaLoading, setRecaptchaLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { verifyPhoneCode, sendPhoneVerification, confirmationResult, setConfirmationResult } = useAuth();
  const { isOnline } = useNetwork();
  const recaptchaVerifierRef = useRef(null);

  // reCAPTCHA 초기화는 onLoad 콜백에서 처리

  // 타이머 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 시간 포맷팅 (02:59)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 휴대폰번호 마스킹 (010-****-5678)
  const maskPhoneNumber = (phone) => {
    const parts = phone.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-****-${parts[2]}`;
    }
    return phone;
  };

  // 6자리 통합 입력 처리
  const handleCodeInput = (value) => {
    // 숫자만 입력 가능
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // 최대 6자리까지만 입력
    if (numericValue.length <= 6) {
      setCode(numericValue);
      setError(''); // 입력 시 에러 메시지 클리어
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (!isOnline) {
      Alert.alert('오프라인 상태', '인터넷 연결을 확인해주세요.');
      return;
    }

    if (!confirmationResult) {
      setError('인증 세션이 만료되었습니다. 다시 시도해주세요.');
      return;
    }

    if (code.length !== 6) {
      setError('6자리 인증번호를 모두 입력해주세요.');
      return;
    }

    // 데모모드 체크: 010-0000-0000 번호와 123456 인증번호 조합
    if (phoneNumber === '010-0000-0000' && code === '123456') {
      try {
        setIsLoading(true);
        setError('');
        // 데모모드: Firebase 인증 없이 바로 홈화면으로 이동
        navigation.navigate('Home');
        setIsLoading(false);
        return;
      } catch (error) {
        setIsLoading(false);
        setError('데모모드 인증 중 오류가 발생했습니다.');
        return;
      }
    }

    try {
      setIsLoading(true);
      setError('');

      const user = await verifyPhoneCode(confirmationResult, code);

      
      // 🚀 실제 Firebase 사용자 처리
      if (isLogin) {
        // 로그인 모드: 온보딩 상태 확인 후 적절한 안내
        
        // 온보딩 상태 확인을 위해 Firestore에서 사용자 데이터 조회
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isOnboardingCompleted = userData.onboardingCompleted || false;
          
          if (!isOnboardingCompleted) {
            // 온보딩 미완료 사용자: 알럿 표시 후 온보딩으로 이동
            Alert.alert(
              '프로필 설정 필요',
              '프로필을 설정하지 않았습니다.\n프로필 설정 단계로 이동합니다.',
              [
                {
                  text: '확인',
                  onPress: () => {
                    // AuthContext의 상태 변경으로 AppNavigator가 온보딩 화면으로 전환
                  }
                }
              ]
            );
          } else {
            // 온보딩 완료 사용자: 정상적으로 메인 화면으로 이동
          }
        } else {
          // 사용자 문서가 없는 경우 (이상한 상황)
          Alert.alert(
            '오류',
            '사용자 정보를 찾을 수 없습니다. 다시 시도해주세요.',
            [{ text: '확인' }]
          );
        }
        
        // AuthContext의 상태 변경으로 AppNavigator가 자동으로 적절한 화면으로 전환
      } else {
        // 회원가입 모드: Firestore에 사용자 기본 정보 저장 후 온보딩으로 이동
        
        // 한국 전화번호를 국제 형식으로 변환 (010-1234-5678 → +821012345678)
        const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
        const fullPhoneNumber = `+82${cleanNumber}`;
        
        const db = getFirestore();
        await setDoc(doc(db, 'users', user.uid), {
          phoneNumber: fullPhoneNumber, // 국제 형식으로 저장
          uid: user.uid,
          createdAt: serverTimestamp(),
          onboardingCompleted: false, // 새 사용자는 온보딩 미완료
          communityStats: {
            totalParticipated: 0,
            thisMonthParticipated: 0,
            hostedEvents: 0,
            averageMannerScore: 5.0,
            mannerScoreCount: 0,
            receivedTags: {}
          }
        });

        // AuthContext의 상태 변경으로 AppNavigator가 자동으로 온보딩 화면으로 전환
      }

    } catch (error) {
      setError(error.message || '인증번호가 올바르지 않습니다. 다시 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 인증번호 재전송 (Firebase Phone Auth)
  const handleResendCode = async () => {
    if (!canResend) return;

    try {
      setIsLoading(true);
      setRecaptchaLoading(true);
      setError('');
      setCanResend(false);
      setTimer(180); // 타이머 재시작

      // reCAPTCHA 준비 상태 확인
      if (!recaptchaReady) {
        throw new Error('보안 인증이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      }

      // reCAPTCHA 모달 확인
      if (!recaptchaVerifierRef.current) {
        throw new Error('보안 인증 모달을 찾을 수 없습니다. 앱을 재시작해주세요.');
      }

      console.log('🔐 reCAPTCHA 재전송 검증 시작...');

      // Firebase Phone Auth를 통한 재전송
      console.log('📱 인증번호 재전송 시작...');
      const newConfirmationResult = await sendPhoneVerification(phoneNumber, recaptchaVerifierRef.current);
      console.log('✅ 인증번호 재전송 성공');
      
      // 새로운 confirmationResult로 전역 상태 업데이트
      setConfirmationResult(newConfirmationResult);
      setRetryCount(0); // 성공 시 재시도 카운트 리셋
      
      Alert.alert('재전송 완료', '새로운 인증번호가 발송되었습니다.');
    } catch (error) {
      console.error('❌ 재전송 오류 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });

      setIsLoading(false);
      setRecaptchaLoading(false);
      
      // 구체적인 오류 메시지 제공
      let errorMessage = '인증번호 재전송에 실패했습니다.';
      if (error.message.includes('recaptcha') || error.message.includes('보안 인증')) {
        errorMessage = '보안 인증에 실패했습니다. 다시 시도해주세요.';
      } else if (error.message.includes('network') || error.message.includes('네트워크')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error.message.includes('phone') || error.message.includes('휴대폰')) {
        errorMessage = '휴대폰번호를 확인해주세요.';
      }
      
      setError(errorMessage);
      setCanResend(true);
    } finally {
      setIsLoading(false);
      setRecaptchaLoading(false);
    }
  };

  const isVerifyButtonDisabled = code.length !== 6 || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifierRef}
        firebaseConfig={firebaseService.getApp().options}
        attemptInvisibleVerification={true}
        androidHardwareAccelerationDisabled={true}
        androidLayerType="software"
        onLoad={() => {
          console.log('✅ reCAPTCHA 모달 로드 완료 (Verification)');
          setRecaptchaReady(true);
        }}
        onError={(error) => {
          console.error('❌ reCAPTCHA 모달 오류 (Verification):', error);
          setRecaptchaReady(false);
        }}
      />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>인증번호를 입력해주세요</Text>
          <Text style={styles.subtitle}>
            {maskPhoneNumber(phoneNumber)}로 발송된 6자리 번호를 입력하세요
          </Text>

          {/* 타이머 */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {formatTime(timer)}
            </Text>
          </View>

          {/* 6자리 통합 입력 필드 */}
          <View style={styles.codeContainer}>
            <TextInput
              style={[styles.codeInput, code.length === 6 && styles.codeInputFilled]}
              value={code}
              onChangeText={handleCodeInput}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
              selectTextOnFocus
              placeholder="000000"
              placeholderTextColor="#666"
            />
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* 인증 확인 버튼 */}
          <TouchableOpacity
            style={[styles.verifyButton, isVerifyButtonDisabled && styles.disabledButton]}
            onPress={handleVerifyCode}
            disabled={isVerifyButtonDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.verifyButtonText}>인증 확인</Text>
            )}
          </TouchableOpacity>

          {/* 재전송 버튼 */}
          <TouchableOpacity
            style={[styles.resendButton, !canResend && styles.disabledResendButton]}
            onPress={handleResendCode}
            disabled={!canResend || isLoading}
          >
            <Text style={[styles.resendText, canResend && styles.resendTextActive]}>
              {canResend ? '인증번호 재전송' : `재전송 (${formatTime(timer)})`}
            </Text>
          </TouchableOpacity>

          {/* 뒤로가기 */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.backText}>휴대폰번호 변경</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Pretendard-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'Pretendard-Regular',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 18,
    color: '#3AF8FF',
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '85%',
    alignSelf: 'center',
  },
  codeInput: {
    width: '100%',
    height: 55,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Pretendard-Bold',
    letterSpacing: 8,
  },
  codeInputFilled: {
    borderColor: '#3AF8FF',
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Pretendard-Regular',
  },
  verifyButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    width: '85%',
    alignSelf: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledResendButton: {
    opacity: 0.5,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
  },
  resendTextActive: {
    color: '#3AF8FF',
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  backButton: {
    alignItems: 'center',
  },
  backText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
    fontFamily: 'Pretendard-Regular',
  },
});

export default VerificationScreen; 