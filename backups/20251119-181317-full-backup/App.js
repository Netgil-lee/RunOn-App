import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, StyleSheet, Text, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import * as Font from 'expo-font';

import AppNavigator from './navigation/AppNavigator';
import firebaseService from './config/firebase';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { EventProvider } from './contexts/EventContext';
import { CommunityProvider } from './contexts/CommunityContext';
import { NotificationSettingsProvider } from './contexts/NotificationSettingsContext';
import { GuideProvider } from './contexts/GuideContext';

SplashScreen.preventAutoHideAsync();

// 안전한 폰트 설정 (Text.render 오버라이드 제거)
// Timestamp 처리는 각 컴포넌트에서 개별적으로 수행

export default function App() {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    initializeAppLogic();
  }, []);

  const initializeAppLogic = async () => {
    try {
      const networkStatus = await Network.getNetworkStateAsync();
      setIsOnline(networkStatus.isConnected);

      // 폰트 로딩 (에러 처리 추가)
      try {
        await Font.loadAsync({
          'Pretendard': require('./assets/fonts/Pretendard-Regular.otf'),
          'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
          'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
          'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
          'Gold-Regular': require('./assets/fonts/Gold-Regular.ttf'),
          'Gold-Bold': require('./assets/fonts/Gold-Bold.ttf'),
        });
        console.log('✅ Pretendard 및 Gold 폰트 로딩 완료');
      } catch (fontError) {
        console.warn('⚠️ 폰트 로딩 실패, 기본 폰트 사용:', fontError);
      }
      setFontsLoaded(true);

      // 데모 모드 체크 (개발 환경에서만)
      // 개발환경에서 자동 데모모드 활성화 비활성화
      // if (__DEV__) {
      //   // 개발 환경에서 데모 모드 활성화
      //   setIsDemoMode(true);
      //   console.log('🎭 데모 모드 활성화');
      // }

      await initializeFirebase();
      
      // 스플래시 스크린 즉시 숨기기
      await SplashScreen.hideAsync();
      
    } catch (error) {
      console.warn('앱 초기화 중 에러 발생:', error);
      if (error.message.includes('font')) {
        console.error('❌ 폰트 로딩 실패:', error.message);
      }
      // 에러가 발생해도 스플래시 스크린 숨기기
      await SplashScreen.hideAsync();
    }
  };

  const initializeFirebase = async () => {
    try {
      // Firebase가 완전히 초기화될 때까지 대기 (자동 로그인을 위해 충분한 시간)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Firebase 초기화 상태 확인 (자동 로그인 지원 확인)
      if (!firebaseService.isInitialized()) {
        console.warn('Firebase 초기화 미완료. 자동 로그인을 위해 재시도 중...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const auth = firebaseService.getAuth();
      if (!auth) {
        console.warn('Firebase Auth 객체가 없습니다. 자동 로그인 지원 불가');
        setIsFirebaseInitialized(false);
        return;
      }
      
      console.log('✅ Firebase 초기화 완료');
      setIsFirebaseInitialized(true);
    } catch (error) {
      console.warn('Firebase 초기화 실패:', error);
      // Firebase 초기화 실패해도 앱은 계속 실행 (크래시 방지)
      setIsFirebaseInitialized(true);
    }
  };

  if (!isOnline) {
    return (
      <>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#000000" 
          translucent={false}
        />
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineText}>인터넷 연결을 확인하세요.</Text>
        </View>
      </>
    );
  }

  // 폰트 로딩 실패 시에도 앱 실행 허용
  if (!fontsLoaded) {
    return (
      <>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#000000" 
          translucent={false}
        />
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineText}>앱 초기화 중...</Text>
        </View>
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#000000" 
        translucent={false}
      />
      <NavigationContainer>
        <NetworkProvider>
          <AuthProvider isDemoMode={isDemoMode}>
            <NotificationSettingsProvider>
              <EventProvider>
                <CommunityProvider>
                  <GuideProvider>
                    <AppNavigator isDemoMode={isDemoMode} />
                  </GuideProvider>
                </CommunityProvider>
              </EventProvider>
            </NotificationSettingsProvider>
          </AuthProvider>
        </NetworkProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
