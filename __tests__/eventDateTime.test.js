import { parseEventStart, formatDdayLabel, formatEventWhen, getUpcomingEvents } from '../utils/eventDateTime';

describe('parseEventStart', () => {
  it('ISO 날짜 + 오전/오후 시간을 읽는다', () => {
    const start = parseEventStart({ date: '2026-11-21', time: '오후 7:00' });
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()])
      .toEqual([2026, 10, 21, 19, 0]);
  });

  it('한글 날짜(요일 포함) + 24시간 표기를 읽는다', () => {
    const start = parseEventStart({ date: '2026년 11월 21일 (토)', time: '07:30' });
    expect([start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()]).toEqual([10, 21, 7, 30]);
  });

  it('오전 12시는 0시, 오후 12시는 12시', () => {
    expect(parseEventStart({ date: '2026-11-21', time: '오전 12:10' }).getHours()).toBe(0);
    expect(parseEventStart({ date: '2026-11-21', time: '오후 12:10' }).getHours()).toBe(12);
  });

  it('날짜나 시간을 읽지 못하면 null', () => {
    expect(parseEventStart({ date: '2026-11-21' })).toBeNull();
    expect(parseEventStart({ date: '내일', time: '오후 7:00' })).toBeNull();
    expect(parseEventStart(null)).toBeNull();
  });
});

describe('표시 문구', () => {
  const now = new Date(2026, 10, 20, 22, 0); // 금요일 밤 10시

  it('달력 날짜 기준으로 D-day를 센다 (자정을 넘기면 D-1)', () => {
    expect(formatDdayLabel(new Date(2026, 10, 21, 7, 0), now)).toBe('D-1');
    expect(formatDdayLabel(new Date(2026, 10, 20, 23, 0), now)).toBe('오늘');
    expect(formatDdayLabel(new Date(2026, 10, 27, 7, 0), now)).toBe('D-7');
  });

  it('당일은 오늘, 그 외는 요일로 표시한다', () => {
    expect(formatEventWhen(new Date(2026, 10, 21, 7, 0), now)).toBe('토 07:00');
    expect(formatEventWhen(new Date(2026, 10, 20, 23, 5), now)).toBe('오늘 23:05');
  });
});

describe('getUpcomingEvents', () => {
  const now = new Date(2026, 10, 20, 12, 0);
  const events = [
    { id: 'late', date: '2026-11-25', time: '오전 7:00' },
    { id: 'past', date: '2026-11-19', time: '오전 7:00' },
    { id: 'soon', date: '2026-11-21', time: '오전 7:00' },
    { id: 'ended', date: '2026-11-20', time: '오후 8:00', status: 'ended' },
    { id: 'broken', date: null, time: null },
  ];

  it('지난 모임·종료된 모임·날짜 없는 모임을 빼고 가까운 순으로 정렬한다', () => {
    expect(getUpcomingEvents(events, now).map(({ event }) => event.id)).toEqual(['soon', 'late']);
  });

  it('빈 입력에도 빈 배열을 돌려준다', () => {
    expect(getUpcomingEvents(undefined, now)).toEqual([]);
  });
});
