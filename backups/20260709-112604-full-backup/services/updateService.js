class UpdateService {
  // 업데이트 알림 표시 여부 확인 (수동으로 설정)
  async checkForUpdate() {
    try {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const db = getFirestore();
      const updateRef = doc(db, 'app_config', 'update_notification');
      const updateSnap = await getDoc(updateRef);
      
      if (updateSnap.exists()) {
        const updateData = updateSnap.data();
        const shouldShow = updateData.showNotification || false;
        const currentMessage = updateData.message || '새로운 업데이트가 있습니다.';
        
        // AsyncStorage 사용 가능 여부 확인 후 처리
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          
          // Firebase의 업데이트 내용과 AsyncStorage의 읽음 상태 비교
          const updateRead = await AsyncStorage.getItem('updateNotificationRead');
          const lastUpdateMessage = await AsyncStorage.getItem('lastUpdateMessage');
          const lastUpdateTimestamp = await AsyncStorage.getItem('lastUpdateTimestamp');
          const currentTimestamp = updateData.timestamp?.toDate?.() || updateData.updatedAt?.toDate?.() || new Date();
          
          // 메시지가 변경되었거나 새로운 업데이트가 있으면 읽음 상태 초기화 (타임스탬프는 무시)
          const messageChanged = lastUpdateMessage !== currentMessage;
          
          if (messageChanged || !updateRead) {
            await AsyncStorage.removeItem('updateNotificationRead');
            await AsyncStorage.setItem('lastUpdateMessage', currentMessage);
            await AsyncStorage.setItem('lastUpdateTimestamp', currentTimestamp.toISOString());
            console.log('🔄 업데이트 내용이 변경되어 읽음 상태 초기화됨:', {
              messageChanged,
              lastMessage: lastUpdateMessage,
              currentMessage,
              lastTimestamp: lastUpdateTimestamp,
              currentTimestamp: currentTimestamp.toISOString()
            });
          }
          
          // 로그 출력 최소화 (디버깅 시에만 활성화)
          // console.log('🔍 업데이트 알림 체크:', {
          //   shouldShow,
          //   updateMessage: currentMessage,
          //   lastUpdateMessage,
          //   updateRead,
          //   messageChanged: lastUpdateMessage !== currentMessage
          // });
        } catch (storageError) {
          console.warn('⚠️ AsyncStorage 사용 불가, 기본 알림 표시:', storageError);
        }

        return {
          showNotification: shouldShow,
          message: currentMessage,
          timestamp: new Date()
        };
      } else {
        return { 
          showNotification: false,
          message: '새로운 업데이트가 있습니다.',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error('❌ 업데이트 알림 체크 실패:', error);
      return { 
        showNotification: false,
        message: '새로운 업데이트가 있습니다.',
        timestamp: new Date()
      };
    }
  }
}

export default new UpdateService();
