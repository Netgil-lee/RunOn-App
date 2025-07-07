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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

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
  const { signOut } = useAuth();
  
  const [settings, setSettings] = useState({
    notifications: {
      meetingReminder: true,
      newMember: true,
      weatherAlert: true,
      safetyAlert: true
    },
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

  const toggleSetting = (category, key) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive',
          onPress: () => signOut()
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('계정 삭제', '계정 삭제 기능이 곧 추가됩니다.');
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
            <Ionicons name="chevron-back" size={24} color={COLORS.WHITE} />
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
            title="새 멤버 알림"
            subtitle="새로운 멤버 가입 알림을 받습니다"
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
            subtitle="러닝에 영향을 주는 날씨 변화 알림"
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
            subtitle="한강 주변 안전 관련 알림"
            onPress={() => toggleSetting('notifications', 'safetyAlert')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.safetyAlert}
              onToggle={() => toggleSetting('notifications', 'safetyAlert')}
            />
          </SettingItem>
        </View>

        {/* 러닝 & 매칭 */}
        <SectionTitle title="러닝 & 매칭" />
        <View style={styles.section}>
          <SettingItem
            icon="location-outline"
            title="코스 매칭 설정"
            subtitle={`현재: ${settings.matching.maxDistance}km`}
            onPress={() => Alert.alert('코스 매칭', '코스 매칭 설정 기능이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="flash-outline"
            title="레벨 매칭 범위"
            subtitle={`현재: ${settings.matching.levelRange === 'all' ? '전체 레벨' : settings.matching.levelRange}`}
            onPress={() => Alert.alert('레벨 매칭', '레벨 매칭 설정 기능이 곧 추가됩니다.')}
          />

        </View>

        {/* 개인정보 & 보안 */}
        <SectionTitle title="개인정보 & 보안" />
        <View style={styles.section}>
          <SettingItem
            icon="eye-outline"
            title="프로필 공개 범위"
            subtitle={`현재: ${settings.privacy.profileVisibility === 'public' ? '전체 공개' : '친구만'}`}
            onPress={() => Alert.alert('프로필 공개', '프로필 공개 설정 기능이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="call-outline"
            title="긴급 연락처"
            subtitle="러닝 중 긴급 상황 시 연락할 수 있는 번호"
            onPress={() => Alert.alert('긴급 연락처', '긴급 연락처 설정 기능이 곧 추가됩니다.')}
          />
          <SettingItem
            icon="trash-outline"
            title="차단 관리"
            subtitle="차단한 사용자 목록을 관리합니다"
            onPress={() => Alert.alert('차단 관리', '차단 관리 기능이 곧 추가됩니다.')}
          />
        </View>



        {/* 앱 */}
        <SectionTitle title="앱" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="도움말 센터"
            subtitle="자주 묻는 질문과 사용법 가이드"
            onPress={() => Alert.alert('도움말 센터', '도움말 센터가 곧 추가됩니다.')}
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
            icon="information-circle-outline"
            title="버전 정보"
            subtitle="냇길 v1.0.0"
            onPress={() => Alert.alert('버전 정보', '냇길 v1.0.0\n최신 버전입니다.')}
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
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.GRAY_400,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    color: COLORS.RED_600,
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default SettingsScreen; 