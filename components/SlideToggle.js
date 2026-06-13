import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// 다크/라이트 모드 토글(ThemeToggle)과 동일한 슬라이딩 스위치 — 단, 아이콘 없음.
// 켜짐: 트랙=PRIMARY / 꺼짐: 트랙=회색(BORDER), 흰 노브가 좌우로 슬라이드.
const TRACK_W = 51;
const TRACK_H = 31;
const KNOB = 27;
const PAD = 2;
const TRAVEL = TRACK_W - KNOB - PAD * 2;

const SlideToggle = ({ value, onValueChange, disabled = false }) => {
  const { colors } = useTheme();

  // 노브 이동은 네이티브 드라이버, 트랙 색은 JS 드라이버(색 보간)
  const animNative = useRef(new Animated.Value(value ? 1 : 0)).current;
  const animColor = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    const to = value ? 1 : 0;
    Animated.spring(animNative, {
      toValue: to, useNativeDriver: true, friction: 7, tension: 70,
    }).start();
    Animated.spring(animColor, {
      toValue: to, useNativeDriver: false, friction: 7, tension: 70,
    }).start();
  }, [value, animNative, animColor]);

  const translateX = animNative.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, PAD + TRAVEL],
  });
  const trackColor = animColor.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.BORDER, colors.PRIMARY],
  });

  return (
    <Pressable onPress={() => !disabled && onValueChange?.(!value)} hitSlop={8}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor, opacity: disabled ? 0.5 : 1 }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default SlideToggle;
