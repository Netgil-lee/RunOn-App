import {
  PERIOD_WEEK,
  PERIOD_MONTH,
  PERIOD_YEAR,
  getPeriodRange,
  shiftAnchorDate,
  formatPeriodLabel,
  buildPeriodStats,
  formatKm,
  formatPaceLabel,
  formatDurationLabel,
  isCurrentPeriod,
} from '../utils/runningStats';

/**
 * 로컬 시각으로 러닝 기록을 만든다.
 * (집계는 기기 로컬 기준이므로 테스트도 로컬 시각으로 구성한다)
 */
const makeRun = (year, month, day, hour, distanceMeters, durationSeconds) => ({
  id: `run-${year}${month}${day}${hour}`,
  startTime: new Date(year, month - 1, day, hour, 0, 0).toISOString(),
  raw: { distanceMeters, durationSeconds },
});

describe('getPeriodRange', () => {
  it('주간은 월요일에 시작해 7일 뒤에 끝난다', () => {
    // 2026-09-17은 목요일
    const { rangeStart, rangeEnd } = getPeriodRange(PERIOD_WEEK, new Date(2026, 8, 17));
    expect(rangeStart.getDay()).toBe(1); // 월요일
    expect(rangeStart.getDate()).toBe(14);
    expect(rangeEnd.getDate()).toBe(21);
  });

  it('일요일은 그 주의 마지막 날로 묶인다', () => {
    // 2026-09-20은 일요일 → 9.14 주에 속해야 한다
    const { rangeStart } = getPeriodRange(PERIOD_WEEK, new Date(2026, 8, 20));
    expect(rangeStart.getDate()).toBe(14);
  });

  it('월요일 당일은 그 주의 시작이다', () => {
    const { rangeStart } = getPeriodRange(PERIOD_WEEK, new Date(2026, 8, 14));
    expect(rangeStart.getDate()).toBe(14);
  });

  it('월간은 1일부터 다음 달 1일까지다', () => {
    const { rangeStart, rangeEnd } = getPeriodRange(PERIOD_MONTH, new Date(2026, 8, 17));
    expect(rangeStart.getMonth()).toBe(8);
    expect(rangeStart.getDate()).toBe(1);
    expect(rangeEnd.getMonth()).toBe(9);
    expect(rangeEnd.getDate()).toBe(1);
  });

  it('연간은 1월 1일부터 다음 해 1월 1일까지다', () => {
    const { rangeStart, rangeEnd } = getPeriodRange(PERIOD_YEAR, new Date(2026, 8, 17));
    expect(rangeStart.getFullYear()).toBe(2026);
    expect(rangeStart.getMonth()).toBe(0);
    expect(rangeEnd.getFullYear()).toBe(2027);
  });
});

describe('shiftAnchorDate', () => {
  it('주 단위로 이동한다', () => {
    const prev = shiftAnchorDate(PERIOD_WEEK, new Date(2026, 8, 17), -1);
    expect(prev.getMonth()).toBe(8);
    expect(prev.getDate()).toBe(7);
  });

  it('월 경계를 넘어 이동한다', () => {
    const prev = shiftAnchorDate(PERIOD_MONTH, new Date(2026, 0, 15), -1);
    expect(prev.getFullYear()).toBe(2025);
    expect(prev.getMonth()).toBe(11);
  });

  it('연 단위로 이동한다', () => {
    const next = shiftAnchorDate(PERIOD_YEAR, new Date(2026, 8, 17), 1);
    expect(next.getFullYear()).toBe(2027);
  });
});

describe('formatPeriodLabel', () => {
  it('기간 단위별 라벨을 만든다', () => {
    const week = getPeriodRange(PERIOD_WEEK, new Date(2026, 8, 17));
    expect(formatPeriodLabel(PERIOD_WEEK, week.rangeStart, week.rangeEnd)).toBe('9.14 – 9.20');

    const month = getPeriodRange(PERIOD_MONTH, new Date(2026, 8, 17));
    expect(formatPeriodLabel(PERIOD_MONTH, month.rangeStart, month.rangeEnd)).toBe('2026년 9월');

    const year = getPeriodRange(PERIOD_YEAR, new Date(2026, 8, 17));
    expect(formatPeriodLabel(PERIOD_YEAR, year.rangeStart, year.rangeEnd)).toBe('2026년');
  });
});

