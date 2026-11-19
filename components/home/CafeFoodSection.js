import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionHeader, FilterChips, SkeletonBox, EmptyCard } from './HomeSection';

const TAB_NEW = 'new';
const TAB_FREQUENT = 'frequent';
const CHIPS = [
  { key: TAB_NEW, label: '신규 입점' },
  { key: TAB_FREQUENT, label: '자주 가는 곳' },
];

const SIDE_MARGIN = 16;
const CARD_GAP = 10;
const TINT_ALPHA = '29';

// '11월 10일 입점'
const formatOpenedDate = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}월 ${date.getDate()}일 입점`;
};

/**
 * 러닝카페·푸드 (신규 입점 / 자주 가는 곳)
 * 데이터는 hooks/useHomeCafes 결과를 받는다. 목록이 비어도 섹션은 그대로 두고 안내를 보여준다.
 */
const CafeFoodSection = ({ navigation, newPlaces, frequentPlaces, loading }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const [selectedTab, setSelectedTab] = useState(null);

  // 한 화면에 카드 2장이 보이는 너비, 사진은 4:3
  const cardWidth = Math.floor((screenWidth - SIDE_MARGIN * 2 - CARD_GAP) / 2);
  const imageHeight = Math.round(cardWidth * 0.75);

  // 고르기 전 기본 탭: 신규 입점이 있으면 신규, 없으면 자주 가는 곳
  const tab = selectedTab || (newPlaces.length > 0 || loading ? TAB_NEW : TAB_FREQUENT);
  const places = tab === TAB_NEW ? newPlaces : frequentPlaces;

  const openPlace = (place) => {
    navigation.navigate('MapTab', place.type === 'cafe'
      ? { targetCafeId: place.id, activeToggle: 'cafes' }
      : { targetFoodId: place.id, activeToggle: 'foods' });
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.cards}>
          <SkeletonBox style={{ width: cardWidth, height: imageHeight }} />
          <SkeletonBox style={{ width: cardWidth, height: imageHeight }} />
        </View>
      );
    }

    if (places.length === 0) {
      return (
        <EmptyCard
          message={
            tab === TAB_NEW
              ? '최근 한 달 동안 새로 입점한 곳이 없어요.\n지도에서 러닝카페를 둘러보세요'
              : '아직 자주 가는 곳이 없어요.\n러닝카페를 두 번 이상 방문해보세요'
          }
          actionLabel="둘러보기"
          onActionPress={() => navigation.navigate('MapTab', { activeToggle: 'cafes' })}
        />
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {places.map((place) => {
          const accent = place.type === 'cafe' ? colors.SHORTCUT_AMBER : colors.SHORTCUT_GREEN;
          const subText = tab === TAB_NEW ? formatOpenedDate(place.createdAt) : `${place.visitCount}번 방문`;
          return (
            <TouchableOpacity
              key={`${place.type}-${place.id}`}
              style={{ width: cardWidth }}
              onPress={() => openPlace(place)}
              activeOpacity={0.8}
            >
              <View style={[styles.imageBox, { height: imageHeight, backgroundColor: `${accent}${TINT_ALPHA}` }]}>
                {place.image ? (
                  <Image source={{ uri: place.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons
                    name={place.type === 'cafe' ? 'coffee' : 'food-apple'}
                    size={32}
                    color={accent}
                  />
                )}
                {tab === TAB_NEW && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText} allowFontScaling={false}>NEW</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
              {!!subText && <Text style={styles.sub} numberOfLines={1}>{subText}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="러닝카페·푸드"
        onMorePress={() => navigation.navigate('MapTab', { activeToggle: 'cafes' })}
      />
      <FilterChips chips={CHIPS} selectedKey={tab} onSelect={setSelectedTab} />
      {renderBody()}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginTop: 26,
  },
  cards: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingHorizontal: SIDE_MARGIN,
  },
  imageBox: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: colors.PRIMARY,
  },
  newBadgeText: {
    fontSize: 11,
    fontFamily: 'Pretendard-Bold',
    color: colors.ON_PRIMARY,
  },
  name: {
    marginTop: 7,
    fontSize: 15,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
  },
  sub: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY,
  },
});

export default CafeFoodSection;
