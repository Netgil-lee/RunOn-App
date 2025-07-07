import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, StyleSheet, Text, View, StatusBar } from 'react-native';
import * as Network from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';

import AppNavigator from './navigation/AppNavigator';
import firebaseService from './config/firebase';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { EventProvider } from './contexts/EventContext';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    initializeAppLogic();
  }, []);

  const initializeAppLogic = async () => {
    try {
      const networkStatus = await Network.getNetworkStateAsync();
      setIsOnline(networkStatus.isConnected);

      await initializeFirebase();
      
    } catch (error) {
      console.warn('앱 초기화 중 에러 발생:', error);
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

  if (!isFirebaseInitialized && Platform.OS !== 'web') {
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
            <EventProvider>
              <AppNavigator />
            </EventProvider>
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
