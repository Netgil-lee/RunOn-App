/**
 * 러닝 기록 정규화 · 병합 유틸
 *
 * RunOn 로컬 기록(AsyncStorage)과 Apple Fitness(HealthKit) 기록은 서로 다른
 * 형태로 들어오지만, 같은 러닝 세션이 양쪽에 중복 저장되어 있을 수 있다.
 * (RunOn으로 측정하면 HealthKit에도 함께 저장하기 때문)
 *
 * 러닝 피드와 러닝 통계가 동일한 병합 규칙을 쓰도록 이곳에 모아둔다.
 */

// 같은 세션으로 볼 시작 시각 허용 오차
const SAME_SESSION_START_TOLERANCE_MS = 12 * 60 * 1000; // 12분
// 같은 세션으로 볼 지속 시간 허용 오차
const SAME_SESSION_DURATION_TOLERANCE_SEC = 8 * 60; // 8분

/**
 * 기록의 소스가 RunOn인지 판별
 * @param {object} workout - 러닝 기록
 * @returns {boolean} RunOn에서 측정된 기록이면 true
 */
export const isRunOnWorkoutSource = (workout) => /runon/i.test(
  `${workout?.sourceLabel || workout?.sourceName || workout?.source || ''}`
);

/**
 * 지속 시간 값을 초 단위로 변환
 * 숫자(초), "1:02:03", "5:30", "1h 2m 3s" 형태를 모두 허용한다.
 * @param {number|string} durationValue - 지속 시간 값
 * @returns {number|null} 초 단위 지속 시간, 해석 불가 시 null
 */
export const parseDurationToSeconds = (durationValue) => {
  if (typeof durationValue === 'number' && Number.isFinite(durationValue)) {
    return Math.max(0, Math.floor(durationValue));
  }
  const text = `${durationValue || ''}`.trim();
  if (!text) return null;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) {
    const [hh, mm, ss] = text.split(':').map(Number);
    return hh * 3600 + mm * 60 + ss;
  }
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [mm, ss] = text.split(':').map(Number);
    return mm * 60 + ss;
  }

  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);
  const secondMatch = text.match(/(\d+)\s*s/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const seconds = secondMatch ? Number(secondMatch[1]) : 0;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
};

/**
 * 두 기록이 동일한 러닝 세션인지 판별
 * @param {object} runOnWorkout - RunOn 로컬 기록
 * @param {object} appleWorkout - Apple Fitness 기록
 * @returns {boolean} 동일 세션으로 간주되면 true
 */
export const isSameRunningSession = (runOnWorkout, appleWorkout) => {
  const runOnStart = new Date(runOnWorkout?.startTime || 0).getTime();
  const appleStart = new Date(appleWorkout?.startTime || 0).getTime();
  if (!Number.isFinite(runOnStart) || !Number.isFinite(appleStart)) return false;

  const startDiffMs = Math.abs(runOnStart - appleStart);
  if (startDiffMs > SAME_SESSION_START_TOLERANCE_MS) return false;

  const runOnDuration = parseDurationToSeconds(runOnWorkout?.raw?.durationSeconds ?? runOnWorkout?.duration);
  const appleDuration = parseDurationToSeconds(appleWorkout?.raw?.durationSeconds ?? appleWorkout?.duration);
  if (runOnDuration === null || appleDuration === null) {
    return true;
  }

  const durationDiff = Math.abs(runOnDuration - appleDuration);
  return durationDiff <= SAME_SESSION_DURATION_TOLERANCE_SEC;
};

/**
 * 기록의 거리를 미터 단위로 반환
 * 포맷된 문자열("5.2km")이 아닌 raw 값을 사용한다.
 * @param {object} workout - 러닝 기록
 * @returns {number} 미터 단위 거리 (없으면 0)
 */
export const getWorkoutDistanceMeters = (workout) => {
  const meters = Number(workout?.raw?.distanceMeters);
  return Number.isFinite(meters) && meters > 0 ? meters : 0;
};

/**
 * 기록의 지속 시간을 초 단위로 반환
 * @param {object} workout - 러닝 기록
 * @returns {number} 초 단위 지속 시간 (없으면 0)
 */
export const getWorkoutDurationSeconds = (workout) => {
  const seconds = parseDurationToSeconds(workout?.raw?.durationSeconds ?? workout?.duration);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
};

/**
 * RunOn 로컬 기록에 소스 정보를 붙인다.
 * @param {Array} workouts - RunOn 로컬 기록 배열
 * @returns {Array} 소스 정보가 추가된 배열
 */
const normalizeRunOnWorkouts = (workouts) => (workouts || []).map((item) => ({
  ...item,
  sourceLabel: 'RunOn',
  sourceType: 'runon_local',
}));

/**
 * Apple Fitness 기록에 소스 정보를 붙인다.
 *
 * RunOn이 HealthKit에 저장한 기록은 소스 이름이 RunOn으로 남으므로,
 * 로컬 기록이 사라진 뒤에도 RunOn 기록으로 표시되도록 라벨을 맞춰준다.
 * (sourceType은 'runon_health' — 로컬 기록이 아니므로 삭제 대상은 아니다)
 * @param {Array} workouts - HealthKit 기록 배열
 * @returns {Array} 소스 정보가 추가된 배열
 */
const normalizeAppleWorkouts = (workouts) => (workouts || []).map((item) => {
  const fromRunOn = isRunOnWorkoutSource(item);
  return {
    ...item,
    sourceLabel: fromRunOn ? 'RunOn' : 'Apple Fitness',
    sourceType: fromRunOn ? 'runon_health' : 'apple',
  };
});

/**
 * RunOn 로컬 기록과 Apple Fitness 기록을 중복 없이 병합
 *
 * 동일 세션이 양쪽에 있으면 RunOn 로컬 기록을 우선한다.
 * 소스 이름만 보고 미리 걸러내지 않고 세션 단위로만 중복을 제거하므로,
 * 로컬 보관 한도(300개)를 넘겨 사라진 과거 기록도 HealthKit 쪽에서 살아남는다.
 *
 * @param {Array} runOnWorkouts - RunOn 로컬 기록 배열
 * @param {Array} appleWorkouts - Apple Fitness 기록 배열
 * @returns {Array} 최신순으로 정렬된 병합 결과
 */
export const mergeRunningWorkouts = (runOnWorkouts, appleWorkouts) => {
  const normalizedRunOn = normalizeRunOnWorkouts(runOnWorkouts);
  const normalizedApple = normalizeAppleWorkouts(appleWorkouts);

  const dedupedApple = normalizedApple.filter((appleWorkout) => (
    !normalizedRunOn.some((runOnWorkout) => isSameRunningSession(runOnWorkout, appleWorkout))
  ));

  return [...dedupedApple, ...normalizedRunOn]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};
