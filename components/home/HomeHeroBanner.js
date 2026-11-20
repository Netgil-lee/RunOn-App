import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { openAdBannerLink } from '../../services/adBannerService';

const SIDE_MARGIN = 16;
// 배너 이미지 비율 1:1 정사각형 (예: 1200×1200). 대시보드 안내 문구와 맞출 것
const ASPECT_RATIO = 1;
// 복제 슬라이드까지 넘긴 뒤 실제 슬라이드로 순간이동하기까지의 대기 시간.
// 넘김 애니메이션(약 300ms)보다 길어야 이동이 눈에 띄지 않는다. (AdPopupModal과 같은 값)
const SNAP_DELAY = 400;

/**
 * 홈 상단 배너
 *
 * 대시보드에서 '홈 배너'로 등록한 이미지를 가로로 넘겨 본다. 문구는 이미지에 포함된 것을 그대로 쓴다.
 * - 2개 이상이면 rotationIntervalMs 주기로 자동 넘김, 손으로 넘기면 타이머가 다시 시작된다
 * - 항상 오른쪽에서 왼쪽으로 흐르는 무한 루프. 마지막 배너 다음에 첫 배너로 되감기지 않는다
 *   (광고 팝업과 같은 방식: 앞뒤에 복제 슬라이드를 두고 경계에서 애니메이션 없이 순간이동)
 * - 우하단에 '2 / 5' 카운터
 * - 누르면 배너의 링크를 연다
 * - 배너가 없으면 아무것도 그리지 않는다
 */
const HomeHeroBanner = ({ banners, rotationIntervalMs }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef(null);
  const snapTimerRef = useRef(null);
  const [index, setIndex] = useState(0); // 실제 배너 기준 인덱스 (카운터 표시용)

  const list = Array.isArray(banners) ? banners : [];
  const count = list.length;
  const bannerWidth = screenWidth - SIDE_MARGIN * 2;
  const bannerHeight = Math.round(bannerWidth / ASPECT_RATIO);

  // 무한 루프용 슬라이드: [마지막 복제, ...실제 배너, 첫 배너 복제]. 1개면 넘김이 없으니 복제하지 않는다.
  const loop = count > 1;
  const OFFSET = loop ? 1 : 0; // 화면상 위치 = 실제 인덱스 + OFFSET
  const slides = loop ? [list[count - 1], ...list, list[0]] : list;

  const scrollToPos = useCallback((position, animated) => {
    scrollRef.current?.scrollTo({ x: position * bannerWidth, animated });
  }, [bannerWidth]);

  // 배너 목록이 바뀌면 실제 첫 배너에서 다시 시작
  const bannerKey = list.map((banner) => banner.id).join('|');
  useEffect(() => {
    clearTimeout(snapTimerRef.current);
    setIndex(0);
    scrollToPos(OFFSET, false);
  }, [bannerKey, OFFSET, scrollToPos]);

  useEffect(() => () => clearTimeout(snapTimerRef.current), []);

  // 자동 넘김: 항상 오른쪽 한 칸. index가 바뀔 때마다(손으로 넘긴 경우 포함) 타이머를 새로 건다.
  // 마지막 배너 다음에는 맨 뒤 복제(= 첫 배너)로 넘긴 뒤 애니메이션 없이 실제 첫 배너로 옮긴다.
  useEffect(() => {
    if (!loop || !rotationIntervalMs) return undefined;

    const timer = setTimeout(() => {
      const next = index + 1;
      scrollToPos(next + OFFSET, true);
      if (next < count) {
        setIndex(next);
      } else {
        snapTimerRef.current = setTimeout(() => {
          scrollToPos(OFFSET, false);
          setIndex(0);
        }, SNAP_DELAY);
      }
    }, rotationIntervalMs);

    return () => clearTimeout(timer);
  }, [index, count, loop, OFFSET, rotationIntervalMs, scrollToPos]);

  if (count === 0) return null;

  // 넘김이 멈춘 위치 반영. 복제 슬라이드에 멈췄으면 같은 그림의 실제 슬라이드로 옮겨 붙인다.
  const handleMomentumEnd = (event) => {
    const position = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);

    if (!loop) {
      if (position !== index && position >= 0 && position < count) setIndex(position);
      return;
    }
    if (position <= 0) {
      // 맨 앞 복제(= 마지막 배너)로 손으로 되넘긴 경우
      scrollToPos(count, false);
      setIndex(count - 1);
      return;
    }
    if (position >= count + 1) {
      // 맨 뒤 복제(= 첫 배너)
      scrollToPos(OFFSET, false);
      setIndex(0);
      return;
    }
    const logical = position - OFFSET;
    if (logical !== index) setIndex(logical);
  };

  return (
    <View style={[styles.container, { width: bannerWidth, height: bannerHeight }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={loop}
        onMomentumScrollEnd={handleMomentumEnd}
        // 첫 레이아웃이 잡히면 실제 첫 배너 위치로 맞춘다 (복제 슬라이드가 먼저 보이지 않게)
        contentOffset={{ x: OFFSET * bannerWidth, y: 0 }}
      >
        {slides.map((banner, position) => (
          <Pressable
            key={`${banner.id}-${position}`}
            onPress={() => openAdBannerLink(banner)}
            accessibilityRole={banner.linkUrl ? 'link' : 'image'}
            accessibilityLabel={banner.title || '파트너 배너'}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={{ width: bannerWidth, height: bannerHeight }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {count > 1 && (
        <View style={styles.counter} pointerEvents="none">
          <Text style={styles.counterText} allowFontScaling={false}>{index + 1} / {count}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.BANNER_PLACEHOLDER,
  },
  counter: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 17, 21, 0.72)',
  },
  counterText: {
    fontSize: 12,
    fontFamily: 'Pretendard-Medium',
    color: '#FFFFFF',
  },
});

export default HomeHeroBanner;
