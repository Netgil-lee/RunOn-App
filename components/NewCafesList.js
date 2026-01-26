/**
 * 신규 입점 카페 목록 컴포넌트
 * - 최근 1개월 내 입점한 카페를 배너/캐러셀 형태로 표시
 * - 스와이프로 다음 카페 보기
 * - 클릭 시 지도탭의 해당 카페로 이동
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import firestoreService from '../services/firestoreService';

const { width: screenWidth } = Dimensions.get('window');

// 디자인 시스템 색상 (HomeScreen과 동일)
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#FFFFFF',
  SECONDARY: '#666666',
  GRAY: '#888888',
};

const NewCafesList = ({ navigation }) => {
  const [newCafes, setNewCafes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  // 신규 입점 카페 조회 (최근 1개월)
  const loadNewCafes = useCallback(async () => {
    try {
      setIsLoading(true);
      const cafes = await firestoreService.getNewCafes(10);
      setNewCafes(cafes);
    } catch (error) {
      console.error('❌ [NewCafesList] 신규 카페 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 화면 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadNewCafes();
    }, [loadNewCafes])
  );

  // 카페 클릭 핸들러
  const handleCafePress = (cafe) => {
    navigation.navigate('MapTab', {
      targetCafeId: cafe.id,
      activeToggle: 'cafes'
    });
  };

  // 입점일 포맷팅
  const formatDate = (timestamp) => {
    if (!timestamp) return '입점일 미정';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}월 ${day}일 입점`;
    } catch (error) {
      return '입점일 미정';
    }
  };

  // 페이지 인디케이터 렌더링
  const renderPagination = () => {
    if (newCafes.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {newCafes.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    );
  };

  // 카페 카드 렌더링
  const renderCafeCard = ({ item, index }) => (
    <TouchableOpacity
      style={styles.cafeCard}
      onPress={() => handleCafePress(item)}
      activeOpacity={0.8}
    >
      {item.representativeImage ? (
        <Image
          source={{ uri: item.representativeImage }}
          style={styles.cafeImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cafeImagePlaceholder}>
          <Ionicons name="cafe-outline" size={48} color={COLORS.SECONDARY} />
        </View>
      )}
      
      {/* 그라데이션 오버레이 */}
      <View style={styles.overlay} />
      
      {/* 카페 정보 */}
      <View style={styles.cafeInfo}>
        <Text style={styles.cafeName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cafeLocation} numberOfLines={1}>
          {item.location}
        </Text>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.PRIMARY} />
          <Text style={styles.cafeDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      
      {/* NEW 뱃지 */}
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>NEW</Text>
      </View>
    </TouchableOpacity>
  );

  // 스크롤 이벤트 핸들러
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>신규 입점 카페</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        </View>
      </View>
    );
  }

  // 데이터 없음
  if (newCafes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>신규 입점 카페</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cafe-outline" size={32} color={COLORS.SECONDARY} />
          <Text style={styles.emptyText}>최근 1개월 내 신규 입점 카페가 없습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={COLORS.PRIMARY} />
        <Text style={styles.sectionTitle}>신규 입점 카페</Text>
        <Text style={styles.subtitle}>최근 1개월</Text>
      </View>
      
      {/* 캐러셀 */}
      <FlatList
        ref={flatListRef}
        data={newCafes}
        renderItem={renderCafeCard}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={screenWidth - 32}
        decelerationRate="fast"
      />
      
      {/* 페이지 인디케이터 */}
      {renderPagination()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginLeft: 'auto',
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    textAlign: 'center',
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  cafeCard: {
    width: screenWidth - 64,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: COLORS.SURFACE,
  },
  cafeImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cafeImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    // 하단 그라데이션 효과를 위해 상단은 투명하게
  },
  cafeInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cafeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  cafeLocation: {
    fontSize: 13,
    color: COLORS.GRAY,
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cafeDate: {
    fontSize: 12,
    color: COLORS.PRIMARY,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.SECONDARY,
  },
  paginationDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
  },
});

export default NewCafesList;