describe('buildPeriodStats - 주간', () => {
  const anchorDate = new Date(2026, 8, 17); // 2026-09-17 목요일 (9.14 주)

  it('요일별 7개 버킷을 월요일부터 만든다', () => {
    const stats = buildPeriodStats([], { period: PERIOD_WEEK, anchorDate });
    expect(stats.buckets).toHaveLength(7);
    expect(stats.buckets.map((b) => b.label)).toEqual(['월', '화', '수', '목', '금', '토', '일']);
  });

  it('기록이 없는 요일도 0으로 남는다', () => {
    const workouts = [makeRun(2026, 9, 16, 7, 5000, 1800)]; // 수요일
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.buckets[2].distanceMeters).toBe(5000);
    expect(stats.buckets[2].runCount).toBe(1);
    expect(stats.buckets[0].distanceMeters).toBe(0);
    expect(stats.buckets[6].runCount).toBe(0);
  });

  it('같은 요일의 여러 기록을 합산한다', () => {
    const workouts = [
      makeRun(2026, 9, 16, 7, 5000, 1800),
      makeRun(2026, 9, 16, 19, 3000, 1200),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.buckets[2].distanceMeters).toBe(8000);
    expect(stats.buckets[2].runCount).toBe(2);
    expect(stats.summary.activeDays).toBe(1);
  });

  it('기간 밖 기록은 제외한다', () => {
    const workouts = [
      makeRun(2026, 9, 13, 10, 9999, 3000), // 직전 주 일요일
      makeRun(2026, 9, 21, 10, 9999, 3000), // 다음 주 월요일
      makeRun(2026, 9, 16, 7, 5000, 1800),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.summary.runCount).toBe(1);
    expect(stats.summary.totalDistanceMeters).toBe(5000);
  });

  it('늦은 밤 러닝이 다음 날로 밀리지 않는다', () => {
    const workouts = [makeRun(2026, 9, 20, 23, 5000, 1800)]; // 일요일 23시
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.buckets[6].runCount).toBe(1); // 일요일 버킷
    expect(stats.summary.runCount).toBe(1);
  });
});

describe('buildPeriodStats - 월간', () => {
  it('달의 일수만큼 버킷을 만든다', () => {
    const september = buildPeriodStats([], { period: PERIOD_MONTH, anchorDate: new Date(2026, 8, 17) });
    expect(september.buckets).toHaveLength(30);

    const january = buildPeriodStats([], { period: PERIOD_MONTH, anchorDate: new Date(2026, 0, 5) });
    expect(january.buckets).toHaveLength(31);
  });

  it('윤년 2월은 29개 버킷이다', () => {
    const feb2028 = buildPeriodStats([], { period: PERIOD_MONTH, anchorDate: new Date(2028, 1, 10) });
    expect(feb2028.buckets).toHaveLength(29);

    const feb2026 = buildPeriodStats([], { period: PERIOD_MONTH, anchorDate: new Date(2026, 1, 10) });
    expect(feb2026.buckets).toHaveLength(28);
  });

  it('일자별로 담는다', () => {
    const workouts = [makeRun(2026, 9, 1, 7, 5000, 1800), makeRun(2026, 9, 30, 7, 3000, 1200)];
    const stats = buildPeriodStats(workouts, { period: PERIOD_MONTH, anchorDate: new Date(2026, 8, 17) });

    expect(stats.buckets[0].distanceMeters).toBe(5000);
    expect(stats.buckets[29].distanceMeters).toBe(3000);
  });
});

describe('buildPeriodStats - 연간', () => {
  it('12개월 버킷을 만든다', () => {
    const stats = buildPeriodStats([], { period: PERIOD_YEAR, anchorDate: new Date(2026, 8, 17) });
    expect(stats.buckets).toHaveLength(12);
    expect(stats.buckets[0].label).toBe('1월');
    expect(stats.buckets[11].label).toBe('12월');
  });

  it('월별로 담고 다른 해는 제외한다', () => {
    const workouts = [
      makeRun(2026, 1, 5, 7, 5000, 1800),
      makeRun(2026, 12, 25, 7, 3000, 1200),
      makeRun(2025, 12, 25, 7, 9999, 3000),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_YEAR, anchorDate: new Date(2026, 8, 17) });

    expect(stats.buckets[0].distanceMeters).toBe(5000);
    expect(stats.buckets[11].distanceMeters).toBe(3000);
    expect(stats.summary.runCount).toBe(2);
  });
});

