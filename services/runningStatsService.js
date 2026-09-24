/**
 * 러닝 통계용 기록 로더
 *
 * RunOn 로컬 기록과 외부 피트니스 기록(Android: Health Connect, iOS: HealthKit)을
 * 전체 기간으로 불러와 병합한다.
 * 통계는 경로 폴리라인이 필요 없으므로 route 조회를 끄고 가져온다.
 * (러닝 피드는 미니맵 때문에 경로까지 받지만 통계에서는 순수 낭비다)
 */

import { Platform } from 'react-native';
import { getAppleFitnessService } from './getAppleFitnessService';
import healthConnectService from './healthConnectService';
import runOnRunningService from './runOnRunningService';
import { mergeRunningWorkouts } from '../utils/runningWorkouts';

// 화면을 드나들 때마다 Health Connect를 다시 훑지 않도록 짧게 캐시한다
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;

/**
 * 플랫폼에 맞는 외부 피트니스 기록을 경로 없이 전체 기간으로 불러온다.
 * @returns {Promise<Array>} 외부 피트니스 러닝 기록 배열
 */
const loadExternalWorkouts = async () => {
  if (Platform.OS === 'android') {
    return healthConnectService.getRecentRunningWorkouts(0, {
      includeRoutes: false,
      routeFetchLimit: 0,
    });
  }

  const appleFitnessService = getAppleFitnessService();
  if (Platform.OS === 'ios' && appleFitnessService?.getRecentRunningWorkouts) {
    return appleFitnessService.getRecentRunningWorkouts(0, {
      includeRoutes: false,
      routeFetchLimit: 0,
      cacheTtlMs: CACHE_TTL_MS,
    });
  }

  return [];
};

class RunningStatsService {
  /**
   * 통계에 쓸 전체 러닝 기록을 불러온다.
   *
   * 외부 피트니스 조회가 실패해도(권한 없음 등) RunOn 로컬 기록만으로 결과를 돌려준다.
   * 두 소스가 모두 비어 있을 때만 에러 코드를 함께 전달한다.
   *
   * @param {object} options - { force: boolean } 캐시를 무시하고 다시 불러올지
   * @returns {Promise<{ workouts: Array, errorCode: string }>} 병합된 기록과 에러 코드
   */
  async loadAllWorkouts(options = {}) {
    const force = options?.force === true;

    if (!force && cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
      return { workouts: cache.workouts, errorCode: cache.errorCode };
    }

    let runOnWorkouts = [];
    try {
      runOnWorkouts = await runOnRunningService.getRecentRunningWorkouts(0);
    } catch (error) {
      console.warn('⚠️ [RunningStatsService] RunOn 로컬 기록 조회 실패:', error?.message || error);
    }

    let externalWorkouts = [];
    let externalErrorCode = '';
    try {
      externalWorkouts = await loadExternalWorkouts();
    } catch (error) {
      externalErrorCode = error?.code || 'UNKNOWN';
    }

    const workouts = mergeRunningWorkouts(runOnWorkouts, externalWorkouts);
    // 로컬 기록이라도 있으면 외부 피트니스 실패는 에러로 알리지 않는다
    const errorCode = workouts.length === 0 ? externalErrorCode : '';

    cache = { workouts, errorCode, cachedAt: Date.now() };
    return { workouts, errorCode };
  }

  /** 캐시를 비운다 (새 러닝 기록 저장 후 등) */
  clearCache() {
    cache = null;
  }
}

export default new RunningStatsService();
