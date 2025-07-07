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
import { doc, setDoc, updateDoc, getFirestore } from 'firebase/firestore';
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
};

// AuthContext 생성
const AuthContext = createContext(defaultContextValue);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
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
      (user) => {
        const handleAuthChange = () => {
    
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

  
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      throw error;
    }
  };

  const value = {
    user,
    signIn: authViewModel.signIn,
    signUp: authViewModel.signUp,
    signInWithGoogle: authViewModel.signInWithGoogle,
    logout: authViewModel.logout,
    resetPassword: authViewModel.resetPassword,
    updateUserProfile,
    loading: authViewModel.loading,
    error: authViewModel.error,
    initializing,
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