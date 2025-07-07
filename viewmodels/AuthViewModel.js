import { useState, useEffect } from 'react';
import firebaseService from '../config/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signOut
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';

// WebBrowser 초기화
WebBrowser.maybeCompleteAuthSession();

export const useAuthViewModel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🎯 표준 makeRedirectUri 사용
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
  });
    


  // 🎯 Expo 표준 방식: Google Auth Request Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: Constants.expoConfig.extra.googleClientId,
    iosClientId: Constants.expoConfig.extra.googleIosClientId,
    androidClientId: Constants.expoConfig.extra.googleAndroidClientId,
    scopes: ['profile', 'email'],
    redirectUri,
  });

  // 🎯 Expo 표준 방식: Google 인증 응답 자동 처리
  useEffect(() => {
    if (response?.type === 'success') {

      handleGoogleAuthSuccess(response.authentication);
    } else if (response?.type === 'error') {
      console.error('❌ Google OAuth 오류:', response.error);
      setError('Google 로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }, [response]);

  // Firebase 인증 처리
  const handleGoogleAuthSuccess = async (authentication) => {
    try {
      const auth = firebaseService.getAuth();

      if (!authentication?.accessToken) {
        throw new Error('Google 로그인 토큰을 받지 못했습니다.');
      }


      
      const credential = GoogleAuthProvider.credential(
        authentication.idToken, 
        authentication.accessToken
      );
      
      const userCredential = await signInWithCredential(auth, credential);

      
      setError(null); // 성공 시 에러 클리어
      
    } catch (error) {
      console.error('❌ Firebase 인증 오류:', error);
      setError(getAuthErrorMessage(error.code) || '로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Google 로그인 - Expo 표준 방식
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      

      
      // Expo의 표준 promptAsync 사용
      const result = await promptAsync();
      

      
      if (result?.type === 'cancel') {

        return null; // 취소는 에러가 아님
      }
      
      // 성공/실패는 useEffect에서 자동 처리됨
      return result;
      
    } catch (error) {
      console.error('❌ Google 로그인 오류:', error);
      const errorMessage = error.message || 'Google 로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

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
      
      const auth = firebaseService.getAuth();
      await signOut(auth);
      

      
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error);
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
      
      // Google 로그인
      'auth/popup-closed-by-user': '로그인 창이 닫혔습니다. 다시 시도해주세요. 🔄',
      'auth/cancelled-popup-request': '로그인이 취소되었습니다. 🔄',
      
      // 보안
      'auth/too-many-requests': '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요. ⏰',
    };
    
    return errorMessages[errorCode] || '로그인 중 문제가 발생했습니다. 다시 시도해주세요. 🔄';
  };

  return {
    loading,
    error,
    setError,
    signUp,
    signIn,
    signInWithGoogle,
    logout
  };
};