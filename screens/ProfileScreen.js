import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingTimeSelector from '../components/OnboardingTimeSelector';
import OnboardingStyleSelector from '../components/OnboardingStyleSelector';
import OnboardingSeasonSelector from '../components/OnboardingSeasonSelector';
import OnboardingGoalSelector from '../components/OnboardingGoalSelector';
import OnboardingBioInput from '../components/OnboardingBioInput';
import OnboardingLevelSelector from '../components/OnboardingLevelSelector';
import OnboardingCourseSelector from '../components/OnboardingCourseSelector';
import { 
  HAN_RIVER_PARKS, 
  RIVER_SIDES, 
  RUNNING_LEVELS, 
  getCourseName, 
  getSeasonTitle, 
  getGoalTitle,
  getLevelInfo,
  getTimeTitle,
  getStyleTitle
} from '../constants/onboardingOptions';

// NetGill 디자인 시스템 - 홈화면과 동일한 색상 팔레트
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  TAG_GREEN: '#B6F5C9',
  TAG_YELLOW: '#FFF6B2',
  TAG_PURPLE: '#E2D6FF',
  TAG_PINK: '#FFD6E7',
  TAG_BLUE: '#B6E6F5',
  BADGE: '#1EB8C6',
};







// 안전한 가입일 포맷 함수
const getJoinDate = (createdAt) => {
  if (!createdAt) return '-';
  let dateObj;
  if (typeof createdAt === 'string') {
    dateObj = new Date(createdAt);
  } else if (createdAt.toDate) {
    dateObj = createdAt.toDate();
  } else {
    dateObj = createdAt;
  }
  if (!dateObj || isNaN(dateObj)) return '-';
  return `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
};




const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUserProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    vibration: false,
    darkMode: false,
    accountEmail: user?.email || '',
  });
  const [editBtnPressed, setEditBtnPressed] = useState(false);
  const [profileImagePressed, setProfileImagePressed] = useState(false);

  // 커뮤니티 이력(임의 데이터)
  const [activity, setActivity] = useState({
    totalParticipated: 24,
    thisMonth: 6,
    hostedEvents: 3,
    mannerScore: 4.8,
    tags: ['#시간 정확해요', '#페이스 안정적', '#분위기 좋아요'],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } catch (e) {
        Alert.alert('오류', '프로필 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleMenuPress = () => {
    Alert.alert('메뉴', '메뉴 기능이 곧 추가됩니다!');
  };

  const handleSearchPress = () => {
    Alert.alert('검색', '검색 기능이 곧 추가됩니다!');
  };

  const handleNotificationPress = () => {
    Alert.alert('알림', '알림 기능이 곧 추가됩니다!');
  };

  const handleProfilePress = () => {
    // 이미 프로필 화면에 있으므로 아무것도 하지 않음
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
      Alert.alert('로그아웃 실패', error.message || '로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEdit = () => {
    if (profile) {
      setEditData({
        nickname: profile.displayName || '',
        bio: profile.bio || '',
        runningProfile: {
          level: profile.runningProfile?.level || '',
          pace: profile.runningProfile?.pace || '',
          preferredCourses: profile.runningProfile?.preferredCourses || [],
          preferredTimes: profile.runningProfile?.preferredTimes || [],
          runningStyles: profile.runningProfile?.runningStyles || [],
          favoriteSeasons: profile.runningProfile?.favoriteSeasons || [],
          currentGoals: profile.runningProfile?.currentGoals || [],
        }
      });
      setEditModalVisible(true);
    }
  };

  const handleProfileImageEdit = () => {
    Alert.alert(
      '프로필 사진 편집',
      '프로필 사진을 변경하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '갤러리에서 선택', onPress: () => selectImageFromGallery() },
        { text: '카메라로 촬영', onPress: () => takePhotoWithCamera() },
      ]
    );
  };

  const selectImageFromGallery = () => {
    Alert.alert('갤러리', '갤러리에서 이미지 선택 기능이 곧 추가됩니다!');
  };

  const takePhotoWithCamera = () => {
    Alert.alert('카메라', '카메라 촬영 기능이 곧 추가됩니다!');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateUserProfile({
        displayName: editData.nickname,
        bio: editData.bio,
        runningProfile: editData.runningProfile,
      });
      setProfile((prev) => ({
        ...prev,
        displayName: editData.nickname,
        bio: editData.bio,
        runningProfile: editData.runningProfile,
      }));
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('오류', '프로필 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AppBar */}
      <AppBar
        user={user}
        onProfilePress={handleProfilePress}
        onNotificationPress={handleNotificationPress}
        onSettingsPress={handleSettingsPress}
        hideProfile={true}
      />

      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
      >
        {/* 상단 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardContentRow}>
            <View style={styles.profileImageWrapWithEdit}>
              <TouchableOpacity
                style={[styles.profileImageWrap, profileImagePressed && styles.profileImageWrapPressed]}
                onPress={handleProfileImageEdit}
                onPressIn={() => setProfileImagePressed(true)}
                onPressOut={() => setProfileImagePressed(false)}
                activeOpacity={0.8}
              >
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                )}
                <View style={styles.profileImageEditIcon}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profileEditBtnMini, editBtnPressed && styles.profileEditBtnMiniActive]}
                onPress={handleEdit}
                onPressIn={() => setEditBtnPressed(true)}
                onPressOut={() => setEditBtnPressed(false)}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.TEXT} />
                <Text style={styles.profileEditTextMini}>프로필 편집</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileTextCol}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{profile?.displayName || '닉네임 없음'}</Text>
                <View style={styles.levelBadgeOutline}>
                  <Text style={styles.levelBadgeText}>{getLevelInfo(profile?.runningProfile?.level).title}</Text>
                </View>
              </View>
              <Text style={styles.profileJoin}>가입일: {getJoinDate(profile?.createdAt)}</Text>
              <Text style={styles.profileBio}>{profile?.bio || '자기소개가 없습니다.'}</Text>
            </View>
          </View>
        </View>

        {/* 커뮤니티 활동 */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTitleRow}>
            <Ionicons name="people" size={22} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
            <Text style={styles.infoCardTitle}>커뮤니티 활동</Text>
          </View>
          <View style={styles.activityRowGrid}>
            <View style={styles.activityItemGrid}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="heart" size={22} color="#FF0073" style={{ marginRight: 2 }} />
                <Text style={styles.activityNumPrimary}>{activity.mannerScore}</Text>
              </View>
              <Text style={styles.activityLabel}>러닝 매너</Text>
            </View>
            <View style={styles.activityItemGrid}>
              <Text style={styles.activityNumWhite}>{activity.totalParticipated}</Text>
              <Text style={styles.activityLabel}>총 참여</Text>
            </View>
            <View style={styles.activityItemGrid}>
              <Text style={styles.activityNumWhite}>{activity.thisMonth}</Text>
              <Text style={styles.activityLabel}>이번 달</Text>
            </View>
            <View style={styles.activityItemGrid}>
              <Text style={styles.activityNumWhite}>{activity.hostedEvents}</Text>
              <Text style={styles.activityLabel}>주최 모임</Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            {activity.tags.map((tag, i) => (
              <View key={i} style={styles.tagOutline}> 
                <Text style={styles.tagTextOutline}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 러닝 매칭 정보 */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTitleRow}>
            <Ionicons name="extension-puzzle" size={22} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
            <Text style={styles.infoCardTitle}>러닝 매칭 정보</Text>
          </View>
          {/* 선호 코스 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="location-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 코스</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.preferredCourses || ['-']).map((c, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getCourseName(c)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 선호 시간 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="time-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 시간</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.preferredTimes || ['-']).map((t, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getTimeTitle(t)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 러닝 스타일 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="flash-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>러닝 스타일</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.runningStyles || ['-']).map((s, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getStyleTitle(s)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 선호 계절 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="cloud-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 계절</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.favoriteSeasons || ['-']).map((s, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getSeasonTitle(s)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 러닝 목표 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="trophy-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>러닝 목표</Text>
            </View>
            <View style={styles.tagRow}>
              {(profile?.runningProfile?.currentGoals || ['-']).map((g, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getGoalTitle(g)}</Text>
                </View>
              ))}
            </View>
          </View>
          </View>



        {/* 프로필 수정 모달 */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* 모달 헤더 */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.modalBackButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Ionicons name="chevron-back" size={24} color={COLORS.TEXT} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>프로필 수정</Text>
              </View>
              <ScrollView
                style={{ flexGrow: 1 }}
                contentContainerStyle={{ paddingBottom: 40, minHeight: '100%' }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.stepContainer}>
                  <Text style={[styles.inputLabel, styles.stepTitle]}>닉네임/자기소개</Text>
                  <OnboardingBioInput
                    nickname={editData.nickname}
                    bio={editData.bio}
                    onChangeNickname={text => setEditData(d => ({ ...d, nickname: text }))}
                    onChangeBio={text => setEditData(d => ({ ...d, bio: text }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                  />
                </View>
                <View style={styles.stepContainer}>
                  <Text style={[styles.inputLabel, styles.stepTitle]}>러닝 레벨</Text>
                  <OnboardingLevelSelector
                    value={editData.runningProfile?.level}
                    onChange={levelId => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, level: levelId, pace: (RUNNING_LEVELS.find(l => l.id === levelId)?.pace || '') } }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                    levels={RUNNING_LEVELS}
                  />
                </View>
                <View style={styles.stepContainer}>
                  <Text style={[styles.inputLabel, styles.stepTitle]}>선호 코스</Text>
                  <OnboardingCourseSelector
                    value={editData.runningProfile?.preferredCourses || []}
                    onChange={courses => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, preferredCourses: courses } }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                  />
                </View>
                <View style={styles.stepContainer}>
                  <Text style={[styles.inputLabel, styles.stepTitle]}>선호 시간</Text>
                  <OnboardingTimeSelector 
                    value={editData.runningProfile?.preferredTimes || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, preferredTimes: value } }))}
                    colors={{ TEXT: COLORS.TEXT, PRIMARY: COLORS.PRIMARY, CARD: COLORS.CARD, TEXT_SECONDARY: COLORS.TEXT_SECONDARY }}
                  />
                </View>
                <Text style={styles.inputLabel}>러닝 스타일</Text>
                <View style={{ marginBottom: 12 }}>
                  <OnboardingStyleSelector 
                    value={editData.runningProfile?.runningStyles || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, runningStyles: value } }))}
                  />
                </View>
                <Text style={styles.inputLabel}>선호 계절</Text>
                <View style={{ marginBottom: 12 }}>
                  <OnboardingSeasonSelector 
                    value={editData.runningProfile?.favoriteSeasons || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, favoriteSeasons: value } }))}
                  />
                </View>
                <Text style={styles.inputLabel}>러닝 목표</Text>
                <View style={{ marginBottom: 12 }}>
                  <OnboardingGoalSelector 
                    value={editData.runningProfile?.currentGoals || []}
                    onChange={(value) => setEditData(d => ({ ...d, runningProfile: { ...d.runningProfile, currentGoals: value } }))}
                  />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
      {/* 설정 모달 */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>설정</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>알림</Text>
              <Switch value={settings.notifications} onValueChange={v => setSettings(s => ({ ...s, notifications: v }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>진동</Text>
              <Switch value={settings.vibration} onValueChange={v => setSettings(s => ({ ...s, vibration: v }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>다크모드</Text>
              <Switch value={settings.darkMode} onValueChange={v => setSettings(s => ({ ...s, darkMode: v }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>계정 이메일</Text>
              <Text style={styles.settingValue}>{settings.accountEmail}</Text>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.cancelButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  profileCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginTop: 18,
    marginBottom: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImageWrapWithEdit: {
    alignItems: 'center',
    marginRight: 18,
    justifyContent: 'flex-start',
  },
  profileImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileImageWrapPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  profileImageEditIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.CARD,
  },
  profileTextCol: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginRight: 12,
    textAlign: 'left',
  },
  levelBadgeOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginRight: 8,
  },
  levelBadgeText: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 16,
  },
  levelSubtitleWhite: {
    fontSize: 17,
    color: '#fff',
  },
  profileJoin: {
    fontSize: 15,
    color: COLORS.TEXT,
    marginBottom: 12,
    textAlign: 'left',
  },
  profileBio: {
    fontSize: 17,
    color: COLORS.TEXT,
    textAlign: 'left',
    marginBottom: 0,
    fontWeight: 'bold',
  },
  profileEditBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.TEXT,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 17,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  profileEditBtnMiniActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  profileEditTextMini: {
    color: COLORS.TEXT,
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 13,
  },
  levelSelectBtn: {
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  levelSelectBtnActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  levelSelectText: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 15,
  },
  levelSelectTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  inputLabel: {
    color: COLORS.TEXT,
    fontSize: 15,
    marginBottom: 4,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  settingLabel: {
    color: COLORS.TEXT,
    fontSize: 16,
    fontWeight: '600',
  },
  settingValue: {
    color: COLORS.PRIMARY,
    fontSize: 15,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 18,
    marginHorizontal: 0,
    marginBottom: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  infoRowCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOutline: {
    borderWidth: 1,
    borderColor: '#97DCDE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  tagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#fff',
  },
  activityRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    marginTop: 8,
    width: '100%',
  },
  activityItemGrid: {
    alignItems: 'center',
    flex: 1,
    marginBottom: 10,
    minWidth: 60,
    maxWidth: 80,
  },
  activityNumWhite: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    minHeight: 400,
    maxHeight: '90%',
    height: '80%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    position: 'relative',
    height: 50,
  },
  modalBackButton: {
    padding: 5,
    position: 'absolute',
    left: 5,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: 12,
    color: COLORS.TEXT,
    fontSize: 15,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 15,
  },
  infoRowIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabelWhite: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  activityNumPrimary: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 2,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepContainer: {
    marginBottom: 18,
  },
});

export default ProfileScreen; 