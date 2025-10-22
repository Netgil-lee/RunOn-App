import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebaseService from '../config/firebase';
import firestoreService from '../services/firestoreService';

const PhoneAuthScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendPhoneVerification, setConfirmationResult } = useAuth();
  const { isOnline } = useNetwork();
  const recaptchaVerifierRef = useRef(null);

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
    setError(''); // 입력 시 에러 메시지 클리어
  };

  const handleSendVerificationCode = async () => {
    
    if (!isOnline) {
      Alert.alert('오프라인 상태', '인터넷 연결을 확인해주세요.');
      return;
    }

    if (!phoneNumber) {
      setError('휴대폰번호를 입력해주세요.');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('올바른 휴대폰번호 형식이 아닙니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // 휴대전화번호 중복 체크
      const phoneCheckResult = await firestoreService.checkPhoneNumberAvailability(phoneNumber);
      if (!phoneCheckResult.available) {
        setError(phoneCheckResult.reason);
        return;
      }
      
      const confirmationResult = await sendPhoneVerification(phoneNumber, recaptchaVerifierRef.current);
      
      // confirmationResult를 전역 상태로 저장
      setConfirmationResult(confirmationResult);
      
      // VerificationScreen으로 이동 (confirmationResult는 전역 상태에서 가져옴)
      navigation.navigate('Verification', { 
        phoneNumber: phoneNumber,
        isLogin: false // 회원가입 모드임을 표시
      });
    } catch (error) {
      console.error('❌ PhoneAuthScreen 에러:', error);
      setError(error.message || '인증번호 발송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };


  const isButtonDisabled = !validatePhoneNumber(phoneNumber) || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifierRef}
        firebaseConfig={firebaseService.getApp().options}
      />
      <View style={styles.content}>
        <Text style={styles.title}>RunOn</Text>
        <Text style={styles.subtitle}>너와 나의 러닝 커뮤니티</Text>
        
        {/* 제목과 라벨 사이 여백 */}
        <View style={{ height: 40 }} />

        <View style={styles.inputContainer}>
          <Text style={styles.label}>휴대폰번호를 입력해주세요</Text>
          
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="010-0000-0000"
            placeholderTextColor="#666"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            keyboardType="phone-pad"
            maxLength={13}
            editable={!isLoading}
          />
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, isButtonDisabled && styles.disabledButton]}
          onPress={handleSendVerificationCode}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.sendButtonText}>인증번호 받기</Text>
          )}
        </TouchableOpacity>


      </View>
    </SafeAreaView>
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
    fontFamily: 'Pretendard-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Pretendard-Regular',
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontFamily: 'Pretendard-Regular',
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
    marginTop: 8,
    fontFamily: 'Pretendard-Regular',
  },
  sendButton: {
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
  sendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default PhoneAuthScreen; 