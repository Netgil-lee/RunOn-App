import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getFirestore, getDoc } from 'firebase/firestore';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthViewModel } from '../viewmodels/AuthViewModel';
import { useNetwork } from './NetworkContext';

// 기본 컨텍스트 값 정의
const defaultContextValue = {
  user: null,
  initializing: true,
  loading: false,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  sendPhoneVerification: async () => {},
  verifyPhoneCode: async () => {},
  carrierAuth: async () => {},
};

// AuthContext 생성
const AuthContext = createContext(defaultContextValue);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [testUserProfile, setTestUserProfile] = useState(null); // 테스트 모드 사용자 프로필 데이터
  const { isOnline, error: networkError } = useNetwork();
  const authViewModel = useAuthViewModel();

  

  useEffect(() => {

    
    // 최소 스플래시 표시 시간 (2.5초로 단축)
    const minSplashTime = 2500;
    const startTime = Date.now();
    
    // 500ms 후에 Expo 스플래시 숨김 (커스텀 스플래시로 자연스럽게 전환)
    setTimeout(() => {
      
      SplashScreen.hideAsync();
    }, 500);
    
    // Firebase 인증 상태 모니터링
    const unsubscribeAuth = onAuthStateChanged(auth, 
      async (user) => {
        console.log('🔐 AuthContext: Firebase 인증 상태 변경', { 
          user: !!user, 
          uid: user?.uid,
          email: user?.email 
        });
        
        const handleAuthChange = async () => {
          // 새로 로그인한 사용자의 경우 초기 커뮤니티 통계 설정
          if (user) {
            console.log('🔐 AuthContext: 로그인된 사용자 발견', user.uid);
            try {
              const db = getFirestore();
              const userRef = doc(db, 'users', user.uid);
              const userSnap = await getDoc(userRef);
              
              // 사용자 문서가 없거나 communityStats가 없는 경우 초기화
              if (!userSnap.exists() || !userSnap.data().communityStats) {
                await setDoc(userRef, {
                  communityStats: {
                    totalParticipated: 0,
                    thisMonthParticipated: 0,
                    hostedEvents: 0,
                    averageMannerScore: 5.0, // 초기값 5.0
                    mannerScoreCount: 0,
                    receivedTags: {}
                  }
                }, { merge: true });
              }
            } catch (error) {
              console.error('초기 커뮤니티 통계 설정 실패:', error);
            }
          } else {
            console.log('🔐 AuthContext: 로그인된 사용자 없음');
          }
    
          console.log('🔐 AuthContext: 사용자 상태 설정', { user: !!user, uid: user?.uid });
          setUser(user);
          setInitializing(false);
          
        };

        // 최소 스플래시 시간을 보장
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minSplashTime - elapsedTime);
        
        if (remainingTime > 0) {
  
          setTimeout(handleAuthChange, remainingTime);
        } else {
          handleAuthChange();
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        authViewModel.setError(error.message);
        
        // 에러가 발생해도 최소 스플래시 시간은 보장
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minSplashTime - elapsedTime);
        
        if (remainingTime > 0) {
  
          setTimeout(() => setInitializing(false), remainingTime);
        } else {
          setInitializing(false);
        }
      }
    );

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // 로딩 화면 컴포넌트
  const LoadingScreen = () => (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3AF8FF" />
      <Text style={styles.loadingText}>로딩 중...</Text>
    </View>
  );

  // 오프라인 화면 컴포넌트
  const OfflineScreen = () => (
    <View style={styles.container}>
      <Text style={styles.errorText}>인터넷 연결을 확인해주세요.</Text>
    </View>
  );

  // 에러 화면 컴포넌트
  const ErrorScreen = () => (
    <View style={styles.container}>
      <Text style={styles.errorText}>{authViewModel.error || networkError}</Text>
    </View>
  );

  // initializing 상태는 StackNavigator에서 처리하도록 변경
  // AuthContext는 상태만 제공하고 렌더링은 하지 않음
  
  if (!isOnline) {
    return <OfflineScreen />;
  }

  // 에러 화면 제거 - 에러 처리는 각 화면에서 담당
  // if (authViewModel.error || networkError) {
  //   return <ErrorScreen />;
  // }

  // 사용자 프로필 업데이트 함수
  const updateUserProfile = async (profileData) => {
    if (!user) {
      throw new Error('로그인된 사용자가 없습니다.');
    }

    // 테스트 모드 확인
    if (user.uid === 'test-user-id') {
      console.log('🧪 테스트 모드: 로컬 프로필 데이터 저장');
      setTestUserProfile(profileData);
      return; // 테스트 모드에서는 Firestore 저장 건너뛰기
    }

    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      // Firebase Auth의 displayName 업데이트
      if (profileData.displayName) {
        await updateProfile(user, {
          displayName: profileData.displayName
        });
      }

      // Firestore에 전체 프로필 데이터 저장
      await setDoc(userRef, {
        ...profileData,
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log('✅ 프로필 업데이트 완료');
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      throw error;
    }
  };

  // 테스트 모드 사용자 설정 함수
  const setTestUser = (testUser) => {
    console.log('🧪 테스트 모드: 사용자 상태 설정', testUser);
    setUser(testUser);
    setInitializing(false);
    setOnboardingCompleted(false); // 테스트 모드 사용자는 온보딩 미완료 상태
    console.log('🧪 테스트 모드: onboardingCompleted = false로 설정됨');
  };

  // 로그아웃 함수 래핑 (테스트 모드 처리 포함)
  const handleLogout = async () => {
    try {
      console.log('🚪 로그아웃 시작', { userUid: user?.uid, isTestUser: user?.uid === 'test-user-id' });
      
      // 테스트 모드 사용자인 경우 상태만 초기화
      if (user?.uid === 'test-user-id') {
        console.log('🧪 테스트 모드: 로그아웃 상태 초기화');
        setUser(null);
        setTestUserProfile(null);
        setOnboardingCompleted(false);
        setConfirmationResult(null);
        console.log('✅ 테스트 모드 로그아웃 완료');
        return;
      }
      
      // 실제 사용자인 경우 AuthViewModel의 logout 호출
      console.log('🔐 실제 사용자: Firebase 로그아웃 실행');
      await authViewModel.logout();
      
      // 로그아웃 후 상태 초기화 (순서 중요)
      console.log('🔄 로그아웃 후 상태 초기화 시작');
      setConfirmationResult(null);
      setTestUserProfile(null);
      setOnboardingCompleted(false);
      setUser(null); // 마지막에 user를 null로 설정하여 네비게이션 트리거
      console.log('✅ 로그아웃 완료 및 상태 초기화');
    } catch (error) {
      console.error('❌ 로그아웃 처리 중 오류:', error);
      // 에러가 발생해도 상태는 초기화
      setUser(null);
      setTestUserProfile(null);
      setOnboardingCompleted(false);
      setConfirmationResult(null);
      throw error;
    }
  };

  // 컨텍스트 값 생성 시 로그 추가
  console.log('🔐 AuthContext: 컨텍스트 값 생성', { 
    user: !!user, 
    userUid: user?.uid,
    initializing,
    onboardingCompleted 
  });

  const value = {
    user,
    signIn: authViewModel.signIn,
    signUp: authViewModel.signUp,
    logout: handleLogout,
    resetPassword: authViewModel.resetPassword,
    sendPhoneVerification: authViewModel.sendPhoneVerification,
    verifyPhoneCode: authViewModel.verifyPhoneCode,
    carrierAuth: authViewModel.carrierAuth,
    updateUserProfile,
    loading: authViewModel.loading,
    error: authViewModel.error,
    initializing,
    confirmationResult,
    setConfirmationResult,
    setTestUser,
    onboardingCompleted,
    setOnboardingCompleted,
    testUserProfile, // 테스트 모드 사용자 프로필 데이터 추가
    clearError: () => authViewModel.setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    padding: 20,
  },
}); 