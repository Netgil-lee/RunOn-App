/**
 * 러닝 통계 집계 유틸 (순수 함수)
 *
 * 주/월/년 기간별로 러닝 기록을 구간(버킷)에 나눠 담고 요약 지표를 계산한다.
 * - 주간: 월~일 7개 구간 (요일별 거리)
 * - 월간: 1일~말일 구간 (일별 거리)
 * - 연간: 1~12월 12개 구간 (월별 거리)
 *
 * 모든 구간 경계는 기기 로컬 시각(KST) 기준으로 자른다.
 * UTC 기준으로 자르면 밤 9시 이후 러닝이 다음 날로 밀린다.
 */

import { getWorkoutDistanceMeters, getWorkoutDurationSeconds } from './runningWorkouts';

export const PERIOD_WEEK = 'week';
export const PERIOD_MONTH = 'month';
export const PERIOD_YEAR = 'year';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/** 해당 날짜의 자정(로컬 기준) Date를 반환 */
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** 주의 시작일(월요일 자정)을 반환 */
const startOfWeek = (date) => {
  const day = startOfDay(date);
  // getDay(): 일0 월1 ... 토6 → 월요일까지 되돌릴 일수
  const daysSinceMonday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - daysSinceMonday);
  return day;
};

/** 달의 1일 자정을 반환 */
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** 해의 1월 1일 자정을 반환 */
const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);

/** 해당 달의 일수 (윤년 포함) */
const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

/**
 * 기준일이 속한 기간의 시작/끝 경계를 구한다.
 * rangeEnd는 다음 기간의 시작(배타적 경계)이다.
 * @param {string} period - PERIOD_WEEK | PERIOD_MONTH | PERIOD_YEAR
 * @param {Date} anchorDate - 기준일
 * @returns {{ rangeStart: Date, rangeEnd: Date }} 기간 경계
 */
export const getPeriodRange = (period, anchorDate) => {
  const anchor = anchorDate instanceof Date && !Number.isNaN(anchorDate.getTime())
    ? anchorDate
    : new Date();

  if (period === PERIOD_MONTH) {
    const rangeStart = startOfMonth(anchor);
    return { rangeStart, rangeEnd: new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1) };
  }
  if (period === PERIOD_YEAR) {
    const rangeStart = startOfYear(anchor);
    return { rangeStart, rangeEnd: new Date(rangeStart.getFullYear() + 1, 0, 1) };
  }

  const rangeStart = startOfWeek(anchor);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  return { rangeStart, rangeEnd };
};

/**
 * 기준일을 이전/다음 기간으로 이동시킨다.
 * @param {string} period - 기간 단위
 * @param {Date} anchorDate - 현재 기준일
 * @param {number} step - 이동할 기간 수 (-1: 이전, +1: 다음)
 * @returns {Date} 이동한 기간의 시작일
 */
export const shiftAnchorDate = (period, anchorDate, step) => {
  const { rangeStart } = getPeriodRange(period, anchorDate);
  const moved = new Date(rangeStart);

  if (period === PERIOD_MONTH) moved.setMonth(moved.getMonth() + step);
  else if (period === PERIOD_YEAR) moved.setFullYear(moved.getFullYear() + step);
  else moved.setDate(moved.getDate() + step * 7);

  return moved;
};

/** 기간 안에 들어갈 빈 버킷들을 미리 만들어 둔다 */
const createEmptyBuckets = (period, rangeStart) => {
  const makeBucket = (key, label, date) => ({
    key,
    label,
    date,
    distanceMeters: 0,
    durationSeconds: 0,
    runCount: 0,
  });

  if (period === PERIOD_MONTH) {
    const year = rangeStart.getFullYear();
    const month = rangeStart.getMonth();
    return Array.from({ length: daysInMonth(year, month) }, (_, index) => {
      const day = index + 1;
      return makeBucket(`d-${day}`, `${day}`, new Date(year, month, day));
    });
  }

  if (period === PERIOD_YEAR) {
    const year = rangeStart.getFullYear();
    return MONTH_LABELS.map((label, index) => (
      makeBucket(`m-${index + 1}`, label, new Date(year, index, 1))
    ));
  }

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + index);
    return makeBucket(`w-${index}`, label, date);
  });
};

/** 기록이 들어갈 버킷의 인덱스를 구한다 */
const getBucketIndex = (period, rangeStart, workoutDate) => {
  if (period === PERIOD_MONTH) return workoutDate.getDate() - 1;
  if (period === PERIOD_YEAR) return workoutDate.getMonth();

  const dayDiffMs = startOfDay(workoutDate).getTime() - rangeStart.getTime();
  return Math.floor(dayDiffMs / (24 * 60 * 60 * 1000));
};

/**
 * 기간 라벨을 만든다. (예: "9.14 – 9.20", "2026년 9월", "2026년")
 * @param {string} period - 기간 단위
 * @param {Date} rangeStart - 기간 시작일
 * @param {Date} rangeEnd - 기간 끝(배타적)
 * @returns {string} 화면에 표시할 기간 라벨
 */
