import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ShortcutIcon from './ShortcutIcon';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * 홈 바로가기 5개 (한 줄)
 * 바탕 없이 입체풍 컬러 아이콘(ShortcutIcon)을 쓴다.
 */
const HomeShortcuts = ({ navigation, showCafeBadge = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const items = [
    {
      key: 'run',
      label: '러닝 시작',
      icon: 'run',
      onPress: () => navigation.navigate('RunningTracker'),
    },
    {
      key: 'find',
      label: '모임 찾기',
      icon: 'find',
      // 모임 목록은 지도 탭의 모임 토글에 있다 (모임 탭 첫 화면은 메뉴)
      onPress: () => navigation.navigate('MapTab', { activeToggle: 'events' }),
    },
    {
      key: 'create',
      label: '모임 만들기',
      icon: 'create',
      onPress: () => navigation.navigate('ScheduleTab', { openCreateFlow: true }),
    },
    {
      key: 'cafe',
      label: '러닝카페',
      icon: 'cafe',
      badge: showCafeBadge,
      onPress: () => navigation.navigate('MapTab', { activeToggle: 'cafes' }),
    },
    {
      key: 'stats',
      label: '내 기록',
      icon: 'stats',
      onPress: () => navigation.navigate('RunningStats'),
    },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.item}
          onPress={item.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <View style={styles.iconBox}>
            <ShortcutIcon name={item.icon} size={56} />
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} allowFontScaling={false}>N</Text>
              </View>
            )}
          </View>
          <Text style={styles.label} numberOfLines={1} allowFontScaling={false}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Pretendard-Medium',
    color: colors.TEXT_SECONDARY_STRONG,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.PINK,
    borderWidth: 1.5,
    borderColor: colors.BACKGROUND,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Pretendard-Bold',
    color: '#FFFFFF',
  },
});

export default HomeShortcuts;
