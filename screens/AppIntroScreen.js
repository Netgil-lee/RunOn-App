import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import { useAuth } from '../contexts/AuthContext'; // AuthContext 추가
import * as Notifications from 'expo-notifications';
import appleFitnessService from '../services/appleFitnessService';

// Runon 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  SUCCESS: '#00FF88',
  WARNING: '#FFD700',
  ERROR: '#FF4444',
};


const AppIntroScreen = ({ navigation }) => {
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [healthKitStatus, setHealthKitStatus] = useState({
    isChecking: false,
    hasPermissions: false,
    error: null
  });
  
  const { 
    isTabEnabled, 
    isNotificationTypeEnabled,
    toggleTab,
    toggleNotificationType,
    settings,
    toggleSetting
  } = useNotificationSettings();
  
  const { completeOnboarding, onboardingCompleted, user } = useAuth(); // AuthContext에서 필요한 변수들 가져오기

  // 알림 권한 확인
  useEffect(() => {
    checkNotificationPermission();
    checkHealthKitStatus();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      console.log('📱 알림 권한 확인 시작 - 환경:', __DEV__ ? '개발' : '프로덕션');
      const { status } = await Notifications.getPermissionsAsync();
      console.log('📱 알림 권한 상태:', status);
      setNotificationPermission(status === 'granted');
    } catch (error) {
      console.error('❌ 알림 권한 확인 실패:', error);
      console.error('❌ 에러 상세:', {
        message: error.message,
        code: error.code,
        environment: __DEV__ ? 'development' : 'production'
      });
      // 에러 발생 시에도 앱 진행에 문제가 없도록 false로 설정
      setNotificationPermission(false);
    }
  };

  // HealthKit 상태 확인
  const checkHealthKitStatus = async () => {
    try {
      setHealthKitStatus(prev => ({ ...prev, isChecking: true }));
      const status = await appleFitnessService.checkPermissions();
      setHealthKitStatus({
        isChecking: false,
        hasPermissions: status.hasPermissions,
        error: status.error
      });
      console.log('🏥 HealthKit 상태:', status);
    } catch (error) {
      console.error('❌ HealthKit 상태 확인 실패:', error);
      setHealthKitStatus({
        isChecking: false,
        hasPermissions: false,
        error: error.message
      });
    }
  };

  // HealthKit 권한 요청
  const handleHealthKitAccess = async () => {
    try {
      if (healthKitStatus.hasPermissions) {
        Alert.alert(
          '건강데이터 접근',
          '이미 HealthKit 권한이 허용되어 있습니다.\n\n러닝 데이터가 자동으로 동기화됩니다.',
          [{ text: '확인' }]
        );
        return;
      }

      Alert.alert(
        '건강데이터 접근',
        'HealthKit에서 러닝 데이터를 가져오기 위해 건강 데이터 접근 권한이 필요합니다.\n\n허용하시겠습니까?',
        [
          { text: '나중에', style: 'cancel' },
          {
            text: '허용',
            onPress: async () => {
              try {
                const granted = await appleFitnessService.requestPermissions();
                if (granted) {
                  Alert.alert(
                    '권한 허용됨',
                    'HealthKit 권한이 허용되었습니다.\n\n러닝 데이터가 자동으로 동기화됩니다.',
                    [{ text: '확인' }]
                  );
                  await checkHealthKitStatus();
                } else {
                  Alert.alert(
                    '권한 거부됨',
                    'HealthKit 권한 허용에 실패했습니다.\n\n설정 > 개인정보 보호 및 보안 > 건강에서 수동으로 허용해주세요.',
                    [{ text: '확인' }]
                  );
                }
              } catch (error) {
                console.error('❌ HealthKit 권한 요청 실패:', error);
                Alert.alert(
                  '권한 요청 실패',
                  'HealthKit 권한 요청 중 오류가 발생했습니다.',
                  [{ text: '확인' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ HealthKit 접근 처리 실패:', error);
      Alert.alert(
        '오류 발생',
        'HealthKit 접근 처리 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
    }
  };

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    try {
      console.log('📱 알림 권한 요청 시작 - 환경:', __DEV__ ? '개발' : '프로덕션');
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('📱 알림 권한 요청 결과:', status);
      setNotificationPermission(status === 'granted');
      
      if (status === 'granted') {
        console.log('✅ 알림 권한 허용됨');
        Alert.alert(
          '알림 설정 완료',
          '알림을 받을 수 있도록 설정되었습니다.',
          [{ text: '확인' }]
        );
      } else {
        console.log('⚠️ 알림 권한 거부됨');
        Alert.alert(
          '알림 권한 거부',
          '알림 권한이 거부되었습니다. 설정에서 알림을 활성화할 수 있습니다.',
          [{ text: '확인' }]
        );
      }
    } catch (error) {
      console.error('❌ 알림 권한 요청 실패:', error);
      console.error('❌ 에러 상세:', {
        message: error.message,
        code: error.code,
        environment: __DEV__ ? 'development' : 'production'
      });
      Alert.alert(
        '알림 설정',
        '알림 기능을 사용하려면 기기 설정에서 앱 알림을 활성화해주세요.',
        [{ text: '확인' }]
      );
    }
  };

  // 알림 설정 토글
  const handleNotificationToggle = (type, value) => {
    if (type === 'setting') {
      // SettingsScreen과 동일한 방식으로 토글
      toggleSetting('notifications', value);
    } else if (type === 'tab') {
      toggleTab(value);
    } else {
      toggleNotificationType(value);
    }
  };

  // 알림설정 완료 후 홈화면으로 이동
  const handleNext = async () => {
    // 앱 인트로 완료 - 온보딩 상태를 완료로 변경
    try {
      console.log('🎉 AppIntro 완료 - 온보딩 상태 업데이트 시작');
      console.log('🔍 현재 환경:', __DEV__ ? '개발' : '프로덕션');
      console.log('🔍 현재 사용자:', user?.uid);
      console.log('🔍 네트워크 상태 확인 중...');
      
      // TestFlight 환경에서 네트워크 상태 확인
      if (!__DEV__) {
        console.log('🔍 TestFlight 환경 - 추가 검증 시작');
        
        // 사용자 상태 재확인
        if (!user || !user.uid) {
          console.error('❌ TestFlight: 사용자 정보 누락');
          Alert.alert(
            '사용자 정보 오류',
            '사용자 정보를 찾을 수 없습니다. 앱을 다시 시작해주세요.',
            [{ text: '확인' }]
          );
          return;
        }
      }
      
      // 온보딩 완료 처리 (타임아웃 설정)
      console.log('🔍 온보딩 완료 처리 시작...');
      const result = await Promise.race([
        completeOnboarding(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('온보딩 완료 처리 시간 초과')), 10000)
        )
      ]);
      
      console.log('✅ 온보딩 완료 처리 결과:', result);
      
      if (result) {
        console.log('🎯 온보딩 완료 - Main 스크린으로 이동');
        
        // TestFlight 환경에서 추가 대기
        if (!__DEV__) {
          console.log('🔍 TestFlight: 상태 동기화 대기 중...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 단순하고 안정적인 네비게이션
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
        
        console.log('✅ Main 스크린으로 이동 완료');
      } else {
        console.log('⚠️ 온보딩 완료 처리 실패');
        Alert.alert(
          '온보딩 완료 오류',
          '온보딩 완료 처리에 실패했습니다. 다시 시도해주세요.',
          [{ text: '확인' }]
        );
      }
      
    } catch (error) {
      console.error('❌ 온보딩 완료 처리 실패:', error);
      console.error('❌ 에러 상세 정보:', {
        message: error.message,
        code: error.code,
        environment: __DEV__ ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      
      // TestFlight 환경에서 더 자세한 에러 정보
      if (!__DEV__) {
        console.error('❌ TestFlight 에러 컨텍스트:', {
          userExists: !!user,
          userUid: user?.uid,
          onboardingCompleted: onboardingCompleted,
          currentStep: currentStep
        });
      }
      
      Alert.alert(
        '설정 저장 오류', 
        '온보딩 완료 처리 중 문제가 발생했습니다. 다시 시도해주세요.',
        [
          { text: '다시 시도', onPress: handleNext },
          { text: '취소', style: 'cancel' }
        ]
      );
    }
  };



  // 알림 권한 요청
  const handleRequestPermission = () => {
    Alert.alert(
      '알림 권한 요청',
      '러논에서 러닝 모임, 날씨 알림, 커뮤니티 활동 등을 알려드립니다. 알림을 받으시겠습니까?',
      [
        { text: '나중에', style: 'cancel' },
        { text: '허용', onPress: requestNotificationPermission }
      ]
    );
  };

  // 알림 설정 항목들 (SettingsScreen과 동일)
  const notificationItems = [
    {
      id: 'newsNotification',
      title: '소식 알림',
      description: '새로운 기능, 이벤트 등 소식 알림을 받습니다.',
      icon: 'megaphone-outline',
      type: 'setting'
    },
    {
      id: 'meetingReminder',
      title: '모임 알림',
      description: '러닝 모임 관련 알림을 받습니다',
      icon: 'notifications-outline',
      type: 'setting'
    },
    {
      id: 'newMember',
      title: '커뮤니티 알림',
      description: '채팅, 작성한 글의 좋아요와 댓글 알림을 받습니다.',
      icon: 'people-outline',
      type: 'setting'
    },
    {
      id: 'weatherAlert',
      title: '날씨 알림',
      description: '러닝에 영향을 주는 날씨 변화 알림을 받습니다.',
      icon: 'cloud-outline',
      type: 'setting'
    },
    {
      id: 'safetyAlert',
      title: '안전 알림',
      description: '한강 주변 안전 관련 알림을 받습니다.',
      icon: 'shield-checkmark-outline',
      type: 'setting'
    }
  ];

  // 1단계: 알림 설정
  const renderNotificationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerSection}>
        <Text style={styles.stepTitle}>알림 설정</Text>
        <Text style={styles.stepSubtitle}>러논에서 제공하는 다양한 알림을 설정해보세요</Text>
      </View>

      {/* 알림 권한 상태 */}
      <View style={styles.permissionSection}>
        <View style={styles.permissionHeader}>
          <Ionicons 
            name={notificationPermission ? "checkmark-circle" : "alert-circle"} 
            size={24} 
            color={notificationPermission ? COLORS.SUCCESS : COLORS.PRIMARY} 
          />
          <Text style={styles.permissionTitle}>
            {notificationPermission ? '알림 권한 허용됨' : '알림 권한 필요'}
          </Text>
        </View>
        <Text style={styles.permissionDescription}>
          {notificationPermission 
            ? '알림을 받을 수 있도록 설정되었습니다.' 
            : '알림을 받으려면 권한을 허용해주세요.'
          }
        </Text>
        {!notificationPermission && (
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <Text style={styles.permissionButtonText}>알림 권한 허용</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 알림 설정 목록 */}
      <View style={styles.notificationList}>
        <Text style={styles.sectionTitle}>알림 종류</Text>
        {notificationItems.map((item) => {
          const isEnabled = item.type === 'setting'
            ? settings.notifications[item.id]
            : item.type === 'tab' 
              ? isTabEnabled(item.id)
              : isNotificationTypeEnabled(item.id);
          
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.notificationItem}
              onPress={() => handleNotificationToggle(item.type, item.id)}
              disabled={!notificationPermission}
            >
              <View style={styles.notificationItemLeft}>
                <View style={styles.notificationIcon}>
                  <Ionicons name={item.icon} size={20} color="#97DCDE" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationDescription}>{item.description}</Text>
                </View>
              </View>
              <View style={styles.notificationItemRight}>
                <View style={[
                  styles.toggleSwitch,
                  isEnabled && styles.toggleSwitchActive,
                  !notificationPermission && styles.toggleSwitchDisabled
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    isEnabled && styles.toggleThumbActive
                  ]} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 안내 메시지 */}
      <Text style={styles.infoText}>
        알림 권한을 허용해야 개별 알림 설정이 가능합니다.
      </Text>

      {/* 건강데이터 권한 섹션 */}
      <View style={styles.healthSection}>
        <Text style={styles.sectionTitle}>건강데이터 접근</Text>
        <TouchableOpacity 
          style={styles.healthItem}
          onPress={handleHealthKitAccess}
        >
          <View style={styles.healthItemLeft}>
            <View style={styles.healthIcon}>
              <Ionicons name="heart-outline" size={20} color="#97DCDE" />
            </View>
            <View style={styles.healthContent}>
              <Text style={styles.healthTitle}>건강데이터 접근</Text>
              <Text style={styles.healthDescription}>
                {healthKitStatus.isChecking 
                  ? "상태 확인 중..." 
                  : healthKitStatus.hasPermissions 
                    ? "HealthKit 권한 허용됨" 
                    : "러닝 데이터 동기화 및 권한 관리"
                }
              </Text>
            </View>
          </View>
          <View style={styles.healthItemRight}>
            <Ionicons 
              name={healthKitStatus.hasPermissions ? "checkmark-circle" : "chevron-forward"} 
              size={20} 
              color={healthKitStatus.hasPermissions ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY} 
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );



  return (
    <SafeAreaView style={styles.container}>

      {/* 컨텐츠 */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderNotificationStep()}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  headerSection: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
    fontFamily: 'Pretendard-Bold',
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 24,
    fontFamily: 'Pretendard-Regular',
  },
  permissionSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginLeft: 12,
    fontFamily: 'Pretendard-Bold',
  },
  permissionDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 2,
    fontFamily: 'Pretendard-Regular',
  },
  permissionButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
  notificationList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
    fontFamily: 'Pretendard-Bold',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  notificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'Pretendard-Bold',
  },
  notificationDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
    fontFamily: 'Pretendard-Regular',
  },
  notificationItemRight: {
    marginLeft: 12,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  toggleSwitchDisabled: {
    opacity: 0.5,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.TEXT_SECONDARY,
    borderRadius: 10,
  },
  toggleThumbActive: {
    backgroundColor: '#000',
    transform: [{ translateX: 20 }],
  },
  infoText: {
    fontSize: 14,
    color: COLORS.TEXT,
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
    textAlign: 'center',
    marginTop: 10,
  },
  healthSection: {
    marginTop: 30,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
  },
  healthItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  healthIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  healthContent: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'Pretendard-Bold',
  },
  healthDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
    fontFamily: 'Pretendard-Regular',
  },
  healthItemRight: {
    marginLeft: 12,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 0.25,
    borderTopColor: COLORS.SURFACE,
    backgroundColor: COLORS.BACKGROUND,
  },
  nextButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
});

export default AppIntroScreen; 