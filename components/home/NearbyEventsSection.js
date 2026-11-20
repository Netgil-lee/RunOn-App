import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../contexts/EventContext';
import { getUpcomingEvents, formatEventWhen } from '../../utils/eventDateTime';
import {
  REGION_ALL, REGION_CHIPS, matchesRegion, getEventCoords, getDistanceMeters,
} from '../../utils/eventRegion';
import { SectionHeader, FilterChips, EmptyCard } from './HomeSection';

const MAX_CARDS = 10;
const TINT_ALPHA = '29'; // 아이콘 색을 옅게 깐 타일 바탕 (약 16%)

const toSerializable = (value) =>
  value && typeof value.toISOString === 'function' ? value.toISOString() : value;

// 모임 사진이 없는 모임(사진 기능 이전에 만든 모임)은 시작 시간대에 맞는 아이콘을 쓴다
const getTimeIcon = (start) => {
  const hour = start.getHours();
  if (hour >= 19 || hour < 5) return 'weather-night';
  if (hour < 10) return 'weather-sunset-up';
  return 'run';
};

// 주최자가 넣은 모임 사진이 있는지
const hasPhoto = (event) => typeof event.imageUrl === 'string' && event.imageUrl.startsWith('http');

// 정원이 찼는지 (정원이 없는 모임은 항상 모집 중)
const isFull = (event) =>
  !!event.maxParticipants && (event.participants?.length || 0) >= event.maxParticipants;

/**
 * 내 주변 모임
 * 아직 시작 전이고 자리가 남은 모임을 현재 위치에서 가까운 순으로 보여준다.
 * 위치를 모르면(coords 없음) 시작 시각이 빠른 순.
 * 보여줄 모임이 없어도 섹션은 그대로 두고 모임 만들기 안내를 보여준다.
 */
const NearbyEventsSection = ({ navigation, coords }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth() || {};
  const { allEvents, userJoinedEvents } = useEvents();
  const [region, setRegion] = useState(REGION_ALL);

  // 모집 중인 다가오는 모임 전체 (칩과 무관)
  const openEvents = useMemo(
    () => getUpcomingEvents(allEvents).filter(({ event }) => !isFull(event)),
    [allEvents]
  );

  const cards = useMemo(() => {
    const filtered = openEvents.filter(({ event }) => matchesRegion(event, region));
    if (!coords) return filtered.slice(0, MAX_CARDS);

    return filtered
      .map((item) => ({ ...item, distance: getDistanceMeters(coords, getEventCoords(item.event)) }))
      // 가까운 순, 좌표 없는 모임(거리 Infinity)은 뒤로. 거리가 같으면 빨리 시작하는 순
      .sort((a, b) => (a.distance === b.distance ? a.start - b.start : a.distance - b.distance))
      .slice(0, MAX_CARDS);
  }, [openEvents, region, coords]);

  const palette = [colors.SHORTCUT_BLUE, colors.SHORTCUT_PURPLE, colors.SHORTCUT_GREEN, colors.SHORTCUT_AMBER];

  const openDetail = (event) => {
    const isCreatedByMe = !!event.isCreatedByUser;
    navigation.navigate('EventDetail', {
      event: {
        ...event,
        createdAt: toSerializable(event.createdAt),
        updatedAt: toSerializable(event.updatedAt),
        date: toSerializable(event.date),
      },
      isJoined: (userJoinedEvents || []).some((joined) => joined.id === event.id)
        || (!isCreatedByMe && !!event.participants?.includes(user?.uid)),
      isCreatedByMe,
    });
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="내 주변 모임"
        // 모임 목록은 지도 탭의 모임 토글에 있다
        onMorePress={() => navigation.navigate('MapTab', { activeToggle: 'events' })}
      />
      <FilterChips chips={REGION_CHIPS} selectedKey={region} onSelect={setRegion} />

      {cards.length === 0 ? (
        <EmptyCard
          message={
            openEvents.length === 0
              ? '지금 모집 중인 모임이 없어요.\n첫 모임을 만들어보세요'
              : '이 지역에 모집 중인 모임이 없어요.\n직접 모임을 만들어보세요'
          }
          actionLabel="모임 만들기"
          onActionPress={() => navigation.navigate('ScheduleTab', { openCreateFlow: true })}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {cards.map(({ event, start }, cardIndex) => {
            const color = palette[cardIndex % palette.length];
            const joined = event.participants?.length || 0;
            const people = event.maxParticipants ? `${joined}/${event.maxParticipants}` : `${joined}명`;
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.card}
                onPress={() => openDetail(event)}
                activeOpacity={0.8}
              >
                <View style={[styles.thumb, { backgroundColor: `${color}${TINT_ALPHA}` }]}>
                  {hasPhoto(event) ? (
                    <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name={getTimeIcon(start)} size={30} color={color} />
                  )}
                </View>
                <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>{formatEventWhen(start)} · {people}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginTop: 26,
  },
  cards: {
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    width: 150,
  },
  thumb: {
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 7,
    fontSize: 15,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY,
  },
});

export default NearbyEventsSection;
