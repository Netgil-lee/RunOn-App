import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { formatKm } from '../../utils/runningStats';
import { getParticipationGoal } from '../../utils/participationGoal';

const ProgressBar = ({ ratio, color, trackColor }) => (
  <View style={{ height: 6, borderRadius: 3, backgroundColor: trackColor }}>
    <View
      style={{
        width: `${Math.round(Math.max(0, Math.min(ratio, 1)) * 100)}%`,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
      }}
    />
  </View>
);

/**
 * 홈 2칸 타일
 * 왼쪽: 나의 러닝 · 이번 주 (누적 거리 / 주간 목표) → 러닝 통계 화면
 * 오른쪽: 나의 모임 · 참여 목표 (누적 참여 / 다음 목표, 매너 점수) → 내가 참여한 모임
 */
const HomeStatTiles = ({ summary, onPressRunning, onPressMeeting }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { weekDistanceMeters, weeklyGoalKm, totalParticipated, mannerScore, loading } = summary;

  const runRatio = weeklyGoalKm > 0 ? weekDistanceMeters / 1000 / weeklyGoalKm : 0;
  const goal = getParticipationGoal(totalParticipated);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tile}
        onPress={onPressRunning}
        activeOpacity={0.8}
        accessibilityLabel={`이번 주 러닝 ${formatKm(weekDistanceMeters)}킬로미터, 목표 ${weeklyGoalKm}킬로미터`}
      >
        <Text style={styles.tileTitle} numberOfLines={1}>나의 러닝 · 이번 주</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1}>{loading ? '–' : formatKm(weekDistanceMeters)}</Text>
          <Text style={styles.unit} numberOfLines={1}> / {weeklyGoalKm}km</Text>
        </View>
        <ProgressBar ratio={loading ? 0 : runRatio} color={colors.PRIMARY} trackColor={colors.BORDER} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tile}
        onPress={onPressMeeting}
        activeOpacity={0.8}
        accessibilityLabel={`모임 참여 ${goal.current}회, 다음 목표 ${goal.target}회`}
      >
        <Text style={styles.tileTitle} numberOfLines={1}>나의 모임 · 참여 목표</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1}>{loading ? '–' : goal.current}</Text>
          <Text style={styles.unit} numberOfLines={1}> / {goal.target}회</Text>
          {!loading && mannerScore != null && (
            <View style={styles.manner}>
              <Ionicons name="star" size={12} color={colors.MEETING_ACCENT} />
              <Text style={styles.mannerText} numberOfLines={1}>{mannerScore.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <ProgressBar ratio={loading ? 0 : goal.ratio} color={colors.MEETING_ACCENT} trackColor={colors.BORDER} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.CARD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER,
  },
  tileTitle: {
    fontSize: 13,
    fontFamily: 'Pretendard-Medium',
    color: colors.TEXT,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 10,
  },
  value: {
    fontSize: 24,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
  },
  unit: {
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY,
    flexShrink: 1,
  },
  manner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  mannerText: {
    fontSize: 13,
    fontFamily: 'Pretendard-Medium',
    color: colors.MEETING_ACCENT,
  },
});

export default HomeStatTiles;
