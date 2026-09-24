/**
 * 여러 달에 걸친 기록으로 주/월/년 집계의 정합성을 교차 검증한다.
 * (단일 값 검증은 runningStats.test.js, 여기서는 기간 간 일관성만 본다)
 */
import {
  PERIOD_WEEK,
  PERIOD_MONTH,
  PERIOD_YEAR,
  buildPeriodStats,
  shiftAnchorDate,
} from '../utils/runningStats';

/** 선형 합동 생성기 — 같은 시드면 항상 같은 수열 */
const createRandom = (seed) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

/**
 * 오늘로부터 과거 N개월치 러닝 기록을 만든다.
 * 매일 달리지 않고 거리·페이스가 제각각이어야 버킷 분배를 제대로 검증할 수 있다.
 */
const createWorkouts = (months = 14) => {
  const random = createRandom(20260922);
  const records = [];

  const today = new Date();
  const cursor = new Date(today.getFullYear(), today.getMonth() - months, 1);

  while (cursor <= today) {
    const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;

    if (random() < (isWeekend ? 0.6 : 0.4)) {
      const runsToday = random() < 0.08 ? 2 : 1;

      for (let i = 0; i < runsToday; i += 1) {
        const distanceMeters = Math.round((isWeekend ? 8 + random() * 14 : 3 + random() * 6) * 1000);
        const paceSecPerKm = 270 + random() * 120;
        const durationSeconds = Math.round((distanceMeters / 1000) * paceSecPerKm);
        const hour = i === 0 ? 6 + Math.floor(random() * 3) : 19 + Math.floor(random() * 2);

        const startTime = new Date(
          cursor.getFullYear(), cursor.getMonth(), cursor.getDate(),
          hour, Math.floor(random() * 60), 0,
        );

        records.push({
          id: `w-${startTime.getTime()}-${i}`,
          startTime: startTime.toISOString(),
          raw: { distanceMeters, durationSeconds },
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return records;
};

describe('주/월/년 집계 정합성', () => {
  const workouts = createWorkouts(14);

  it('여러 달에 걸친 기록이 준비된다', () => {
    expect(workouts.length).toBeGreaterThan(150);

    const months = new Set(workouts.map((w) => {
      const d = new Date(w.startTime);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    expect(months.size).toBeGreaterThanOrEqual(14);
  });

  it('각 기간에서 버킷 합이 요약 총합과 일치한다', () => {
    const anchorDate = new Date();

    [PERIOD_WEEK, PERIOD_MONTH, PERIOD_YEAR].forEach((period) => {
      const stats = buildPeriodStats(workouts, { period, anchorDate });
      const bucketSum = stats.buckets.reduce((sum, b) => sum + b.distanceMeters, 0);
      const bucketRuns = stats.buckets.reduce((sum, b) => sum + b.runCount, 0);

      expect(bucketSum).toBeCloseTo(stats.summary.totalDistanceMeters, 5);
      expect(bucketRuns).toBe(stats.summary.runCount);
    });
  });

  it('연간 각 월 버킷 = 그 달을 따로 집계한 값', () => {
    const currentYear = new Date().getFullYear();
    const year = buildPeriodStats(workouts, { period: PERIOD_YEAR, anchorDate: new Date() });

    year.buckets.forEach((bucket, monthIndex) => {
      const month = buildPeriodStats(workouts, {
        period: PERIOD_MONTH,
        anchorDate: new Date(currentYear, monthIndex, 15),
      });
      expect(bucket.distanceMeters).toBeCloseTo(month.summary.totalDistanceMeters, 5);
      expect(bucket.runCount).toBe(month.summary.runCount);
    });
  });

  it('연간 총합이 월간 총합보다 작지 않다', () => {
    const anchorDate = new Date();
    const month = buildPeriodStats(workouts, { period: PERIOD_MONTH, anchorDate });
    const year = buildPeriodStats(workouts, { period: PERIOD_YEAR, anchorDate });

    expect(year.summary.totalDistanceMeters).toBeGreaterThanOrEqual(month.summary.totalDistanceMeters);
    expect(year.summary.runCount).toBeGreaterThanOrEqual(month.summary.runCount);
  });

  it('이전 기간으로 이동해도 집계가 이어진다', () => {
    const prevWeek = shiftAnchorDate(PERIOD_WEEK, new Date(), -1);
    const week = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate: prevWeek });

    expect(week.buckets).toHaveLength(7);
    expect(week.summary.runCount).toBeGreaterThan(0);
    expect(week.summary.activeDays).toBeLessThanOrEqual(7);
  });
});
