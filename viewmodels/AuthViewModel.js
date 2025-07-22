import { useState, useEffect } from 'react';
import firebaseService from '../config/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  PhoneAuthProvider,
  signInWithPhoneNumber
} from 'firebase/auth';
import carrierAuthService from '../services/carrierAuthService';

export const useAuthViewModel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);



  // 📧 이메일 회원가입
  const signUp = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const auth = firebaseService.getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      

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
      
      const auth = firebaseService.getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      

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
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('⚠️ AuthViewModel: 현재 로그인된 사용자가 없음');
        return;
      }
      
      if (currentUser.uid === 'test-user-id') {
        console.log('🧪 테스트 모드: Firebase 로그아웃 건너뛰기');
        // 테스트 모드에서는 Firebase 로그아웃을 호출하지 않음
      } else {
        console.log('🔐 실제 사용자: Firebase signOut 실행');
        await signOut(auth);
        console.log('✅ Firebase signOut 완료');
      }
      
      console.log('✅ AuthViewModel 로그아웃 완료');
      
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

  // 📱 휴대폰 인증번호 발송
  const sendPhoneVerification = async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 휴대폰 인증 시작:', phoneNumber);
      
      const auth = firebaseService.getAuth();
      console.log('🔧 Firebase Auth 객체:', auth ? '존재함' : '없음');
      
      const fullPhoneNumber = `+82${phoneNumber.replace(/[^\d]/g, '').slice(1)}`; // 010 → +8210 변환
      console.log('🌍 변환된 전화번호:', fullPhoneNumber);
      
      // 개발 중 임시 테스트 모드 (실제 Firebase 호출 대신)
      if (phoneNumber === '010-0000-0000') {
        console.log('🧪 테스트 모드: 가짜 confirmationResult 반환');
        // 가짜 confirmationResult 객체 생성
        const mockConfirmationResult = {
          verificationId: 'test-verification-id',
          confirm: async (code) => {
            if (code === '123456') {
              return { user: { uid: 'test-user-id' } };
            } else {
              throw new Error('인증번호가 올바르지 않습니다.');
            }
          }
        };
        return mockConfirmationResult;
      }
      
      // React Native에서는 reCAPTCHA 없이 직접 호출
      console.log('📞 signInWithPhoneNumber 호출 중...');
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber);
      console.log('✅ 인증번호 발송 성공:', confirmationResult ? '성공' : '실패');
      
      setError(null);
      return confirmationResult;
    } catch (error) {
      console.error('❌ 휴대폰 인증번호 발송 오류:', error);
      console.error('❌ 에러 코드:', error.code);
      console.error('❌ 에러 메시지:', error.message);
      
      // reCAPTCHA 관련 에러인 경우 특별 처리
      if (error.message && error.message.includes('verify')) {
        const errorMessage = 'Firebase Phone Auth 설정이 필요합니다. Firebase Console에서 Phone Auth를 활성화해주세요.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      // 네트워크 에러 처리
      if (error.message && error.message.includes('network')) {
        const errorMessage = '네트워크 연결을 확인해주세요.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      const errorMessage = getAuthErrorMessage(error.code) || '인증번호 발송에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 📱 휴대폰 인증번호 확인
  const verifyPhoneCode = async (confirmationResult, code) => {
    try {
      setLoading(true);
      setError(null);
      
      // 테스트 모드 확인
      if (confirmationResult.verificationId === 'test-verification-id') {
        console.log('🧪 테스트 모드: 가짜 인증 확인');
        if (code === '123456') {
          // 테스트 모드에서 성공 시 가짜 사용자 객체 반환
          const mockUser = {
            uid: 'test-user-id',
            phoneNumber: '+821000000000',
            email: null,
            displayName: null,
            emailVerified: false,
            isAnonymous: false,
            metadata: {
              creationTime: new Date().toISOString(),
              lastSignInTime: new Date().toISOString()
            },
            // Firebase User 객체의 필수 메서드들 추가
            getIdToken: async () => 'test-id-token',
            getIdTokenResult: async () => ({
              token: 'test-id-token',
              authTime: new Date().toISOString(),
              issuedAtTime: new Date().toISOString(),
              expirationTime: new Date(Date.now() + 3600000).toISOString(),
              signInProvider: 'phone',
              claims: {}
            }),
            reload: async () => Promise.resolve(),
            toJSON: () => ({
              uid: 'test-user-id',
              phoneNumber: '+821000000000'
            })
          };
          console.log('🧪 테스트 모드: 가짜 사용자 객체 반환', mockUser);
          return mockUser;
        } else {
          throw new Error('인증번호가 올바르지 않습니다.');
        }
      }
      
      const auth = firebaseService.getAuth();
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, code);
      const userCredential = await signInWithCredential(auth, credential);
      
      setError(null);
      return userCredential.user;
    } catch (error) {
      console.error('❌ 휴대폰 인증번호 확인 오류:', error);
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🔐 통신사 본인인증
  const carrierAuth = async (authData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 통신사 본인인증 시작:', authData);
      
      // 통신사 지원 여부 확인
      if (!carrierAuthService.isCarrierSupported(authData.carrier)) {
        throw new Error('지원하지 않는 통신사입니다.');
      }
      
      // 통신사 서비스 상태 확인
      const serviceStatus = await carrierAuthService.checkCarrierServiceStatus(authData.carrier);
      if (!serviceStatus.available) {
        throw new Error(serviceStatus.message);
      }
      
      // 통신사 본인인증 실행
      const result = await carrierAuthService.verifyIdentity(authData);
      
      console.log('✅ 통신사 본인인증 성공:', result);
      
      setError(null);
      return result;
    } catch (error) {
      console.error('❌ 통신사 본인인증 오류:', error);
      setError(error.message);
      throw error;
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
    verifyPhoneCode,
    carrierAuth
  };
};