// 홈 진입 시 뜨는 파트너 광고 팝업 (이미지 전용)
//
// - 광고는 이미지 한 장으로만 구성 (앱이 넣는 제목/문구 없음)
// - 이미지 탭 → 파트너 링크를 외부 브라우저로 열기
// - 우상단 X: 닫기 (다음 앱 실행 때 다시 노출)
// - 하단 '오늘 하루 보지 않기' 체크박스: 체크 후 닫으면 그날 하루 숨김

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  Text,
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

const AdPopupModal = ({ visible, banner, onClose }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [dontShowToday, setDontShowToday] = useState(false);
  // 업로드된 사진의 실제 비율에 맞춰 높이 계산 (기본값: 4:5 세로형)
  const [imageHeight, setImageHeight] = useState(CARD_W * 1.25);

  // 팝업이 다시 열릴 때마다 체크 상태 초기화
  useEffect(() => {
    if (visible) setDontShowToday(false);
  }, [visible]);

  // 이미지 실제 크기를 읽어 비율에 맞는 높이 산출 (잘림 방지)
  useEffect(() => {
    if (!banner?.imageUrl) return;
    let active = true;
    Image.getSize(
      banner.imageUrl,
      (w, h) => {
        if (!active || !w || !h) return;
        const ratio = h / w;
        const next = Math.max(MIN_IMG_H, Math.min(CARD_W * ratio, MAX_IMG_H));
        setImageHeight(next);
      },
      () => {
        // 크기 조회 실패 시 기본 비율 유지
      }
    );
    return () => {
      active = false;
    };
  }, [banner?.imageUrl]);

  if (!banner) return null;

  const handleClose = () => {
    onClose?.(dontShowToday);
  };

  const handlePressImage = async () => {
    const url = banner.linkUrl;
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

          {/* 광고 이미지 (탭 → 링크) */}
          <TouchableOpacity
            activeOpacity={banner.linkUrl ? 0.9 : 1}
            onPress={handlePressImage}
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
      width: '100%',
      backgroundColor: colors.CARD,
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
