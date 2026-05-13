import Constants from 'expo-constants';

let cached;

/**
 * HealthKit(iOS) 전용 모듈을 지연 로드합니다.
 * 모듈 최상단에서 `Platform` + `require`로 초기화하면 Expo `[runtime not ready]` 단계에서 크래시할 수 있어,
 * `expo-constants`로 iOS 여부만 판별한 뒤 require 합니다.
 */
export function getAppleFitnessService() {
  if (cached !== undefined) return cached;
  if (Constants.platform?.ios == null) {
    cached = null;
    return null;
  }
  try {
    cached = require('./appleFitnessService').default;
  } catch {
    cached = null;
  }
  return cached;
}
