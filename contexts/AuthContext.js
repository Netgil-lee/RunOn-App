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
import { doc, setDoc, updateDoc, getFirestore, getDoc, serverTimestamp } from 'firebase/firestore';
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

};

// AuthContext 생성
const AuthContext = createContext(defaultContextValue);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
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
              
              // 사용자 문서 확인 및 온보딩 상태 설정
              if (!userSnap.exists()) {
                // 사용자 문서가 없는 경우 - 새 사용자
                await setDoc(userRef, {
                  email: user.email,
                  uid: user.uid,
                  createdAt: serverTimestamp(),
                  onboardingCompleted: false, // 새 사용자는 온보딩 미완료
                  communityStats: {
                    totalParticipated: 0,
                    thisMonthParticipated: 0,
                    hostedEvents: 0,
                    averageMannerScore: 5.0, // 초기값 5.0
                    mannerScoreCount: 0,
                    receivedTags: {}
                  }
                }, { merge: true });
                
                setOnboardingCompleted(false);
                console.log('🔐 AuthContext: 새 사용자 문서 생성 - 온보딩 미완료');
              } else {
                // 기존 사용자 문서가 있는 경우
                const userData = userSnap.data();
                
                // communityStats가 없는 경우에만 추가
                if (!userData.communityStats) {
                  await setDoc(userRef, {
                    communityStats: {
                      totalParticipated: 0,
                      thisMonthParticipated: 0,
                      hostedEvents: 0,
                      averageMannerScore: 5.0,
                      mannerScoreCount: 0,
                      receivedTags: {}
                    }
                  }, { merge: true });
                  console.log('🔐 AuthContext: communityStats 추가');
                }
                
                // 온보딩 완료 상태 확인
                const isOnboardingCompleted = userData.onboardingCompleted || false;
                setOnboardingCompleted(isOnboardingCompleted);
                console.log('🔐 AuthContext: 기존 사용자 - 온보딩 상태:', isOnboardingCompleted);
              }
            } catch (error) {
              console.error('초기 커뮤니티 통계 설정 실패:', error);
              // 오류 발생 시 기본적으로 온보딩 미완료 상태로 설정
              setOnboardingCompleted(false);
            }
          } else {
            console.log('🔐 AuthContext: 로그인된 사용자 없음');
            // 사용자가 없으면 온보딩 상태를 false로 설정
            setOnboardingCompleted(false);
          }
          
          // 최소 스플래시 시간 보장
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minSplashTime - elapsedTime);
          
          setTimeout(() => {
            setUser(user);
            setInitializing(false);
            // onboardingCompleted 상태를 다시 확인하여 로그에 반영
            console.log('🔐 AuthContext: 컨텍스트 값 생성', {
              initializing: false,
              onboardingCompleted: onboardingCompleted,
              user: !!user,
              userUid: user?.uid
            });
          }, remainingTime);
        };
        
        handleAuthChange();
      },
      (error) => {
        console.error('❌ AuthContext: Firebase 인증 상태 모니터링 오류:', error);
        setUser(null);
        setInitializing(false);
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
      // 사용자 상태 즉시 업데이트
      if (profileData.profileImage) {
        setUser(prevUser => ({
          ...prevUser,
          photoURL: profileData.profileImage
        }));
      }
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      throw error;
    }
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      console.log('🚪 로그아웃 시작', { userUid: user?.uid });
      
      // AuthViewModel의 logout 호출
      console.log('🔐 Firebase 로그아웃 실행');
      await authViewModel.logout();
      
      // 로그아웃 후 상태 초기화
      console.log('🔄 로그아웃 후 상태 초기화 시작');
      setConfirmationResult(null);
      setOnboardingCompleted(false);
      setUser(null);
      console.log('✅ 로그아웃 완료 및 상태 초기화');
    } catch (error) {
      console.error('❌ 로그아웃 처리 중 오류:', error);
      // 에러가 발생해도 상태는 초기화
      setUser(null);
      setOnboardingCompleted(false);
      setConfirmationResult(null);
      throw error;
    }
  };

  // 온보딩 완료 처리
  const completeOnboarding = async () => {
    try {
      if (user) {
        console.log('🔐 AuthContext: 온보딩 완료 처리 시작', { 
          uid: user.uid,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        
        // Firestore 업데이트
        await updateDoc(userRef, {
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp()
        });
        
        console.log('✅ Firestore 업데이트 완료');
        
        // 로컬 상태 업데이트
        setOnboardingCompleted(true);
        console.log('🔐 AuthContext: 온보딩 완료 상태로 업데이트 완료');
        
        return true;
      } else {
        console.warn('⚠️ 사용자 정보가 없어 온보딩 완료 처리 불가');
        return false;
      }
    } catch (error) {
      console.error('❌ 온보딩 완료 처리 실패:', error);
      console.error('❌ 에러 상세:', {
        code: error.code,
        message: error.message,
        environment: __DEV__ ? 'development' : 'production'
      });
      throw error;
    }
  };

  // 컨텍스트 값 생성
  const contextValue = {
    user,
    initializing,
    loading: authViewModel.loading,
    error: authViewModel.error,
    signIn: authViewModel.signIn,
    signUp: authViewModel.signUp,
    signInWithGoogle: authViewModel.signInWithGoogle,
    logout: authViewModel.logout,
    resetPassword: authViewModel.resetPassword,
    sendPhoneVerification: authViewModel.sendPhoneVerification,
    verifyPhoneCode: authViewModel.verifyPhoneCode,
    confirmationResult,
    setConfirmationResult,
    onboardingCompleted,
    setOnboardingCompleted,
    completeOnboarding,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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