import { useState } from 'react';
import firebaseService from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithCredential,
  PhoneAuthProvider,
  signInWithPhoneNumber
} from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';


export const useAuthViewModel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);



  // 📧 이메일 회원가입 (자동 로그인 포함)
  const signUp = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 이메일 회원가입 시작:', email);
      
      const auth = firebaseService.getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Firebase 회원가입 성공:', userCredential.user.uid);
      
      // 회원가입 성공 후 자동으로 로그인 상태 유지
      console.log('🔐 회원가입 후 자동 로그인 상태 유지');
      
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
      'auth/quota-exceeded': '인증 요청 할당량을 초과했습니다. 나중에 다시 시도해주세요. 📱',
      'auth/captcha-check-failed': '보안 인증에 실패했습니다. 🔒',
      'auth/invalid-verification-code': '인증번호가 올바르지 않습니다. 🔢',
      'auth/invalid-verification-id': '인증 세션이 만료되었습니다. 다시 시도해주세요. ⏰',
      'auth/operation-not-allowed': 'Firebase Console에서 Phone Authentication이 활성화되지 않았거나, 한국 지역이 허용되지 않았습니다. 관리자에게 문의해주세요. 🇰🇷',
      
      // 보안
      'auth/too-many-requests': '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요. ⏰',
    };
    
    return errorMessages[errorCode] || '로그인 중 문제가 발생했습니다. 다시 시도해주세요. 🔄';
  };

  // 📱 휴대폰 인증번호 발송 (Firebase Phone Auth)
  const sendPhoneVerification = async (phoneNumber, recaptchaVerifier) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 휴대폰 인증 시작:', phoneNumber);
      
      // 한국 전화번호를 국제 형식으로 변환 (010-1234-5678 → +821012345678)
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      // 앞자리 '0' 제거 (010 → 10)
      const withoutLeadingZero = cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber;
      const fullPhoneNumber = `+82${withoutLeadingZero}`; // 한국 국가 코드 +82 추가
      console.log('🌍 변환된 전화번호:', fullPhoneNumber);
      console.log('🇰🇷 한국 국가 코드 적용됨 (E.164 형식)');
      
      const auth = firebaseService.getAuth();
      
      // 🚀 실제 Firebase Phone Auth 인증번호 발송
      console.log('📞 Firebase Phone Auth 인증번호 발송 시작');
      
      if (!recaptchaVerifier) {
        throw new Error('보안 인증이 필요합니다. 잠시 후 다시 시도해주세요.');
      }
      
      try {
        const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
        console.log('✅ Firebase Phone Auth 인증번호 발송 성공');
        return confirmationResult;
        
      } catch (firebaseError) {
        // 상세 로그: 원인 추적용
        console.error('❌ Firebase Phone Auth 오류:', firebaseError);
        console.error('❌ Firebase 오류 코드:', firebaseError?.code);
        console.error('❌ Firebase 오류 메시지:', firebaseError?.message);
        try {
          const errKeys = firebaseError && typeof firebaseError === 'object' ? Object.keys(firebaseError) : [];
          console.error('❌ [상세] 에러 객체 키 목록:', errKeys.join(', '));
          if (firebaseError?.customData && typeof firebaseError.customData === 'object') {
            console.error('❌ [상세] customData:', JSON.stringify(firebaseError.customData, null, 2));
          }
          if (firebaseError?.name) console.error('❌ [상세] name:', firebaseError.name);
          if (firebaseError?.stack) console.error('❌ [상세] stack:', firebaseError.stack);
          // Firebase JS SDK가 감싼 내부 응답
          const inner = firebaseError?.response || firebaseError?.customData?._tokenResponse;
          if (inner) console.error('❌ [상세] response/inner:', typeof inner === 'object' ? JSON.stringify(inner, null, 2) : inner);
        } catch (logErr) {
          console.error('❌ [상세] 로그 출력 중 오류:', logErr);
        }

        // Firebase 특정 에러 처리
        if (firebaseError.code === 'auth/invalid-phone-number') {
          throw new Error('올바르지 않은 전화번호 형식입니다.');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          throw new Error('너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.');
        } else if (firebaseError.code === 'auth/quota-exceeded') {
          throw new Error('일일 인증 요청 한도를 초과했습니다.');
        } else if (firebaseError.code === 'auth/invalid-recaptcha-token') {
          throw new Error('보안 인증에 실패했습니다. 다시 시도해주세요.');
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
          // 더 구체적인 에러 메시지 제공
          const errorMessage = getAuthErrorMessage(firebaseError.code);
          throw new Error(errorMessage);
        }
        
        // 일반적인 에러 처리
        const errorMessage = getAuthErrorMessage(firebaseError.code) || '인증번호 발송에 실패했습니다. 다시 시도해주세요.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Firebase Phone Auth 인증번호 발송 오류:', error);
      console.error('❌ 에러 코드:', error?.code);
      console.error('❌ 에러 메시지:', error?.message);
      try {
        if (error && typeof error === 'object') {
          const keys = Object.keys(error);
          console.error('❌ [외부 catch] 에러 객체 키:', keys.join(', '));
          if (error.stack) console.error('❌ [외부 catch] stack:', error.stack);
        }
      } catch (logErr) {
        console.error('❌ [외부 catch] 로그 출력 중 오류:', logErr);
      }

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

  // 📱 휴대폰 인증번호 확인 (Firebase Phone Auth) - 자동 로그인 포함
  const verifyPhoneCode = async (confirmationResult, code) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 Firebase Phone Auth 인증번호 확인 시작:', code);
      
      // 🚀 실제 Firebase Phone Auth 인증번호 확인
      console.log('📱 Firebase Phone Auth 인증번호 확인 중...');
      
      const userCredential = await confirmationResult.confirm(code);
      
      console.log('✅ Firebase Phone Auth 인증 성공');
      console.log('👤 사용자 정보:', userCredential.user);
      
      // 휴대폰 인증 성공 후 자동으로 로그인 상태 유지
      console.log('🔐 휴대폰 인증 후 자동 로그인 상태 유지');
      
      setError(null);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Firebase Phone Auth 인증번호 확인 오류:', error);
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