import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@runon:active_running_session_v1';

/**
 * 러닝 활성 세션을 AsyncStorage에 영속화한다.
 *
 * 저장 구조:
 * {
 *   sessionId: string,
 *   startedAtMs: number,        // 러닝 시작 타임스탬프 (ms)
 *   totalPausedMs: number,      // 누적 일시정지 시간 (ms)
 *   distanceMeters: number,     // 누적 거리 (m)
 *   lastSavedAtMs: number,      // 마지막 저장 시각 (ms)
 *   isPaused: boolean,          // 일시정지 여부
 *   pauseStartedAtMs: number|null,
 *   lastCoord: { latitude, longitude } | null,
 * }
 */

const runningTrackingSessionService = {
  async save(sessionData) {
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
        ...sessionData,
        lastSavedAtMs: Date.now(),
      }));
    } catch (error) {
      console.warn('⚠️ 러닝 세션 저장 실패:', error?.message || error);
    }
  },

  async load() {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // 24시간 이상 된 세션은 폐기 (비정상 잔존 방지)
      if (parsed?.lastSavedAtMs && Date.now() - parsed.lastSavedAtMs > 24 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn('⚠️ 러닝 세션 로드 실패:', error?.message || error);
      return null;
    }
  },

  async clear() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn('⚠️ 러닝 세션 삭제 실패:', error?.message || error);
    }
  },

  /**
   * 러닝 진행 중 주기적으로 최신 상태를 덮어쓴다.
   * 인자로 받은 필드만 갱신하고 나머지는 기존 값 유지.
   */
  async update(partialData) {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      const current = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
        ...current,
        ...partialData,
        lastSavedAtMs: Date.now(),
      }));
    } catch (error) {
      console.warn('⚠️ 러닝 세션 업데이트 실패:', error?.message || error);
    }
  },
};

export default runningTrackingSessionService;
