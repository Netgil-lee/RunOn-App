// 애플 피트니스 연동 서비스 - 단순화 버전
import { Platform, NativeModules } from 'react-native';
import env from '../config/environment';

// HealthKit 네이티브 모듈은 시뮬레이터에서 초기화 시점에 크래시를 유발할 수 있으므로
// 반드시 동적 임포트로 지연 로드한다.
async function loadHealthKitModule() {
  // iOS 에서만 로드 (실제 지원 여부는 isAvailable로 판단)
  if (Platform.OS !== 'ios') return undefined;
  try {
    // 1) 동적 임포트 시도 (Hermes 지원)
    const mod = await import('react-native-health');
    const v = (mod && (mod.default ?? mod)) || undefined;
    if (v && (typeof v.isAvailable === 'function' || typeof v.initHealthKit === 'function')) {
      return v;
    }
  } catch (e) {
    // 무시하고 다음 전략으로 폴백
  }
  try {
    // 2) require 폴백 (프로덕션 번들에서 동적 임포트 트리쉐이킹 대비)
    // eslint-disable-next-line global-require
    const req = require('react-native-health');
    const v = (req && (req.default ?? req)) || undefined;
    if (v && (typeof v.isAvailable === 'function' || typeof v.initHealthKit === 'function')) {
      return v;
    }
  } catch (e) {
    // 무시하고 다음 전략으로 폴백
  }
  // 3) 최후의 수단: NativeModules에서 직접 조회 (이름 차이 호환)
  const native = NativeModules?.AppleHealthKit || NativeModules?.RNAppleHealthKit;
  if (native && (typeof native.isAvailable === 'function' || typeof native.initHealthKit === 'function')) {
    return native;
  }
  console.warn('⚠️ HealthKit 모듈 로드 실패: NativeModules keys=', Object.keys(NativeModules || {}));
  return undefined;
}

class AppleFitnessService {
  constructor() {
    this.isAvailable = false;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🏥 HealthKit 초기화 시작');
      
      // 플랫폼 가드만 적용 (시뮬레이터 여부는 isAvailable이 판단)
      if (Platform.OS !== 'ios') {
        console.warn('⚠️ iOS 이외 플랫폼에서는 HealthKit을 사용할 수 없습니다.');
        this.isAvailable = false;
        this.isInitialized = false;
        return false;
      }

      // 개발/시뮬레이터 환경에서 모의 허용 옵션
      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        console.log('🧪 시뮬레이터 HealthKit 모의 허용 활성화');
        this.isAvailable = true;
        this.isInitialized = true;
        return true;
      }
      
      const AppleHealthKit = await loadHealthKitModule();
      // 네이티브 모듈 가드 + 로드 상태 출력
      if (!AppleHealthKit) {
        console.warn('⚠️ AppleHealthKit 네이티브 모듈이 로드되지 않았습니다. NativeModules keys:', Object.keys(NativeModules || {}));
        this.isAvailable = false;
        this.isInitialized = false;
        return false;
      }
      if (typeof AppleHealthKit.isAvailable !== 'function' || typeof AppleHealthKit.initHealthKit !== 'function') {
        console.warn('⚠️ AppleHealthKit 메서드가 없습니다. 키 목록:', Object.keys(AppleHealthKit));
        this.isAvailable = false;
        this.isInitialized = false;
        return false;
      }
      
      // HealthKit 사용 가능 여부 확인
      this.isAvailable = await new Promise((resolve) => {
        AppleHealthKit.isAvailable((error, results) => {
          if (error) {
            console.error('❌ HealthKit 사용 가능 여부 확인 실패:', error);
            resolve(false);
          } else {
            resolve(results);
          }
        });
      });
      
