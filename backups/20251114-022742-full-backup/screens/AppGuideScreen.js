import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// RunOn 디자인 시스템
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

const AppGuideScreen = ({ navigation }) => {
  const [selectedFeature, setSelectedFeature] = useState('map');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 앱 기능별 이미지 데이터 (AppIntroScreen과 동일)
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
    ]
  };

  // 기능 선택 핸들러
  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
    setCurrentImageIndex(0);
  };

  // 이미지 슬라이더 렌더링
  const renderImageSlider = () => {
    const images = featureImages[selectedFeature];
    
    return (
      <View style={styles.imageSliderContainer}>
        <FlatList
          data={images}
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
            <View style={styles.imageSlide}>
              <View style={styles.guideImageContainer}>
                {item.imagePath ? (
                  <Image 
                    source={item.imagePath} 
                    style={styles.guideImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.guideImagePlaceholder}>
                    <Ionicons name="phone-portrait" size={80} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.guideImageText}>{item.title}</Text>
                    <Text style={styles.guideImageSubtext}>{item.description}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
        />
        
        {/* 이미지 인디케이터 */}
        <View style={styles.imageIndicators}>
          {images.map((_, index) => (
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

  // 기능 선택 버튼들
  const renderFeatureButtons = () => (
    <View style={styles.featureButtons}>
      <TouchableOpacity
        style={[
          styles.featureButton,
          selectedFeature === 'map' && styles.featureButtonActive
        ]}
        onPress={() => handleFeatureSelect('map')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="map-outline" 
          size={24} 
          color={selectedFeature === 'map' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
        />
        <Text style={styles.featureButtonText}>한강 지도 사용법</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.featureButton,
          selectedFeature === 'meeting' && styles.featureButtonActive
        ]}
        onPress={() => handleFeatureSelect('meeting')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="people-outline" 
          size={24} 
          color={selectedFeature === 'meeting' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
        />
        <Text style={styles.featureButtonText}>러닝 모임 사용법</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.featureButton,
          selectedFeature === 'community' && styles.featureButtonActive
        ]}
        onPress={() => handleFeatureSelect('community')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chatbubbles-outline" 
          size={24} 
          color={selectedFeature === 'community' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
        />
        <Text style={styles.featureButtonText}>커뮤니티 활용법</Text>
      </TouchableOpacity>
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
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>앱 사용 가이드</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {/* 컨텐츠 */}
      <View style={styles.content}>
        {/* 이미지 슬라이더 */}
        {renderImageSlider()}
        
        {/* 기능 선택 버튼들 */}
        <ScrollView 
          style={styles.scrollableContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderFeatureButtons()}
        </ScrollView>
      </View>
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
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageSliderContainer: {
    height: 500,
    position: 'relative',
  },
  imageSlide: {
    width: screenWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideImageContainer: {
    width: screenWidth,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideImage: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
  },
  guideImagePlaceholder: {
    width: screenWidth,
    height: '100%',
    backgroundColor: COLORS.CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideImageText: {
    fontSize: 18,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
    fontFamily: 'Pretendard-Regular',
  },
  guideImageSubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 6,
    fontFamily: 'Pretendard-Regular',
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
  featureButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  featureButtonActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SURFACE,
  },
  featureButtonText: {
    fontSize: 16,
    color: COLORS.TEXT,
    marginLeft: 12,
    fontFamily: 'Pretendard-Regular',
  },
});

export default AppGuideScreen; 