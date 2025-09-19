import React, { useState, useEffect } from 'react';
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
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import blacklistService from '../services/blacklistService';

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
  const { user, logout } = useAuth();
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

  const [blacklist, setBlacklist] = useState([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);

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

  // 블랙리스트 조회
  const fetchBlacklist = async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingBlacklist(true);
      const blacklistData = await blacklistService.getBlacklist(user.uid);
      setBlacklist(blacklistData);
    } catch (error) {
      console.log('블랙리스트 조회 실패 (빈 배열로 처리):', error.message);
      setBlacklist([]); // 빈 배열로 설정
    } finally {
      setLoadingBlacklist(false);
    }
  };

  // 차단 해제
  const handleUnblockUser = (blockedUser) => {
    Alert.alert(
      '차단 해제',
      `"${blockedUser.blockedUserName}"님의 차단을 해제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel'
        },
        {
          text: '해제',
          style: 'default',
          onPress: async () => {
            try {
              await blacklistService.unblockUser(user.uid, blockedUser.blockedUserId);
              await fetchBlacklist(); // 블랙리스트 다시 조회
              Alert.alert('해제 완료', '차단이 해제되었습니다.');
            } catch (error) {
              console.error('차단 해제 실패:', error);
              Alert.alert('해제 실패', error.message || '차단 해제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  // 차단된 사용자 관리 화면으로 이동
  const handleBlacklistManagement = () => {
    // Date 객체를 문자열로 변환하여 직렬화 문제 해결
    const serializedBlacklist = blacklist.map(item => ({
      ...item,
      blockedAt: item.blockedAt instanceof Date ? item.blockedAt.toISOString() : item.blockedAt
    }));
    
    navigation.navigate('BlacklistManagement', { 
      blacklist: serializedBlacklist, 
      onRefresh: fetchBlacklist 
    });
  };

  // 컴포넌트 마운트 시 블랙리스트 조회
  useEffect(() => {
    fetchBlacklist();
  }, [user?.uid]);

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
      '계정을 영구적으로 삭제하시겠습니까?\n\n삭제된 계정은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '최종 확인',
              '정말로 계정을 삭제하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                { 
                  text: '삭제', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // TODO: 실제 계정 삭제 로직 구현
                      Alert.alert('계정 삭제', '계정 삭제 기능이 곧 추가됩니다.');
                    } catch (error) {
                      Alert.alert('오류', '계정 삭제 중 오류가 발생했습니다.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, children, customIcon }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          {customIcon ? customIcon : <Ionicons name={icon} size={20} color="#97DCDE" />}
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
            subtitle="작성한 글의 좋아요와 댓글 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'newMember')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.newMember}
              onToggle={() => toggleSetting('notifications', 'newMember')}
            />
          </SettingItem>
          <SettingItem
            icon="chatbubbles-outline"
            title="채팅 알림"
            subtitle="채팅 메시지 알림을 휴대전화에서 받습니다."
            onPress={() => toggleSetting('notifications', 'chatNotification')}
            showArrow={false}
          >
            <ToggleSwitch 
              enabled={settings.notifications.chatNotification}
              onToggle={() => toggleSetting('notifications', 'chatNotification')}
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
            icon="ban-outline"
            title="차단된 사용자"
            subtitle={`차단된 사용자 ${blacklist.length}명 (최대 3명)`}
            onPress={handleBlacklistManagement}
          />
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
            icon="diamond-outline"
            title="프리미엄"
            subtitle="고급 기능과 혜택을 이용해보세요"
            onPress={() => Alert.alert('프리미엄', '프리미엄 서비스가 곧 출시됩니다.\n\n• 무제한 모임 생성\n• 고급 필터링 옵션\n• 우선 지원\n• 광고 제거\n\n더 많은 혜택이 준비 중입니다!')}
            customIcon={
              <View style={styles.premiumIconContainer}>
                <Ionicons name="diamond-outline" size={20} color="#FFEA00" />
              </View>
            }
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
    paddingVertical: 20,
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
    marginBottom: 16,
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
  premiumIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 234, 0, 0.1)',
    borderRadius: 20,
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