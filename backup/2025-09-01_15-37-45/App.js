import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, StyleSheet, Text, View, StatusBar } from 'react-native';
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

SplashScreen.preventAutoHideAsync();

// 전역 폰트 설정 및 Timestamp 안전 처리
const originalTextRender = Text.render;
Text.render = function (...args) {
  const origin = originalTextRender.call(this, ...args);
  
  // children에서 Timestamp 객체를 안전하게 처리
  let safeChildren = origin.props.children;
  
  // 배열인 경우 각 요소를 처리
  if (Array.isArray(safeChildren)) {
    safeChildren = safeChildren.map(child => {
      if (child && typeof child === 'object' && child.seconds) {
        try {
          const date = new Date(child.seconds * 1000);
          return date.toLocaleString('ko-KR');
        } catch (error) {
          return '';
        }
      } else if (child && typeof child === 'object') {
        try {
          return JSON.stringify(child);
        } catch (error) {
          return '';
        }
      }
      return child;
    });
  } else if (safeChildren && typeof safeChildren === 'object' && safeChildren.seconds) {
    // Firebase Timestamp 객체인 경우
    try {
      const date = new Date(safeChildren.seconds * 1000);
      safeChildren = date.toLocaleString('ko-KR');
    } catch (error) {
      safeChildren = '';
    }
  } else if (safeChildren && typeof safeChildren === 'object') {
    // 기타 객체인 경우 JSON 문자열로 변환
    try {
      safeChildren = JSON.stringify(safeChildren);
    } catch (error) {
      safeChildren = '';
    }
  }
  
  return React.cloneElement(origin, {
    style: [
      { fontFamily: 'Pretendard-Regular' },
      origin.props.style
    ],
    children: safeChildren
  });
};

export default function App() {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    initializeAppLogic();
  }, []);

  const initializeAppLogic = async () => {
    try {
      const networkStatus = await Network.getNetworkStateAsync();
      setIsOnline(networkStatus.isConnected);

      // 폰트 로딩
      await Font.loadAsync({
        'Pretendard': require('./assets/fonts/Pretendard-Regular.otf'),
        'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
        'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
        'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
      });
      setFontsLoaded(true);
      console.log('✅ Pretendard 폰트 로딩 완료');

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
      // Firebase가 완전히 초기화될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const auth = firebaseService.getAuth();
      if (!auth) {
        console.warn('Firebase Auth 객체가 없습니다. 초기화 대기 중...');
        setIsFirebaseInitialized(false);
        return;
      }
      
      setIsFirebaseInitialized(true);
    } catch (error) {
      console.warn('Firebase 초기화 실패:', error);
      setIsFirebaseInitialized(false);
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

  if (!fontsLoaded || (!isFirebaseInitialized && Platform.OS !== 'web')) {
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
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#000000" 
        translucent={false}
      />
      <NavigationContainer>
        <NetworkProvider>
          <AuthProvider>
            <NotificationSettingsProvider>
            <EventProvider>
                <CommunityProvider>
              <AppNavigator />
                </CommunityProvider>
            </EventProvider>
            </NotificationSettingsProvider>
          </AuthProvider>
        </NetworkProvider>
      </NavigationContainer>
    </>
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
