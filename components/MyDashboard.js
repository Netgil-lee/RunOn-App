/**
 * 마이 대시보드 컴포넌트
 * - 자주 찾아가는 러닝카페 (마커 클릭 횟수 기준)
 * - 자주 개설하는 모임장소 (모임 생성 횟수 기준)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getFrequentCafes, getFrequentMeetingLocations } from '../services/userActivityService';
import { Ionicons } from '@expo/vector-icons';

// 디자인 시스템 색상 (HomeScreen과 동일)
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',        // 카드 배경색
  CARD_INNER: '#1F1F24',  // 카드 내부 요소 배경색
  TEXT: '#FFFFFF',
  SECONDARY: '#666666',
  GRAY: '#888888',
};

const MyDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [frequentCafes, setFrequentCafes] = useState([]);
  const [frequentLocations, setFrequentLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // 병렬로 데이터 조회
      const [cafes, locations] = await Promise.all([
        getFrequentCafes(user.uid, 2, 3),
        getFrequentMeetingLocations(user.uid, 2, 3)
      ]);

      setFrequentCafes(cafes);
      setFrequentLocations(locations);
    } catch (error) {
      console.error('❌ [MyDashboard] 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // 화면 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // 카페 카드 클릭 핸들러
  const handleCafePress = (cafe) => {
    // 지도탭의 해당 카페로 이동
    navigation.navigate('지도', {
      targetCafeId: cafe.cafeId,
      activeToggle: 'cafes'
    });
  };

  // 장소 카드 클릭 핸들러
  const handleLocationPress = (location) => {
    // 모임 생성 화면으로 이동하거나 지도로 이동
    // 현재는 지도탭으로 이동
    navigation.navigate('지도', {
      searchQuery: location.location
    });
  };

  // 카페 카드 렌더링
  const renderCafeCard = (cafe, index) => (
    <TouchableOpacity
      key={cafe.cafeId || index}
      style={styles.cafeCard}
      onPress={() => handleCafePress(cafe)}
      activeOpacity={0.7}
    >
      {cafe.representativeImage ? (
        <Image
          source={{ uri: cafe.representativeImage }}
          style={styles.cafeImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cafeImagePlaceholder}>
          <Ionicons name="cafe-outline" size={24} color={COLORS.SECONDARY} />
        </View>
      )}
      <View style={styles.cafeInfo}>
        <Text style={styles.cafeName} numberOfLines={1}>
          {cafe.cafeName}
        </Text>
        <View style={styles.visitBadge}>
          <Text style={styles.visitCount}>{cafe.visitCount}회</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // 장소 카드 렌더링 (아이콘 없이 텍스트만)
  const renderLocationCard = (location, index) => (
    <TouchableOpacity
      key={location.locationKey || index}
      style={styles.locationCard}
      onPress={() => handleLocationPress(location)}
      activeOpacity={0.7}
    >
      <Text style={styles.locationName} numberOfLines={1}>
        {location.location}
      </Text>
      <Text style={styles.locationDetail} numberOfLines={1}>
        {location.customLocation || '상세 위치 없음'}
      </Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{location.count}회</Text>
      </View>
    </TouchableOpacity>
  );

  // 빈 상태 카드 렌더링 (카페)
  const renderEmptyCafeState = () => (
    <View style={styles.emptyStateCard}>
      <Ionicons name="cafe-outline" size={32} color={COLORS.SECONDARY} />
      <Text style={styles.emptyStateText}>방문한 카페가 없어요</Text>
      <Text style={styles.emptyStateSubtext}>지도에서 러닝카페를 찾아보세요!</Text>
    </View>
  );

  // 빈 상태 카드 렌더링 (장소)
  const renderEmptyLocationState = () => (
    <View style={styles.emptyStateCard}>
      <Ionicons name="location-outline" size={32} color={COLORS.SECONDARY} />
      <Text style={styles.emptyStateText}>개설한 장소가 없어요</Text>
      <Text style={styles.emptyStateSubtext}>러닝 모임을 만들어보세요!</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 섹션 헤더 */}
      <Text style={styles.sectionTitle}>마이 대시보드</Text>

      {/* 자주 찾아가는 러닝카페 */}
      <View style={styles.subSection}>
        <Text style={styles.subSectionTitle}>자주 찾아가는 러닝카페</Text>
        <Text style={styles.subSectionSubtitle}>마커 클릭 횟수 기준</Text>
        
        <View style={styles.cardsRow}>
          {frequentCafes.length > 0 ? (
            frequentCafes.map((cafe, index) => renderCafeCard(cafe, index))
          ) : (
            renderEmptyCafeState()
          )}
        </View>
      </View>

      {/* 자주 개설하는 모임장소 */}
      <View style={styles.subSection}>
        <Text style={styles.subSectionTitle}>자주 개설하는 모임장소</Text>
        <Text style={styles.subSectionSubtitle}>모임 생성 횟수 기준</Text>
        
        <View style={styles.cardsRow}>
          {frequentLocations.length > 0 ? (
            frequentLocations.map((location, index) => renderLocationCard(location, index))
          ) : (
            renderEmptyLocationState()
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,  // 다른 섹션 카드와 동일한 배경색
    borderRadius: 12,              // 다른 섹션 카드와 동일한 borderRadius
    padding: 16,
    marginHorizontal: 0,           // 다른 섹션 카드와 동일한 너비
    marginTop: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  subSection: {
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  subSectionSubtitle: {
    fontSize: 11,
    color: COLORS.SECONDARY,
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
  },
  // 카페 카드 스타일
  cafeCard: {
    width: 100,
    backgroundColor: COLORS.CARD_INNER,  // 내부 카드는 약간 밝은 색상
    borderRadius: 10,
    overflow: 'hidden',
  },
  cafeImage: {
    width: '100%',
    height: 70,
  },
  cafeImagePlaceholder: {
    width: '100%',
    height: 70,
    backgroundColor: COLORS.CARD,  // 플레이스홀더는 더 어두운 색상
    justifyContent: 'center',
    alignItems: 'center',
  },
  cafeInfo: {
    padding: 8,
    alignItems: 'center',
  },
  cafeName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
    textAlign: 'center',
  },
  visitBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  visitCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  // 장소 카드 스타일 (아이콘 없음)
  locationCard: {
    width: 100,
    height: 80,
    backgroundColor: COLORS.CARD_INNER,  // 내부 카드는 약간 밝은 색상
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 2,
  },
  locationDetail: {
    fontSize: 10,
    color: COLORS.GRAY,
    textAlign: 'center',
    marginBottom: 6,
  },
  countBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  // 빈 상태 스타일
  emptyStateCard: {
    flex: 1,
    backgroundColor: COLORS.CARD_INNER,  // 내부 카드는 약간 밝은 색상
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY,
    borderStyle: 'dashed',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  emptyStateText: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 10,
    color: COLORS.SECONDARY,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default MyDashboard;
