import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

/**
 * 강제 업데이트 안내 모달.
 *
 * - 닫을 수 없다(배경 탭/뒤로가기 무시). 업데이트만이 유일한 진행 경로.
 * - "업데이트하기" 버튼은 스토어로 이동한다.
 *
 * @param {boolean} visible        표시 여부
 * @param {string}  storeUrl       이동할 스토어 URL
 */
export default function ForceUpdateModal({ visible, storeUrl }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleUpdate = async () => {
    if (!storeUrl) return;
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        // 폴백: 안드로이드 마켓 스킴 시도
        if (Platform.OS === 'android') {
          await Linking.openURL('market://details?id=com.runon.app');
        }
      }
    } catch (error) {
      console.warn('스토어 열기 실패:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // 안드로이드 하드웨어 뒤로가기로 닫히지 않도록 막는다.
      onRequestClose={() => {
        if (Platform.OS === 'android') {
          BackHandler.exitApp();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket-outline" size={32} color={colors.PRIMARY} />
          </View>

          <Text style={styles.title}>업데이트가 필요해요</Text>
          <Text style={styles.message}>
            더 안정적인 서비스를 위해 새로운 버전이 출시되었어요.{'\n'}
            계속 이용하시려면 최신 버전으로 업데이트해 주세요.
          </Text>

          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={handleUpdate}
          >
            <Text style={styles.updateButtonText}>업데이트하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    card: {
      width: '100%',
      backgroundColor: colors.SURFACE,
      borderRadius: 20,
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.BORDER,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.CARD,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.TEXT,
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.TEXT_SECONDARY,
      textAlign: 'center',
      marginBottom: 28,
    },
    updateButton: {
      width: '100%',
      backgroundColor: colors.PRIMARY,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    updateButtonText: {
      fontSize: 16,
      fontWeight: '700',
      // 시안(PRIMARY) 버튼 위 텍스트는 앱 관례대로 검정 고정.
      // colors.BACKGROUND를 쓰면 라이트모드에서 흰색에 가까워 대비가 무너진다.
      color: '#000000',
    },
  });
