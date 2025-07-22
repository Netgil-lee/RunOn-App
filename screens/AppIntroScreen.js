import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
// import * as Notifications from 'expo-notifications';

// NetGill 디자인 시스템
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AppIntroScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [notificationPermission, setNotificationPermission] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { 
    isTabEnabled, 
    isNotificationTypeEnabled,
    toggleTab,
    toggleNotificationType,
    settings,
    toggleSetting
  } = useNotificationSettings();

  // 알림 권한 확인
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      // expo-notifications가 사용 가능한 경우에만 실행
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status === 'granted');
    } catch (error) {
      console.log('알림 권한 확인 실패:', error);
      setNotificationPermission(false);
    }
  };

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    try {
      // expo-notifications가 사용 가능한 경우에만 실행
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status === 'granted');
      
      if (status === 'granted') {
        Alert.alert(
          '알림 설정 완료',
          '알림을 받을 수 있도록 설정되었습니다.',
          [{ text: '확인' }]
        );
      } else {
        Alert.alert(
          '알림 권한 거부',
          '알림 권한이 거부되었습니다. 설정에서 알림을 활성화할 수 있습니다.',
          [{ text: '확인' }]
        );
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
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

  // 다음 단계로 이동
  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // 홈화면으로 이동
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };



  // 알림 권한 요청
  const handleRequestPermission = () => {
    Alert.alert(
      '알림 권한 요청',
      '냇길에서 러닝 모임, 날씨 알림, 커뮤니티 활동 등을 알려드립니다. 알림을 받으시겠습니까?',
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
        <Text style={styles.stepSubtitle}>냇길에서 제공하는 다양한 알림을 설정해보세요</Text>
      </View>

      {/* 알림 권한 상태 */}
      <View style={styles.permissionSection}>
        <View style={styles.permissionHeader}>
          <Ionicons 
            name={notificationPermission ? "checkmark-circle" : "alert-circle"} 
            size={24} 
            color={notificationPermission ? COLORS.SUCCESS : COLORS.WARNING} 
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
                  <Ionicons name={item.icon} size={20} color={COLORS.PRIMARY} />
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
      {!notificationPermission && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.infoText}>
            알림 권한을 허용해야 개별 알림 설정이 가능합니다.
          </Text>
        </View>
      )}
    </View>
  );

  // 앱 기능별 이미지 데이터
  const featureImages = {
    map: [
      { 
        id: 1, 
        title: '한강 러닝 코스 지도', 
        description: '실시간 지도로 코스 확인', 
        imagePath: require('../assets/images/guide/map-1.png')
      },
      { 
        id: 2, 
        title: '코스 상세 정보', 
        description: '거리, 난이도, 시설 정보', 
        imagePath: require('../assets/images/guide/map-2.png')
      },
      { 
        id: 3, 
        title: '현재 위치 추적', 
        description: '실시간 러닝 경로 기록', 
        imagePath: require('../assets/images/guide/map-3.png')
      },
    ],
    meeting: [
      { 
        id: 1, 
        title: '러닝 모임 참여', 
        description: '다양한 러닝 모임 찾기', 
        imagePath: require('../assets/images/guide/meeting-1.png')
      },
      { 
        id: 2, 
        title: '모임 상세 정보', 
        description: '참여자, 일정, 장소 확인', 
        imagePath: require('../assets/images/guide/meeting-2.png')
      },
      { 
        id: 3, 
        title: '러닝매너점수', 
        description: '함께하는 러닝 문화', 
        imagePath: require('../assets/images/guide/meeting-3.png')
      },
      { 
        id: 4, 
        title: '모임 후기', 
        description: '함께한 러닝 경험 공유', 
        imagePath: require('../assets/images/guide/meeting-4.png')
      },
    ],
    community: [
      { 
        id: 1, 
        title: '커뮤니티 활동', 
        description: '러닝 후기와 팁 공유', 
        imagePath: require('../assets/images/guide/community-1.png')
      },
      { 
        id: 2, 
        title: '게시글 작성', 
        description: '나만의 러닝 스토리', 
        imagePath: require('../assets/images/guide/community-2.png')
      },
      { 
        id: 3, 
        title: '소통과 응원', 
        description: '다른 러너들과 소통', 
        imagePath: require('../assets/images/guide/community-3.png')
      },
    ],

  };

  // 전체 이미지 배열 생성 (순서: map → meeting → community)
  const getAllImages = () => {
    const allImages = [];
    
    // map 이미지들 추가
    featureImages.map.forEach((image, index) => {
      allImages.push({
        ...image,
        featureType: 'map',
        featureName: '한강 지도 사용법',
        featureIndex: index + 1,
        featureTotal: featureImages.map.length
      });
    });
    
    // meeting 이미지들 추가
    featureImages.meeting.forEach((image, index) => {
      allImages.push({
        ...image,
        featureType: 'meeting',
        featureName: '러닝 모임 사용법',
        featureIndex: index + 1,
        featureTotal: featureImages.meeting.length
      });
    });
    
    // community 이미지들 추가
    featureImages.community.forEach((image, index) => {
      allImages.push({
        ...image,
        featureType: 'community',
        featureName: '커뮤니티 활용법',
        featureIndex: index + 1,
        featureTotal: featureImages.community.length
      });
    });
    
    return allImages;
  };

  const allImages = getAllImages();
  const totalImages = allImages.length;
  const isLastImage = currentImageIndex >= totalImages - 1;

  // 배경 이미지 렌더링 (슬라이더 방식)
  const renderBackgroundImage = () => {
    return (
      <View style={styles.backgroundImageContainer}>
        <FlatList
          data={allImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentImageIndex(index);
          }}
          getItemLayout={(data, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={styles.backgroundImageSlide}>
              {item.imagePath ? (
                <Image 
                  source={item.imagePath} 
                  style={styles.backgroundImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.backgroundPlaceholder}>
                  <Ionicons name="phone-portrait" size={80} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.backgroundImageText}>{item.title}</Text>
                  <Text style={styles.backgroundImageSubtext}>{item.description}</Text>
                </View>
              )}
            </View>
          )}
          keyExtractor={(item, index) => `${item.featureType}-${index}`}
        />
        
        {/* 이미지 인디케이터 */}
        <View style={styles.imageIndicators}>
          {allImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.imageIndicator,
                index === currentImageIndex && styles.imageIndicatorActive
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // 2단계: 앱 사용 설명
  const renderAppGuideStep = () => (
    <View style={styles.stepContainer}>
      {/* 배경 이미지 */}
      {renderBackgroundImage()}

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
        {currentStep === 1 ? renderNotificationStep() : renderAppGuideStep()}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtonContainer}>
        {currentStep === 1 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>다음</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        ) : (
          // 2단계에서는 진행도 표시 또는 시작하기 버튼
          isLastImage ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>시작하기</Text>
              <Ionicons name="checkmark" size={20} color="#000" />
            </TouchableOpacity>
          ) : (
            <View style={styles.progressButton}>
              <Text style={styles.progressButtonText}>
                {allImages[currentImageIndex]?.featureName} {allImages[currentImageIndex]?.featureIndex}/{allImages[currentImageIndex]?.featureTotal}
              </Text>
            </View>
          )
        )}
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
    paddingHorizontal: 0,
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
    marginBottom: 16,
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
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 8,
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
  },
  backgroundImageContainer: {
    width: screenWidth,
    height: screenHeight * 0.85,
    marginBottom: 0,
    position: 'relative',
  },
  backgroundImageSlide: {
    width: screenWidth,
    height: '100%',
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
  },
  backgroundPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backgroundImageText: {
    fontSize: 24,
    color: COLORS.TEXT,
    marginTop: 16,
    fontFamily: 'Pretendard-Bold',
    textAlign: 'center',
  },
  backgroundImageSubtext: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    fontFamily: 'Pretendard-Regular',
    textAlign: 'center',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    width: 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.TEXT_SECONDARY,
    marginHorizontal: 4,
  },
  imageIndicatorActive: {
    backgroundColor: COLORS.PRIMARY,
    width: 24,
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
    marginRight: 8,
    fontFamily: 'Pretendard-Bold',
  },
  progressButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressButtonText: {
    color: COLORS.TEXT,
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
  },
});

export default AppIntroScreen; 