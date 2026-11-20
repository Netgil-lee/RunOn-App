import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Keyboard } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import {
  PILL_TAB_BAR_HEIGHT,
  PILL_TAB_BAR_SIDE_MARGIN,
  getPillTabBarBottom,
} from '../constants/layout';

// 탭별 아이콘: [선택됨(채움), 선택 안 됨(선)]
const TAB_ICONS = {
  HomeTab: ['home', 'home-outline'],
  ScheduleTab: ['calendar-clear', 'calendar-clear-outline'],
  MapTab: ['map', 'map-outline'],
  CommunityTab: ['chatbubbles', 'chatbubbles-outline'],
  ProfileTab: ['person', 'person-outline'],
};

const BAR_PADDING = 5;

// 유리 캡슐 이동 스프링 (iOS Liquid Glass 느낌: 빠르게 출발, 살짝 출렁이며 안착)
const SLIDE_SPRING = { damping: 18, stiffness: 220, mass: 0.9 };
// 이동 중 캡슐이 늘어났다가 탄성 있게 원래 모양으로 돌아오는 스프링
const STRETCH_SPRING = { damping: 9, stiffness: 180, mass: 0.7 };

/**
 * 화면 위에 떠 있는 알약 모양 하단 탭바.
 *
 * iOS: 배경 불투명도 20% + 뒤를 흐리게(BlurView) 한 다음 옅은 색을 얹는다.
 * Android: expo-blur가 실제 블러를 그리지 못해(반투명 색으로만 대체) 뒤 글자가 그대로 비치므로
 *          블러 없이 거의 불투명한 바탕(TAB_BAR_BG_SOLID)을 쓴다.
 * Tab.Navigator의 tabBar prop으로 사용한다.
 *
 * 선택 표시: 탭마다 배경을 바꾸지 않고, 유리 캡슐 하나가 선택된 탭으로 미끄러져 이동한다.
 * 이동 거리에 비례해 가로로 늘어났다가(세로는 살짝 눌림) 스프링으로 복원된다.
 *
 * Android 전용 동작:
 * - 화면이 tabBarStyle: { display: 'none' } 을 주면 숨긴다 (모임 만들기 흐름)
 * - 키보드가 올라오면 숨긴다 (adjustResize 때문에 탭바가 키보드 위로 따라 올라와 입력창을 가림)
 */
const USE_BLUR = Platform.OS === 'ios';

const TabItem = ({ focused, icon, label, color, labelStyle, badge, badgeStyle, onPress, onLongPress, a11yLabel, style }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 110 }),
        withSpring(1, { damping: 8, stiffness: 220 }),
      );
    }
  }, [focused, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => { scale.value = withTiming(0.88, { duration: 90 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 260 }); }}
      style={style}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={a11yLabel}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={icon} size={23} color={color} />
        {badge && <View style={badgeStyle} />}
      </Animated.View>
      <Text style={labelStyle} numberOfLines={1} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );
};

const PillTabBar = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hasMeetingNotification } = useEvents();
  const { hasCommunityNotification } = useCommunity();

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── 유리 캡슐 애니메이션 ──
  const [tabWidth, setTabWidth] = useState(0);
  const translateX = useSharedValue(0);
  const stretchX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const prevIndex = React.useRef(state.index);
  const placed = React.useRef(false);

  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth;

    // 첫 배치(또는 숨겼다 다시 나타남)는 애니메이션 없이 제자리에
    if (!placed.current) {
      translateX.value = target;
      placed.current = true;
      prevIndex.current = state.index;
      return;
    }

    const distance = Math.abs(state.index - prevIndex.current);
    prevIndex.current = state.index;
    if (distance === 0) return;

    translateX.value = withSpring(target, SLIDE_SPRING);
    // 멀리 갈수록 더 늘어남 (최대 1.45배)
    const stretch = Math.min(1 + 0.16 * distance, 1.45);
    stretchX.value = withSequence(
      withTiming(stretch, { duration: 140 }),
      withSpring(1, STRETCH_SPRING),
    );
    squashY.value = withSequence(
      withTiming(0.86, { duration: 140 }),
      withSpring(1, STRETCH_SPRING),
    );
  }, [state.index, tabWidth, translateX, stretchX, squashY]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleX: stretchX.value },
      { scaleY: squashY.value },
    ],
  }));

  const focusedOptions = descriptors[state.routes[state.index].key]?.options || {};
  const hiddenByScreen = StyleSheet.flatten(focusedOptions.tabBarStyle)?.display === 'none';
  const hidden = hiddenByScreen || keyboardVisible;

  // 숨겨지면 다음에 나타날 때 캡슐을 애니메이션 없이 다시 배치
  useEffect(() => {
    if (hidden) {
      placed.current = false;
      setTabWidth(0);
    }
  }, [hidden]);

  if (hidden) return null;

  const badgeByRoute = {
    ScheduleTab: hasMeetingNotification,
    CommunityTab: hasCommunityNotification,
  };

  const onBarLayout = (e) => {
    const w = (e.nativeEvent.layout.width - BAR_PADDING * 2) / state.routes.length;
    if (w > 0 && Math.abs(w - tabWidth) > 0.5) {
      placed.current = false; // 폭이 바뀌면(회전 등) 즉시 재배치
      setTabWidth(w);
    }
  };

  return (
    <View
      style={[styles.container, { bottom: getPillTabBarBottom(insets) }]}
      onLayout={onBarLayout}
    >
      {USE_BLUR && (
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, USE_BLUR ? styles.tint : styles.tintSolid]} />

      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: tabWidth }, indicatorStyle]}
        >
          {/* 유리 하이라이트: 위쪽이 밝고 아래로 사라지는 광택 */}
          <LinearGradient
            colors={
              isDark
                ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']
                : ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']
            }
            locations={[0, 0.45, 1]}
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
          <TabItem
            key={route.key}
            focused={focused}
            icon={focused ? activeIcon : inactiveIcon}
            color={focused ? colors.TAB_BAR_ACTIVE_ICON : colors.TAB_BAR_INACTIVE}
            label={label}
            labelStyle={[styles.label, focused && styles.labelActive]}
            badge={!!badgeByRoute[route.name]}
            badgeStyle={styles.badge}
            onPress={onPress}
            onLongPress={onLongPress}
            a11yLabel={options.tabBarAccessibilityLabel ?? label}
            style={styles.tab}
          />
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
  tintSolid: {
    backgroundColor: colors.TAB_BAR_BG_SOLID,
  },
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
    borderRadius: (PILL_TAB_BAR_HEIGHT - BAR_PADDING * 2) / 2,
    backgroundColor: colors.TAB_BAR_ACTIVE_BG,
    borderWidth: 1,
    borderColor: colors.TAB_BAR_BORDER,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
