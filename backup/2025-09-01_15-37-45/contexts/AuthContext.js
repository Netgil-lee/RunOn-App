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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    
    // Firebase 인증 상태 모니터링 (자동 로그인 지원)
    const unsubscribeAuth = onAuthStateChanged(auth, 
      async (user) => {
        console.log('🔐 AuthContext: Firebase 인증 상태 변경', { 
          user: !!user, 
          uid: user?.uid,
          email: user?.email,
          isAutoLogin: !!user // 자동 로그인 상태 표시
        });
        
        if (user) {
          console.log('🔐 AuthContext: 자동 로그인 성공 - 사용자 세션 유지됨');
        }
        

        
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

    console.log('🔐 AuthContext: 프로필 업데이트 시작', {
      userUid: user.uid,
      environment: __DEV__ ? 'development' : 'production',
      profileDataKeys: Object.keys(profileData)
    });

    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      // TestFlight 환경에서 추가 검증
      if (!__DEV__) {
        console.log('🔍 TestFlight: Firebase 연결 상태 확인 중...');
        
        // Firebase 연결 상태 확인
        try {
          await getDoc(userRef);
          console.log('✅ TestFlight: Firebase 연결 성공');
        } catch (firebaseError) {
          console.error('❌ TestFlight: Firebase 연결 실패:', firebaseError);
          throw new Error('Firebase 연결에 실패했습니다');
        }
      }
      
      // Firebase Auth의 displayName 업데이트
      if (profileData.nickname) {
        console.log('🔐 Firebase Auth displayName 업데이트 시작');
        await updateProfile(user, {
          displayName: profileData.nickname
        });
        console.log('✅ Firebase Auth displayName 업데이트 완료');
      }

      // undefined 값 제거
      const cleanProfileData = Object.fromEntries(
        Object.entries(profileData).filter(([_, value]) => value !== undefined)
      );
      
      // Firestore에 프로필 데이터 저장 (profile 필드 안에 저장)
      console.log('📝 Firestore 프로필 데이터 저장 시작');
      await setDoc(userRef, {
        profile: {
          ...cleanProfileData,
          updatedAt: new Date().toISOString(),
        },
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log('✅ Firestore 프로필 데이터 저장 완료');

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
      console.error('❌ 에러 상세:', {
        code: error.code,
        message: error.message,
        environment: __DEV__ ? 'development' : 'production',
        userUid: user?.uid
      });
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
      if (!user) {
        console.warn('⚠️ 사용자 정보가 없어 온보딩 완료 처리 불가');
        return false;
      }

      console.log('🔐 AuthContext: 온보딩 완료 처리 시작', { 
        uid: user.uid,
        environment: __DEV__ ? 'development' : 'production'
      });
      

      
              // TestFlight 환경에서 추가 검증
        if (!__DEV__) {
          console.log('🔍 TestFlight: Firebase 연결 상태 확인 중...');
          
          // Firebase 연결 상태 확인
          try {
            const db = getFirestore();
            console.log('✅ TestFlight: Firebase 연결 성공');
          } catch (firebaseError) {
            console.error('❌ TestFlight: Firebase 연결 실패:', firebaseError);
            throw new Error('Firebase 연결에 실패했습니다');
          }
        }
      
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      

      // AsyncStorage에서 온보딩 데이터 가져오기
      let onboardingData = null;
      try {
        const storedData = await AsyncStorage.getItem('onboarding_form_data');
        if (storedData) {
          try {
            onboardingData = JSON.parse(storedData);
            console.log('📥 AsyncStorage에서 온보딩 데이터 로드:', onboardingData);
          } catch (parseError) {
            console.error('❌ 온보딩 데이터 JSON 파싱 실패:', parseError, '원본 데이터:', storedData);
            // 잘못된 데이터 삭제
            await AsyncStorage.removeItem('onboarding_form_data');
            onboardingData = null;
          }
        } else {
          console.warn('⚠️ AsyncStorage에 온보딩 데이터가 없음');
        }
      } catch (storageError) {
        console.error('❌ AsyncStorage 온보딩 데이터 로드 실패:', storageError);
      }

      // Firestore 업데이트 데이터 준비
      const updateData = {
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp()
      };

      // 온보딩 데이터가 있으면 프로필에 추가
      if (onboardingData) {
        // 나이 계산 함수
        const calculateAge = (birthDate) => {
          if (!birthDate) return null;
          
          try {
            // 새로운 YYMMDD 형식 처리
            if (birthDate.length === 6) {
              const year = parseInt(birthDate.substring(0, 2));
              const month = parseInt(birthDate.substring(2, 4));
              const day = parseInt(birthDate.substring(4, 6));
              
              // 한국 주민등록번호 기준: 실제 나이 계산을 위한 보정
              let fullYear;
              const currentYear = new Date().getFullYear();
              const currentYearLastTwo = currentYear % 100; // 2024 → 24
              
              // 간단한 규칙: 00-24는 2000년대, 25-99는 1900년대
              if (year >= 0 && year <= currentYearLastTwo) {
                // 00-24: 2000년대로 처리 (2000-2024)
                fullYear = 2000 + year;
              } else {
                // 25-99: 1900년대로 처리 (1925-1999)
                fullYear = 1900 + year;
              }
              
              const birth = new Date(fullYear, month - 1, day);
              const today = new Date();
              
              let age = today.getFullYear() - birth.getFullYear();
              const monthDiff = today.getMonth() - birth.getMonth();
              
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
              }
              
              return age;
            }
            
            return null;
          } catch (error) {
            return null;
          }
        };
        
        // 나이 계산
        const calculatedAge = calculateAge(onboardingData.birthDate);
        
        updateData.profile = {
          nickname: onboardingData.nickname || user.displayName || '',
          bio: onboardingData.bio || '',
          gender: onboardingData.gender || '',
          birthDate: onboardingData.birthDate || '',
          runningLevel: onboardingData.runningLevel || '',
          averagePace: onboardingData.averagePace || '',
          preferredCourses: onboardingData.preferredCourses || [],
          preferredTimes: onboardingData.preferredTimes || [],
          runningStyles: onboardingData.runningStyles || [],
          favoriteSeasons: onboardingData.favoriteSeasons || [],
          currentGoals: onboardingData.currentGoals || [],
          profileImage: onboardingData.profileImage || null,
          updatedAt: serverTimestamp()
        };
        
        // age 필드는 유효한 값일 때만 추가
        if (calculatedAge !== null && calculatedAge !== undefined) {
          updateData.profile.age = calculatedAge;
        }
        console.log('📝 Firestore에 저장할 프로필 데이터:', updateData.profile);
      }
      
      // Firestore 업데이트 (재시도 로직 포함)
      let retryCount = 0;
      const maxRetries = !__DEV__ ? 5 : 3; // TestFlight에서는 더 많은 재시도
      

      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔍 Firestore 업데이트 시도 ${retryCount + 1}/${maxRetries}`);
          
          await updateDoc(userRef, updateData);
          
          console.log('✅ Firestore 업데이트 완료 (시도:', retryCount + 1, ')');
          
          // 성공적으로 저장되면 AsyncStorage 정리
          if (onboardingData) {
            try {
              await AsyncStorage.removeItem('onboarding_form_data');
              console.log('🧹 AsyncStorage 온보딩 데이터 정리 완료');
            } catch (cleanupError) {
              console.warn('⚠️ AsyncStorage 정리 실패:', cleanupError);
            }
          }
          
          break;
          
        } catch (firestoreError) {
          retryCount++;
          console.error('❌ Firestore 업데이트 실패 (시도:', retryCount, '):', firestoreError);
          
          // TestFlight 환경에서 더 자세한 에러 정보
          if (!__DEV__) {
            console.error('❌ TestFlight Firestore 에러 상세:', {
              code: firestoreError.code,
              message: firestoreError.message,
              retryCount: retryCount,
              maxRetries: maxRetries
            });
          }
          
          if (retryCount >= maxRetries) {
            throw firestoreError;
          }
          
          // 재시도 전 대기 시간 (TestFlight에서는 더 길게)
          const waitTime = !__DEV__ ? 2000 : 1000;
          console.log(`⏳ ${waitTime}ms 대기 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // 로컬 상태 업데이트
      setOnboardingCompleted(true);
      console.log('🔐 AuthContext: 온보딩 완료 상태로 업데이트 완료');
      
      // 상태 동기화를 위한 대기 시간 (TestFlight에서는 더 길게)
      const syncWaitTime = !__DEV__ ? 1000 : 500;
      console.log(`⏳ 상태 동기화 대기 중... (${syncWaitTime}ms)`);
      await new Promise(resolve => setTimeout(resolve, syncWaitTime));
      
      return true;
      
    } catch (error) {
      console.error('❌ 온보딩 완료 처리 실패:', error);
      console.error('❌ 에러 상세:', {
        code: error.code,
        message: error.message,
        environment: __DEV__ ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      
      // TestFlight 환경에서 추가 에러 컨텍스트
      if (!__DEV__) {
        console.error('❌ TestFlight 에러 컨텍스트:', {
          userExists: !!user,
          userUid: user?.uid,
          currentOnboardingStatus: onboardingCompleted
        });
      }
      
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