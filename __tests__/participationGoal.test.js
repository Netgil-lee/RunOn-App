import { getParticipationGoal, getWeeklyGoalKm } from '../utils/participationGoal';

describe('getParticipationGoal', () => {
  it('참여 횟수보다 큰 첫 단계가 목표가 된다', () => {
    expect(getParticipationGoal(0)).toEqual({ current: 0, target: 5, ratio: 0 });
    expect(getParticipationGoal(3)).toMatchObject({ target: 5, ratio: 0.6 });
    expect(getParticipationGoal(5)).toMatchObject({ target: 10, ratio: 0.5 });
    expect(getParticipationGoal(30)).toMatchObject({ target: 40 });
    expect(getParticipationGoal(99)).toMatchObject({ target: 100 });
  });

  it('100회 이상은 10회 단위로 늘어나고, 목표를 채운 상태로 멈추지 않는다', () => {
    expect(getParticipationGoal(100)).toMatchObject({ target: 110 });
    expect(getParticipationGoal(104)).toMatchObject({ target: 110 });
    expect(getParticipationGoal(110)).toMatchObject({ target: 120 });
  });

  it('값이 없거나 이상하면 0회로 본다', () => {
    expect(getParticipationGoal(undefined)).toEqual({ current: 0, target: 5, ratio: 0 });
    expect(getParticipationGoal(-2)).toMatchObject({ current: 0 });
  });
});

describe('getWeeklyGoalKm', () => {
  it('레벨별 기본값, 모르는 레벨은 20km', () => {
    expect(getWeeklyGoalKm('beginner')).toBe(10);
    expect(getWeeklyGoalKm('intermediate')).toBe(20);
    expect(getWeeklyGoalKm('advanced')).toBe(30);
    expect(getWeeklyGoalKm(undefined)).toBe(20);
  });
});
