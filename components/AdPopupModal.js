// 홈 진입 시 뜨는 파트너 광고 팝업 (이미지 전용)
//
// - 광고는 이미지 한 장으로만 구성 (앱이 넣는 제목/문구 없음)
// - 활성 배너가 2개 이상이면 rotationIntervalMs 주기로 자동 전환, 1개면 전환 없음
// - 전환은 무한 루프. 항상 오른쪽 → 왼쪽 한 방향으로만 흐르고, 마지막에서 첫 배너로
//   되감기지 않는다 (앞뒤에 복제 슬라이드를 두고 경계에서 애니메이션 없이 순간이동)
// - 손으로 좌우 스와이프해도 넘길 수 있고, 스와이프하면 자동 전환 타이머가 리셋됨
// - 이미지 탭 → 해당 배너의 파트너 링크를 외부 브라우저로 열기
// - 우상단 X: 닫기 (다음 앱 실행 때 다시 노출)
// - 하단 '오늘 하루 보지 않기' 체크박스: 체크 후 닫으면 그날 하루 숨김

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Linking,
  Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = Math.min(300, SCREEN_W - 56);
const MIN_IMG_H = CARD_W * 0.6; // 가로형 이미지 하한
const MAX_IMG_H = SCREEN_H * 0.62; // 세로형 이미지 상한
const DEFAULT_IMG_H = CARD_W * 1.25; // 크기를 아직 모를 때 기본값 (4:5 세로형)
// 복제 슬라이드까지 슬라이드한 뒤 진짜 슬라이드로 순간이동하기까지의 대기 시간.
// RN의 animated scrollTo 재생 시간(약 300ms)보다 넉넉히 길어야 이동이 눈에 띄지 않는다.
const SNAP_DELAY = 400;

