import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Pressable, Animated, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import WeatherCard from '../WeatherCard';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * 날씨 상세 바텀시트 — 홈 상단바의 날씨 칩을 누르면 올라온다.
 * 내용은 WeatherCard(예보·대기질·경보)를 그대로 쓴다.
 */
const WeatherDetailSheet = ({ visible, onClose, weatherState }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // 0: 닫힘(화면 아래) → 1: 열림
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  const close = () => {
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onClose());
  };

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.6, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="날씨 상세 닫기" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <WeatherCard {...weatherState} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginTop: 8,
    borderRadius: 2,
    backgroundColor: colors.BORDER,
  },
});

export default WeatherDetailSheet;
