import {
  EXTERNAL_FITNESS_SOURCE,
  isRunOnWorkoutSource,
  parseDurationToSeconds,
  isSameRunningSession,
  getWorkoutDistanceMeters,
  getWorkoutDurationSeconds,
  mergeRunningWorkouts,
} from '../utils/runningWorkouts';

const makeWorkout = (overrides = {}) => ({
  id: 'w-1',
  startTime: '2026-09-15T09:00:00.000Z',
  sourceName: 'Apple Watch',
  raw: { distanceMeters: 5000, durationSeconds: 1800 },
  ...overrides,
});

describe('parseDurationToSeconds', () => {
  it('숫자는 초 단위로 그대로 사용한다', () => {
    expect(parseDurationToSeconds(1800)).toBe(1800);
  });

  it('hh:mm:ss / mm:ss 형태를 해석한다', () => {
    expect(parseDurationToSeconds('1:02:03')).toBe(3723);
    expect(parseDurationToSeconds('5:30')).toBe(330);
  });

  it('"1h 2m 3s" 형태를 해석한다', () => {
    expect(parseDurationToSeconds('1h 2m 3s')).toBe(3723);
    expect(parseDurationToSeconds('30m 0s')).toBe(1800);
  });

  it('해석할 수 없으면 null을 반환한다', () => {
    expect(parseDurationToSeconds('')).toBeNull();
    expect(parseDurationToSeconds(null)).toBeNull();
  });
});

describe('isRunOnWorkoutSource', () => {
  it('소스 이름에 runon이 들어가면 RunOn 기록으로 본다', () => {
    expect(isRunOnWorkoutSource({ sourceName: 'RunOn' })).toBe(true);
    expect(isRunOnWorkoutSource({ sourceLabel: 'runon' })).toBe(true);
    expect(isRunOnWorkoutSource({ sourceName: 'Apple Watch' })).toBe(false);
    expect(isRunOnWorkoutSource({})).toBe(false);
  });
});

describe('isSameRunningSession', () => {
  it('시작 시각과 지속 시간이 가까우면 동일 세션이다', () => {
    const runOn = makeWorkout({ startTime: '2026-09-15T09:00:00.000Z' });
    const apple = makeWorkout({ startTime: '2026-09-15T09:05:00.000Z' });
    expect(isSameRunningSession(runOn, apple)).toBe(true);
  });

  it('시작 시각이 12분 넘게 벌어지면 다른 세션이다', () => {
    const runOn = makeWorkout({ startTime: '2026-09-15T09:00:00.000Z' });
    const apple = makeWorkout({ startTime: '2026-09-15T09:13:00.000Z' });
    expect(isSameRunningSession(runOn, apple)).toBe(false);
  });

  it('지속 시간이 8분 넘게 차이나면 다른 세션이다', () => {
    const runOn = makeWorkout({ raw: { distanceMeters: 5000, durationSeconds: 1800 } });
    const apple = makeWorkout({ raw: { distanceMeters: 9000, durationSeconds: 3000 } });
    expect(isSameRunningSession(runOn, apple)).toBe(false);
  });
});

describe('getWorkoutDistanceMeters / getWorkoutDurationSeconds', () => {
  it('raw 값을 사용하고 없으면 0을 반환한다', () => {
    expect(getWorkoutDistanceMeters(makeWorkout())).toBe(5000);
    expect(getWorkoutDistanceMeters({ distance: '5.2km' })).toBe(0);
    expect(getWorkoutDurationSeconds(makeWorkout())).toBe(1800);
    expect(getWorkoutDurationSeconds({ duration: '30m 0s' })).toBe(1800);
    expect(getWorkoutDurationSeconds({})).toBe(0);
  });
});

