import React, { useRef, useEffect, useMemo } from 'react';
import { Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DARK_THEME, LIGHT_THEME } from '../constants/colors';

// 슬라이딩 노브 다크/라이트 토글
// 다크 = 노브 왼쪽(달) / 라이트 = 노브 오른쪽(해)
// iOS 네이티브 Switch 규격에 맞춤 (트랙 51×31, 노브 지름 27)
const TRACK_W = 51;
const TRACK_H = 31;
const KNOB = 27;
const PAD = 2;
const TRAVEL = TRACK_W - KNOB - PAD * 2;

const ThemeToggle = ({ onToggle }) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const handlePress = onToggle || toggleTheme;

  // isDark=true → 0(왼쪽), false → 1(오른쪽)
  // 노브 이동/회전/투명도는 네이티브 드라이버(UI 스레드) → 테마 리렌더 중에도 버벅임 없음
  const animNative = useRef(new Animated.Value(isDark ? 0 : 1)).current;
  // 배경색만 JS 드라이버(색 보간은 네이티브 미지원)
  const animColor = useRef(new Animated.Value(isDark ? 0 : 1)).current;

  useEffect(() => {
    const to = isDark ? 0 : 1;
    Animated.spring(animNative, {
      toValue: to, useNativeDriver: true, friction: 7, tension: 70,
    }).start();
    Animated.spring(animColor, {
      toValue: to, useNativeDriver: false, friction: 7, tension: 70,
    }).start();
  }, [isDark, animNative, animColor]);

  const translateX = animNative.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, PAD + TRAVEL],
  });
  const knobRotate = animNative.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const moonOpacity = animNative.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const sunOpacity = animNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // 트랙 배경: 각 모드의 PRIMARY (다크 #3AF8FF → 라이트 #30DEE4)
  const trackColor = animColor.interpolate({
    inputRange: [0, 1],
    outputRange: [DARK_THEME.PRIMARY, LIGHT_THEME.PRIMARY],
  });

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        {/* 트랙 양끝 보조 아이콘 */}
        <Animated.View style={[styles.sideIcon, styles.sideLeft, { opacity: moonOpacity }]}>
          <Ionicons name="moon" size={14} color="#FFFFFF" />
        </Animated.View>
        <Animated.View style={[styles.sideIcon, styles.sideRight, { opacity: sunOpacity }]}>
          <Ionicons name="sunny" size={15} color="#FFD93B" />
        </Animated.View>

        {/* 슬라이딩 노브 */}
        <Animated.View style={[styles.knob, { transform: [{ translateX }, { rotate: knobRotate }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.knobIcon, { opacity: moonOpacity }]}>
            <Ionicons name="moon" size={16} color="#3A3A40" />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.knobIcon, { opacity: sunOpacity }]}>
            <Ionicons name="sunny" size={17} color="#F5A623" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const createStyles = (colors) => StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  sideIcon: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: KNOB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLeft: { left: PAD },
  sideRight: { right: PAD },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  knobIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeToggle;
