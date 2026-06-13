import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppleFitnessService } from '../services/getAppleFitnessService';
import { useTheme } from '../contexts/ThemeContext';

const RunningResultScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const result = route?.params?.result || {};
  const workoutPayload = route?.params?.workoutPayload || null;
  const [saveStatus, setSaveStatus] = useState(route?.params?.saveStatus || 'unknown');
  const [isRetrying, setIsRetrying] = useState(false);

  const statusText = useMemo(() => {
    if (Platform.OS === 'ios') {
      if (saveStatus === 'success') return 'HealthKit 저장 완료';
      if (saveStatus === 'failed') return 'HealthKit 저장 실패';
      return 'HealthKit 저장 상태 확인 필요';
    }
    if (saveStatus === 'success') return '러닝 기록 저장 완료';
    if (saveStatus === 'failed') return '러닝 기록 저장 실패';
    return '러닝 기록이 저장되었습니다';
  }, [saveStatus]);

  const handleRetry = async () => {
    if (!workoutPayload) return;
    try {
      setIsRetrying(true);
      const appleSvc = getAppleFitnessService();
      if (Platform.OS === 'ios' && appleSvc) {
        await appleSvc.saveWorkout({
          ...workoutPayload,
          startDate: new Date(workoutPayload.startDate),
          endDate: new Date(workoutPayload.endDate),
        });
        Alert.alert('저장 완료', 'HealthKit 저장이 완료되었습니다.');
      }
      setSaveStatus('success');
    } catch (error) {
      console.error('❌ 기록 저장 재시도 실패:', error);
      Alert.alert('저장 실패', '다시 시도해주세요.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleConfirm = () => {
    navigation.navigate('Main', { screen: 'MapTab' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>러닝 기록 완료</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>거리</Text>
          <Text style={styles.value}>{result.distance || '0m'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>페이스</Text>
          <Text style={styles.value}>{result.pace || '0:00/km'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>시간</Text>
          <Text style={styles.value}>{result.duration || '00:00'}</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Ionicons
          name={saveStatus === 'success' ? 'checkmark-circle' : 'warning-outline'}
          size={18}
          color={saveStatus === 'success' ? '#3BE57E' : '#FFCC00'}
        />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {saveStatus === 'failed' && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={isRetrying}>
          {isRetrying ? <ActivityIndicator size="small" color="#000000" /> : <Text style={styles.retryButtonText}>HealthKit 재시도</Text>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.confirmButton, { marginBottom: 30 + insets.bottom }]} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.TEXT,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.BORDER,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.TEXT_SECONDARY,
    fontSize: 14,
  },
  value: {
    color: colors.TEXT,
    fontSize: 20,
    fontWeight: '700',
  },
  statusRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: colors.TEXT,
    fontSize: 13,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  retryButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmButton: {
    marginTop: 'auto',
    marginBottom: 30,
    backgroundColor: colors.PRIMARY,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  confirmButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default RunningResultScreen;
