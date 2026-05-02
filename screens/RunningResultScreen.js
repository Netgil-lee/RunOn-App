import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appleFitnessService from '../services/appleFitnessService';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  TEXT: '#ffffff',
  SECONDARY: '#9A9AA0',
};

const RunningResultScreen = ({ navigation, route }) => {
  const result = route?.params?.result || {};
  const workoutPayload = route?.params?.workoutPayload || null;
  const [saveStatus, setSaveStatus] = useState(route?.params?.saveStatus || 'unknown');
  const [isRetrying, setIsRetrying] = useState(false);

  const statusText = useMemo(() => {
    if (saveStatus === 'success') return 'HealthKit 저장 완료';
    if (saveStatus === 'failed') return 'HealthKit 저장 실패';
    return 'HealthKit 저장 상태 확인 필요';
  }, [saveStatus]);

  const handleRetry = async () => {
    if (!workoutPayload) return;
    try {
      setIsRetrying(true);
      await appleFitnessService.saveWorkout({
        ...workoutPayload,
        startDate: new Date(workoutPayload.startDate),
        endDate: new Date(workoutPayload.endDate),
      });
      setSaveStatus('success');
      Alert.alert('저장 완료', 'HealthKit 저장이 완료되었습니다.');
    } catch (error) {
      console.error('❌ HealthKit 저장 재시도 실패:', error);
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

      {saveStatus === 'failed' && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={isRetrying}>
          {isRetrying ? <ActivityIndicator size="small" color="#000000" /> : <Text style={styles.retryButtonText}>HealthKit 재시도</Text>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D34',
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: COLORS.SECONDARY,
    fontSize: 14,
  },
  value: {
    color: COLORS.TEXT,
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
    color: COLORS.TEXT,
    fontSize: 13,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.PRIMARY,
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
    backgroundColor: COLORS.PRIMARY,
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
