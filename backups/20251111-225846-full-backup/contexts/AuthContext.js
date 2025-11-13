import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../config/firebase';
import {
  signOut,
  onAuthStateChanged,
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
  logout: async () => {},
  sendPhoneVerification: async () => {},
  verifyPhoneCode: async () => {},
  loginAsDemo: async () => {},
};

// AuthContext 생성
const AuthContext = createContext(defaultContextValue);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children, isDemoMode = false }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const { isOnline, error: networkError } = useNetwork();
  const authViewModel = useAuthViewModel();


  

  useEffect(() => {
    // 데모 모드인 경우 데모 사용자 생성 (자동 활성화 비활성화)
    // if (isDemoMode) {
    //   console.log('🎭 데모 모드: 데모 사용자 생성');
    //   
    //   const demoUser = {
    //     uid: 'demo-user-12345',
    //     email: 'demo@runon.app',
    //     displayName: '데모 사용자',
    //     phoneNumber: '010-0000-0000',
    //     photoURL: null,
    //     isDemo: true
    //   };
    //   
    //   setUser(demoUser);
    //   setOnboardingCompleted(true);
    //   setInitializing(false);
    //   return;
    // }

    
    // 최소 스플래시 표시 시간 (2.5초로 단축)
    const minSplashTime = 2500;
    const startTime = Date.now();
    
    // 500ms 후에 Expo 스플래시 숨김 (커스텀 스플래시로 자연스럽게 전환)
    setTimeout(() => {
      
      SplashScreen.hideAsync();
    }, 500);
    
    // Firebase 인증 상태 모니터링 (안전성 강화)
    if (!auth) {
      console.error('❌ Firebase Auth가 초기화되지 않음');
      setInitializing(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, 
      async (user) => {
        // 자동 로그인 상태 감지
        
        const handleAuthChange = async () => {
          // 새로 로그인한 사용자의 경우 초기 커뮤니티 통계 설정
          if (user) {
            // 사용자 프로필 데이터 처리
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
                }
                
                // 온보딩 완료 상태 확인
                const isOnboardingCompleted = userData.onboardingCompleted || false;
                setOnboardingCompleted(isOnboardingCompleted);
              }
            } catch (error) {
              console.error('초기 커뮤니티 통계 설정 실패:', error);
              // 오류 발생 시 기본적으로 온보딩 미완료 상태로 설정
              setOnboardingCompleted(false);
            }
          } else {
            // 사용자가 없으면 온보딩 상태를 false로 설정
            setOnboardingCompleted(false);
          }
          
          // 최소 스플래시 시간 보장
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minSplashTime - elapsedTime);
          
          setTimeout(() => {
            setUser(user);
            setInitializing(false);
            
            // 초기화 완료
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
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
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

    // 프로필 업데이트 처리

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
        await updateProfile(user, {
          displayName: profileData.nickname
        });
      }

      // undefined 값 제거
      const cleanProfileData = Object.fromEntries(
        Object.entries(profileData).filter(([_, value]) => value !== undefined)
      );
      
      // Firestore에 프로필 데이터 저장 (profile 필드 안에 저장 + profileImage는 최상위에도 저장)
      const updateData = {
        profile: {
          ...cleanProfileData,
          updatedAt: new Date().toISOString(),
        },
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString(),
      };
      
      // profileImage가 있으면 최상위 레벨에도 저장 (AppBar에서 쉽게 접근할 수 있도록)
      if (cleanProfileData.profileImage) {
        updateData.profileImage = cleanProfileData.profileImage;
      }
      
      await setDoc(userRef, updateData, { merge: true });
      
      // 사용자 상태 즉시 업데이트
      if (profileData.profileImage) {
        setUser(prevUser => ({
          ...prevUser,
          photoURL: profileData.profileImage
        }));
      }
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      throw error;
    }
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await authViewModel.logout();
      
      // 로그아웃 후 상태 초기화
      setConfirmationResult(null);
      setOnboardingCompleted(false);
      setUser(null);
    } catch (error) {
      console.error('로그아웃 처리 중 오류:', error);
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
        console.warn('사용자 정보가 없어 온보딩 완료 처리 불가');
        return false;
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
          } catch (parseError) {
            console.error('온보딩 데이터 JSON 파싱 실패:', parseError);
            // 잘못된 데이터 삭제
            await AsyncStorage.removeItem('onboarding_form_data');
            onboardingData = null;
          }
        } else {
        }
      } catch (storageError) {
        console.error('AsyncStorage 온보딩 데이터 로드 실패:', storageError);
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
      }
      
      // Firestore 업데이트 (재시도 로직 포함)
      let retryCount = 0;
      const maxRetries = !__DEV__ ? 5 : 3; // TestFlight에서는 더 많은 재시도
      

      
      while (retryCount < maxRetries) {
        try {
          
          await updateDoc(userRef, updateData);
          
          
          // 성공적으로 저장되면 AsyncStorage 정리
          if (onboardingData) {
            try {
              await AsyncStorage.removeItem('onboarding_form_data');
            } catch (cleanupError) {
              console.warn('⚠️ AsyncStorage 정리 실패:', cleanupError);
            }
          }
          
          break;
          
        } catch (firestoreError) {
          retryCount++;
          
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
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // 로컬 상태 업데이트
      setOnboardingCompleted(true);
      
      // 상태 동기화를 위한 대기 시간
      const syncWaitTime = !__DEV__ ? 1000 : 500;
      await new Promise(resolve => setTimeout(resolve, syncWaitTime));
      
      return true;
      
    } catch (error) {
      console.error('온보딩 완료 처리 실패:', error);
      
      throw error;
    }
  };

  // 데모 모드 로그인 함수
  const loginAsDemo = async () => {
    try {
      console.log('🎭 데모 모드 로그인 시작');
      
      const demoUserId = 'demo-user-123456789';
      const db = getFirestore();
      const userRef = doc(db, 'users', demoUserId);
      
      // Firestore에서 데모 사용자 데이터 가져오기
      let userSnap = await getDoc(userRef);
      
      // 데모 사용자 데이터가 없으면 생성
      if (!userSnap.exists()) {
        console.log('🎯 데모 사용자 데이터 생성 중...');
        const demoUserData = {
          uid: demoUserId,
          phoneNumber: '010-0000-0000',
          displayName: 'Apple 심사팀',
          email: 'demo@apple-review.com',
          emailVerified: true,
          isAnonymous: false,
          profile: {
            nickname: 'Apple 심사팀',
            bio: 'Apple App Store 심사팀 데모 계정',
            gender: '기타',
            age: 30,
            runningLevel: '중급',
            averagePace: '5분/km',
            preferredCourses: ['한강공원', '올림픽공원', '여의도한강공원'],
            preferredTimes: ['오전', '저녁'],
            runningStyles: ['혼자', '그룹'],
            favoriteSeasons: ['봄', '가을'],
            currentGoals: ['건강관리', '체력향상'],
            profileImage: null,
            updatedAt: new Date().toISOString()
          },
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          communityStats: {
            totalParticipated: 5,
            thisMonthParticipated: 2,
            hostedEvents: 1,
            averageMannerScore: 5.0,
            mannerScoreCount: 3,
            receivedTags: {
              '친절함': 2,
              '시간관리': 1
            }
          },
          isPremium: true,
          subscriptionType: 'com.runon.app.premium.monthly',
          purchaseDate: serverTimestamp(),
          transactionId: 'DEMO_' + Date.now(),
          originalTransactionId: 'DEMO_' + Date.now(),
          expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          blacklistCount: 0,
          discountEligible: false,
          monthlyCounts: {
            '2024-10': 2,
            '2024-09': 3
          },
          isDemo: true
        };
        
        await setDoc(userRef, demoUserData, { merge: true });
        userSnap = await getDoc(userRef);
      }
      
      // 데모 사용자 객체 생성
      const userData = userSnap.data();
      const demoUser = {
        uid: demoUserId,
        email: userData.email || 'demo@apple-review.com',
        displayName: userData.profile?.nickname || 'Apple 심사팀',
        phoneNumber: userData.phoneNumber || '010-0000-0000',
        photoURL: userData.profileImage || null,
        isDemo: true,
        ...userData
      };
      
      // 사용자 상태 설정
      setUser(demoUser);
      setOnboardingCompleted(true);
      
      console.log('✅ 데모 모드 로그인 완료');
      
      return demoUser;
    } catch (error) {
      console.error('❌ 데모 모드 로그인 실패:', error);
      throw error;
    }
  };

  // 컨텍스트 값 생성
  const contextValue = {
    user,
    initializing,
    loading: authViewModel.loading,
    error: authViewModel.error,
    logout: authViewModel.logout,
    sendPhoneVerification: authViewModel.sendPhoneVerification,
    verifyPhoneCode: authViewModel.verifyPhoneCode,
    confirmationResult,
    setConfirmationResult,
    onboardingCompleted,
    setOnboardingCompleted,
    completeOnboarding,
    updateUserProfile,
    loginAsDemo,
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