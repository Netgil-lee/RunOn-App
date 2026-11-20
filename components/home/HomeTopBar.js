import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getDustChip, getRunConditionChip } from '../../utils/weatherCondition';

/**
 * 홈 상단바
 *
 * 왼쪽: 현재 지역(동 이름) — 누르면 위치를 다시 잡는다
 * 오른쪽: 검색, 알림(새 알림이 있으면 빨간 점)
 * 아래: 날씨 칩 3개(기온·날씨 / 미세먼지 / 러닝 컨디션) — 누르면 날씨 상세 시트
 */
const HomeTopBar = ({
  weatherState,
  hasUnread,
  onLocationPress,
  onSearchPress,
  onNotificationPress,
  onWeatherPress,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { weather, airQuality, locationName, loading, error } = weatherState;

  // 칩 색: good=초록, warn=주황, neutral=보조 글자색
  const toneColor = (tone) => {
    if (tone === 'good') return colors.SUCCESS;
    if (tone === 'warn') return colors.WARNING;
    return colors.TEXT_SECONDARY_STRONG;
  };

  const renderChips = () => {
    if (!weather) {
      const message = loading ? '날씨 불러오는 중' : error ? '날씨 정보를 불러올 수 없어요' : null;
      if (!message) return null;
      return (
        <View style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>{message}</Text>
        </View>
      );
    }

    const dustChip = getDustChip(airQuality);
    const runChip = getRunConditionChip(weather, airQuality);

    return (
      <>
        <View style={styles.chip}>
          <Ionicons name={weather.icon} size={13} color={colors.TEXT} />
          <Text style={[styles.chipText, { color: colors.TEXT }]} numberOfLines={1}>
            {weather.temperature}° {weather.description}
          </Text>
        </View>
        {dustChip && (
          <View style={[styles.chip, { borderColor: toneColor(dustChip.tone) }]}>
            <Text style={[styles.chipText, { color: toneColor(dustChip.tone) }]} numberOfLines={1}>
              {dustChip.label}
            </Text>
          </View>
        )}
        {runChip && (
          <View style={[styles.chip, runChip.tone === 'warn' && { borderColor: toneColor('warn') }]}>
            <Text style={[styles.chipText, { color: toneColor(runChip.tone) }]} numberOfLines={1}>
              {runChip.label}
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.location}
          onPress={onLocationPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`현재 지역 ${locationName}, 눌러서 위치 다시 잡기`}
        >
          <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.TEXT} />
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress} accessibilityLabel="검색">
            <Ionicons name="search-outline" size={23} color={colors.TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress} accessibilityLabel="알림">
            <Ionicons name="notifications-outline" size={23} color={colors.TEXT} />
            {hasUnread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* 칩 줄 어디를 눌러도 날씨 상세 시트가 열린다. 화면이 좁으면 넘치는 칩은 잘린다 */}
      <TouchableOpacity
        style={styles.chips}
        activeOpacity={0.7}
        onPress={onWeatherPress}
        accessibilityLabel="날씨 상세 보기"
      >
        {renderChips()}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.SURFACE,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 18,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0022',
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Pretendard-Medium',
    color: colors.TEXT_SECONDARY,
  },
});

export default HomeTopBar;