describe('buildPeriodStats - 요약 지표', () => {
  const anchorDate = new Date(2026, 8, 17);

  it('평균 거리는 러닝 횟수 기준이다', () => {
    const workouts = [
      makeRun(2026, 9, 14, 7, 6000, 1800),
      makeRun(2026, 9, 16, 7, 4000, 1200),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    // 기간 일수(7)가 아니라 러닝 횟수(2)로 나눈다
    expect(stats.summary.totalDistanceMeters).toBe(10000);
    expect(stats.summary.runCount).toBe(2);
    expect(stats.summary.avgDistanceMeters).toBe(5000);
  });

  it('평균 페이스는 거리 가중(총시간 ÷ 총거리)이다', () => {
    const workouts = [
      makeRun(2026, 9, 14, 7, 10000, 3000), // 5:00/km
      makeRun(2026, 9, 16, 7, 2000, 720),   // 6:00/km
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    // 산술평균이면 330초, 거리 가중이면 3720 / 12 = 310초
    expect(stats.summary.avgPaceSecPerKm).toBeCloseTo(310, 5);
  });

  it('연간 평균도 회차 기준으로 계산한다', () => {
    const workouts = [
      makeRun(2026, 1, 5, 7, 6000, 1800),
      makeRun(2026, 7, 5, 7, 4000, 1200),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_YEAR, anchorDate });

    // 기록이 있는 달(2)이나 12개월이 아니라 러닝 횟수(2)로 나눈다
    expect(stats.summary.avgDistanceMeters).toBe(5000);
  });

  it('지속 시간이 0인 기록은 거리에는 더하되 페이스에서는 뺀다', () => {
    const workouts = [
      makeRun(2026, 9, 14, 7, 10000, 3000), // 5:00/km
      makeRun(2026, 9, 16, 7, 5000, 0),     // 시간 없음
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.summary.totalDistanceMeters).toBe(15000);
    expect(stats.summary.runCount).toBe(2);
    expect(stats.summary.avgPaceSecPerKm).toBeCloseTo(300, 5);
  });

  it('기록이 없으면 0으로 나누지 않는다', () => {
    const stats = buildPeriodStats([], { period: PERIOD_WEEK, anchorDate });

    expect(stats.summary.avgDistanceMeters).toBe(0);
    expect(stats.summary.avgPaceSecPerKm).toBe(0);
    expect(stats.maxDistanceMeters).toBe(0);
  });

  it('활동한 날 수를 센다', () => {
    const workouts = [
      makeRun(2026, 9, 14, 7, 5000, 1800),
      makeRun(2026, 9, 14, 19, 3000, 1200),
      makeRun(2026, 9, 16, 7, 4000, 1500),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.summary.runCount).toBe(3);
    expect(stats.summary.activeDays).toBe(2);
  });

  it('차트 높이 기준이 되는 최대 거리를 구한다', () => {
    const workouts = [
      makeRun(2026, 9, 14, 7, 5000, 1800),
      makeRun(2026, 9, 16, 7, 8000, 2400),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate });

    expect(stats.maxDistanceMeters).toBe(8000);
  });
});

describe('buildPeriodStats - 방어적 처리', () => {
  it('null 입력과 잘못된 기간을 허용한다', () => {
    const stats = buildPeriodStats(null, { period: 'decade', anchorDate: new Date(2026, 8, 17) });
    expect(stats.period).toBe(PERIOD_WEEK);
    expect(stats.buckets).toHaveLength(7);
  });

  it('시작 시각이 깨진 기록은 건너뛴다', () => {
    const workouts = [
      { id: 'bad', startTime: 'not-a-date', raw: { distanceMeters: 5000, durationSeconds: 1800 } },
      { id: 'none', raw: { distanceMeters: 5000, durationSeconds: 1800 } },
      makeRun(2026, 9, 16, 7, 3000, 1200),
    ];
    const stats = buildPeriodStats(workouts, { period: PERIOD_WEEK, anchorDate: new Date(2026, 8, 17) });

    expect(stats.summary.runCount).toBe(1);
    expect(stats.summary.totalDistanceMeters).toBe(3000);
  });
});

describe('표시 포맷', () => {
  it('거리를 km 문자열로 바꾼다', () => {
    expect(formatKm(12400)).toBe('12.4');
    expect(formatKm(12400, 2)).toBe('12.40');
    expect(formatKm(0)).toBe('0.0');
    expect(formatKm(null)).toBe('0.0');
  });

  it("페이스를 5'30\" 형태로 바꾼다", () => {
    expect(formatPaceLabel(330)).toBe("5'30\"");
    expect(formatPaceLabel(305)).toBe("5'05\"");
    expect(formatPaceLabel(0)).toBe('-');
    expect(formatPaceLabel(null)).toBe('-');
  });

  it('총 시간을 한글 라벨로 바꾼다', () => {
    expect(formatDurationLabel(4800)).toBe('1시간 20분');
    expect(formatDurationLabel(1800)).toBe('30분');
    expect(formatDurationLabel(0)).toBe('0분');
  });

  it('현재 기간인지 판별한다', () => {
    expect(isCurrentPeriod(PERIOD_WEEK, new Date())).toBe(true);
    expect(isCurrentPeriod(PERIOD_MONTH, new Date())).toBe(true);
    expect(isCurrentPeriod(PERIOD_YEAR, new Date(2020, 0, 1))).toBe(false);

    const lastWeek = shiftAnchorDate(PERIOD_WEEK, new Date(), -1);
    expect(isCurrentPeriod(PERIOD_WEEK, lastWeek)).toBe(false);
  });
});
