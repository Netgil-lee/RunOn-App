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

  /**
   * 이벤트 시간 파싱 (date + time → Date 객체)
   * @param {Object} event - 이벤트 데이터 { date: "2024-01-18", time: "오후 2:30" }
   * @returns {Date|null} 파싱된 Date 객체
   */
  parseEventTime(event) {
    try {
      if (!event || !event.date) {
        console.warn('⚠️ 이벤트 날짜 정보가 없습니다.');
        return null;
      }

      // date 파싱 (YYYY-MM-DD 형식)
      const dateParts = event.date.split('-');
      if (dateParts.length !== 3) {
        console.warn('⚠️ 날짜 형식이 올바르지 않습니다:', event.date);
        return null;
      }

      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // 월은 0부터 시작
      const day = parseInt(dateParts[2], 10);

      // time 파싱 (오전/오후 HH:MM 형식)
      let hour = 9; // 기본값: 오전 9시
      let minute = 0;

      if (event.time) {
        const timeMatch = event.time.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const ampm = timeMatch[1];
          hour = parseInt(timeMatch[2], 10);
          minute = parseInt(timeMatch[3], 10);

          // 12시간 형식을 24시간 형식으로 변환
          if (ampm === '오후' && hour !== 12) {
            hour += 12;
          } else if (ampm === '오전' && hour === 12) {
            hour = 0;
          }
        }
      }

      const eventDate = new Date(year, month, day, hour, minute, 0, 0);
      console.log('📅 파싱된 이벤트 시간:', eventDate.toISOString());
      return eventDate;
    } catch (error) {
      console.error('❌ 이벤트 시간 파싱 실패:', error);
      return null;
    }
  }

  /**
   * 거리 포맷팅
   * @param {number} meters - 미터 단위 거리
   * @returns {string} 포맷팅된 거리 문자열
   */
  formatDistance(meters) {
    if (!meters || meters < 0) return '0m';
    
    if (meters < 1000) {
      // 1000m 미만: 미터 단위로 표시
      return `${Math.round(meters)}m`;
    } else {
      // 1000m 이상: 킬로미터 단위로 표시 (소수점 유지)
      const km = meters / 1000;
      // 소수점이 있는 경우 그대로, 없는 경우 .0 제거
      const kmStr = km % 1 === 0 ? km.toString() : km.toFixed(2).replace(/\.?0+$/, '');
      return `${kmStr}km`;
    }
  }

  /**
   * 페이스 포맷팅 (작은따옴표를 콜론으로, 큰따옴표 제거)
   * @param {string} pace - 페이스 문자열 (예: "6'40\"/km" 또는 "6:40/km")
   * @returns {string} 포맷팅된 페이스 문자열
   */
  formatPace(pace) {
    if (!pace) return '0:00/km';
    
    // 이미 콜론 형식인 경우 그대로 반환
    if (pace.includes(':')) {
      // "/km"가 없으면 추가
      return pace.includes('/km') ? pace : `${pace}/km`;
    }
    
    // 작은따옴표를 콜론으로 변환, 큰따옴표 제거
    let formattedPace = pace
      .replace(/'/g, ':')  // 작은따옴표를 콜론으로
      .replace(/"/g, '');  // 큰따옴표 제거
    
    // "/km"가 없으면 추가
    if (!formattedPace.includes('/km')) {
      formattedPace = `${formattedPace}/km`;
    }
    
    return formattedPace;
  }

  /**
   * 시간 포맷팅
   * @param {number} seconds - 초 단위 시간
   * @returns {string} 포맷팅된 시간 문자열
   */
  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      // 시간이 있으면: "3h 21m" (초 표시 안 함)
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      // 분이 있으면: "54m 19s"
      return `${minutes}m ${secs}s`;
    } else {
      // 초만 있으면: "34s"
      return `${secs}s`;
    }
  }

  /**
   * HealthKit에서 이동경로 좌표 조회
   * @param {Date} startDate - 시작 시간
   * @param {Date} endDate - 종료 시간
   * @returns {Promise<Array>} 좌표 배열 [{latitude, longitude}, ...]
   */
  async getRouteCoordinates(startDate, endDate) {
    try {
      if (!this.isServiceAvailable()) {
        console.warn('⚠️ HealthKit 서비스를 사용할 수 없습니다.');
        return [];
      }

      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        // 시뮬레이터 모드: 더미 데이터 반환
        return [
          { latitude: 37.5665, longitude: 126.9780 },
          { latitude: 37.5666, longitude: 126.9781 },
          { latitude: 37.5667, longitude: 126.9782 }
        ];
      }

      const AppleHealthKit = await loadHealthKitModule();
      if (!AppleHealthKit || typeof AppleHealthKit.getSamples !== 'function') {
        console.warn('⚠️ Location 샘플 조회 불가');
        return [];
      }

      // Location 권한 확인 필요 (현재 권한 목록에 Location이 없을 수 있음)
      // Location 샘플 조회 시도
      return new Promise((resolve) => {
        AppleHealthKit.getSamples(
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            dataType: 'Location', // 또는 AppleHealthKit.Constants.DataTypes.Location
            limit: 1000, // 최대 샘플 수
          },
          (error, results) => {
            if (error) {
              console.warn('⚠️ 이동경로 데이터 조회 실패:', error);
              resolve([]);
              return;
            }

            if (!results || !Array.isArray(results) || results.length === 0) {
              console.log('ℹ️ 이동경로 데이터가 없습니다.');
              resolve([]);
              return;
            }

            // Location 샘플을 좌표 배열로 변환
            const coordinates = results
              .filter(sample => sample.latitude && sample.longitude)
              .map(sample => ({
                latitude: parseFloat(sample.latitude),
                longitude: parseFloat(sample.longitude)
              }));

            console.log(`✅ 이동경로 좌표 ${coordinates.length}개 조회됨`);
            resolve(coordinates);
          }
        );
      });
    } catch (error) {
      console.error('❌ 이동경로 조회 실패:', error);
      return [];
    }
  }

  // 개발용 더미 데이터
  getDummyWorkoutDetails() {
    // 더미 데이터도 실제 포맷팅 함수 사용
    const distanceFormatted = this.formatDistance(5000); // 5km
    const durationFormatted = this.formatDuration(1800); // 30분 → "30m 0s"
    const paceFormatted = this.formatPace("6'00\"/km"); // "6:00/km"
    
    return {
      distance: distanceFormatted,
      duration: durationFormatted,
      pace: paceFormatted,
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
      // 이벤트 시간 파싱
      const eventTime = this.parseEventTime(event);
      if (!eventTime) {
        console.warn('⚠️ 이벤트 시간을 파싱할 수 없습니다.');
        return null;
      }

      // 개발 모드 체크
      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        console.log('🔧 개발 모드: 더미 데이터 사용');
        return this.getDummyWorkoutDetails();
      }

      // HealthKit 서비스 사용 가능 여부 확인
      if (!this.isServiceAvailable()) {
        console.warn('⚠️ HealthKit 서비스를 사용할 수 없습니다.');
        return null;
      }

      const AppleHealthKit = await loadHealthKitModule();
      if (!AppleHealthKit || typeof AppleHealthKit.getSamples !== 'function') {
        console.warn('⚠️ HealthKit 모듈을 사용할 수 없습니다.');
        return null;
      }

      // 조회 범위: 이벤트 시간 ±30분
      const searchStartDate = new Date(eventTime.getTime() - 30 * 60 * 1000);
      const searchEndDate = new Date(eventTime.getTime() + 30 * 60 * 1000);

      console.log('🔍 워크아웃 조회 시작:', {
        이벤트시간: eventTime.toISOString(),
        조회범위: `${searchStartDate.toISOString()} ~ ${searchEndDate.toISOString()}`
      });

      // 워크아웃 데이터 조회
      const workouts = await new Promise((resolve, reject) => {
        AppleHealthKit.getSamples(
          {
            startDate: searchStartDate.toISOString(),
            endDate: searchEndDate.toISOString(),
            dataType: 'Workout',
            limit: 50,
          },
          (error, results) => {
            if (error) {
              console.error('❌ 워크아웃 조회 실패:', error);
              reject(error);
              return;
            }
            resolve(results || []);
          }
        );
      });

      if (!workouts || workouts.length === 0) {
        console.log('❌ 매칭되는 워크아웃 없음');
        return null;
      }

      // 러닝 워크아웃만 필터링 및 가장 가까운 워크아웃 선택
      const runningWorkouts = workouts.filter(workout => {
        // 워크아웃 타입이 Running인지 확인
        const workoutType = workout.workoutType || workout.type;
        return workoutType && (
          workoutType === AppleHealthKit.Constants.WorkoutType.Running ||
          workoutType === 'Running' ||
          workoutType === 1 // Running 타입 코드
        );
      });

      if (runningWorkouts.length === 0) {
        console.log('❌ 러닝 워크아웃 없음');
        return null;
      }

      // 가장 가까운 워크아웃 찾기 (이벤트 시간과의 차이 기준)
      let closestWorkout = null;
      let minTimeDiff = Infinity;

      for (const workout of runningWorkouts) {
        const workoutStartTime = new Date(workout.startDate || workout.start);
        const timeDiff = Math.abs(workoutStartTime.getTime() - eventTime.getTime());
        
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestWorkout = workout;
        }
      }

      if (!closestWorkout) {
        console.log('❌ 매칭되는 워크아웃 없음');
        return null;
      }

      console.log('✅ 매칭되는 워크아웃 발견:', closestWorkout);

      // 워크아웃 데이터 추출 및 포맷팅
      const distanceMeters = closestWorkout.totalDistance || closestWorkout.distance || 0;
      const distanceFormatted = this.formatDistance(distanceMeters);

      // 페이스 추출 (averageSpeed 또는 pace 필드 확인)
      let paceFormatted = '0:00/km';
      if (closestWorkout.averagePace) {
        paceFormatted = this.formatPace(closestWorkout.averagePace);
      } else if (closestWorkout.averageSpeed) {
        // averageSpeed를 페이스로 변환 (m/s → min/km)
        const speedMps = closestWorkout.averageSpeed; // m/s
        if (speedMps > 0) {
          const paceSecondsPerKm = 1000 / speedMps; // 초/km
          const paceMinutes = Math.floor(paceSecondsPerKm / 60);
          const paceSeconds = Math.floor(paceSecondsPerKm % 60);
          paceFormatted = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
        }
      }

      const durationSeconds = closestWorkout.duration || closestWorkout.durationValue || 0;
      const durationFormatted = this.formatDuration(durationSeconds);

      const calories = closestWorkout.totalEnergyBurned || closestWorkout.energyBurned || 0;

      // 이동경로 좌표 조회
      const workoutStartDate = new Date(closestWorkout.startDate || closestWorkout.start);
      const workoutEndDate = new Date(closestWorkout.endDate || closestWorkout.end || workoutStartDate.getTime() + durationSeconds * 1000);
      const routeCoordinates = await this.getRouteCoordinates(workoutStartDate, workoutEndDate);

      const result = {
        distance: distanceFormatted, // 포맷팅된 문자열
        duration: durationFormatted, // 포맷팅된 문자열
        pace: paceFormatted, // 포맷팅된 문자열
        calories: Math.round(calories),
        routeCoordinates: routeCoordinates,
      };

      console.log('✅ 워크아웃 데이터 추출 완료:', result);
      return result;

    } catch (error) {
      console.error('❌ 운동기록 조회 실패:', error);
      return null;
    }
  }
}

export default new AppleFitnessService();