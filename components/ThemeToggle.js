import React, { useRef, useEffect, useMemo } from 'react';
import { Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// 슬라이딩 노브 다크/라이트 토글
// 다크 = 노브 왼쪽(달) / 라이트 = 노브 오른쪽(해)
const TRACK_W = 64;
const TRACK_H = 34;
const KNOB = 28;
const PAD = 3;
const TRAVEL = TRACK_W - KNOB - PAD * 2;

const ThemeToggle = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // isDark=true → 0(왼쪽), false → 1(오른쪽)
  const anim = useRef(new Animated.Value(isDark ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isDark ? 0 : 1,
      useNativeDriver: false,
      friction: 7,
      tension: 70,
    }).start();
  }, [isDark, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, PAD + TRAVEL],
  });

  // 트랙 배경: 다크(어두운 남색) → 라이트(하늘색)
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#3A3A40', '#7EC8FF'],
  });

  // 아이콘 회전(해/달 전환 느낌)
  const knobRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 달 아이콘은 다크일 때, 해 아이콘은 라이트일 때 선명
  const moonOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const sunOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable onPress={toggleTheme} hitSlop={8}>
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
