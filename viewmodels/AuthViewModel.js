import { useState } from 'react';
import firebaseService from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import smsService from '../services/smsService';


export const useAuthViewModel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);



  // 📧 이메일 회원가입
  const signUp = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 이메일 회원가입 시작:', email);
      
      const auth = firebaseService.getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Firebase 회원가입 성공:', userCredential.user.uid);
      setError(null);
      return userCredential.user;
      
    } catch (error) {
      console.error('❌ 회원가입 오류:', error);
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🔐 이메일 로그인
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 이메일 로그인 시작:', email);
      
      const auth = firebaseService.getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Firebase 로그인 성공:', userCredential.user.uid);
      setError(null);
      return userCredential.user;
      
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🚪 로그아웃
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 AuthViewModel: 로그아웃 시작');
      
      const auth = firebaseService.getAuth();
      await signOut(auth);
      console.log('✅ Firebase signOut 완료');
      
    } catch (error) {
      console.error('❌ AuthViewModel 로그아웃 오류:', error);
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 친화적 에러 메시지
  const getAuthErrorMessage = (errorCode) => {
    const errorMessages = {
      // 네트워크
      'auth/network-request-failed': '인터넷 연결을 확인해주세요. 📶',
      
      // 이메일
      'auth/invalid-email': '올바른 이메일 주소를 입력해주세요. 📧',
      'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인을 시도해보세요. 👤',
      
      // 비밀번호
      'auth/wrong-password': '비밀번호가 올바르지 않습니다. 🔒',
      'auth/weak-password': '비밀번호는 6자 이상 입력해주세요. 🔐',
      
      // 계정
      'auth/user-not-found': '등록되지 않은 이메일입니다. 회원가입을 먼저 해주세요. 👤',
      'auth/user-disabled': '일시적으로 사용이 중단된 계정입니다. 🚫',
      

      
      // 휴대폰 인증
      'auth/invalid-phone-number': '유효하지 않은 휴대폰번호입니다. 📱',
      'auth/missing-phone-number': '휴대폰번호를 입력해주세요. 📱',
      'auth/quota-exceeded': 'SMS 할당량을 초과했습니다. 나중에 다시 시도해주세요. 📱',
      'auth/captcha-check-failed': '보안 인증에 실패했습니다. 🔒',
      'auth/invalid-verification-code': '인증번호가 올바르지 않습니다. 🔢',
      'auth/invalid-verification-id': '인증 세션이 만료되었습니다. 다시 시도해주세요. ⏰',
      
      // 보안
      'auth/too-many-requests': '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요. ⏰',
    };
    
    return errorMessages[errorCode] || '로그인 중 문제가 발생했습니다. 다시 시도해주세요. 🔄';
  };

  // �� 휴대폰 인증번호 발송 (서버 사이드 SMS)
  const sendPhoneVerification = async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 휴대폰 인증 시작:', phoneNumber);
      
      const fullPhoneNumber = `+82${phoneNumber.replace(/[^\d]/g, '').slice(1)}`; // 010 → +8210 변환
      console.log('🌍 변환된 전화번호:', fullPhoneNumber);
      
      // SMS 서비스를 통한 전송
      console.log('📞 SMS 서비스로 전송 시도...');
      
      const smsResult = await smsService.sendSMS(fullPhoneNumber);
      
      console.log('✅ SMS 전송 성공');
      console.log('📱 verificationId:', smsResult.verificationId);
      
      // SMS 서비스 응답을 기반으로 confirmationResult 생성
      const confirmationResult = {
        verificationId: smsResult.verificationId,
        confirm: async (code) => {
          console.log('🔢 인증번호 확인 시도:', code);
          
          // SMS 서비스를 통한 인증번호 확인
          const verifyResult = await smsService.verifyCode(smsResult.verificationId, code);
          
          console.log('✅ 인증번호 확인 성공');
          return verifyResult;
        }
      };
      
      setError(null);
      return confirmationResult;
    } catch (error) {
      console.error('❌ 휴대폰 인증번호 발송 오류:', error);
      console.error('❌ 에러 코드:', error.code);
      console.error('❌ 에러 메시지:', error.message);
      
      // 네트워크 에러 처리
      if (error.message && error.message.includes('network')) {
        const errorMessage = '네트워크 연결을 확인해주세요.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      const errorMessage = getAuthErrorMessage(error.code) || error.message || '인증번호 발송에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 📱 휴대폰 인증번호 확인 (서버 사이드)
  const verifyPhoneCode = async (confirmationResult, code) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 인증번호 확인 시작:', code);
      console.log('🔍 verificationId:', confirmationResult.verificationId);
      
      // 서버 사이드 인증번호 확인
      const result = await confirmationResult.confirm(code);
      
      console.log('✅ 인증번호 확인 성공');
      console.log('👤 사용자 정보:', result.user);
      
      setError(null);
      return result.user;
    } catch (error) {
      console.error('❌ 휴대폰 인증번호 확인 오류:', error);
      const errorMessage = getAuthErrorMessage(error.code) || error.message || '인증번호가 올바르지 않습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  return {
    loading,
    error,
    setError,
    signUp,
    signIn,
    logout,
    sendPhoneVerification,
    verifyPhoneCode
  };
};