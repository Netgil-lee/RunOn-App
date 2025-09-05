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
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebaseService from '../config/firebase';


const VerificationScreen = ({ navigation, route }) => {
  const { phoneNumber, isLogin = false } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(180); // 3분 타이머
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const { verifyPhoneCode, sendPhoneVerification, confirmationResult, setConfirmationResult } = useAuth();
  const { isOnline } = useNetwork();
  const recaptchaVerifierRef = useRef(null);

  // 6개 입력 필드 refs
  const refs = [
    useRef(),
    useRef(),
    useRef(),
    useRef(),
    useRef(),
    useRef(),
  ];

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

  // 6자리 개별 입력 처리
  const handleCodeInput = (value, index) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(''); // 입력 시 에러 메시지 클리어

    // 다음 입력 필드로 자동 이동
    if (value && index < 5) {
      refs[index + 1].current?.focus();
    }
  };

  // 키보드 삭제 처리
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      refs[index - 1].current?.focus();
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

    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('6자리 인증번호를 모두 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const user = await verifyPhoneCode(confirmationResult, verificationCode);

      console.log('✅ 인증 성공, 사용자 정보:', user);
      
      // 🚀 실제 Firebase 사용자 처리
      if (isLogin) {
        // 로그인 모드: AuthContext 상태 변경으로 자동 네비게이션
        console.log('🔥 Firebase 사용자 로그인 성공');
        console.log('📱 전화번호:', user.phoneNumber);
        console.log('🆔 사용자 UID:', user.uid);
        // AuthContext의 상태 변경으로 AppNavigator가 자동으로 메인 화면으로 전환
      } else {
        // 회원가입 모드: Firestore에 사용자 기본 정보 저장 후 온보딩으로 이동
        console.log('🔥 Firebase 사용자 회원가입, Firestore에 저장');
        const db = getFirestore();
        await setDoc(doc(db, 'users', user.uid), {
          phoneNumber: phoneNumber,
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

        console.log('✅ 사용자 정보 저장 완료');
        console.log('📱 저장된 전화번호:', phoneNumber);
        console.log('🆔 저장된 사용자 UID:', user.uid);
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
      setError('');
      setCanResend(false);
      setTimer(180); // 타이머 재시작

      // Firebase Phone Auth를 통한 재전송
      const newConfirmationResult = await sendPhoneVerification(phoneNumber, recaptchaVerifierRef.current);
      
      // 새로운 confirmationResult로 전역 상태 업데이트
      setConfirmationResult(newConfirmationResult);
      
      Alert.alert('재전송 완료', '새로운 인증번호가 발송되었습니다.');
    } catch (error) {
      setError(error.message || '인증번호 재전송에 실패했습니다.');
      setCanResend(true);
    } finally {
      setIsLoading(false);
    }
  };

  const isVerifyButtonDisabled = code.join('').length !== 6 || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifierRef}
        firebaseConfig={firebaseService.getApp().options}
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

          {/* 6자리 입력 필드 */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={refs[index]}
                style={[styles.codeInput, digit && styles.codeInputFilled]}
                value={digit}
                onChangeText={(value) => handleCodeInput(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!isLoading}
                selectTextOnFocus
              />
            ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Pretendard-Bold',
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