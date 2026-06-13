import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import blacklistService from '../services/blacklistService';
import { getAppleFitnessService } from '../services/getAppleFitnessService';
import TermsPrivacyModal from '../components/TermsPrivacyModal';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import SlideToggle from '../components/SlideToggle';

// 모듈 레벨 컴포넌트 — 부모 리렌더 시 리마운트되지 않아야 토글 슬라이드 애니메이션이 유지됨
const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, children, customIcon }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
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
        {showArrow && <Ionicons name="chevron-forward" size={16} color={colors.TEXT_SECONDARY} />}
      </View>
    </TouchableOpacity>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 테마 전환 크로스페이드 — 현재 화면을 스냅샷으로 덮고 새 테마가 렌더되는 동안 페이드아웃
  const screenRef = React.useRef(null);
  const fadeOverlayOpacity = React.useRef(new Animated.Value(0)).current;
  const [fadeSnapshotUri, setFadeSnapshotUri] = useState(null);
  const isTransitioningRef = React.useRef(false);

  const handleThemeToggle = async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    try {
      const uri = await captureRef(screenRef, {
        format: 'jpg',
        quality: 0.6,
        width: Math.round(SCREEN_W / 2),
        height: Math.round(SCREEN_H / 2),
      });
      fadeOverlayOpacity.setValue(1);
      setFadeSnapshotUri(uri); // 스냅샷이 그려진 뒤 onLoad에서 전환
    } catch {
      toggleTheme();
      isTransitioningRef.current = false;
    }
  };

  // 스냅샷이 화면을 덮어 그려진 직후 — 테마 전환 + 스냅샷 페이드아웃
  const handleOverlayLoaded = () => {
    toggleTheme();
    Animated.timing(fadeOverlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setFadeSnapshotUri(null);
      isTransitioningRef.current = false;
    });
  };

  const { user, logout } = useAuth();
  const { settings, toggleSetting, updateSetting } = useNotificationSettings();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('privacy'); // 'privacy' or 'child-safety'
  
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
  const [healthKitStatus, setHealthKitStatus] = useState({
    isAvailable: false,
    hasPermissions: false,
    isChecking: false
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

  // 컴포넌트 마운트 시 블랙리스트 조회 및 HealthKit 상태 확인
  useEffect(() => {
    fetchBlacklist();
    checkHealthKitStatus();
  }, [user?.uid]);

  // HealthKit 상태 확인
  const checkHealthKitStatus = async () => {
    try {
      setHealthKitStatus(prev => ({ ...prev, isChecking: true }));
      
      const appleFitnessService = getAppleFitnessService();
      // HealthKit 모듈 안전성 체크
      if (!appleFitnessService || typeof appleFitnessService.checkPermissions !== 'function') {
        console.warn('⚠️ HealthKit 서비스가 사용할 수 없습니다.');
        setHealthKitStatus({
          isAvailable: false,
          hasPermissions: false,
          isChecking: false
        });
        return;
      }
      
      const status = await appleFitnessService.checkPermissions();
      
      setHealthKitStatus({
        isAvailable: status.isAvailable,
        hasPermissions: status.hasPermissions,
        isChecking: false
      });
      
      console.log('🏥 HealthKit 상태:', status);
    } catch (error) {
      console.error('❌ HealthKit 상태 확인 실패:', error);
      setHealthKitStatus({
        isAvailable: false,
        hasPermissions: false,
        isChecking: false
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
          { text: '취소', style: 'cancel' },
          { 
            text: '허용', 
            onPress: async () => {
              try {
                const appleFitnessService = getAppleFitnessService();
                if (!appleFitnessService) {
                  Alert.alert('오류', 'HealthKit을 이 기기에서 사용할 수 없습니다.', [{ text: '확인' }]);
                  return;
                }
                const success = await appleFitnessService.requestPermissions();
                if (success) {
                  Alert.alert(
                    '권한 허용 완료',
                    'HealthKit 권한이 허용되었습니다.\n\n러닝 데이터가 자동으로 동기화됩니다.',
                    [{ text: '확인' }]
                  );
                  // 상태 다시 확인
                  await checkHealthKitStatus();
                } else {
                  Alert.alert(
                    '권한 허용 실패',
                    'HealthKit 권한 허용에 실패했습니다.\n\n설정 > 개인정보 보호 및 보안 > 건강에서 수동으로 허용해주세요.',
                    [{ text: '확인' }]
                  );
                }
              } catch (error) {
                console.error('❌ HealthKit 권한 요청 실패:', error);
                Alert.alert(
                  '오류',
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
        '오류',
        'HealthKit 접근 처리 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
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

  const SectionTitle = ({ title }) => (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );

  const openModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
    <View ref={screenRef} collapsable={false} style={styles.container}>
      {/* 헤더 */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
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
            <SlideToggle 
              value={settings.notifications.newsNotification}
              onValueChange={() => toggleSetting('notifications', 'newsNotification')}
            />
          </SettingItem>
          <SettingItem
            icon="notifications-outline"
            title="모임 알림"
            subtitle="러닝 모임 관련 알림을 받습니다"
            onPress={() => toggleSetting('notifications', 'meetingReminder')}
            showArrow={false}
          >
            <SlideToggle 
              value={settings.notifications.meetingReminder}
              onValueChange={() => toggleSetting('notifications', 'meetingReminder')}
            />
          </SettingItem>
          <SettingItem
            icon="people-outline"
            title="커뮤니티 알림"
            subtitle="작성한 글의 좋아요와 댓글 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'newMember')}
            showArrow={false}
          >
            <SlideToggle 
              value={settings.notifications.newMember}
              onValueChange={() => toggleSetting('notifications', 'newMember')}
            />
          </SettingItem>
          <SettingItem
            icon="chatbubbles-outline"
            title="채팅 알림"
            subtitle="채팅 메시지 알림을 휴대전화에서 받습니다."
            onPress={() => toggleSetting('notifications', 'chatNotification')}
            showArrow={false}
          >
            <SlideToggle 
              value={settings.notifications.chatNotification}
              onValueChange={() => toggleSetting('notifications', 'chatNotification')}
            />
          </SettingItem>
          <SettingItem
            icon="cloud-outline"
            title="날씨 알림"
            subtitle="러닝에 영향을 주는 날씨 변화 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'weatherAlert')}
            showArrow={false}
          >
            <SlideToggle 
              value={settings.notifications.weatherAlert}
              onValueChange={() => toggleSetting('notifications', 'weatherAlert')}
            />
          </SettingItem>
          <SettingItem
            icon="shield-checkmark-outline"
            title="안전 알림"
            subtitle="한강 주변 안전 관련 알림을 받습니다."
            onPress={() => toggleSetting('notifications', 'safetyAlert')}
            showArrow={false}
          >
            <SlideToggle 
              value={settings.notifications.safetyAlert}
              onValueChange={() => toggleSetting('notifications', 'safetyAlert')}
            />
          </SettingItem>
        </View>



        {/* 앱 */}
        <SectionTitle title="앱" />
        <View style={styles.section}>
          <SettingItem
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            title="화면 모드"
            subtitle={isDark ? '다크 모드' : '라이트 모드'}
            showArrow={false}
            onPress={handleThemeToggle}
          >
            <ThemeToggle onToggle={handleThemeToggle} />
          </SettingItem>
          <SettingItem
            icon="heart-outline"
            title="건강데이터 접근"
            subtitle={
              healthKitStatus.isChecking 
                ? "상태 확인 중..." 
                : healthKitStatus.hasPermissions 
                  ? "HealthKit 권한 허용됨" 
                  : "러닝 데이터 동기화 및 권한 관리"
            }
            onPress={handleHealthKitAccess}
          />
          <SettingItem
            icon="ban-outline"
            title="블랙리스트"
            subtitle={`차단된 사용자 ${blacklist.length}명 (최대 3명)`}
            onPress={handleBlacklistManagement}
            customIcon={
              <View style={styles.blacklistBadgeContainer}>
                <View style={styles.blacklistBadgeGlow}>
                  <Image 
                    source={require('../assets/images/Union.png')} 
                    style={styles.blacklistBadgeImage}
                  />
                </View>
                <View style={styles.blacklistIconOverlay}>
                  <Ionicons name="ban-outline" size={16} color="#FFFFFF" />
                </View>
              </View>
            }
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
            subtitle="러논 서비스 이용약관"
            onPress={() => openModal('terms')}
          />
          <SettingItem
            icon="shield-outline"
            title="개인정보 처리방침"
            subtitle="개인정보 수집 및 이용에 대한 안내"
            onPress={() => openModal('privacy')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="아동 안전 정책"
            subtitle="아동 보호 및 안전에 관한 정책"
            onPress={() => openModal('child-safety')}
          />

          <SettingItem
            icon="information-circle-outline"
            title="버전 정보"
            subtitle="RunOn v1.0.3"
            onPress={() => Alert.alert('버전 정보', 'RunOn v1.0.0\n최신 버전입니다.')}
          />
        </View>

        {/* 계정 */}
        <SectionTitle title="계정" />
        <View style={styles.section}>
          <SettingItem
            icon="diamond-outline"
            title="러논 멤버스"
            subtitle="구독하고 다양한 혜택을 누려보세요"
            onPress={() => navigation.navigate('Premium')}
            customIcon={
              <View style={styles.premiumBadgeContainer}>
                <View style={styles.premiumBadgeGlow}>
                  <Image 
                    source={require('../assets/images/Union.png')} 
                    style={styles.premiumBadgeImage}
                  />
                </View>
                <View style={styles.premiumIconOverlay}>
                  <Ionicons name="diamond-outline" size={16} color="#FFFFFF" />
                </View>
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
      
      {/* 모달 */}
      <TermsPrivacyModal
        visible={modalVisible}
        onClose={closeModal}
        type={modalType}
      />
    </View>
      {/* 테마 전환 크로스페이드 오버레이 (스냅샷이 새 테마 위에서 페이드아웃) */}
      {fadeSnapshotUri && (
        <Animated.Image
          source={{ uri: fadeSnapshotUri }}
          style={[StyleSheet.absoluteFill, { opacity: fadeOverlayOpacity }]}
          pointerEvents="none"
          resizeMode="cover"
          onLoad={handleOverlayLoaded}
        />
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  header: {
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT,
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
    color: colors.TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Pretendard-SemiBold',
  },
  section: {
    backgroundColor: colors.CARD,
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
    backgroundColor: colors.CARD,
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
  // 프리미엄 배지 스타일 (PremiumScreen과 동일)
  premiumBadgeContainer: {
    width: 60,
    height: 24,
    backgroundColor: 'transparent',
    // 글로우 효과 - 핑크 색상
    shadowColor: '#FF0073',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  premiumBadgeGlow: {
    backgroundColor: 'transparent',
  },
  premiumBadgeImage: {
    width: 60,
    height: 24,
    resizeMode: 'contain',
  },
  premiumIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 블랙리스트 배지 스타일 (프리미엄 배지와 동일)
  blacklistBadgeContainer: {
    width: 60,
    height: 24,
    backgroundColor: 'transparent',
    // 글로우 효과 - 핑크 색상
    shadowColor: '#FF0073',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  blacklistBadgeGlow: {
    backgroundColor: 'transparent',
  },
  blacklistBadgeImage: {
    width: 60,
    height: 24,
    resizeMode: 'contain',
  },
  blacklistIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.TEXT,
    marginBottom: 2,
    fontFamily: 'Pretendard-Medium',
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard-Regular',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    color: colors.ERROR,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default SettingsScreen; 