const AdPopupModal = ({ visible, banners, rotationIntervalMs, onClose }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const list = Array.isArray(banners) ? banners : [];
  const count = list.length;

  const scrollRef = useRef(null);
  const snapTimerRef = useRef(null);
  const didInitScrollRef = useRef(false);
  const [index, setIndex] = useState(0); // 논리 인덱스(복제 슬라이드 제외, 도트 표시 기준)
  const [dontShowToday, setDontShowToday] = useState(false);

  // 무한 루프용 슬라이드 배열: [마지막 복제, ...실제 배너, 첫 배너 복제]
  // 배너가 1개면 전환 자체가 없으므로 복제하지 않는다.
  const loop = count > 1;
  const OFFSET = loop ? 1 : 0; // 물리 인덱스 = 논리 인덱스 + OFFSET
  const slides = loop ? [list[count - 1], ...list, list[0]] : list;
  // 배너별 실제 이미지 높이. 전환할 때 카드 높이가 출렁이지 않도록
  // 최종 높이는 이 값들 중 가장 큰 것을 쓴다.
  const [heights, setHeights] = useState({});

  const scrollToPos = useCallback((pos, animated) => {
    scrollRef.current?.scrollTo({ x: pos * CARD_W, animated });
  }, []);

  // 팝업이 다시 열릴 때마다 체크 상태와 페이지 위치 초기화.
  // 루프 모드에서는 맨 앞 복제 슬라이드 다음(= 실제 첫 배너)이 시작 위치다.
  useEffect(() => {
    if (!visible) return;
    setDontShowToday(false);
    setIndex(0);
    didInitScrollRef.current = false;
    scrollToPos(OFFSET, false);
  }, [visible, OFFSET, scrollToPos]);

  // 언마운트 시 순간이동 타이머 정리
  useEffect(() => () => clearTimeout(snapTimerRef.current), []);

  // 각 이미지의 실제 비율을 읽어 높이 산출 (잘림 방지)
  useEffect(() => {
    let alive = true;
    list.forEach((banner) => {
      if (!banner?.imageUrl) return;
      Image.getSize(
        banner.imageUrl,
        (w, h) => {
          if (!alive || !w || !h) return;
          const next = Math.max(MIN_IMG_H, Math.min(CARD_W * (h / w), MAX_IMG_H));
          setHeights((prev) =>
            prev[banner.id] === next ? prev : { ...prev, [banner.id]: next }
          );
        },
        () => {
          // 크기 조회 실패 시 기본 비율 유지
        }
      );
    });
    return () => {
      alive = false;
    };
    // 배너 목록이 바뀔 때만 다시 측정
  }, [list.map((b) => b?.imageUrl).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const measured = list.map((b) => heights[b.id]).filter(Boolean);
  const imageHeight = measured.length > 0 ? Math.max(...measured) : DEFAULT_IMG_H;

  // 자동 전환. 배너가 1개면 타이머를 걸지 않는다.
  // index가 바뀔 때마다 effect가 다시 돌아 타이머가 리셋되므로,
  // 사용자가 손으로 스와이프하면 자연스럽게 주기가 처음부터 다시 시작된다.
  //
  // 마지막 배너 다음에는 맨 뒤 복제 슬라이드(= 첫 배너와 같은 이미지)로 한 칸 더 밀고,
  // 애니메이션이 끝난 뒤 애니메이션 없이 실제 첫 배너로 되돌린다.
  // → 사용자 눈에는 항상 같은 방향으로 흐르는 무한 루프로 보인다.
  useEffect(() => {
    if (!visible || !loop) return undefined;
    const interval = rotationIntervalMs > 0 ? rotationIntervalMs : 2000;
    const timer = setTimeout(() => {
      const nextLogical = index + 1;
      scrollToPos(nextLogical + OFFSET, true); // 항상 오른쪽으로 한 칸
      if (nextLogical < count) {
        setIndex(nextLogical);
      } else {
        // 복제 슬라이드에 도착 → 순간이동. setIndex(0)이 이 effect를 다시 돌려 타이머도 재무장한다.
        snapTimerRef.current = setTimeout(() => {
          scrollToPos(OFFSET, false);
          setIndex(0);
        }, SNAP_DELAY);
      }
    }, interval);
    return () => {
      clearTimeout(timer);
      clearTimeout(snapTimerRef.current);
    };
  }, [visible, loop, count, OFFSET, rotationIntervalMs, index, scrollToPos]);

  if (count === 0) return null;

  const handleClose = () => {
    onClose?.(dontShowToday);
  };

  const handlePressImage = async (banner) => {
    const url = banner?.linkUrl;
    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      } catch (error) {
        console.warn('광고 링크 열기 실패:', error);
      }
    }
    onClose?.(dontShowToday);
  };

  // 스와이프(또는 자동 전환 애니메이션)가 끝난 시점 → 현재 인덱스 반영 (타이머도 함께 리셋됨).
  // 복제 슬라이드에 멈췄으면 같은 그림의 실제 슬라이드로 애니메이션 없이 옮겨 붙인다.
  const handleMomentumEnd = (event) => {
    const pos = Math.round(event.nativeEvent.contentOffset.x / CARD_W);

    if (!loop) {
      if (pos !== index && pos >= 0 && pos < count) setIndex(pos);
      return;
    }

    if (pos <= 0) {
      // 맨 앞 복제(= 마지막 배너)에서 왼쪽으로 스와이프 → 실제 마지막 배너로
      scrollToPos(count, false);
      setIndex(count - 1);
      return;
    }
    if (pos >= count + 1) {
      // 맨 뒤 복제(= 첫 배너) → 실제 첫 배너로
      scrollToPos(OFFSET, false);
      setIndex(0);
      return;
    }

    const logical = pos - OFFSET;
    if (logical !== index) setIndex(logical);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* 닫기 X */}
          <TouchableOpacity
            style={styles.xBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="닫기"
          >
            <Text style={styles.xText}>✕</Text>
          </TouchableOpacity>

          {/* 광고 이미지 캐러셀 (탭 → 링크) */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={count > 1}
            onMomentumScrollEnd={handleMomentumEnd}
            onContentSizeChange={() => {
              // 레이아웃이 잡힌 첫 순간에 시작 위치(실제 첫 배너)로 맞춘다.
              // 이미지 높이가 뒤늦게 측정돼 다시 호출돼도 위치를 흔들지 않도록 1회만 수행.
              if (didInitScrollRef.current) return;
              didInitScrollRef.current = true;
              scrollToPos(OFFSET, false);
            }}
            style={{ width: CARD_W, height: imageHeight }}
          >
            {slides.map((banner, i) => (
              <TouchableOpacity
                key={`${banner.id}-${i}`}
                activeOpacity={banner.linkUrl ? 0.9 : 1}
                onPress={() => handlePressImage(banner)}
                disabled={!banner.linkUrl}
                accessibilityRole="imagebutton"
                accessibilityLabel="파트너 광고"
              >
                <Image
                  source={{ uri: banner.imageUrl }}
                  style={[styles.image, { height: imageHeight }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 페이지 표시 (2개 이상일 때만) */}
          {count > 1 && (
            <View style={styles.dots} pointerEvents="none">
              {list.map((banner, i) => (
                <View
                  key={banner.id}
                  style={[styles.dot, i === index && styles.dotOn]}
                />
              ))}
            </View>
          )}

          {/* 하단 바: 체크박스 + 닫기 */}
          <View style={styles.footer}>
            <Pressable
              style={styles.checkRow}
              onPress={() => setDontShowToday((v) => !v)}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: dontShowToday }}
            >
              <View style={[styles.checkbox, dontShowToday && styles.checkboxOn]}>
                {dontShowToday && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text
                style={[styles.checkLabel, dontShowToday && styles.checkLabelOn]}
              >
                오늘 하루 보지 않기
              </Text>
            </Pressable>

            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Text style={styles.closeText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.74)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },
    card: {
      width: CARD_W,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.SURFACE,
    },
    xBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 3,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    xText: {
      color: '#ffffff',
      fontSize: 15,
      lineHeight: 17,
      fontWeight: '600',
    },
    image: {
      width: CARD_W,
      backgroundColor: colors.CARD,
    },
    dots: {
      position: 'absolute',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      // 하단 바(약 44px) 바로 위에 겹쳐서 표시
      bottom: 56,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.38)',
      zIndex: 2,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginHorizontal: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.45)',
    },
    dotOn: {
      backgroundColor: '#ffffff',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.SURFACE,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.BORDER,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 19,
      height: 19,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.TEXT_SECONDARY,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    checkboxOn: {
      backgroundColor: colors.PRIMARY,
      borderColor: colors.PRIMARY,
    },
    checkMark: {
      color: '#0B0D10',
      fontSize: 12,
      fontWeight: '900',
      lineHeight: 14,
    },
    checkLabel: {
      color: colors.TEXT_SECONDARY,
      fontSize: 13,
    },
    checkLabelOn: {
      color: colors.TEXT,
    },
    closeText: {
      color: colors.TEXT,
      fontSize: 13.5,
      fontWeight: '600',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
  });

export default AdPopupModal;
