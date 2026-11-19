/**
 * 모임 참여 목표 단계
 *
 * 누적 참여 횟수보다 큰 첫 단계가 다음 목표가 된다.
 * 100회까지는 정해진 단계, 그 뒤로는 10회 단위로 늘어난다.
 */

const GOAL_STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * @param {number} totalParticipated - 누적 모임 참여 횟수
 * @returns {{ current: number, target: number, ratio: number }} ratio는 0~1
 */
export const getParticipationGoal = (totalParticipated) => {
  const current = Number.isFinite(totalParticipated) && totalParticipated > 0
    ? Math.floor(totalParticipated)
    : 0;

  const target = GOAL_STEPS.find((step) => current < step)
    // 100회 이상: 다음 10의 배수 (정확히 10의 배수면 그다음 단계)
    ?? (Math.floor(current / 10) + 1) * 10;

  return { current, target, ratio: Math.min(current / target, 1) };
};

// 러닝 레벨(온보딩 값)별 주간 거리 목표 기본값 (km)
const WEEKLY_GOAL_KM_BY_LEVEL = {
  beginner: 10,
  intermediate: 20,
  advanced: 30,
};
const DEFAULT_WEEKLY_GOAL_KM = 20;

/** @param {string} level - users/{uid}.runningProfile.level */
export const getWeeklyGoalKm = (level) => WEEKLY_GOAL_KM_BY_LEVEL[level] || DEFAULT_WEEKLY_GOAL_KM;
