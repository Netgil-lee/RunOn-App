import React, { useState } from 'react';
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

const EmailSignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const { isOnline } = useNetwork();

  // 이메일 유효성 검사
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 비밀번호 유효성 검사
  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // 비밀번호 확인 검사
  const validateConfirmPassword = (password, confirmPassword) => {
    return password === confirmPassword;
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    setError(''); // 입력 시 에러 메시지 클리어
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setError('');
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    setError('');
  };

  const handleSignup = async () => {
    console.log('🚀 이메일 회원가입 시작');
    
    if (!isOnline) {
      Alert.alert('오프라인 상태', '인터넷 연결을 확인해주세요.');
      return;
    }

    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (!validatePassword(password)) {
      setError('비밀번호는 6자 이상 입력해주세요.');
      return;
    }

    if (!confirmPassword) {
      setError('비밀번호 확인을 입력해주세요.');
      return;
    }

    if (!validateConfirmPassword(password, confirmPassword)) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      console.log('📧 Firebase Auth 회원가입 시작');
      
      // Firebase Auth를 통한 회원가입
      const user = await signUp(email, password);
      
      console.log('✅ 회원가입 성공:', user.uid);
      
      // Firestore에 사용자 정보 저장 (개발 모드에서 오류 처리)
      try {
        const db = getFirestore();
        await setDoc(doc(db, 'users', user.uid), {
          email: email,
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
      } catch (firestoreError) {
        console.error('❌ Firestore 저장 실패:', firestoreError);
        // 개발 모드에서는 Firestore 오류를 무시하고 계속 진행
        if (__DEV__) {
          console.log('🧪 개발 모드: Firestore 저장 오류 무시하고 계속 진행');
        } else {
          throw firestoreError;
        }
      }
      
      // AuthContext의 상태 변경을 통해 자연스럽게 온보딩 화면으로 이동
      // navigation.replace는 호출하지 않음 - AppNavigator가 자동으로 처리
      
    } catch (error) {
      console.error('❌ 이메일 회원가입 실패:', error);
      setError(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isSignupButtonDisabled = !email || !password || !confirmPassword || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>이메일로 회원가입</Text>
          <Text style={styles.subtitle}>RunOn에 가입하고 러닝 커뮤니티를 시작하세요</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="example@email.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="6자 이상 입력"
              placeholderTextColor="#666"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="비밀번호를 다시 입력"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.signupButton, isSignupButtonDisabled && styles.disabledButton]}
            onPress={handleSignup}
            disabled={isSignupButtonDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.signupButtonText}>회원가입</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.backText}>뒤로가기</Text>
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
    fontSize: 28,
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
    marginBottom: 40,
    fontFamily: 'Pretendard-Regular',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
  },
  signupButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  signupButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
  },
});

export default EmailSignupScreen; 