import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import {
  PILL_TAB_BAR_HEIGHT,
  PILL_TAB_BAR_SIDE_MARGIN,
  getPillTabBarBottom,
} from '../constants/layout';

// 탭바 안쪽 여백 (선택 캡슐과 탭바 테두리 사이)
const BAR_PADDING = 5;

// 탭별 아이콘: [선택됨(채움), 선택 안 됨(선)]
const TAB_ICONS = {
  HomeTab: ['home', 'home-outline'],
  ScheduleTab: ['calendar-clear', 'calendar-clear-outline'],
  MapTab: ['map', 'map-outline'],
  CommunityTab: ['chatbubbles', 'chatbubbles-outline'],
  ProfileTab: ['person', 'person-outline'],
};

/**
 * 화면 위에 떠 있는 알약 모양 하단 탭바.
 *
 * 배경은 불투명도 20%라 뒤 콘텐츠가 비친다. 글자가 묻히지 않도록
 * 뒤를 흐리게(BlurView) 한 다음 그 위에 옅은 색을 얹는다.
 * Tab.Navigator의 tabBar prop으로 사용한다.
 */
const PillTabBar = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hasMeetingNotification } = useEvents();
  const { hasCommunityNotification } = useCommunity();

  // 선택 표시(유리 캡슐): 탭마다 따로 그리지 않고 하나를 두고 선택된 탭 자리로 미끄러뜨린다
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / state.routes.length : 0;
  const indicatorX = useRef(new Animated.Value(0)).current;
  // 0: 평소 모양, 1: 이동 중 가로로 늘어난 모양 (물방울처럼 늘어났다 돌아온다)
  const stretch = useRef(new Animated.Value(0)).current;
  const positionedRef = useRef(false);

  useEffect(() => {
    if (!tabWidth) return;
    const toValue = state.index * tabWidth;
    // 처음 자리를 잡을 때(와 화면 너비가 바뀔 때)는 움직임 없이 바로 놓는다
    if (!positionedRef.current) {
      indicatorX.setValue(toValue);
      positionedRef.current = true;
      return;
    }
    Animated.parallel([
      Animated.spring(indicatorX, { toValue, stiffness: 260, damping: 24, mass: 0.9, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.spring(stretch, { toValue: 0, stiffness: 220, damping: 14, useNativeDriver: true }),
      ]),
    ]).start();
  }, [state.index, tabWidth, indicatorX, stretch]);

  const handleBarLayout = (event) => {
    // 테두리 안쪽 너비 (절대 위치 자식은 테두리 안쪽 기준으로 놓인다)
    const inner = event.nativeEvent.layout.width - StyleSheet.hairlineWidth * 2;
    if (Math.abs(inner - barWidth) > 0.5) {
      positionedRef.current = false;
      setBarWidth(inner);
    }
  };

  const indicatorTransform = [
    { translateX: indicatorX },
    { scaleX: stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
    { scaleY: stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
  ];
  // 유리 윗면에 맺히는 빛: 위쪽이 밝고 가운데는 비었다가 아래쪽에 옅게 다시 받는다
  const glassSheen = isDark
    ? ['rgba(255, 255, 255, 0.26)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.10)']
    : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.45)'];

  const badgeByRoute = {
    ScheduleTab: hasMeetingNotification,
    CommunityTab: hasCommunityNotification,
  };

  return (
    <View
      style={[styles.container, { bottom: getPillTabBarBottom(insets) }]}
      onLayout={handleBarLayout}
    >
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />

      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: tabWidth, transform: indicatorTransform }]}
        >
          <BlurView intensity={24} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.indicatorFill]} />
          <LinearGradient
            colors={glassSheen}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const [activeIcon, inactiveIcon] = TAB_ICONS[route.name] || ['ellipse', 'ellipse-outline'];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          >
            <View>
              <Ionicons
                name={focused ? activeIcon : inactiveIcon}
                size={23}
                color={focused ? colors.TAB_BAR_ACTIVE_ICON : colors.TAB_BAR_INACTIVE}
              />
              {badgeByRoute[route.name] && <View style={styles.badge} />}
            </View>
            <Text
              style={[styles.label, focused && styles.labelActive]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: PILL_TAB_BAR_SIDE_MARGIN,
    right: PILL_TAB_BAR_SIDE_MARGIN,
    height: PILL_TAB_BAR_HEIGHT,
    flexDirection: 'row',
    padding: BAR_PADDING,
    borderRadius: PILL_TAB_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.TAB_BAR_BORDER,
    overflow: 'hidden',
    // 탭바 아래로 옅게 깔리는 그림자 — 밝은 배경에서 탭바 윤곽이 묻히지 않게 한다.
    // boxShadow는 상자 바깥에만 그려져서 반투명한 탭바 안쪽이 어두워지지 않는다.
    boxShadow: [
      { offsetX: 0, offsetY: 6, blurRadius: 18, spreadDistance: 0, color: colors.TAB_BAR_SHADOW },
      { offsetX: 0, offsetY: 1, blurRadius: 3, spreadDistance: 0, color: colors.TAB_BAR_SHADOW },
    ],
  },
  tint: {
    backgroundColor: colors.TAB_BAR_BG,
  },
  // 미끄러지는 유리 캡슐 (선택 표시)
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
    borderRadius: (PILL_TAB_BAR_HEIGHT - BAR_PADDING * 2) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.TAB_BAR_GLASS_BORDER,
    overflow: 'hidden',
  },
  indicatorFill: {
    backgroundColor: colors.TAB_BAR_ACTIVE_BG,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: (PILL_TAB_BAR_HEIGHT - 10) / 2,
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: 'Pretendard-Medium',
    color: colors.TAB_BAR_INACTIVE,
  },
  labelActive: {
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TAB_BAR_ACTIVE_LABEL,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0022',
  },
});

export default PillTabBar;
