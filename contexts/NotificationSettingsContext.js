import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const NotificationSettingsContext = createContext();

export const useNotificationSettings = () => {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
  }
  return context;
};

export const NotificationSettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const db = getFirestore();
  
  const defaultSettings = {
    notifications: {
      newsNotification: true,      // 소식 알림 (일반 탭)
      meetingReminder: true,       // 모임 알림 (모임 탭)
      newMember: true,             // 커뮤니티 알림 (커뮤니티 탭)
      weatherAlert: true,          // 날씨 알림 (일반 탭)
      safetyAlert: true,           // 안전 알림 (일반 탭)
      chatNotification: true       // 채팅 알림 (푸시 알림)
    }
  };

  const [settings, setSettings] = useState(defaultSettings);

  // 사용자 로그인 시 Firestore에서 설정 로드 및 동기화
  useEffect(() => {
    if (user?.uid) {
      loadSettingsFromFirestore();
    } else {
      loadSettings();
    }
  }, [user?.uid]);

  // Firestore에서 설정 로드
  const loadSettingsFromFirestore = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.notificationSettings) {
          setSettings(userData.notificationSettings);
          // AsyncStorage에도 동기화
          await AsyncStorage.setItem('notificationSettings', JSON.stringify(userData.notificationSettings));
          return;
        }
      }

      // Firestore에 설정이 없으면 기본값 사용 및 저장
      await saveSettingsToFirestore(defaultSettings);
      setSettings(defaultSettings);
    } catch (error) {
      console.error('❌ Firestore에서 알림 설정 로드 실패:', error);
      // 실패 시 AsyncStorage에서 로드 시도
      loadSettings();
    }
  };

  // AsyncStorage에서 설정 로드 (로그인 전 또는 Firestore 실패 시)
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (parseError) {
          console.error('❌ 알림 설정 JSON 파싱 실패:', parseError, '원본 데이터:', savedSettings);
          // 잘못된 데이터 삭제하고 기본값 사용
          await AsyncStorage.removeItem('notificationSettings');
          setSettings(defaultSettings);
        }
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  // Firestore에 설정 저장
  const saveSettingsToFirestore = async (newSettings) => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationSettings: newSettings
      });
      console.log('✅ Firestore에 알림 설정 저장 완료');
    } catch (error) {
      console.error('❌ Firestore에 알림 설정 저장 실패:', error);
    }
  };

  // 설정 저장 (AsyncStorage + Firestore)
  const saveSettings = async (newSettings) => {
    try {
      // AsyncStorage에 저장
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      
      // Firestore에도 저장 (로그인한 경우)
      if (user?.uid) {
        await saveSettingsToFirestore(newSettings);
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  };

  // 토글 설정
  const toggleSetting = (category, key) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: !settings[category][key]
      }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // 설정 업데이트
  const updateSetting = (category, key, value) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // 특정 탭의 알림이 활성화되어 있는지 확인
  const isTabEnabled = (tabType) => {
    switch (tabType) {
      case 'general':
        return settings.notifications.newsNotification || 
               settings.notifications.weatherAlert || 
               settings.notifications.safetyAlert;
      case 'meeting':
        return settings.notifications.meetingReminder;
      case 'chat':
        return settings.notifications.newMember;
      default:
        return true;
    }
  };

  // 특정 알림 타입이 활성화되어 있는지 확인
  const isNotificationTypeEnabled = (notificationType) => {
    switch (notificationType) {
      case 'system':
      case 'event':
      case 'tip':
        return settings.notifications.newsNotification;
      case 'weather':
      case 'temperature_high':
      case 'temperature_low':
      case 'rain_heavy':
      case 'rain_moderate':
      case 'wind_strong':
      case 'humidity_high':
      case 'air_very_unhealthy':
      case 'air_unhealthy':
      case 'air_moderate':
      case 'pm25':
      case 'pm10':
        return settings.notifications.weatherAlert;
      case 'safety':
      case 'flood_risk_rain':
      case 'flood_warning':
        return settings.notifications.safetyAlert;
      case 'reminder':
      case 'rating':
      case 'cancel':
      case 'new_participant':
        return settings.notifications.meetingReminder;
      case 'message':
        return settings.notifications.chatNotification;
      case 'like':
      case 'comment':
      case 'mention':
        return settings.notifications.newMember;
      default:
        return true;
    }
  };

  const value = {
    settings,
    toggleSetting,
    updateSetting,
    isTabEnabled,
    isNotificationTypeEnabled
  };

  return (
    <NotificationSettingsContext.Provider value={value}>
      {children}
    </NotificationSettingsContext.Provider>
  );
}; 