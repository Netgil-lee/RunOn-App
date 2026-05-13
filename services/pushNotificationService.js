import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestoreService from './firestoreService';

// 알림 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.isInitialized = false;
    this.notificationListener = null;
    this.responseListener = null;
    this.navigationHandler = null;
    this.initialResponseHandled = false;
  }

  // 푸시 알림 초기화
  async initialize(userId) {
    try {
      console.log('📱 푸시 알림 서비스 초기화 시작');
      
      const isRealDevice = Device.isDevice;
      
      if (!isRealDevice) {
        console.warn('⚠️ 시뮬레이터에서 실행 중입니다. 푸시 알림은 실제 디바이스에서만 작동합니다.');
      }

      // 알림 권한 요청 (시뮬레이터에서도 권한 요청은 가능)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ 푸시 알림 권한이 거부되었습니다');
        return false;
      }

      console.log('✅ 알림 권한 허용됨');

      // 실제 디바이스에서만 Expo Push Token 획득 및 저장
      if (isRealDevice) {
        // iOS 원격 알림 등록 (명시적으로 등록하여 안정성 향상)
        try {
          if (Platform.OS === 'ios') {
            await Notifications.registerForNotificationsAsync();
            console.log('✅ iOS 원격 알림 등록 완료');
          }
        } catch (error) {
          console.warn('⚠️ 원격 알림 등록 중 경고 (계속 진행):', error);
          // 원격 알림 등록 실패해도 계속 진행 (getExpoPushTokenAsync가 내부적으로 처리할 수 있음)
        }

        // Expo Push Token 획득
        this.expoPushToken = await this.getExpoPushToken();
        
        if (!this.expoPushToken) {
          console.error('❌ Expo Push Token 획득 실패');
          return false;
        }

        // 토큰을 Firestore에 저장
        await this.saveTokenToFirestore(userId, this.expoPushToken);

        // 로컬 저장소에 토큰 저장
        await AsyncStorage.setItem('expoPushToken', this.expoPushToken);
      } else {
        console.log('📱 시뮬레이터에서는 Expo Push Token을 획득하지 않습니다.');
      }

      // 알림 리스너 설정 (시뮬레이터에서도 로컬 알림은 작동)
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ 푸시 알림 서비스 초기화 완료');
      return true;
      
    } catch (error) {
      console.error('❌ 푸시 알림 초기화 실패:', error);
      return false;
    }
  }

  // Expo Push Token 획득
  async getExpoPushToken() {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.easConfig?.projectId ||
                       'b2ec1d33-1054-4404-b072-623c6cd66588'; // 프로젝트 ID (app.json과 일치)

      console.log('🔍 사용 중인 Project ID:', projectId);
      console.log('🔍 Constants.expoConfig?.extra?.eas?.projectId:', Constants.expoConfig?.extra?.eas?.projectId);
      console.log('🔍 Constants.easConfig?.projectId:', Constants.easConfig?.projectId);

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });

      console.log('📱 Expo Push Token 획득:', token.data);
      return token.data;
      
    } catch (error) {
      console.error('❌ Expo Push Token 획득 실패:', error);
      console.error('❌ 에러 상세:', error.message);
      if (error.stack) {
        console.error('❌ 스택 트레이스:', error.stack);
      }
      return null;
    }
  }

  // 토큰을 Firestore에 저장
  async saveTokenToFirestore(userId, token) {
    try {
      await firestoreService.updateUserProfile(userId, {
        expoPushToken: token,
        deviceInfo: {
          platform: Platform.OS,
          osVersion: Platform.Version,
          appVersion: Constants.expoConfig?.version || '1.0.0',
          updatedAt: new Date().toISOString()
        }
      });
      
      console.log('✅ Push Token Firestore 저장 완료');
    } catch (error) {
      console.error('❌ Push Token Firestore 저장 실패:', error);
    }
  }

  // 알림 리스너 설정
  setupNotificationListeners() {
    // 앱이 포그라운드에 있을 때 알림 수신
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 알림 수신:', notification);
      this.handleNotificationReceived(notification);
    });

    // 알림 클릭 시 처리
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 알림 클릭:', response);
      this.handleNotificationResponse(response);
    });

    console.log('✅ 알림 리스너 설정 완료');
  }

  // 알림 수신 처리
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    
    console.log('📱 알림 내용:', { title, body, data });
    
    // 커스텀 알림 처리 로직
    if (data?.type) {
      this.handleCustomNotification(data);
    }

    // 포그라운드 수신 시 배지 카운트를 1 증가시켜 아이콘 상태를 유지
    this.incrementBadgeCount().catch((error) => {
      console.error('❌ 배지 카운트 증가 실패:', error);
    });
  }

  // 알림 클릭 처리
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;

    if (!data) {
      return;
    }

    if (data?.type || data?.navigationTarget || data?.chatRoomId) {
      console.log('🎯 알림 클릭 데이터:', data);
    }

    if (typeof this.navigationHandler === 'function') {
      try {
        this.navigationHandler(data);
      } catch (error) {
        console.error('❌ 알림 클릭 네비게이션 처리 실패:', error);
      }
    }
  }

  // 앱 전역 네비게이션 핸들러 등록
  setNavigationHandler(handler) {
    this.navigationHandler = handler;
  }

  // 앱이 알림 탭으로 실행된 경우 초기 응답 처리
  async handleInitialNotificationResponse() {
    try {
      if (this.initialResponseHandled) {
        return;
      }

      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) {
        return;
      }

      this.initialResponseHandled = true;
      this.handleNotificationResponse(response);
    } catch (error) {
      console.error('❌ 초기 알림 응답 처리 실패:', error);
    }
  }

  // 커스텀 알림 처리
  handleCustomNotification(data) {
    switch (data.type) {
      case 'meeting_reminder':
        console.log('⏰ 모임 리마인더 알림');
        break;
      case 'meeting_cancelled':
        console.log('❌ 모임 취소 알림', data);
        break;
      case 'new_message':
        console.log('💬 새 메시지 알림', data);
        break;
      case 'new_participant':
        console.log('👥 새 참여자 알림', data);
        break;
      case 'like':
        console.log('👍 좋아요 알림', data);
        break;
      case 'comment':
        console.log('💬 댓글 알림', data);
        break;
      case 'weather_alert':
        console.log('🌦️ 날씨 경고 알림');
        break;
      default:
        console.log('📱 일반 알림', data);
    }
  }

  // 로컬 알림 스케줄링
  async scheduleLocalNotification(title, body, scheduledTime, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: new Date(scheduledTime),
        },
      });

      console.log('📅 로컬 알림 스케줄링 완료:', notificationId);
      return notificationId;
      
    } catch (error) {
      console.error('❌ 로컬 알림 스케줄링 실패:', error);
      return null;
    }
  }

  // 즉시 로컬 알림 표시
  async showLocalNotification(title, body, data = {}) {
    try {
      await Notifications.presentNotificationAsync({
        title: title,
        body: body,
        data: data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      });

      console.log('📱 즉시 알림 표시 완료');
      
    } catch (error) {
      console.error('❌ 즉시 알림 표시 실패:', error);
    }
  }

  // 서버를 통한 푸시 알림 전송 (다른 사용자에게)
  async sendPushNotification(targetUserId, title, body, data = {}) {
    try {
      // 대상 사용자의 토큰 가져오기
      const targetUser = await firestoreService.getUserProfile(targetUserId);
      
      if (!targetUser || !targetUser.expoPushToken) {
        console.warn('⚠️ 대상 사용자의 Push Token이 없습니다');
        return false;
      }

      // Expo Push API를 통해 알림 전송
      const message = {
        to: targetUser.expoPushToken,
        title: title,
        body: body,
        data: data,
        sound: 'default',
        priority: 'high',
        channelId: 'runon-notifications',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (response.ok && result.data && result.data.status === 'ok') {
        console.log('✅ 푸시 알림 전송 성공:', result);
        return true;
      } else {
        console.error('❌ 푸시 알림 전송 실패:', result);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 푸시 알림 전송 오류:', error);
      return false;
    }
  }

  // 모임 리마인더 알림 스케줄링
  async scheduleMeetingReminder(meeting, reminderTime = 60) { // 기본 60분 전
    try {
      const meetingTime = new Date(meeting.date + ' ' + meeting.time);
      const reminderDateTime = new Date(meetingTime.getTime() - reminderTime * 60 * 1000);
      
      // 과거 시간인 경우 스케줄링하지 않음
      if (reminderDateTime <= new Date()) {
        console.log('⚠️ 과거 시간으로 리마인더 스케줄링 건너뜀');
        return null;
      }

      const notificationId = await this.scheduleLocalNotification(
        `🏃‍♂️ ${meeting.title}`,
        `${reminderTime}분 후 모임이 시작됩니다. ${meeting.location}에서 만나요!`,
        reminderDateTime,
        {
          type: 'meeting_reminder',
          meetingId: meeting.id,
          navigationTarget: 'EventDetail',
          meetingData: meeting
        }
      );

      console.log(`⏰ 모임 리마인더 설정: ${meeting.title} (${reminderTime}분 전)`);
      return notificationId;
      
    } catch (error) {
      console.error('❌ 모임 리마인더 스케줄링 실패:', error);
      return null;
    }
  }

  // 모임 취소 알림 전송
  async sendMeetingCancelledNotification(meeting, participantUserIds) {
    try {
      const title = '😢 모임이 취소되었습니다';
      const body = `"${meeting.title}" 모임이 주최자에 의해 취소되었습니다.`;
      
      const data = {
        type: 'meeting_cancelled',
        meetingId: meeting.id,
        navigationTarget: 'Home'
      };

      // 각 참여자에게 알림 전송
      const promises = participantUserIds.map(userId => 
        this.sendPushNotification(userId, title, body, data)
      );
      
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
      
      console.log(`📱 모임 취소 알림 전송 완료: ${successCount}/${participantUserIds.length}명`);
      return successCount;
      
    } catch (error) {
      console.error('❌ 모임 취소 알림 전송 실패:', error);
      return 0;
    }
  }

  // 새 메시지 알림 전송
  async sendNewMessageNotification(targetUserId, senderName, messagePreview, chatRoomId) {
    try {
      const title = `💬 ${senderName}`;
      const body = messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...' 
        : messagePreview;
      
      const data = {
        type: 'new_message',
        chatRoomId: chatRoomId,
        navigationTarget: 'Chat',
        senderName: senderName
      };

      return await this.sendPushNotification(targetUserId, title, body, data);
      
    } catch (error) {
      console.error('❌ 새 메시지 알림 전송 실패:', error);
      return false;
    }
  }

  // 날씨 경고 알림
  async sendWeatherAlert(alertType, message) {
    try {
      let title = '🌦️ 날씨 알림';
      
      switch (alertType) {
        case 'rain':
          title = '🌧️ 비 예보';
          break;
        case 'storm':
          title = '⛈️ 폭풍 경고';
          break;
        case 'extreme_temperature':
          title = '🌡️ 기온 주의';
          break;
        case 'flood_risk':
          title = '🚨 홍수 위험';
          break;
      }

      const data = {
        type: 'weather_alert',
        alertType: alertType,
        navigationTarget: 'Home'
      };

      await this.showLocalNotification(title, message, data);
      
    } catch (error) {
      console.error('❌ 날씨 경고 알림 실패:', error);
    }
  }

  // 스케줄된 알림 취소
  async cancelScheduledNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ 스케줄된 알림 취소:', notificationId);
    } catch (error) {
      console.error('❌ 알림 취소 실패:', error);
    }
  }

  // 모든 스케줄된 알림 취소
  async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ 모든 스케줄된 알림 취소');
    } catch (error) {
      console.error('❌ 모든 알림 취소 실패:', error);
    }
  }

  // 앱 배지 설정
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('📱 앱 배지 설정:', count);
    } catch (error) {
      console.error('❌ 앱 배지 설정 실패:', error);
    }
  }

  // 앱 배지 +1
  async incrementBadgeCount() {
    try {
      const currentCount = await Notifications.getBadgeCountAsync();
      const nextCount = Math.max(0, Number(currentCount || 0) + 1);
      await Notifications.setBadgeCountAsync(nextCount);
      return nextCount;
    } catch (error) {
      console.error('❌ 배지 카운트 증가 실패:', error);
      return null;
    }
  }

  // 앱 배지 클리어
  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('📱 앱 배지 클리어');
    } catch (error) {
      console.error('❌ 앱 배지 클리어 실패:', error);
    }
  }

  // 리스너 정리
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    console.log('🧹 푸시 알림 리스너 정리 완료');
  }

  // 푸시 토큰 갱신
  async refreshPushToken(userId) {
    try {
      const newToken = await this.getExpoPushToken();
      if (newToken && newToken !== this.expoPushToken) {
        this.expoPushToken = newToken;
        await this.saveTokenToFirestore(userId, newToken);
        await AsyncStorage.setItem('expoPushToken', newToken);
        console.log('🔄 푸시 토큰 갱신 완료');
      }
    } catch (error) {
      console.error('❌ 푸시 토큰 갱신 실패:', error);
    }
  }

  // 알림 권한 상태 확인
  async getNotificationPermissionStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('❌ 알림 권한 상태 확인 실패:', error);
      return 'undetermined';
    }
  }
}

const pushNotificationService = new PushNotificationService();
export default pushNotificationService; 