      if (this.isAvailable) {
        // 필요한 권한 요청 (라이브러리 상수 기반으로 구성)
        const buildPermissions = (HK) => {
          const P = HK?.Constants?.Permissions || {};
          return {
            permissions: {
              read: [
                P.DistanceWalkingRunning || 'DistanceWalkingRunning',
                P.ActiveEnergyBurned || 'ActiveEnergyBurned',
                P.HeartRate || 'HeartRate',
                P.Workout || 'Workout',
                P.StepCount || 'StepCount'
              ],
              write: []
            }
          };
        };

        const options = buildPermissions(AppleHealthKit);
        
        // HealthKit 초기화 및 권한 요청
        await new Promise((resolve, reject) => {
          AppleHealthKit.initHealthKit(options, (err, results) => {
            if (err) {
              console.error('❌ HealthKit 초기화 실패:', err?.message || err, options);
              reject(err);
            } else {
              console.log('✅ HealthKit 초기화 성공:', results);
              this.isInitialized = true;
              resolve(results);
            }
          });
        });
        
        console.log('✅ Apple Fitness Service 초기화 완료');
        return true;
      } else {
        console.log('❌ HealthKit을 사용할 수 없습니다 (iOS 8.0 이상 필요)');
        return false;
      }
    } catch (error) {
      console.error('❌ HealthKit 초기화 실패:', error);
      return false;
    }
  }

  async checkPermissions() {
    try {
      console.log('🔍 HealthKit 사용 가능 여부 확인');
      
      if (Platform.OS !== 'ios') {
        return {
          isAvailable: false,
          hasPermissions: false,
          error: '비 iOS 환경에서는 HealthKit을 사용할 수 없습니다.'
        };
      }

      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        return { isAvailable: true, hasPermissions: true, error: null };
      }

      // HealthKit 모듈 동적 로드
      const AppleHealthKit = await loadHealthKitModule();

      // 네이티브 모듈 가드
      if (!AppleHealthKit || typeof AppleHealthKit.isAvailable !== 'function') {
        return {
          isAvailable: false,
          hasPermissions: false,
          error: 'AppleHealthKit 네이티브 모듈이 연결되지 않았습니다.'
        };
      }
      
      // HealthKit 사용 가능 여부 확인
      const isAvailable = await new Promise((resolve) => {
        AppleHealthKit.isAvailable((error, results) => {
          if (error) {
            console.error('❌ HealthKit 사용 가능 여부 확인 실패:', error);
            resolve(false);
          } else {
            resolve(results);
          }
        });
      });
      
      if (!isAvailable) {
        return {
          isAvailable: false,
          hasPermissions: false,
          error: 'HealthKit을 사용할 수 없습니다 (iOS 8.0 이상 필요)'
        };
      }

      this.isAvailable = true;
      
      return {
        isAvailable: true,
        hasPermissions: this.isInitialized,
        error: null
      };
    } catch (error) {
      console.error('❌ HealthKit 상태 확인 실패:', error);
      
      return {
        isAvailable: false,
        hasPermissions: false,
        error: error.message
      };
    }
  }

  async requestPermissions() {
    try {
      console.log('🔍 HealthKit 권한 요청 시작');

      if (Platform.OS !== 'ios') {
        console.warn('⚠️ 시뮬레이터/비 iOS 환경에서는 권한을 요청할 수 없습니다.');
        return false;
      }

      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        console.log('🧪 시뮬레이터에서 권한 모의 허용');
        this.isInitialized = true;
        this.isAvailable = true;
        return true;
      }

      // 모듈 로드 및 가드
      const AppleHealthKit = await loadHealthKitModule();
      if (!AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') {
        console.warn('⚠️ AppleHealthKit 네이티브 모듈이 연결되지 않았습니다. NativeModules keys:', Object.keys(NativeModules || {}));
        return false;
      }

      // 권한 요청 옵션(상수 기반)
      const options = {
        permissions: {
          read: [
            (AppleHealthKit?.Constants?.Permissions?.StepCount) || 'StepCount',
            (AppleHealthKit?.Constants?.Permissions?.DistanceWalkingRunning) || 'DistanceWalkingRunning',
            (AppleHealthKit?.Constants?.Permissions?.ActiveEnergyBurned) || 'ActiveEnergyBurned',
            (AppleHealthKit?.Constants?.Permissions?.HeartRate) || 'HeartRate',
            (AppleHealthKit?.Constants?.Permissions?.Workout) || 'Workout'
          ],
          write: []
        }
      };

      // HealthKit 권한 요청
      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(options, (error, results) => {
          if (error) {
            console.error('❌ HealthKit 권한 요청 실패:', error?.message || error, options);
            resolve(false);
          } else {
            console.log('✅ HealthKit 권한 요청 성공:', results);
            this.isInitialized = true;
            this.isAvailable = true;
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ HealthKit 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 서비스 사용 가능 여부 확인
   * @returns {boolean} 사용 가능 여부
   */
  isServiceAvailable() {
    return this.isAvailable && this.isInitialized;
  }

  // 개발용 더미 데이터
  getDummyWorkoutDetails() {
    return {
      distance: 5000, // 5km
      duration: 1800, // 30분
      pace: '6:00',
      calories: 300,
      routeCoordinates: [
        { latitude: 37.5665, longitude: 126.9780 },
        { latitude: 37.5666, longitude: 126.9781 },
        { latitude: 37.5667, longitude: 126.9782 }
      ]
    };
  }

  // 이벤트와 매칭되는 운동기록 찾기
  async findMatchingWorkout(event) {
    try {
      if (__DEV__) {
        console.log('🔧 개발 모드: 더미 데이터 사용');
        return this.getDummyWorkoutDetails();
      }

      // 실제 HealthKit 데이터 조회 로직
      // (현재는 더미 데이터 반환)
      return this.getDummyWorkoutDetails();
    } catch (error) {
      console.error('❌ 운동기록 조회 실패:', error);
      return null;
    }
  }
}

export default new AppleFitnessService();