export const formatPeriodLabel = (period, rangeStart, rangeEnd) => {
  if (period === PERIOD_MONTH) {
    return `${rangeStart.getFullYear()}년 ${rangeStart.getMonth() + 1}월`;
  }
  if (period === PERIOD_YEAR) {
    return `${rangeStart.getFullYear()}년`;
  }

  const lastDay = new Date(rangeEnd);
  lastDay.setDate(lastDay.getDate() - 1);
  const startText = `${rangeStart.getMonth() + 1}.${rangeStart.getDate()}`;
  const endText = `${lastDay.getMonth() + 1}.${lastDay.getDate()}`;
  return `${startText} – ${endText}`;
};

/**
 * 기간별 러닝 통계를 집계한다.
 *
 * 평균 거리는 러닝 횟수 기준(총거리 ÷ 횟수), 평균 페이스는 거리 가중
 * (총시간 ÷ 총거리)으로 계산한다. 주/월/년 모두 동일한 기준을 쓴다.
 *
 * @param {Array} workouts - 병합된 러닝 기록 배열
 * @param {object} options - { period, anchorDate }
 * @returns {object} 기간 경계, 버킷 배열, 요약 지표
 */
export const buildPeriodStats = (workouts, options = {}) => {
  const period = [PERIOD_WEEK, PERIOD_MONTH, PERIOD_YEAR].includes(options.period)
    ? options.period
    : PERIOD_WEEK;
  const { rangeStart, rangeEnd } = getPeriodRange(period, options.anchorDate);

  const buckets = createEmptyBuckets(period, rangeStart);
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();

  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;
  let runCount = 0;
  // 페이스는 거리·시간이 모두 있는 기록만으로 계산한다.
  // (HealthKit 기록 중 지속 시간이 0으로 들어오는 경우가 있다)
  let paceDistanceMeters = 0;
  let paceDurationSeconds = 0;
  const activeDayKeys = new Set();

  (workouts || []).forEach((workout) => {
    const startTime = new Date(workout?.startTime || 0);
    if (Number.isNaN(startTime.getTime())) return;

    const startMs = startTime.getTime();
    if (startMs < rangeStartMs || startMs >= rangeEndMs) return;

    const index = getBucketIndex(period, rangeStart, startTime);
    const bucket = buckets[index];
    if (!bucket) return;

    const distanceMeters = getWorkoutDistanceMeters(workout);
    const durationSeconds = getWorkoutDurationSeconds(workout);

    bucket.distanceMeters += distanceMeters;
    bucket.durationSeconds += durationSeconds;
    bucket.runCount += 1;

    totalDistanceMeters += distanceMeters;
    totalDurationSeconds += durationSeconds;
    runCount += 1;

    if (distanceMeters > 0 && durationSeconds > 0) {
      paceDistanceMeters += distanceMeters;
      paceDurationSeconds += durationSeconds;
    }

    const day = startOfDay(startTime);
    activeDayKeys.add(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`);
  });

  const maxDistanceMeters = buckets.reduce(
    (max, bucket) => Math.max(max, bucket.distanceMeters),
    0,
  );

  return {
    period,
    rangeStart,
    rangeEnd,
    label: formatPeriodLabel(period, rangeStart, rangeEnd),
    buckets,
    maxDistanceMeters,
    summary: {
      totalDistanceMeters,
      totalDurationSeconds,
      runCount,
      activeDays: activeDayKeys.size,
      avgDistanceMeters: runCount > 0 ? totalDistanceMeters / runCount : 0,
      avgPaceSecPerKm: paceDistanceMeters > 0
        ? paceDurationSeconds / (paceDistanceMeters / 1000)
        : 0,
    },
  };
};

/**
 * 거리를 km 문자열로 변환
 * @param {number} meters - 미터 단위 거리
 * @param {number} digits - 소수점 자리수
 * @returns {string} 예: "12.4"
 */
export const formatKm = (meters, digits = 1) => {
  const safeMeters = Number.isFinite(meters) && meters > 0 ? meters : 0;
  return (safeMeters / 1000).toFixed(digits);
};

/**
 * 페이스를 "5'30\"" 형태로 변환
 * @param {number} secPerKm - km당 초
 * @returns {string} 페이스 라벨, 값이 없으면 '-'
 */
export const formatPaceLabel = (secPerKm) => {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '-';
  const totalSeconds = Math.round(secPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${String(seconds).padStart(2, '0')}"`;
};

/**
 * 총 시간을 "1시간 20분" 형태로 변환
 * @param {number} seconds - 초 단위 시간
 * @returns {string} 시간 라벨
 */
export const formatDurationLabel = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
};

/**
 * 해당 기간이 오늘을 포함하는 마지막 기간인지 판별 (▶ 버튼 비활성화용)
 * @param {string} period - 기간 단위
 * @param {Date} anchorDate - 기준일
 * @returns {boolean} 현재 기간이면 true
 */
export const isCurrentPeriod = (period, anchorDate) => {
  const current = getPeriodRange(period, new Date());
  const target = getPeriodRange(period, anchorDate);
  return current.rangeStart.getTime() === target.rangeStart.getTime();
};
