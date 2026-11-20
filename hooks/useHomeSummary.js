import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import runningStatsService from '../services/runningStatsService';
import { buildPeriodStats, PERIOD_WEEK } from '../utils/runningStats';
import { getWeeklyGoalKm } from '../utils/participationGoal';

/**
 * 홈 2칸 타일용 요약 데이터
 *
 * - 이번 주(월~일) 러닝 거리: 러닝 통계 화면과 같은 기록·같은 집계(utils/runningStats)를 쓴다
 * - 모임 참여 횟수·매너 점수·러닝 레벨: users/{uid} 문서 1회 조회
 *
 * 러닝을 마치고 돌아오면 숫자가 바뀌어야 하므로 홈이 다시 보일 때마다 불러온다.
 * (러닝 기록은 runningStatsService가 5분간 캐시하므로 매번 HealthKit을 훑지는 않는다)
 */
const useHomeSummary = (user) => {
  const [summary, setSummary] = useState({
    weekDistanceMeters: 0,
    weeklyGoalKm: getWeeklyGoalKm(),
    totalParticipated: 0,
    mannerScore: null,
    loading: true,
  });

  const uid = user?.uid;

  const load = useCallback(async ({ force = false } = {}) => {
    if (!uid) return;

    const [workoutResult, userSnap] = await Promise.all([
      runningStatsService.loadAllWorkouts({ force }).catch((error) => {
        console.warn('홈 주간 러닝 조회 실패:', error?.message || error);
        return { workouts: [] };
      }),
      getDoc(doc(getFirestore(), 'users', uid)).catch((error) => {
        console.warn('홈 사용자 요약 조회 실패:', error?.message || error);
        return null;
      }),
    ]);

    const weekStats = buildPeriodStats(workoutResult.workouts, { period: PERIOD_WEEK, anchorDate: new Date() });
    const userData = userSnap?.exists() ? userSnap.data() : {};
    const communityStats = userData.communityStats || {};

    setSummary({
      weekDistanceMeters: weekStats.summary.totalDistanceMeters,
      weeklyGoalKm: getWeeklyGoalKm(userData.runningProfile?.level),
      totalParticipated: communityStats.totalParticipated || 0,
      mannerScore: typeof communityStats.averageMannerScore === 'number'
        ? communityStats.averageMannerScore
        : null,
      loading: false,
    });
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // 당겨서 새로고침: 러닝 기록 캐시를 무시하고 다시 불러온다
  const refresh = useCallback(() => load({ force: true }), [load]);

  return { ...summary, refresh };
};

export default useHomeSummary;
