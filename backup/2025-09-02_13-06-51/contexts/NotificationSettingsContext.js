import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationSettingsContext = createContext();

export const useNotificationSettings = () => {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
  }
  return context;
};

export const NotificationSettingsProvider = ({ children }) => {
  const defaultSettings = {
    notifications: {
      newsNotification: true,      // 소식 알림 (일반 탭)
      meetingReminder: true,       // 모임 알림 (모임 탭)
      newMember: true,             // 커뮤니티 알림 (커뮤니티 탭)
      weatherAlert: true,          // 날씨 알림 (일반 탭)
      safetyAlert: true            // 안전 알림 (일반 탭)
    }
  };

  const [settings, setSettings] = useState(defaultSettings);

  // AsyncStorage에서 설정 로드
  useEffect(() => {
    loadSettings();
  }, []);

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

  // 설정 저장
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
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
        return settings.notifications.weatherAlert;
      case 'safety':
      case 'flood_risk_rain':
      case 'flood_warning':
        return settings.notifications.safetyAlert;
      case 'reminder':
      case 'rating':
      case 'cancel':
        return settings.notifications.meetingReminder;
      case 'message':
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