import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  WHITE: '#ffffff',
  GRAY_100: '#f3f4f6',
  GRAY_200: '#e5e7eb',
  GRAY_300: '#d1d5db',
  GRAY_400: '#9ca3af',
  GRAY_500: '#6b7280',
  GRAY_600: '#4b5563',
  GRAY_700: '#374151',
  GRAY_800: '#1f2937',
  GRAY_900: '#111827',
  BLUE_50: '#eff6ff',
  BLUE_600: '#2563eb',
  RED_600: '#dc2626',
};

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { settings, toggleSetting, updateSetting } = useNotificationSettings();
  
  const [otherSettings, setOtherSettings] = useState({
    privacy: {
      profileVisibility: 'public',
      locationSharing: true,
      activitySharing: true
    },
    matching: {
      maxDistance: 5,
      levelRange: 'all',
      timeFlexibility: 30
    },
    preferences: {
      units: 'metric',
      theme: 'light',
      language: 'ko'
    }
  });

  const toggleOtherSetting = (category, key) => {
    setOtherSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const updateOtherSetting = (category, key, value) => {
    setOtherSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleChildSafetyPolicy = () => {
    Alert.alert(
      '아동 안전 정책',
      'RunOn은 아동의 안전과 보호를 최우선으로 합니다.\n\n• 아동성적학대착취(CSAE) 콘텐츠 금지\n• 만 13세 미만 사용자 보호자 동의 필요\n• 24시간 신고 시스템 운영\n• 부적절한 콘텐츠 자동 필터링\n\n신고: safety@runon.app\n긴급신고: 02-0000-0000',
      [
        { text: '확인', style: 'default' },
        {
          text: '상세보기',
          onPress: () => {
            Linking.openURL('https://netgil-lee.github.io/RunOn-App/')
              .catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
          }
        }
      ]
    );
  };

  const handleDebugInfo = async () => {
    try {
      const debugLog = await AsyncStorage.getItem('onboarding_debug_log');
      if (debugLog) {
        const debugInfo = JSON.parse(debugLog);
        Alert.alert(
          '디버깅 정보',
          `시간: ${debugInfo.timestamp}\n단계: ${debugInfo.step}\n선택된 목표: ${debugInfo.currentGoals.length}개\n진행 가능: ${debugInfo.canProceed}\n메시지: ${debugInfo.message}`,
          [
            { text: '확인', style: 'default' },
            {
              text: '로그 삭제',
              onPress: async () => {
                await AsyncStorage.removeItem('onboarding_debug_log');
                Alert.alert('완료', '디버깅 로그가 삭제되었습니다.');
              }
            }
          ]
        );
      } else {
        Alert.alert('알림', '저장된 디버깅 정보가 없습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '디버깅 정보를 불러올 수 없습니다.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 SettingsScreen: 로그아웃 시작');
              await logout();
              console.log('✅ SettingsScreen: 로그아웃 완료');
              // 로그아웃 성공 시 별도 알림 없이 자동으로 로그인 화면으로 이동
            } catch (error) {
              console.error('❌ SettingsScreen: 로그아웃 실패', error);
              Alert.alert('로그아웃 실패', '로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '계정 삭제를 요청하시겠습니까? 이메일로 요청을 보내드리겠습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '요청하기', 
          style: 'destructive',
          onPress: () => {
            // 사용자 정보 가져오기
            const user = useAuth().user;
            const userInfo = user ? `사용자 ID: ${user.uid}\n휴대폰번호: ${user.phoneNumber || '알 수 없음'}` : '사용자 정보를 가져올 수 없습니다.';
            
            // 이메일 링크 생성
            const emailSubject = encodeURIComponent('RunOn 앱 계정 삭제 요청');
            const emailBody = encodeURIComponent(
              `안녕하세요,\n\nRunOn 앱에서 계정 삭제를 요청합니다.\n\n사용자 정보:\n${userInfo}\n\n요청 일시: ${new Date().toLocaleString('ko-KR')}\n\n계정 삭제를 확인합니다.\n\n감사합니다.`
            );
            
                         const emailUrl = `mailto:dlrhdkgml12@gmail.com?subject=${emailSubject}&body=${emailBody}`;
            
                         // 이메일 앱 열기
             Linking.openURL(emailUrl).catch(() => {
               Alert.alert('오류', '이메일 앱을 열 수 없습니다. 수동으로 dlrhdkgml12@gmail.com으로 계정 삭제 요청을 보내주세요.');
             });
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, children }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color="#97DCDE" />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {children}
        {showArrow && <Ionicons name="chevron-forward" size={16} color={COLORS.GRAY_400} />}
      </View>
    </TouchableOpacity>
  );

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: COLORS.GRAY_600, true: COLORS.PRIMARY }}
      thumbColor={enabled ? COLORS.WHITE : COLORS.GRAY_300}
      ios_backgroundColor={COLORS.GRAY_600}
    />
  );

  const SectionTitle = ({ title }) => (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>설정</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >


        {/* 알림 설정 */}
        <SectionTitle title="알림 설정" />
        <View style={styles.section}>
          <SettingItem
            icon="megaphone-outline"
            title="소식 알림"
            subtitle="새로운 기능, 이벤트 등 소식 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'newsNotification')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.newsNotification}
              onToggle={() => toggleSetting('notifications', 'newsNotification')}
            />
          </SettingItem>
          <SettingItem
            icon="notifications-outline"
            title="모임 알림"
            subtitle="러닝 모임 관련 알림을 받습니다"
            onPress={() => toggleSetting('notifications', 'meetingReminder')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.meetingReminder}
              onToggle={() => toggleSetting('notifications', 'meetingReminder')}
            />
          </SettingItem>
          <SettingItem
            icon="people-outline"
            title="커뮤니티 알림"
            subtitle="채팅, 작성한 글의 좋아요와 댓글 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'newMember')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.newMember}
              onToggle={() => toggleSetting('notifications', 'newMember')}
            />
          </SettingItem>
          <SettingItem
            icon="cloud-outline"
            title="날씨 알림"
            subtitle="러닝에 영향을 주는 날씨 변화 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'weatherAlert')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.weatherAlert}
              onToggle={() => toggleSetting('notifications', 'weatherAlert')}
            />
          </SettingItem>
          <SettingItem
            icon="shield-checkmark-outline"
            title="안전 알림"
            subtitle="한강 주변 안전 관련 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'safetyAlert')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.safetyAlert}
              onToggle={() => toggleSetting('notifications', 'safetyAlert')}
            />
          </SettingItem>
        </View>



        {/* 앱 */}
        <SectionTitle title="앱" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="앱 사용 가이드"
            subtitle="자주 묻는 질문과 사용법 안내"
            onPress={() => navigation.navigate('AppGuide')}
          />
          <SettingItem
            icon="call-outline"
            title="고객지원"
            subtitle="1:1 문의 및 상담 서비스"
            onPress={() => Alert.alert('고객지원', '고객지원 기능이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="document-text-outline"
            title="이용약관"
            subtitle="냇길 서비스 이용약관"
            onPress={() => Alert.alert('이용약관', '이용약관이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="shield-outline"
            title="개인정보 처리방침"
            subtitle="개인정보 수집 및 이용에 대한 안내"
            onPress={() => Alert.alert('개인정보 처리방침', '개인정보 처리방침이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="아동 안전 정책"
            subtitle="아동 보호 및 안전에 관한 정책"
            onPress={() => handleChildSafetyPolicy()}
          />
          <SettingItem
            icon="bug-outline"
            title="디버깅 정보"
            subtitle="온보딩 디버깅 정보 확인"
            onPress={() => handleDebugInfo()}
          />
          <SettingItem
            icon="information-circle-outline"
            title="버전 정보"
            subtitle="RunOn v1.0.0"
            onPress={() => Alert.alert('버전 정보', 'RunOn v1.0.0\n최신 버전입니다.')}
          />
        </View>

        {/* 계정 */}
        <SectionTitle title="계정" />
        <View style={styles.section}>
          <SettingItem
            icon="shield-outline"
            title="비밀번호 변경"
            subtitle="계정 보안을 위해 비밀번호를 변경하세요"
            onPress={() => Alert.alert('비밀번호 변경', '비밀번호 변경 기능이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="log-out-outline"
            title="로그아웃"
            subtitle="현재 계정에서 로그아웃합니다"
            onPress={handleLogout}
            showArrow={false}
          />
          <SettingItem
            icon="trash-outline"
            title="계정 삭제"
            subtitle="계정을 영구적으로 삭제합니다"
            onPress={handleDeleteAccount}
            showArrow={false}
          >
            <Text style={styles.deleteText}>삭제</Text>
          </SettingItem>
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    backgroundColor: COLORS.SURFACE,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 5,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Pretendard-SemiBold',
  },
  section: {
    backgroundColor: COLORS.CARD,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.CARD,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.WHITE,
    marginBottom: 2,
    fontFamily: 'Pretendard-Medium',
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.GRAY_400,
    fontFamily: 'Pretendard-Regular',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    color: COLORS.RED_600,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default SettingsScreen; 