describe('mergeRunningWorkouts', () => {
  it('동일 세션은 RunOn 로컬 기록을 남긴다', () => {
    // RunOn은 로컬 기록과 HealthKit 워크아웃을 같은 시작 시각으로 함께 저장한다.
    const runOn = [makeWorkout({ id: 'runon-1', sourceName: 'RunOn' })];
    const apple = [makeWorkout({ id: 'hk-1', sourceName: 'RunOn' })];

    const merged = mergeRunningWorkouts(runOn, apple);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('runon-1');
    expect(merged[0].sourceType).toBe('runon_local');
  });

  it('로컬에서 사라진 과거 RunOn 기록은 HealthKit 쪽에서 살아남는다', () => {
    const runOn = [];
    const apple = [makeWorkout({ id: 'hk-old', sourceName: 'RunOn' })];

    const merged = mergeRunningWorkouts(runOn, apple);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('hk-old');
    expect(merged[0].sourceLabel).toBe('RunOn');
    expect(merged[0].sourceType).toBe('runon_health');
  });

  it('다른 앱 기록은 외부 피트니스 소스로 표시한다', () => {
    const merged = mergeRunningWorkouts([], [makeWorkout({ sourceName: 'Nike Run Club' })]);

    expect(merged[0].sourceLabel).toBe(EXTERNAL_FITNESS_SOURCE.label);
    expect(merged[0].sourceType).toBe(EXTERNAL_FITNESS_SOURCE.type);
  });

  it('Health Connect 매핑 라벨이 붙어 있어도 원본 소스 이름으로 판별한다', () => {
    // healthConnectService는 모든 기록에 sourceLabel 'Google Health Connect'를 붙인다
    const merged = mergeRunningWorkouts([], [makeWorkout({
      sourceName: 'Samsung Health',
      sourceLabel: 'Google Health Connect',
    })]);

    expect(merged[0].sourceType).toBe(EXTERNAL_FITNESS_SOURCE.type);
  });

  it('겹치지 않는 기록은 모두 최신순으로 남긴다', () => {
    const runOn = [makeWorkout({ id: 'runon-1', startTime: '2026-09-15T09:00:00.000Z' })];
    const apple = [
      makeWorkout({ id: 'hk-1', startTime: '2026-09-16T09:00:00.000Z' }),
      makeWorkout({ id: 'hk-2', startTime: '2026-09-14T09:00:00.000Z' }),
    ];

    const merged = mergeRunningWorkouts(runOn, apple);

    expect(merged.map((item) => item.id)).toEqual(['hk-1', 'runon-1', 'hk-2']);
  });

  it('HealthKit이 지속 시간을 주지 않아도 RunOn 사본을 중복 제거한다', () => {
    const runOn = [makeWorkout({
      id: 'runon-1',
      sourceName: 'RunOn',
      routeCoordinates: [{ latitude: 37.5, longitude: 127 }, { latitude: 37.6, longitude: 127.1 }],
    })];
    const apple = [makeWorkout({
      id: 'hk-1',
      sourceName: 'RunOn',
      routeCoordinates: [],
      raw: { distanceMeters: 5000, durationSeconds: 0 },
    })];

    const merged = mergeRunningWorkouts(runOn, apple);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('runon-1');
    expect(merged[0].routeCoordinates).toHaveLength(2);
  });

  it('일시정지로 지속 시간이 벌어져도 RunOn 사본을 중복 제거한다', () => {
    // 로컬은 일시정지를 뺀 활동 시간(30분), HealthKit은 포함한 경과 시간(40분)
    const runOn = [makeWorkout({ id: 'runon-1', sourceName: 'RunOn' })];
    const apple = [makeWorkout({
      id: 'hk-1',
      sourceName: 'RunOn',
      raw: { distanceMeters: 5000, durationSeconds: 2400 },
    })];

    const merged = mergeRunningWorkouts(runOn, apple);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('runon-1');
  });

  it('다른 앱 기록은 지속 시간이 어긋나면 별개 기록으로 남긴다', () => {
    const runOn = [makeWorkout({ id: 'runon-1', sourceName: 'RunOn' })];
    const apple = [makeWorkout({
      id: 'hk-1',
      sourceName: 'Apple Watch',
      raw: { distanceMeters: 5000, durationSeconds: 0 },
    })];

    expect(mergeRunningWorkouts(runOn, apple)).toHaveLength(2);
  });

  it('빈 입력과 null을 허용한다', () => {
    expect(mergeRunningWorkouts(null, undefined)).toEqual([]);
  });
});
