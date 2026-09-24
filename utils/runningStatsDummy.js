/**
 * 러닝 통계 더미 데이터 (개발 검증용)
 *
 * __DEV__ 빌드에서만 runningStatsService가 통계에 섞는다. 러닝 피드에는 들어가지 않는다.
 * 시드 고정 난수라 새로고침해도 같은 기록이 만들어진다.
 *
 * 화면에서 확인할 수 있는 검증 포인트
 * - 오늘부터 14개월 전까지 기록 → 연간 이전 해 이동, 월별 막대 확인
 * - 주말은 장거리, 평일은 단거리 → 요일별 막대 높낮이 차이
 * - 가끔 하루 2회 러닝 → 선택 카드의 "N회" 표시
 * - 이번 주 월요일 23:30 러닝 → 자정 경계가 다음 날로 밀리지 않는지
 * - 지속 시간 0인 기록 → 거리 합계엔 포함, 평균 페이스엔 제외
 */

/** 선형 합동 생성기 — 같은 시드면 항상 같은 수열 */
const createRandom = (seed) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const makeWorkout = (startTime, distanceMeters, durationSeconds, suffix = '') => ({
  id: `dummy-stats-${startTime.getTime()}${suffix}`,
  sourceName: 'RunOn',
  startTime: startTime.toISOString(),
  raw: { distanceMeters, durationSeconds },
});

/**
 * 과거 N개월치 더미 러닝 기록을 만든다.
 * @param {number} months - 오늘로부터 몇 개월 전까지 만들지
 * @returns {Array} runOnRunningService 기록과 같은 형태의 배열
 */
export const buildDummyStatsWorkouts = (months = 14) => {
  const random = createRandom(20260924);
  const records = [];

  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth() - months, 1);

  while (cursor <= now) {
    const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;

    if (random() < (isWeekend ? 0.6 : 0.4)) {
      const runsToday = random() < 0.08 ? 2 : 1;

      for (let i = 0; i < runsToday; i += 1) {
        const distanceMeters = Math.round((isWeekend ? 8 + random() * 14 : 3 + random() * 6) * 1000);
        const paceSecPerKm = 270 + random() * 120; // 4'30" ~ 6'30"
        const durationSeconds = Math.round((distanceMeters / 1000) * paceSecPerKm);
        const hour = i === 0 ? 6 + Math.floor(random() * 3) : 19 + Math.floor(random() * 2);
        const startTime = new Date(
          cursor.getFullYear(), cursor.getMonth(), cursor.getDate(),
          hour, Math.floor(random() * 60), 0,
        );

        // 아직 오지 않은 시각의 기록은 만들지 않는다
        if (startTime <= now) {
          records.push(makeWorkout(startTime, distanceMeters, durationSeconds, `-${i}`));
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // 경계값: 이번 주 월요일 23:30 (로컬 기준 월요일 막대에 들어가야 한다)
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const mondayLate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 23, 30);
  if (mondayLate <= now) {
    records.push(makeWorkout(mondayLate, 4200, 1500, '-late'));
  }

  // 지속 시간이 0인 외부 기록 (거리만 집계, 페이스 계산에서는 제외)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0);
  records.push(makeWorkout(yesterday, 3000, 0, '-nodur'));

  return records;
};
