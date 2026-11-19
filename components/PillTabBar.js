import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
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

  const badgeByRoute = {
    ScheduleTab: hasMeetingNotification,
    CommunityTab: hasCommunityNotification,
  };

  return (
    <View
      style={[styles.container, { bottom: getPillTabBarBottom(insets) }]}
    >
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />

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
            style={[styles.tab, focused && styles.tabActive]}
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
    padding: 5,
    borderRadius: PILL_TAB_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.TAB_BAR_BORDER,
    overflow: 'hidden',
  },
  tint: {
    backgroundColor: colors.TAB_BAR_BG,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: (PILL_TAB_BAR_HEIGHT - 10) / 2,
  },
  tabActive: {
    backgroundColor: colors.TAB_BAR_ACTIVE_BG,
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
