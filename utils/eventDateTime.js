/**
 * 모임 날짜·시간 유틸
 *
 * 모임 문서의 date / time 은 문자열이고 형식이 섞여 있다.
 *   date: '2026-11-21' 또는 '2026년 11월 21일' (뒤에 요일이 붙기도 함)
 *   time: '오후 7:00' 또는 '19:00'
 * 서버(functions/index.js parseEventStartDateTime)와 같은 규칙으로 읽되,
 * 앱에서는 기기 현지 시각 기준 Date 로 만든다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const parseDatePart = (rawDate) => {
  if (!rawDate) return null;

  // Date 객체 또는 Firestore Timestamp
  const asDate =
    rawDate instanceof Date ? rawDate
      : typeof rawDate.toDate === 'function' ? rawDate.toDate()
        : null;
  if (asDate) {
    return { year: asDate.getFullYear(), month: asDate.getMonth(), day: asDate.getDate() };
  }

  if (typeof rawDate !== 'string') return null;
  const text = rawDate.trim();

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) - 1, day: Number(iso[3]) };

  const korean = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (korean) return { year: Number(korean[1]), month: Number(korean[2]) - 1, day: Number(korean[3]) };

  return null;
};

const parseTimePart = (rawTime) => {
  if (typeof rawTime === 'number') return { hours: rawTime, minutes: 0 };
  if (typeof rawTime !== 'string') return null;
  const text = rawTime.trim();

  const korean = text.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
  if (korean) {
    let hours = Number(korean[2]);
    if (korean[1] === '오후' && hours !== 12) hours += 12;
    if (korean[1] === '오전' && hours === 12) hours = 0;
    return { hours, minutes: Number(korean[3]) };
  }

  const plain = text.match(/^(\d{1,2}):(\d{2})$/);
  if (plain) return { hours: Number(plain[1]), minutes: Number(plain[2]) };

  return null;
};

/**
 * 모임 시작 시각을 Date 로 돌려준다. 날짜나 시간을 읽지 못하면 null.
 */
export const parseEventStart = (event) => {
  const datePart = parseDatePart(event?.date);
  const timePart = parseTimePart(event?.time);
  if (!datePart || !timePart) return null;

  const start = new Date(datePart.year, datePart.month, datePart.day, timePart.hours, timePart.minutes, 0, 0);
  return Number.isNaN(start.getTime()) ? null : start;
};

// 두 시각의 달력 날짜 차이 (시각은 무시)
const diffInCalendarDays = (target, now) => {
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
};

/** 'D-1' 형태 배지 문구. 당일은 '오늘' */
export const formatDdayLabel = (start, now = new Date()) => {
  const days = diffInCalendarDays(start, now);
  if (days <= 0) return '오늘';
  return `D-${days}`;
};

/** '토 07:00' 형태. 당일은 '오늘 20:00' */
export const formatEventWhen = (start, now = new Date()) => {
  const hh = String(start.getHours()).padStart(2, '0');
  const mm = String(start.getMinutes()).padStart(2, '0');
  const dayLabel = diffInCalendarDays(start, now) === 0 ? '오늘' : WEEKDAYS[start.getDay()];
  return `${dayLabel} ${hh}:${mm}`;
};

/**
 * 아직 시작하지 않았고 종료 처리도 안 된 모임만 골라 시작 시각이 빠른 순으로 돌려준다.
 * 각 항목은 { event, start }.
 */
export const getUpcomingEvents = (events, now = new Date()) =>
  (events || [])
    .filter((event) => event && event.status !== 'ended')
    .map((event) => ({ event, start: parseEventStart(event) }))
    .filter(({ start }) => start && start.getTime() > now.getTime())
    .sort((a, b) => a.start - b.start);
