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
    this.recentWorkoutsListCache = {
      key: null,
      cachedAt: 0,
      data: [],
    };
    this.workoutRouteCache = {};
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
                P.StepCount || 'StepCount',
                // WorkoutRoute 권한 추가
                P.WorkoutRoute || 'WorkoutRoute'
              ],
              write: [
                P.Workout || 'Workout',
                P.DistanceWalkingRunning || 'DistanceWalkingRunning',
                P.ActiveEnergyBurned || 'ActiveEnergyBurned',
              ]
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
      // WorkoutRoute는 Workout과 함께 읽을 수 있지만, 명시적으로 요청하는 것이 좋음
      const options = {
        permissions: {
          read: [
            (AppleHealthKit?.Constants?.Permissions?.StepCount) || 'StepCount',
            (AppleHealthKit?.Constants?.Permissions?.DistanceWalkingRunning) || 'DistanceWalkingRunning',
            (AppleHealthKit?.Constants?.Permissions?.ActiveEnergyBurned) || 'ActiveEnergyBurned',
            (AppleHealthKit?.Constants?.Permissions?.HeartRate) || 'HeartRate',
            (AppleHealthKit?.Constants?.Permissions?.Workout) || 'Workout',
            // WorkoutRoute 권한 추가 (일부 라이브러리에서는 Workout만으로도 가능하지만 명시적으로 추가)
            (AppleHealthKit?.Constants?.Permissions?.WorkoutRoute) || 'WorkoutRoute'
          ],
          write: [
            (AppleHealthKit?.Constants?.Permissions?.Workout) || 'Workout',
            (AppleHealthKit?.Constants?.Permissions?.DistanceWalkingRunning) || 'DistanceWalkingRunning',
            (AppleHealthKit?.Constants?.Permissions?.ActiveEnergyBurned) || 'ActiveEnergyBurned',
          ]
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
   * @param {Object} event - 이벤트 데이터 { date: "2024-01-18" | Date | Timestamp, time: "오후 2:30" }
   * @returns {Date|null} 파싱된 Date 객체 (로컬 타임존)
   */
  parseEventTime(event) {
    try {
      console.log('🔍 parseEventTime 시작:', { 
        event: event ? { date: event.date, time: event.time, dateType: typeof event.date } : null 
      });

      if (!event || !event.date) {
        console.warn('⚠️ 이벤트 날짜 정보가 없습니다.');
        return null;
      }

      let dateObj = null;
      let year, month, day;

      // date 파싱 - 다양한 형식 지원
      if (event.date instanceof Date) {
        // Date 객체인 경우
        dateObj = new Date(event.date);
        year = dateObj.getFullYear();
        month = dateObj.getMonth();
        day = dateObj.getDate();
        console.log('📅 Date 객체로 파싱:', { year, month: month + 1, day });
      } else if (typeof event.date === 'string') {
        // 문자열 형식 (YYYY-MM-DD)
        const dateParts = event.date.split('-');
        if (dateParts.length !== 3) {
          console.warn('⚠️ 날짜 형식이 올바르지 않습니다:', event.date);
          return null;
        }
        year = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1; // 월은 0부터 시작
        day = parseInt(dateParts[2], 10);
        console.log('📅 문자열로 파싱:', { year, month: month + 1, day, dateString: event.date });
      } else if (event.date && typeof event.date.toDate === 'function') {
        // Firestore Timestamp 객체인 경우
        dateObj = event.date.toDate();
        year = dateObj.getFullYear();
        month = dateObj.getMonth();
        day = dateObj.getDate();
        console.log('📅 Firestore Timestamp로 파싱:', { year, month: month + 1, day });
      } else if (event.date && typeof event.date.getTime === 'function') {
        // Date-like 객체인 경우
        dateObj = new Date(event.date);
        year = dateObj.getFullYear();
        month = dateObj.getMonth();
        day = dateObj.getDate();
        console.log('📅 Date-like 객체로 파싱:', { year, month: month + 1, day });
      } else {
        console.warn('⚠️ 지원하지 않는 날짜 형식:', event.date, typeof event.date);
        return null;
      }

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
          console.log('⏰ 시간 파싱:', { timeString: event.time, hour, minute, ampm });
        } else {
          console.warn('⚠️ 시간 형식을 파싱할 수 없습니다:', event.time);
        }
      } else {
        console.warn('⚠️ 이벤트 시간 정보가 없습니다. 기본값(오전 9시) 사용');
      }

      // 로컬 타임존으로 Date 객체 생성 (타임존 변환 없이)
      const eventDate = new Date(year, month, day, hour, minute, 0, 0);
      
      console.log('📅 파싱된 이벤트 시간:', {
        로컬시간: eventDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        ISO: eventDate.toISOString(),
        타임스탬프: eventDate.getTime(),
        년월일시분: `${year}-${month + 1}-${day} ${hour}:${minute}`
      });

      return eventDate;
    } catch (error) {
      console.error('❌ 이벤트 시간 파싱 실패:', error, { event });
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

  normalizeRouteCoordinates(locations = []) {
    if (!Array.isArray(locations)) return [];
    return locations
      .filter((location) => {
        const hasLat = location?.latitude !== undefined || location?.lat !== undefined;
        const hasLng = location?.longitude !== undefined || location?.lng !== undefined || location?.lon !== undefined;
        return hasLat && hasLng;
      })
      .map((location) => {
        const lat = location?.latitude ?? location?.lat;
        const lng = location?.longitude ?? location?.lng ?? location?.lon;
        return {
          latitude: Number(lat),
          longitude: Number(lng),
        };
      })
      .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));
  }

  extractWorkoutRouteLocations(results) {
    if (!results) return [];
    if (Array.isArray(results)) return results;
    if (Array.isArray(results?.locations)) return results.locations;
    if (Array.isArray(results?.data)) return results.data;
    if (Array.isArray(results?.data?.locations)) return results.data.locations;

    if (results?.data && typeof results.data === 'object') {
      const keys = Object.keys(results.data);
      for (const key of keys) {
        if (Array.isArray(results.data[key])) {
          const candidate = results.data[key];
          if (candidate.length > 0) {
            return candidate;
          }
        }
      }
    }
    return [];
  }

  async getWorkoutRouteCoordinates(AppleHealthKit, options = {}) {
    try {
      const workoutId = options?.workoutId || null;
      const startTime = options?.startTime || null;
      const endTime = options?.endTime || null;

      if (workoutId && typeof AppleHealthKit?.getWorkoutRouteSamples === 'function') {
        const routeFromWorkout = await new Promise((resolve) => {
          AppleHealthKit.getWorkoutRouteSamples(
            { id: workoutId },
            (error, results) => {
              if (error) {
                resolve([]);
                return;
              }
              const locations = this.extractWorkoutRouteLocations(results);
              resolve(this.normalizeRouteCoordinates(locations));
            }
          );
        });

        if (routeFromWorkout.length > 0) {
          return routeFromWorkout;
        }
      }

      if (startTime && endTime) {
        return await this.getRouteCoordinates(startTime, endTime);
      }

      return [];
    } catch (error) {
      console.warn('⚠️ [AppleFitnessService] 워크아웃 경로 조회 실패:', error?.message || error);
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

  /**
   * HealthKit WorkoutRoute 저장 (가능한 API가 있는 경우에만 best-effort 실행)
   * 라이브러리/OS 조합마다 메서드명이 달라 다중 후보를 순차 시도한다.
   */
  async trySaveWorkoutRoute(AppleHealthKit, payload) {
    try {
      const routeCoordinates = Array.isArray(payload?.routeCoordinates) ? payload.routeCoordinates : [];
      if (routeCoordinates.length < 2) {
        return { success: false, reason: 'NO_ROUTE_POINTS' };
      }

      const workoutId = payload?.workoutId || payload?.id || payload?.uuid || null;
      const normalizedLocations = routeCoordinates
        .map((coord) => ({
          latitude: Number(coord?.latitude),
          longitude: Number(coord?.longitude),
        }))
        .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));

      if (normalizedLocations.length < 2) {
        return { success: false, reason: 'INVALID_ROUTE_POINTS' };
      }

      const methodCandidates = ['saveWorkoutRoute', 'saveWorkoutRouteSamples', 'addWorkoutRoute'];
      for (const methodName of methodCandidates) {
        const routeMethod = AppleHealthKit?.[methodName];
        if (typeof routeMethod !== 'function') {
          continue;
        }

        const routePayload = {
          id: workoutId,
          workoutId,
          uuid: workoutId,
          startDate: payload?.startDate,
          endDate: payload?.endDate,
          locations: normalizedLocations,
          routeCoordinates: normalizedLocations,
        };

        try {
          await new Promise((resolve, reject) => {
            routeMethod.call(AppleHealthKit, routePayload, (error, result) => {
              if (error) {
                reject(error);
                return;
              }
              resolve(result);
            });
          });

          console.log(`✅ [AppleFitnessService] WorkoutRoute 저장 성공 (${methodName})`);
          return { success: true, method: methodName };
        } catch (methodError) {
          console.warn(`⚠️ [AppleFitnessService] WorkoutRoute 저장 실패 (${methodName}):`, methodError?.message || methodError);
        }
      }

      return { success: false, reason: 'NO_ROUTE_SAVE_API' };
    } catch (error) {
      console.warn('⚠️ [AppleFitnessService] WorkoutRoute 저장 시도 중 예외:', error?.message || error);
      return { success: false, reason: 'ROUTE_SAVE_EXCEPTION' };
    }
  }

  /**
   * HealthKit에 RunOn 러닝 기록 저장
   * @param {Object} workoutData
   * @param {Date|string} workoutData.startDate
   * @param {Date|string} workoutData.endDate
   * @param {number} workoutData.distance - meters
   * @param {number} workoutData.calories
   * @returns {Promise<any>}
   */
  async saveWorkout(workoutData) {
    try {
      if (!workoutData?.startDate || !workoutData?.endDate) {
        throw new Error('워크아웃 시작/종료 시간이 필요합니다.');
      }

      const startDate = new Date(workoutData.startDate);
      const endDate = new Date(workoutData.endDate);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('유효하지 않은 워크아웃 시간입니다.');
      }

      if (!this.isServiceAvailable()) {
        const initialized = await this.initialize();
        if (!initialized) {
          const initError = new Error('HealthKit을 초기화할 수 없습니다.');
          initError.code = 'NOT_AVAILABLE';
          throw initError;
        }
      }

      const AppleHealthKit = await loadHealthKitModule();
      if (!AppleHealthKit || typeof AppleHealthKit.saveWorkout !== 'function') {
        const moduleError = new Error('HealthKit saveWorkout API를 사용할 수 없습니다.');
        moduleError.code = 'NOT_AVAILABLE';
        throw moduleError;
      }

      const distanceMeters = Math.max(0, Number(workoutData.distance || 0));
      const calories = Math.max(0, Math.round(Number(workoutData.calories || 0)));
      const routeCoordinates = Array.isArray(workoutData.routeCoordinates)
        ? workoutData.routeCoordinates
        : [];

      return await new Promise((resolve, reject) => {
        AppleHealthKit.saveWorkout(
          {
            type: 'Running',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            distance: distanceMeters,
            distanceUnit: 'meter',
            energyBurned: calories,
            energyBurnedUnit: 'kilocalorie',
            metadata: {
              sourceName: 'RunOn',
              routePointCount: routeCoordinates.length,
            },
          },
          async (error, result) => {
            if (error) {
              const saveError = new Error(error?.message || 'HealthKit 저장 실패');
              const message = (error?.message || '').toLowerCase();
              saveError.code = message.includes('authoriz') || message.includes('permission')
                ? 'NO_PERMISSION'
                : 'UNKNOWN';
              reject(saveError);
              return;
            }

            // 저장 가능한 API가 있을 때 WorkoutRoute를 별도로 저장 시도
            try {
              const workoutId = result?.id || result?.uuid || result?.workoutId || result?.identifier || null;
              await this.trySaveWorkoutRoute(AppleHealthKit, {
                workoutId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                routeCoordinates,
              });
            } catch (routeSaveError) {
              console.warn('⚠️ [AppleFitnessService] WorkoutRoute 후처리 실패:', routeSaveError?.message || routeSaveError);
            }

            resolve(result);
          }
        );
      });
    } catch (error) {
      console.error('❌ [AppleFitnessService] 워크아웃 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 최근 러닝 기록 목록 조회 (러닝 피드용)
   * @param {number} days - 조회 기간(일)
   * @returns {Promise<Array>} 최신순 러닝 기록 배열
   */
  async getRecentRunningWorkouts(days = 14, options = {}) {
    try {
      const includeRoutes = options?.includeRoutes !== false;
      const routeFetchLimit = Number.isFinite(options?.routeFetchLimit)
        ? Math.max(0, Math.floor(options.routeFetchLimit))
        : 12;
      const cacheTtlMs = Number.isFinite(options?.cacheTtlMs)
        ? Math.max(0, Math.floor(options.cacheTtlMs))
        : 60000;
      const cacheKey = JSON.stringify({ days: Number.isFinite(days) ? days : 0 });

      const loadAll = !Number.isFinite(days) || days <= 0;
      const periodDays = loadAll ? 0 : days;

      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        const now = new Date();
        return [{
          id: `dummy-${now.getTime()}`,
          startTime: now.toISOString(),
          sourceName: 'Simulator',
          distance: this.formatDistance(5000),
          duration: this.formatDuration(1800),
          pace: '6:00/km',
          calories: 300,
          routeCoordinates: [
            { latitude: 37.5665, longitude: 126.9780 },
            { latitude: 37.5666, longitude: 126.9781 },
            { latitude: 37.5667, longitude: 126.9782 },
          ],
        }];
      }

      if (!this.isServiceAvailable()) {
        const initialized = await this.initialize();
        if (!initialized) {
          const initError = new Error('HealthKit을 초기화할 수 없습니다.');
          initError.code = 'NOT_AVAILABLE';
          throw initError;
        }
      }

      const AppleHealthKit = await loadHealthKitModule();
      if (!AppleHealthKit || typeof AppleHealthKit.getSamples !== 'function') {
        const moduleError = new Error('HealthKit 모듈을 사용할 수 없습니다.');
        moduleError.code = 'NOT_AVAILABLE';
        throw moduleError;
      }

      const parseDateValue = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === 'number' || typeof value === 'string') {
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        if (typeof value?.getTime === 'function') {
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
      };

      let filteredMapped = [];
      const hasValidListCache = (
        this.recentWorkoutsListCache?.key === cacheKey
        && Date.now() - (this.recentWorkoutsListCache?.cachedAt || 0) < cacheTtlMs
        && Array.isArray(this.recentWorkoutsListCache?.data)
      );

      if (hasValidListCache) {
        filteredMapped = this.recentWorkoutsListCache.data.map((item) => ({
          ...item,
          routeCoordinates: Array.isArray(item.routeCoordinates) ? [...item.routeCoordinates] : [],
        }));
      } else {
        const now = new Date();
        const startDate = loadAll
          ? new Date('2000-01-01T00:00:00.000Z')
          : new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
        const workouts = await new Promise((resolve, reject) => {
          AppleHealthKit.getSamples(
            {
              startDate: startDate.toISOString(),
              endDate: now.toISOString(),
              type: 'Workout',
            },
            (error, results) => {
              if (error) {
                const queryError = new Error(error?.message || '워크아웃 목록 조회 실패');
                const message = (error?.message || '').toLowerCase();
                queryError.code = message.includes('authoriz') || message.includes('permission')
                  ? 'NO_PERMISSION'
                  : 'UNKNOWN';
                reject(queryError);
                return;
              }
              resolve(results || []);
            }
          );
        });

        const runningWorkouts = (workouts || []).filter((workout) => {
          const activityName = workout?.activityName;
          const activityId = workout?.activityId;
          return activityName === 'Running'
            || activityName === AppleHealthKit?.Constants?.Activities?.Running
            || activityId === 1;
        });

        const mapped = runningWorkouts.map((workout) => {
          const startTime = parseDateValue(workout.start) || parseDateValue(workout.startDate);
          const endTime = parseDateValue(workout.end) || parseDateValue(workout.endDate);

          const distanceMiles = Number(workout.distance || 0);
          const distanceMeters = distanceMiles * 1609.34;

          let durationSeconds = Number(workout.duration || 0);
          if ((!durationSeconds || durationSeconds <= 0) && startTime && endTime) {
            durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
          }

          let pace = '0:00/km';
          if (durationSeconds > 0 && distanceMeters > 0) {
            const paceSecondsPerKm = (durationSeconds / distanceMeters) * 1000;
            const paceMinutes = Math.floor(paceSecondsPerKm / 60);
            const paceSeconds = Math.floor(paceSecondsPerKm % 60);
            pace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
          } else if (workout.averagePace) {
            pace = this.formatPace(workout.averagePace);
          }

          const calories = workout.calories || workout.totalEnergyBurned || workout.energyBurned || 0;
          const id = workout.id || workout.uuid || workout.workoutId || workout.identifier
            || `${workout.start || workout.startDate || Math.random()}`;

          return {
            id,
            startTime: startTime ? startTime.toISOString() : null,
            sourceName: workout.sourceName || workout.source || '알 수 없음',
            distance: this.formatDistance(distanceMeters),
            duration: this.formatDuration(durationSeconds),
            pace,
            calories: Math.round(calories),
            routeCoordinates: [],
            _routeQuery: {
              workoutId: id,
              startTime,
              endTime,
            },
          };
        });

        filteredMapped = mapped.filter((item) => !!item.startTime);
        filteredMapped.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        this.recentWorkoutsListCache = {
          key: cacheKey,
          cachedAt: Date.now(),
          data: filteredMapped.map((item) => ({
            ...item,
            routeCoordinates: [],
          })),
        };
      }

      if (includeRoutes && routeFetchLimit > 0) {
        const targetCount = Math.min(routeFetchLimit, filteredMapped.length);
        const routeTargets = filteredMapped.slice(0, targetCount);
        await Promise.all(routeTargets.map(async (item) => {
          try {
            if (Array.isArray(this.workoutRouteCache?.[item.id])) {
              item.routeCoordinates = this.workoutRouteCache[item.id];
              return;
            }
            const routeCoordinates = await this.getWorkoutRouteCoordinates(AppleHealthKit, item._routeQuery);
            item.routeCoordinates = routeCoordinates;
            this.workoutRouteCache[item.id] = routeCoordinates;
          } catch (error) {
            item.routeCoordinates = [];
          }
        }));
      }

      const finalResult = filteredMapped.map((item) => {
        const { _routeQuery, ...rest } = item;
        return rest;
      });

      return finalResult;
    } catch (error) {
      console.error('❌ [AppleFitnessService] 최근 러닝 기록 조회 실패:', error);
      throw error;
    }
  }

  // 이벤트와 매칭되는 운동기록 찾기
  async findMatchingWorkout(event) {
    try {
      console.log('🔍 [AppleFitnessService] findMatchingWorkout 시작');
      console.log('🔍 [AppleFitnessService] event:', JSON.stringify(event, null, 2));
      
      // 이벤트 시간 파싱
      console.log('🔍 [AppleFitnessService] 이벤트 시간 파싱 시작');
      const eventTime = this.parseEventTime(event);
      if (!eventTime) {
        console.warn('⚠️ [AppleFitnessService] 이벤트 시간을 파싱할 수 없습니다.');
        return null;
      }
      console.log('✅ [AppleFitnessService] 이벤트 시간 파싱 완료:', eventTime.toISOString());

      // 개발 모드 체크
      if (__DEV__ && env.simulateHealthKitOnSimulator) {
        console.log('🔧 [AppleFitnessService] 개발 모드: 더미 데이터 사용');
        return this.getDummyWorkoutDetails();
      }

      // HealthKit 서비스 사용 가능 여부 확인
      console.log('🔍 [AppleFitnessService] HealthKit 서비스 사용 가능 여부 확인');
      const isAvailable = this.isServiceAvailable();
      console.log('🔍 [AppleFitnessService] isServiceAvailable 결과:', isAvailable);
      console.log('🔍 [AppleFitnessService] isAvailable:', this.isAvailable, 'isInitialized:', this.isInitialized);
      
      if (!isAvailable) {
        console.warn('⚠️ [AppleFitnessService] HealthKit 서비스를 사용할 수 없습니다.');
        console.warn('⚠️ [AppleFitnessService] 초기화 시도...');
        const initialized = await this.initialize();
        console.log('🔍 [AppleFitnessService] 초기화 결과:', initialized);
        
        if (!initialized) {
          console.warn('⚠️ [AppleFitnessService] HealthKit 초기화 실패');
          return null;
        }
      }

      console.log('🔍 [AppleFitnessService] HealthKit 모듈 로드 시작');
      const AppleHealthKit = await loadHealthKitModule();
      console.log('🔍 [AppleFitnessService] HealthKit 모듈 로드 완료:', AppleHealthKit ? '성공' : '실패');
      
      if (!AppleHealthKit || typeof AppleHealthKit.getSamples !== 'function') {
        console.warn('⚠️ [AppleFitnessService] HealthKit 모듈을 사용할 수 없습니다.');
        console.warn('⚠️ [AppleFitnessService] AppleHealthKit:', AppleHealthKit);
        console.warn('⚠️ [AppleFitnessService] getSamples 함수:', typeof AppleHealthKit?.getSamples);
        return null;
      }
      console.log('✅ [AppleFitnessService] HealthKit 모듈 사용 가능');

      // 조회 범위: 이벤트 시간 ±30분
      const searchStartDate = new Date(eventTime.getTime() - 30 * 60 * 1000);
      const searchEndDate = new Date(eventTime.getTime() + 30 * 60 * 1000);

      // HealthKit은 로컬 타임존 기준으로 작동하므로 ISO 문자열 사용
      // 하지만 타임존 정보를 명시적으로 포함하여 전달
      const startDateISO = searchStartDate.toISOString();
      const endDateISO = searchEndDate.toISOString();

      console.log('🔍 [AppleFitnessService] 워크아웃 조회 시작:', {
        이벤트시간: {
          로컬: eventTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          ISO: eventTime.toISOString(),
          타임스탬프: eventTime.getTime()
        },
        조회범위: {
          시작: {
            로컬: searchStartDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            ISO: startDateISO,
            타임스탬프: searchStartDate.getTime()
          },
          종료: {
            로컬: searchEndDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            ISO: endDateISO,
            타임스탬프: searchEndDate.getTime()
          }
        }
      });

      // 워크아웃 데이터 조회
      // react-native-health 라이브러리에서 getSamples는 'type' 파라미터를 사용합니다 (dataType이 아님!)
      // 문서: https://github.com/agencyenterprise/react-native-healthkit/blob/master/docs/getSamples.md
      // type은 'Walking', 'StairClimbing', 'Running', 'Cycling', 'Workout' 중 하나
      // 'Workout'을 사용하면 모든 워크아웃 타입을 조회합니다
      const workoutType = 'Workout';  // 'Workout' 문자열을 직접 사용
      
      console.log('🔍 [AppleFitnessService] Workout 타입:', workoutType);
      console.log('🔍 [AppleFitnessService] HealthKit Constants:', {
        Activities: AppleHealthKit?.Constants?.Activities,
        Permissions: Object.keys(AppleHealthKit?.Constants?.Permissions || {})
      });
      
      // 네이티브 로그도 출력 (macOS Console에서 확인 가능)
      if (Platform.OS === 'ios') {
        console.log('[NATIVE_LOG] Starting Workout query with type:', workoutType);
        console.log('[NATIVE_LOG] Query range:', startDateISO, 'to', endDateISO);
      }
      
      const workouts = await new Promise((resolve, reject) => {
        console.log('🔍 [AppleFitnessService] getSamples 호출 시작');
        console.log('🔍 [AppleFitnessService] 쿼리 파라미터:', {
          startDate: startDateISO,
          endDate: endDateISO,
          type: workoutType  // dataType이 아니라 type을 사용!
        });
        
        AppleHealthKit.getSamples(
          {
            startDate: startDateISO,
            endDate: endDateISO,
            type: workoutType,  // dataType이 아니라 type을 사용!
          },
          (error, results) => {
            if (error) {
              console.error('❌ [AppleFitnessService] 워크아웃 조회 실패:', error);
              console.error('❌ [AppleFitnessService] 에러 상세:', {
                message: error?.message,
                code: error?.code,
                userInfo: error?.userInfo,
                error: JSON.stringify(error)
              });
              
              // 네이티브 로그도 출력
              if (Platform.OS === 'ios') {
                console.log('[NATIVE_LOG] Workout query failed:', error?.message || error);
              }
              
              reject(error);
              return;
            }
            
            console.log('🔍 [AppleFitnessService] HealthKit 조회 성공, 결과:', results ? `${results.length}개` : 'null');
            
            // 네이티브 로그도 출력
            if (Platform.OS === 'ios') {
              console.log('[NATIVE_LOG] Workout query success, count:', results ? results.length : 0);
            }
            
            resolve(results || []);
          }
        );
      });

      console.log('🔍 [AppleFitnessService] HealthKit 조회 완료');
      
      if (!workouts || workouts.length === 0) {
        console.log('❌ [AppleFitnessService] 매칭되는 워크아웃 없음 (조회 결과가 비어있음)');
        return null;
      }

      console.log(`📊 [AppleFitnessService] 조회된 워크아웃 수: ${workouts.length}`);
      console.log('🔍 [AppleFitnessService] 조회된 워크아웃 샘플:', JSON.stringify(workouts.slice(0, 2), null, 2));
      
      // 소스 앱 정보 로깅 (나이키런클럽, 가민커넥트 등 확인용)
      if (workouts.length > 0) {
        console.log('🔍 [AppleFitnessService] 워크아웃 소스 앱 정보:', workouts.map(w => ({
          sourceName: w.sourceName || w.source || '알 수 없음',
          sourceRevision: w.sourceRevision,
          activityName: w.activityName,
          start: w.start || w.startDate
        })));
      }

      // 러닝 워크아웃만 필터링 및 가장 가까운 워크아웃 선택
      // react-native-health의 getSamples는 activityId 또는 activityName을 반환합니다
      // 소스 앱을 구분하지 않고 모든 러닝 워크아웃을 포함 (나이키런클럽, 가민커넥트 등)
      const runningWorkouts = workouts.filter(workout => {
        // 워크아웃 타입이 Running인지 확인
        // react-native-health는 activityId (숫자) 또는 activityName (문자열)을 반환
        const activityId = workout.activityId;
        const activityName = workout.activityName;
        
        // Running 타입 확인
        // activityId: Running은 보통 특정 숫자 코드를 가짐
        // activityName: 'Running' 문자열
        // 또는 Activities 상수에서 확인
        const isRunning = 
          activityName === 'Running' ||
          activityName === AppleHealthKit?.Constants?.Activities?.Running ||
          activityId === 1 || // Running 타입 코드 (일반적으로 1)
          workout.activityName === 'Running';
        
        if (!isRunning) {
          console.log('⚠️ [AppleFitnessService] 러닝이 아닌 워크아웃:', { 
            activityId: activityId,
            activityName: activityName,
            workout: workout
          });
        }
        
        return isRunning;
      });

      if (runningWorkouts.length === 0) {
        console.log('❌ [AppleFitnessService] 러닝 워크아웃 없음');
        console.log('🔍 [AppleFitnessService] 필터링 전 워크아웃 타입들:', workouts.map(w => ({
          workoutType: w.workoutType,
          type: w.type,
          전체데이터: w
        })));
        return null;
      }

      console.log(`🏃 [AppleFitnessService] 러닝 워크아웃 수: ${runningWorkouts.length}`);

      // 워크아웃 분류: 이동경로 데이터가 있을 가능성이 있는 워크아웃과 없는 워크아웃
      // UUID가 있으면 이동경로 데이터가 있을 가능성이 높음
      const workoutsWithRoute = []; // 이동경로 데이터가 있을 가능성이 있는 워크아웃
      const workoutsWithoutRoute = []; // 이동경로 데이터가 없을 가능성이 있는 워크아웃

      for (const workout of runningWorkouts) {
        // 워크아웃 시작 시간 파싱 - 다양한 형식 지원
        // react-native-health의 getSamples는 'start' 필드를 반환합니다 (startDate가 아님!)
        let workoutStartTime = null;
        
        // react-native-health는 'start' 필드를 ISO 문자열로 반환
        if (workout.start) {
          if (typeof workout.start === 'string') {
            workoutStartTime = new Date(workout.start);
          } else if (typeof workout.start === 'number') {
            workoutStartTime = new Date(workout.start);
          } else if (workout.start instanceof Date) {
            workoutStartTime = new Date(workout.start);
          } else if (workout.start && typeof workout.start.getTime === 'function') {
            workoutStartTime = new Date(workout.start);
          }
        } else if (workout.startDate) {
          // startDate 필드도 확인 (다른 라이브러리 호환성)
          if (typeof workout.startDate === 'string') {
            workoutStartTime = new Date(workout.startDate);
          } else if (typeof workout.startDate === 'number') {
            workoutStartTime = new Date(workout.startDate);
          } else if (workout.startDate instanceof Date) {
            workoutStartTime = new Date(workout.startDate);
          } else if (workout.startDate && typeof workout.startDate.getTime === 'function') {
            workoutStartTime = new Date(workout.startDate);
          }
        }

        if (!workoutStartTime || isNaN(workoutStartTime.getTime())) {
          console.warn('⚠️ 워크아웃 시작 시간을 파싱할 수 없습니다:', {
            startDate: workout.startDate,
            start: workout.start,
            workout: workout
          });
          continue;
        }

        const timeDiff = Math.abs(workoutStartTime.getTime() - eventTime.getTime());
        
        console.log('🔍 워크아웃 시간 비교:', {
          워크아웃시작: {
            로컬: workoutStartTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            ISO: workoutStartTime.toISOString(),
            타임스탬프: workoutStartTime.getTime()
          },
          이벤트시간: {
            로컬: eventTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            ISO: eventTime.toISOString(),
            타임스탬프: eventTime.getTime()
          },
          시간차: `${Math.round(timeDiff / 1000 / 60)}분`,
          UUID: workout.id || workout.uuid || workout.workoutId || workout.identifier || '없음',
          소스앱: workout.sourceName || workout.source || '알 수 없음'
        });

        // UUID가 있으면 이동경로 데이터가 있을 가능성이 높음
        const hasUUID = !!(workout.id || workout.uuid || workout.workoutId || workout.identifier);
        
        if (hasUUID) {
          workoutsWithRoute.push({ workout, timeDiff, workoutStartTime });
        } else {
          workoutsWithoutRoute.push({ workout, timeDiff, workoutStartTime });
        }
      }

      // 1순위: 이동경로 데이터가 있을 가능성이 있는 워크아웃 중 이벤트 시간과 가장 가까운 것 선택
      let closestWorkout = null;
      let minTimeDiff = Infinity;

      if (workoutsWithRoute.length > 0) {
        console.log(`✅ [AppleFitnessService] 이동경로 데이터가 있을 가능성이 있는 워크아웃 ${workoutsWithRoute.length}개 발견`);
        for (const { workout, timeDiff } of workoutsWithRoute) {
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestWorkout = workout;
          }
        }
        console.log('✅ [AppleFitnessService] 이동경로 데이터가 있을 가능성이 있는 워크아웃 중 선택:', {
          소스앱: closestWorkout.sourceName || closestWorkout.source || '알 수 없음',
          시간차: `${Math.round(minTimeDiff / 1000 / 60)}분`
        });
      } else {
        // 2순위: 이동경로 데이터가 없을 가능성이 있는 워크아웃 중 이벤트 시간과 가장 가까운 것 선택
        console.log(`⚠️ [AppleFitnessService] 이동경로 데이터가 있을 가능성이 있는 워크아웃 없음. 일반 워크아웃 ${workoutsWithoutRoute.length}개 중 선택`);
        for (const { workout, timeDiff } of workoutsWithoutRoute) {
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestWorkout = workout;
          }
        }
        if (closestWorkout) {
          console.log('⚠️ [AppleFitnessService] 이동경로 데이터가 없을 가능성이 있는 워크아웃 중 선택:', {
            소스앱: closestWorkout.sourceName || closestWorkout.source || '알 수 없음',
            시간차: `${Math.round(minTimeDiff / 1000 / 60)}분`
          });
        }
      }

      if (!closestWorkout) {
        console.log('❌ [AppleFitnessService] 매칭되는 워크아웃 없음 (시간 비교 실패)');
        return null;
      }

      // 매칭된 워크아웃의 시작 시간 다시 파싱 (일관성 유지)
      // react-native-health는 'start' 필드를 반환합니다
      let matchedWorkoutStartTime = null;
      if (closestWorkout.start) {
        if (typeof closestWorkout.start === 'string') {
          matchedWorkoutStartTime = new Date(closestWorkout.start);
        } else if (typeof closestWorkout.start === 'number') {
          matchedWorkoutStartTime = new Date(closestWorkout.start);
        } else if (closestWorkout.start instanceof Date) {
          matchedWorkoutStartTime = new Date(closestWorkout.start);
        } else if (closestWorkout.start && typeof closestWorkout.start.getTime === 'function') {
          matchedWorkoutStartTime = new Date(closestWorkout.start);
        }
      } else if (closestWorkout.startDate) {
        // startDate 필드도 확인 (다른 라이브러리 호환성)
        if (typeof closestWorkout.startDate === 'string') {
          matchedWorkoutStartTime = new Date(closestWorkout.startDate);
        } else if (typeof closestWorkout.startDate === 'number') {
          matchedWorkoutStartTime = new Date(closestWorkout.startDate);
        } else if (closestWorkout.startDate instanceof Date) {
          matchedWorkoutStartTime = new Date(closestWorkout.startDate);
        } else if (closestWorkout.startDate && typeof closestWorkout.startDate.getTime === 'function') {
          matchedWorkoutStartTime = new Date(closestWorkout.startDate);
        }
      }

      if (!matchedWorkoutStartTime || isNaN(matchedWorkoutStartTime.getTime())) {
        console.warn('⚠️ 매칭된 워크아웃의 시작 시간을 파싱할 수 없습니다. 기본값 사용');
        matchedWorkoutStartTime = new Date();
      }

      console.log('✅ [AppleFitnessService] 매칭되는 워크아웃 발견:', {
        워크아웃: closestWorkout,
        소스앱: closestWorkout.sourceName || closestWorkout.source || '알 수 없음',
        시작시간: {
          로컬: matchedWorkoutStartTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          ISO: matchedWorkoutStartTime.toISOString(),
          타임스탬프: matchedWorkoutStartTime.getTime()
        },
        시간차: `${Math.round(minTimeDiff / 1000 / 60)}분`
      });

      // 워크아웃 데이터 추출 및 포맷팅
      // react-native-health의 getSamples는 다음 필드를 반환:
      // - distance: Number (마일 단위)
      // - calories: Number (칼로리)
      // - start: String (ISO 문자열)
      // - end: String (ISO 문자열)
      // 주의: duration 필드는 없으므로 start와 end로부터 계산해야 함!
      
      console.log('🔍 [AppleFitnessService] closestWorkout 원본 데이터:', JSON.stringify(closestWorkout, null, 2));
      
      // 거리: 마일을 미터로 변환 (react-native-health는 마일 단위로 반환)
      const distanceMiles = closestWorkout.distance || 0;
      const distanceMeters = distanceMiles * 1609.34; // 마일을 미터로 변환
      console.log('🔍 [AppleFitnessService] 거리:', { 마일: distanceMiles, 미터: distanceMeters });
      
      const distanceFormatted = this.formatDistance(distanceMeters);

      // 워크아웃 종료 시간 먼저 파싱 (duration 계산에 필요)
      let workoutEndDate = null;
      if (closestWorkout.end) {
        if (typeof closestWorkout.end === 'string') {
          workoutEndDate = new Date(closestWorkout.end);
        } else if (typeof closestWorkout.end === 'number') {
          workoutEndDate = new Date(closestWorkout.end);
        } else if (closestWorkout.end instanceof Date) {
          workoutEndDate = new Date(closestWorkout.end);
        } else if (closestWorkout.end && typeof closestWorkout.end.getTime === 'function') {
          workoutEndDate = new Date(closestWorkout.end);
        }
      } else if (closestWorkout.endDate) {
        // endDate 필드도 확인 (다른 라이브러리 호환성)
        if (typeof closestWorkout.endDate === 'string') {
          workoutEndDate = new Date(closestWorkout.endDate);
        } else if (typeof closestWorkout.endDate === 'number') {
          workoutEndDate = new Date(closestWorkout.endDate);
        } else if (closestWorkout.endDate instanceof Date) {
          workoutEndDate = new Date(closestWorkout.endDate);
        } else if (closestWorkout.endDate && typeof closestWorkout.endDate.getTime === 'function') {
          workoutEndDate = new Date(closestWorkout.endDate);
        }
      }
      
      // 운동 시간(Active Time) 추출 - 일시정지 시간 제외
      // HealthKit의 duration 필드 = 실제 운동 시간 (일시정지 제외)
      // start/end 차이 = 경과 시간 (일시정지 포함) - 사용하지 않음!
      let durationSeconds = 0;
      let durationSource = 'unknown';
      
      // getSamples는 duration 필드를 반환하지 않으므로,
      // getAnchoredWorkouts를 통해 HealthKit의 실제 운동 시간(Active Time, 일시정지 제외)을 조회
      let anchoredWorkoutDetails = null;
      if (AppleHealthKit?.getAnchoredWorkouts) {
        try {
          console.log('🔍 [AppleFitnessService] getAnchoredWorkouts로 Active Time duration 조회 시도');
          // workoutEndDate에 의존하지 않고 matchedWorkoutStartTime 기준 넉넉한 범위 사용
          const anchoredQueryStart = new Date(matchedWorkoutStartTime.getTime() - 2 * 60 * 1000); // -2분
          const anchoredQueryEnd = new Date(matchedWorkoutStartTime.getTime() + 6 * 60 * 60 * 1000); // +6시간

          const anchoredResults = await new Promise((resolve) => {
            AppleHealthKit.getAnchoredWorkouts(
              {
                startDate: anchoredQueryStart.toISOString(),
                endDate: anchoredQueryEnd.toISOString(),
                // type 파라미터 제거: 모든 워크아웃 대상으로 조회
              },
              (error, results) => {
                if (error) {
                  console.warn('⚠️ [AppleFitnessService] getAnchoredWorkouts 실패:', error);
                  resolve(null);
                  return;
                }
                resolve(results);
              }
            );
          });

          const data = anchoredResults?.data;
          if (Array.isArray(data) && data.length > 0) {
            // start 시간이 matchedWorkoutStartTime과 2분 이내인 워크아웃 찾기
            const matchingAnchoredWorkout = data.find(workout => {
              const anchoredStart = workout.start ? new Date(workout.start) : null;
              if (!anchoredStart) return false;
              const timeDiff = Math.abs(anchoredStart.getTime() - matchedWorkoutStartTime.getTime());
              return timeDiff < 2 * 60 * 1000; // 2분 이내
            });

            if (matchingAnchoredWorkout) {
              anchoredWorkoutDetails = matchingAnchoredWorkout;
              console.log('✅ [AppleFitnessService] getAnchoredWorkouts 매칭 성공:', {
                id: matchingAnchoredWorkout.id || matchingAnchoredWorkout.uuid,
                duration: matchingAnchoredWorkout.duration,
                activeDuration: matchingAnchoredWorkout.activeDuration,
                totalDuration: matchingAnchoredWorkout.totalDuration,
                allKeys: Object.keys(matchingAnchoredWorkout),
              });
            } else {
              console.warn('⚠️ [AppleFitnessService] getAnchoredWorkouts: 2분 이내 매칭 워크아웃 없음. 전체 목록:', data.map(w => ({
                start: w.start,
                duration: w.duration,
              })));
            }
          } else {
            console.warn('⚠️ [AppleFitnessService] getAnchoredWorkouts: 조회 결과 없음');
          }
        } catch (error) {
          console.error('❌ [AppleFitnessService] getAnchoredWorkouts 예외:', error);
        }
      } else {
        console.warn('⚠️ [AppleFitnessService] getAnchoredWorkouts 메서드 없음 (react-native-health 버전 확인 필요)');
      }
      
      // 워크아웃의 모든 필드 로깅 (디버깅용)
      console.log('🔍 [AppleFitnessService] 워크아웃 전체 필드:', {
        duration: closestWorkout.duration,
        totalDuration: closestWorkout.totalDuration,
        activeDuration: closestWorkout.activeDuration,
        movingTime: closestWorkout.movingTime,
        activeTime: closestWorkout.activeTime,
        metadata: closestWorkout.metadata,
        allKeys: Object.keys(closestWorkout)
      });
      
      // 메타데이터 상세 로깅
      if (closestWorkout.metadata) {
        console.log('🔍 [AppleFitnessService] 메타데이터 상세:', {
          metadata: closestWorkout.metadata,
          metadataKeys: Object.keys(closestWorkout.metadata),
          HKWorkoutDuration: closestWorkout.metadata.HKWorkoutDuration,
          HKWorkoutActiveDuration: closestWorkout.metadata.HKWorkoutActiveDuration,
          HKWorkoutElapsedTime: closestWorkout.metadata.HKWorkoutElapsedTime,
          HKWorkoutTotalEnergyBurned: closestWorkout.metadata.HKWorkoutTotalEnergyBurned,
          HKWorkoutTotalDistance: closestWorkout.metadata.HKWorkoutTotalDistance
        });
      }
      
      // 1순위: getAnchoredWorkouts에서 가져온 상세 정보의 duration 확인
      if (anchoredWorkoutDetails) {
        if (anchoredWorkoutDetails.duration && anchoredWorkoutDetails.duration > 0) {
          durationSeconds = anchoredWorkoutDetails.duration;
          durationSource = 'getAnchoredWorkouts.duration (Active Time)';
          console.log('✅ [AppleFitnessService] getAnchoredWorkouts에서 duration 추출:', durationSeconds, '초');
        } else if (anchoredWorkoutDetails.activeDuration && anchoredWorkoutDetails.activeDuration > 0) {
          durationSeconds = anchoredWorkoutDetails.activeDuration;
          durationSource = 'getAnchoredWorkouts.activeDuration (Active Time)';
          console.log('✅ [AppleFitnessService] getAnchoredWorkouts에서 activeDuration 추출:', durationSeconds, '초');
        } else if (anchoredWorkoutDetails.totalDuration && anchoredWorkoutDetails.totalDuration > 0) {
          durationSeconds = anchoredWorkoutDetails.totalDuration;
          durationSource = 'getAnchoredWorkouts.totalDuration (Active Time 가능)';
          console.log('✅ [AppleFitnessService] getAnchoredWorkouts에서 totalDuration 추출:', durationSeconds, '초');
        }
      }
      
      // 2순위: 메타데이터에서 Active Duration 확인 (HealthKit의 실제 운동 시간)
      if (durationSeconds === 0 && closestWorkout.metadata) {
        const metadata = closestWorkout.metadata;
        
        // HKWorkoutActiveDuration: 실제 운동 시간 (일시정지 제외) - 가장 정확
        if (metadata.HKWorkoutActiveDuration && metadata.HKWorkoutActiveDuration > 0) {
          // 초 단위로 변환 (밀리초일 수 있음)
          durationSeconds = typeof metadata.HKWorkoutActiveDuration === 'number' 
            ? (metadata.HKWorkoutActiveDuration > 1000000 
                ? Math.floor(metadata.HKWorkoutActiveDuration / 1000) // 밀리초인 경우
                : metadata.HKWorkoutActiveDuration) // 초 단위인 경우
            : 0;
          
          if (durationSeconds > 0) {
            durationSource = 'metadata.HKWorkoutActiveDuration (Active Time)';
            console.log('✅ [AppleFitnessService] 메타데이터 HKWorkoutActiveDuration에서 운동 시간 추출:', durationSeconds, '초');
          }
        }
        // HKWorkoutDuration: 워크아웃 지속 시간 (일부 경우 Active Time과 동일)
        else if (metadata.HKWorkoutDuration && metadata.HKWorkoutDuration > 0) {
          durationSeconds = typeof metadata.HKWorkoutDuration === 'number'
            ? (metadata.HKWorkoutDuration > 1000000
                ? Math.floor(metadata.HKWorkoutDuration / 1000)
                : metadata.HKWorkoutDuration)
            : 0;
          
          if (durationSeconds > 0) {
            durationSource = 'metadata.HKWorkoutDuration (Active Time 가능)';
            console.log('✅ [AppleFitnessService] 메타데이터 HKWorkoutDuration에서 운동 시간 추출:', durationSeconds, '초');
          }
        }
      }
      
      // 3순위: duration 필드 (HealthKit의 실제 운동 시간 = Active Time)
      if (durationSeconds === 0 && closestWorkout.duration && closestWorkout.duration > 0) {
        durationSeconds = closestWorkout.duration;
        durationSource = 'duration (Active Time)';
        console.log('✅ [AppleFitnessService] duration 필드에서 운동 시간 추출:', durationSeconds, '초');
      }
      // 4순위: 다른 가능한 운동 시간 필드명들
      if (durationSeconds === 0 && closestWorkout.activeDuration && closestWorkout.activeDuration > 0) {
        durationSeconds = closestWorkout.activeDuration;
        durationSource = 'activeDuration';
        console.log('✅ [AppleFitnessService] activeDuration 필드에서 운동 시간 추출:', durationSeconds, '초');
      }
      if (durationSeconds === 0 && closestWorkout.movingTime && closestWorkout.movingTime > 0) {
        durationSeconds = closestWorkout.movingTime;
        durationSource = 'movingTime';
        console.log('✅ [AppleFitnessService] movingTime 필드에서 운동 시간 추출:', durationSeconds, '초');
      }
      if (durationSeconds === 0 && closestWorkout.activeTime && closestWorkout.activeTime > 0) {
        durationSeconds = closestWorkout.activeTime;
        durationSource = 'activeTime';
        console.log('✅ [AppleFitnessService] activeTime 필드에서 운동 시간 추출:', durationSeconds, '초');
      }
      if (durationSeconds === 0 && closestWorkout.totalDuration && closestWorkout.totalDuration > 0) {
        durationSeconds = closestWorkout.totalDuration;
        durationSource = 'totalDuration';
        console.log('✅ [AppleFitnessService] totalDuration 필드에서 운동 시간 추출:', durationSeconds, '초');
      }
      // 경과 시간(start/end)은 사용하지 않음. 운동 시간(Active Time)만 사용

      console.log('🔍 [AppleFitnessService] 최종 duration:', {
        초: durationSeconds,
        출처: durationSource,
        분: Math.floor(durationSeconds / 60),
        설명: durationSource.includes('경과 시간') ? '⚠️ 일시정지 포함됨' : '✅ 실제 운동 시간'
      });

      // 페이스 계산 - 운동 시간(Active Time) 기반
      // 페이스 = 운동 시간 / 거리 (일시정지 제외된 정확한 페이스)
      let paceFormatted = '0:00/km';
      let paceSource = 'unknown';
      
      if (durationSeconds > 0 && distanceMeters > 0) {
        // 운동 시간과 거리로부터 페이스 계산
        const paceSecondsPerKm = (durationSeconds / distanceMeters) * 1000; // 초/km
        const paceMinutes = Math.floor(paceSecondsPerKm / 60);
        const paceSeconds = Math.floor(paceSecondsPerKm % 60);
        paceFormatted = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
        paceSource = `계산 (${durationSource})`;
        
        const isAccuratePace = !durationSource.includes('경과 시간');
        console.log(isAccuratePace ? '✅' : '⚠️', '[AppleFitnessService] 페이스 계산:', {
          페이스: paceFormatted,
          운동시간: `${Math.floor(durationSeconds / 60)}분 ${durationSeconds % 60}초`,
          거리: `${(distanceMeters / 1000).toFixed(2)}km`,
          시간출처: durationSource,
          정확도: isAccuratePace ? '정확 (운동 시간 기반)' : '부정확 (경과 시간 기반 - 일시정지 포함)'
        });
      } else if (closestWorkout.averagePace) {
        paceFormatted = this.formatPace(closestWorkout.averagePace);
        paceSource = 'averagePace 필드';
        console.log('✅ [AppleFitnessService] averagePace 필드에서 추출:', paceFormatted);
      } else if (closestWorkout.averageSpeed) {
        // averageSpeed를 페이스로 변환 (m/s → min/km)
        const speedMps = closestWorkout.averageSpeed; // m/s
        if (speedMps > 0) {
          const paceSecondsPerKm = 1000 / speedMps; // 초/km
          const paceMinutes = Math.floor(paceSecondsPerKm / 60);
          const paceSeconds = Math.floor(paceSecondsPerKm % 60);
          paceFormatted = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
          paceSource = 'averageSpeed 변환';
          console.log('✅ [AppleFitnessService] averageSpeed에서 페이스 계산:', paceFormatted);
        }
      } else {
        console.warn('⚠️ [AppleFitnessService] 페이스를 계산할 수 없습니다:', {
          durationSeconds,
          distanceMeters,
          durationSource,
          averagePace: closestWorkout.averagePace,
          averageSpeed: closestWorkout.averageSpeed
        });
      }

      const durationFormatted = this.formatDuration(durationSeconds);
      console.log('🔍 [AppleFitnessService] 포맷팅된 duration:', durationFormatted);

      const calories = closestWorkout.calories || closestWorkout.totalEnergyBurned || closestWorkout.energyBurned || 0;

      // 종료 시간이 없으면 시작 시간 + 지속 시간으로 계산
      if (!workoutEndDate || isNaN(workoutEndDate.getTime())) {
        if (durationSeconds > 0) {
          workoutEndDate = new Date(matchedWorkoutStartTime.getTime() + durationSeconds * 1000);
          console.log('⚠️ [AppleFitnessService] 워크아웃 종료 시간이 없어 시작 시간 + 지속 시간으로 계산:', {
            시작: matchedWorkoutStartTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            지속시간: `${durationSeconds}초`,
            종료: workoutEndDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
          });
        } else {
          // duration도 없으면 기본값 사용
          workoutEndDate = new Date(matchedWorkoutStartTime.getTime() + 30 * 60 * 1000); // 30분 가정
          console.warn('⚠️ [AppleFitnessService] 워크아웃 종료 시간과 지속 시간이 모두 없어 기본값(30분) 사용');
        }
      }
      
      console.log('🔍 [AppleFitnessService] 워크아웃 종료 시간:', {
        로컬: workoutEndDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        ISO: workoutEndDate.toISOString()
      });

      // 이동경로 좌표 조회
      // 워크아웃의 이동경로를 가져오려면 getWorkoutRouteSamples를 사용해야 함
      // 하지만 getSamples는 UUID를 반환하지 않을 수 있으므로, getAnchoredWorkouts를 사용하여 UUID를 얻어야 함
      console.log('🔍 [AppleFitnessService] 이동경로 좌표 조회 시작');
      console.log('🔍 [AppleFitnessService] closestWorkout 객체 확인:', {
        id: closestWorkout.id,
        uuid: closestWorkout.uuid,
        workoutId: closestWorkout.workoutId,
        identifier: closestWorkout.identifier,
        모든필드: Object.keys(closestWorkout)
      });
      
      // 워크아웃 UUID 확인 (여러 가능한 필드명 확인)
      let workoutUUID = closestWorkout.id || 
                       closestWorkout.uuid || 
                       closestWorkout.workoutId ||
                       closestWorkout.identifier;
      
      // getSamples가 UUID를 반환하지 않는 경우, getAnchoredWorkouts를 사용하여 UUID 얻기
      if (!workoutUUID && AppleHealthKit?.getAnchoredWorkouts) {
        console.log('🔍 [AppleFitnessService] getSamples에 UUID가 없어 getAnchoredWorkouts로 UUID 조회 시도');
        try {
          const anchoredResults = await new Promise((resolve, reject) => {
            AppleHealthKit.getAnchoredWorkouts(
              {
                startDate: matchedWorkoutStartTime.toISOString(),
                endDate: workoutEndDate.toISOString(),
                type: 'Running', // Running 타입만 조회
              },
              (error, results) => {
                if (error) {
                  console.warn('⚠️ [AppleFitnessService] getAnchoredWorkouts 실패:', error);
                  resolve(null);
                  return;
                }
                resolve(results);
              }
            );
          });
          
          if (anchoredResults && anchoredResults.data && Array.isArray(anchoredResults.data)) {
            // 매칭된 워크아웃과 같은 시간의 워크아웃 찾기
            const matchingAnchoredWorkout = anchoredResults.data.find(workout => {
              const anchoredStart = workout.start ? new Date(workout.start) : null;
              if (!anchoredStart) return false;
              const timeDiff = Math.abs(anchoredStart.getTime() - matchedWorkoutStartTime.getTime());
              return timeDiff < 60 * 1000; // 1분 이내
            });
            
            if (matchingAnchoredWorkout) {
              workoutUUID = matchingAnchoredWorkout.id || 
                           matchingAnchoredWorkout.uuid || 
                           matchingAnchoredWorkout.workoutId ||
                           matchingAnchoredWorkout.identifier;
              console.log('✅ [AppleFitnessService] getAnchoredWorkouts에서 UUID 찾음:', workoutUUID);
            }
          }
        } catch (error) {
          console.error('❌ [AppleFitnessService] getAnchoredWorkouts 예외:', error);
        }
      }
      
      let routeCoordinates = [];
      
      if (workoutUUID && AppleHealthKit?.getWorkoutRouteSamples) {
        // getWorkoutRouteSamples를 사용하여 워크아웃의 이동경로 가져오기
        console.log('🔍 [AppleFitnessService] getWorkoutRouteSamples 사용, UUID:', workoutUUID);
        
        // WorkoutRoute 권한 확인 및 재요청
        try {
          // 권한 확인
          const hasPermission = await new Promise((resolve) => {
            if (AppleHealthKit.getAuthStatus) {
              AppleHealthKit.getAuthStatus(
                {
                  type: AppleHealthKit?.Constants?.Permissions?.WorkoutRoute || 'WorkoutRoute'
                },
                (error, status) => {
                  if (error) {
                    console.warn('⚠️ [AppleFitnessService] WorkoutRoute 권한 확인 실패:', error);
                    resolve(false);
                    return;
                  }
                  // status: 0 = notDetermined, 1 = sharingDenied, 2 = sharingAuthorized
                  const isAuthorized = status === 2;
                  console.log('🔍 [AppleFitnessService] WorkoutRoute 권한 상태:', status, isAuthorized ? '허용됨' : '거부됨');
                  resolve(isAuthorized);
                }
              );
            } else {
              resolve(true); // getAuthStatus가 없으면 권한 확인 불가, 시도해봄
            }
          });
          
          // 권한이 없으면 재요청
          if (!hasPermission) {
            console.log('🔍 [AppleFitnessService] WorkoutRoute 권한이 없어 재요청 시도');
            await this.requestPermissions();
          }
        } catch (error) {
          console.warn('⚠️ [AppleFitnessService] 권한 확인 중 오류:', error);
        }
        
        try {
          routeCoordinates = await new Promise((resolve) => {
            AppleHealthKit.getWorkoutRouteSamples(
              {
                id: workoutUUID,
              },
              (error, results) => {
                if (error) {
                  console.warn('⚠️ [AppleFitnessService] getWorkoutRouteSamples 실패:', error);
                  console.warn('⚠️ [AppleFitnessService] 에러 상세:', {
                    message: error?.message,
                    code: error?.code,
                    domain: error?.domain
                  });
                  // 실패 시 시간 범위 기반 조회로 폴백
                  resolve([]);
                  return;
                }
                
                // iOS 버전에 따라 응답 구조가 다를 수 있으므로 다양한 구조 처리
                console.log('🔍 [AppleFitnessService] getWorkoutRouteSamples 응답 구조 확인:', {
                  resultsType: typeof results,
                  resultsIsArray: Array.isArray(results),
                  resultsKeys: results ? Object.keys(results) : null,
                  hasData: results?.data !== undefined,
                  dataType: typeof results?.data,
                  dataIsArray: Array.isArray(results?.data),
                  dataKeys: results?.data ? Object.keys(results?.data) : null,
                  hasLocations: results?.data?.locations !== undefined,
                  locationsType: typeof results?.data?.locations,
                  locationsIsArray: Array.isArray(results?.data?.locations),
                  locationsLength: results?.data?.locations?.length,
                  hasDirectLocations: results?.locations !== undefined,
                  directLocationsType: typeof results?.locations,
                  directLocationsIsArray: Array.isArray(results?.locations),
                  directLocationsLength: results?.locations?.length
                });
                
                // 다양한 응답 구조 처리
                let locations = null;
                
                // 1. iOS 18.x 이전 구조: results.data.locations
                if (results?.data?.locations && Array.isArray(results.data.locations)) {
                  locations = results.data.locations;
                  console.log('✅ [AppleFitnessService] iOS 18.x 이전 구조 감지: results.data.locations');
                }
                // 2. iOS 18.x 이후 구조: results.locations (data 없이)
                else if (results?.locations && Array.isArray(results.locations)) {
                  locations = results.locations;
                  console.log('✅ [AppleFitnessService] iOS 18.x 이후 구조 감지: results.locations');
                }
                // 3. results.data가 직접 배열인 경우
                else if (results?.data && Array.isArray(results.data)) {
                  locations = results.data;
                  console.log('✅ [AppleFitnessService] results.data가 배열 구조 감지');
                }
                // 4. results가 직접 배열인 경우
                else if (Array.isArray(results) && results.length > 0) {
                  locations = results;
                  console.log('✅ [AppleFitnessService] results가 직접 배열 구조 감지');
                }
                // 5. results.data가 객체이고 내부에 locations가 있는 경우
                else if (results?.data && typeof results.data === 'object' && !Array.isArray(results.data)) {
                  // data 객체 내부의 모든 배열 필드 확인
                  const dataKeys = Object.keys(results.data);
                  for (const key of dataKeys) {
                    if (Array.isArray(results.data[key]) && results.data[key].length > 0) {
                      // 첫 번째 요소가 좌표 형태인지 확인
                      const firstItem = results.data[key][0];
                      if (firstItem && (firstItem.latitude !== undefined || firstItem.lat !== undefined)) {
                        locations = results.data[key];
                        console.log(`✅ [AppleFitnessService] results.data.${key}에서 좌표 배열 발견`);
                        break;
                      }
                    }
                  }
                }
                
                if (!locations || !Array.isArray(locations) || locations.length === 0) {
                  console.log('ℹ️ [AppleFitnessService] 이동경로 데이터가 없습니다. 응답 구조:', JSON.stringify(results, null, 2));
                  resolve([]);
                  return;
                }
                
                // locations 배열을 좌표 배열로 변환
                // 다양한 필드명 지원 (latitude/longitude, lat/lng, lat/lon 등)
                const coordinates = locations
                  .filter(location => {
                    // 다양한 좌표 필드명 확인
                    const hasLat = location.latitude !== undefined || location.lat !== undefined;
                    const hasLng = location.longitude !== undefined || location.lng !== undefined || location.lon !== undefined;
                    return hasLat && hasLng;
                  })
                  .map(location => {
                    // 다양한 필드명에서 좌표 추출
                    const lat = location.latitude || location.lat;
                    const lng = location.longitude || location.lng || location.lon;
                    return {
                      latitude: parseFloat(lat),
                      longitude: parseFloat(lng)
                    };
                  })
                  .filter(coord => !isNaN(coord.latitude) && !isNaN(coord.longitude));
                
                console.log(`✅ [AppleFitnessService] 이동경로 좌표 ${coordinates.length}개 조회됨 (getWorkoutRouteSamples)`);
                if (coordinates.length === 0) {
                  console.warn('⚠️ [AppleFitnessService] 유효한 좌표가 없습니다. 원본 locations:', locations.slice(0, 3));
                }
                resolve(coordinates);
              }
            );
          });
        } catch (error) {
          console.error('❌ [AppleFitnessService] getWorkoutRouteSamples 예외:', error);
          routeCoordinates = []; // 예외 발생 시 빈 배열 반환
        }
      }
      
      // UUID가 없거나 getWorkoutRouteSamples가 실패한 경우, 시간 범위 기반 조회로 폴백
      if (!routeCoordinates || routeCoordinates.length === 0) {
        console.log('🔍 [AppleFitnessService] 시간 범위 기반 이동경로 조회로 폴백');
        try {
          routeCoordinates = await this.getRouteCoordinates(matchedWorkoutStartTime, workoutEndDate);
        } catch (error) {
          console.warn('⚠️ [AppleFitnessService] 시간 범위 기반 이동경로 조회 실패:', error);
          routeCoordinates = []; // 빈 배열 반환
        }
      }
      
      // 최종적으로 이동경로가 없으면 빈 배열로 설정
      if (!routeCoordinates || routeCoordinates.length === 0) {
        console.log('ℹ️ [AppleFitnessService] 이동경로 데이터를 가져올 수 없습니다. 빈 배열 반환');
        routeCoordinates = [];
      }
      
      console.log('🔍 [AppleFitnessService] 이동경로 좌표 조회 완료:', routeCoordinates ? `${routeCoordinates.length}개` : '0개');

      const result = {
        distance: distanceFormatted, // 포맷팅된 문자열
        duration: durationFormatted, // 포맷팅된 문자열
        pace: paceFormatted, // 포맷팅된 문자열
        calories: Math.round(calories),
        routeCoordinates: routeCoordinates,
      };

      console.log('✅ [AppleFitnessService] 워크아웃 데이터 추출 완료:', {
        결과: result,
        원본데이터: {
          거리: distanceMeters,
          지속시간: durationSeconds,
          칼로리: calories,
          이동경로좌표수: routeCoordinates.length
        },
        매칭정보: {
          시간차: `${Math.round(minTimeDiff / 1000 / 60)}분`,
          워크아웃시작: matchedWorkoutStartTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          워크아웃종료: workoutEndDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
        }
      });
      return result;

    } catch (error) {
      console.error('❌ [AppleFitnessService] 운동기록 조회 실패:', {
        error: error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        event: event
      });
      return null;
    }
  }
}

export default new AppleFitnessService();