// Health Connect 연동 서비스 - HealthKit과 동일한 인터페이스 제공
import { Platform, NativeModules } from 'react-native';
import env from '../config/environment';

// Health Connect 네이티브 모듈 로드
async function loadHealthConnectModule() {
  // Android에서만 로드
  if (Platform.OS !== 'android') return undefined;
  
  try {
    const native = NativeModules?.HealthConnect;
    if (native && (typeof native.isAvailable === 'function' || typeof native.checkPermissions === 'function')) {
      return native;
    }
  } catch (e) {
    console.warn('⚠️ Health Connect 모듈 로드 실패:', e);
  }
  
  console.warn('⚠️ Health Connect 모듈 로드 실패: NativeModules keys=', Object.keys(NativeModules || {}));
  return undefined;
}

class HealthConnectService {
  constructor() {
    this.isAvailable = false;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🏥 Health Connect 초기화 시작');
      
      // 플랫폼 가드
      if (Platform.OS !== 'android') {
        console.warn('⚠️ Android 이외 플랫폼에서는 Health Connect를 사용할 수 없습니다.');
        this.isAvailable = false;
        this.isInitialized = false;
        return false;
      }
      
      const HealthConnect = await loadHealthConnectModule();
      
      // 네이티브 모듈 가드
      if (!HealthConnect) {
        console.warn('⚠️ Health Connect 네이티브 모듈이 로드되지 않았습니다.');
        this.isAvailable = false;
        this.isInitialized = false;
        return false;
      }
      
      if (typeof HealthConnect.isAvailable !== 'function') {
        console.warn('⚠️ Health Connect 메서드가 없습니다.');
        this.isAvailable = false;
        this.isInitialized = false;
        return false;
      }
      
      // Health Connect 사용 가능 여부 확인
      this.isAvailable = await HealthConnect.isAvailable();
      
      if (this.isAvailable) {
        // 권한 요청
        const hasPermission = await HealthConnect.requestPermissions();
        if (hasPermission) {
          this.isInitialized = true;
          console.log('✅ Health Connect 초기화 성공');
          return true;
        } else {
          console.warn('⚠️ Health Connect 권한이 거부되었습니다.');
          this.isInitialized = false;
          return false;
        }
      } else {
        console.log('❌ Health Connect를 사용할 수 없습니다.');
        return false;
      }
    } catch (error) {
      console.error('❌ Health Connect 초기화 실패:', error);
      return false;
    }
  }

  async checkPermissions() {
    try {
      console.log('🔍 Health Connect 사용 가능 여부 확인');
      
      if (Platform.OS !== 'android') {
        return {
          isAvailable: false,
          hasPermissions: false,
          error: '비 Android 환경에서는 Health Connect를 사용할 수 없습니다.'
        };
      }

      const HealthConnect = await loadHealthConnectModule();

      // 네이티브 모듈 가드
      if (!HealthConnect || typeof HealthConnect.checkPermissions !== 'function') {
        return {
          isAvailable: false,
          hasPermissions: false,
          error: 'Health Connect 네이티브 모듈이 연결되지 않았습니다.'
        };
      }
      
      // Health Connect 사용 가능 여부 확인
      const isAvailable = await HealthConnect.isAvailable();
      
      if (!isAvailable) {
        return {
          isAvailable: false,
          hasPermissions: false,
          error: 'Health Connect를 사용할 수 없습니다.'
        };
      }

      this.isAvailable = true;
      
      // 권한 확인
      const permissionStatus = await HealthConnect.checkPermissions();
      
      return {
        isAvailable: true,
        hasPermissions: permissionStatus?.hasPermissions || false,
        error: permissionStatus?.error || null
      };
    } catch (error) {
      console.error('❌ Health Connect 상태 확인 실패:', error);
      
      return {
        isAvailable: false,
        hasPermissions: false,
        error: error.message
      };
    }
  }

  async requestPermissions() {
    try {
      console.log('🔍 Health Connect 권한 요청 시작');

      if (Platform.OS !== 'android') {
        console.warn('⚠️ 비 Android 환경에서는 권한을 요청할 수 없습니다.');
        return false;
      }

      // 모듈 로드 및 가드
      const HealthConnect = await loadHealthConnectModule();
      if (!HealthConnect || typeof HealthConnect.requestPermissions !== 'function') {
        console.warn('⚠️ Health Connect 네이티브 모듈이 연결되지 않았습니다.');
        return false;
      }

      // Health Connect 권한 요청
      const granted = await HealthConnect.requestPermissions();
      
      if (granted) {
        console.log('✅ Health Connect 권한 요청 성공');
        this.isInitialized = true;
        this.isAvailable = true;
        return true;
      } else {
        console.warn('⚠️ Health Connect 권한 요청 실패');
        return false;
      }
    } catch (error) {
      console.error('❌ Health Connect 권한 요청 실패:', error);
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
        dateObj = new Date(event.date);
        year = dateObj.getFullYear();
        month = dateObj.getMonth();
        day = dateObj.getDate();
        console.log('📅 Date 객체로 파싱:', { year, month: month + 1, day });
      } else if (typeof event.date === 'string') {
        const dateParts = event.date.split('-');
        if (dateParts.length !== 3) {
          console.warn('⚠️ 날짜 형식이 올바르지 않습니다:', event.date);
          return null;
        }
        year = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        day = parseInt(dateParts[2], 10);
        console.log('📅 문자열로 파싱:', { year, month: month + 1, day, dateString: event.date });
      } else if (event.date && typeof event.date.toDate === 'function') {
        dateObj = event.date.toDate();
        year = dateObj.getFullYear();
        month = dateObj.getMonth();
        day = dateObj.getDate();
        console.log('📅 Firestore Timestamp로 파싱:', { year, month: month + 1, day });
      } else if (event.date && typeof event.date.getTime === 'function') {
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
      let hour = 9;
      let minute = 0;

      if (event.time) {
        const timeMatch = event.time.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const ampm = timeMatch[1];
          hour = parseInt(timeMatch[2], 10);
          minute = parseInt(timeMatch[3], 10);

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
      return `${Math.round(meters)}m`;
    } else {
      const km = meters / 1000;
      const kmStr = km % 1 === 0 ? km.toString() : km.toFixed(2).replace(/\.?0+$/, '');
      return `${kmStr}km`;
    }
  }

  /**
   * 페이스 포맷팅
   * @param {string} pace - 페이스 문자열
   * @returns {string} 포맷팅된 페이스 문자열
   */
  formatPace(pace) {
    if (!pace) return '0:00/km';
    
    if (pace.includes(':')) {
      return pace.includes('/km') ? pace : `${pace}/km`;
    }
    
    let formattedPace = pace
      .replace(/'/g, ':')
      .replace(/"/g, '');
    
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
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  parseWorkoutStartTime(workout) {
    if (!workout) return null;
    const raw = workout.start ?? workout.startDate;
    if (!raw) return null;
    const date = raw instanceof Date ? new Date(raw) : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  parseWorkoutEndTime(workout, startDate, durationSeconds = 0) {
    if (!workout) return null;
    const raw = workout.end ?? workout.endDate;
    if (raw) {
      const date = raw instanceof Date ? new Date(raw) : new Date(raw);
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (startDate && durationSeconds > 0) {
      return new Date(startDate.getTime() + durationSeconds * 1000);
    }
    return null;
  }

  isRunningWorkout(workout) {
    const activityName = `${workout?.activityName || ''}`;
    return activityName === 'Running' || workout?.activityId === 1;
  }

  async mapWorkoutToFeedItem(workout, HealthConnect, includeRoute = false) {
    const startDate = this.parseWorkoutStartTime(workout);
    if (!startDate) return null;

    const distanceMiles = Number(workout.distance || 0);
    const distanceMeters = distanceMiles * 1609.34;
    const endDate = this.parseWorkoutEndTime(workout, startDate, Number(workout.duration || 0));
    let durationSeconds = Number(workout.duration || 0);
    if (!durationSeconds && endDate) {
      durationSeconds = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
    }

    let paceFormatted = '0:00/km';
    if (durationSeconds > 0 && distanceMeters > 0) {
      const paceSecondsPerKm = (durationSeconds / distanceMeters) * 1000;
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.floor(paceSecondsPerKm % 60);
      paceFormatted = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
    } else if (workout.averagePace) {
      paceFormatted = this.formatPace(workout.averagePace);
    }

    const calories = Math.round(
      Number(workout.calories || workout.totalEnergyBurned || workout.energyBurned || 0)
    );
    const workoutId = workout.id || workout.uuid || workout.workoutId;
    const feedId = workoutId ? `hc-${workoutId}` : `hc-${startDate.getTime()}`;

    // 네이티브 getSamples가 인라인으로 제공한 경로를 우선 사용
    let routeCoordinates = Array.isArray(workout.routeCoordinates) ? workout.routeCoordinates : [];
    // 인라인 경로가 없고 경로 포함 요청이면 단건 재조회로 폴백
    if (includeRoute && routeCoordinates.length === 0 && workoutId && HealthConnect?.getWorkoutRouteSamples) {
      try {
        const fetched = await HealthConnect.getWorkoutRouteSamples({ id: workoutId });
        if (Array.isArray(fetched)) routeCoordinates = fetched;
      } catch (error) {
        console.warn('⚠️ [HealthConnectService] 피드 경로 조회 실패:', error?.message || error);
      }
    }

    const sourceName = `${workout.sourceName || workout.source || 'Google Health Connect'}`.trim();

    return {
      id: feedId,
      startTime: startDate.toISOString(),
      sourceName,
      sourceLabel: 'Google Health Connect',
      distance: this.formatDistance(distanceMeters),
      pace: paceFormatted,
      duration: this.formatDuration(durationSeconds),
      calories,
      routeCoordinates,
      raw: {
        distanceMeters,
        durationSeconds,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        calories,
      },
    };
  }

  /**
   * 최근 러닝 기록 목록 조회 (러닝 피드용)
   * @param {number} days - 조회 기간(일). 0 이하이면 최근 5년
   */
  async getRecentRunningWorkouts(days = 14, options = {}) {
    const { includeRoutes = false, routeFetchLimit = 10 } = options;

    if (!this.isServiceAvailable()) {
      const initialized = await this.initialize();
      if (!initialized) {
        const error = new Error('Health Connect permission required');
        error.code = 'NO_PERMISSION';
        throw error;
      }
    }

    const HealthConnect = await loadHealthConnectModule();
    if (!HealthConnect || typeof HealthConnect.getSamples !== 'function') {
      return [];
    }

    const loadAll = !Number.isFinite(days) || days <= 0;
    const startDate = loadAll
      ? new Date(Date.now() - (5 * 365 * 24 * 60 * 60 * 1000))
      : new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const endDate = new Date();

    const workouts = await HealthConnect.getSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: 'Workout',
    });

    const runningWorkouts = (workouts || [])
      .filter((workout) => this.isRunningWorkout(workout))
      .sort((a, b) => {
        const aStart = this.parseWorkoutStartTime(a)?.getTime() || 0;
        const bStart = this.parseWorkoutStartTime(b)?.getTime() || 0;
        return bStart - aStart;
      });

    const mapped = [];
    for (let index = 0; index < runningWorkouts.length; index += 1) {
      const shouldIncludeRoute = includeRoutes && index < routeFetchLimit;
      const item = await this.mapWorkoutToFeedItem(
        runningWorkouts[index],
        HealthConnect,
        shouldIncludeRoute
      );
      if (item) mapped.push(item);
    }

    return mapped;
  }

  /**
   * Health Connect에서 이동경로 좌표 조회
   * @param {Date} startDate - 시작 시간
   * @param {Date} endDate - 종료 시간
   * @returns {Promise<Array>} 좌표 배열 [{latitude, longitude}, ...]
   */
  async getRouteCoordinates(startDate, endDate) {
    try {
      if (!this.isServiceAvailable()) {
        console.warn('⚠️ Health Connect 서비스를 사용할 수 없습니다.');
        return [];
      }

      const HealthConnect = await loadHealthConnectModule();
      if (!HealthConnect || typeof HealthConnect.getWorkoutRouteSamples !== 'function') {
        console.warn('⚠️ 이동경로 샘플 조회 불가');
        return [];
      }

      // 이동경로 조회 (워크아웃 ID가 필요한 경우를 대비해 빈 배열 반환)
      // 실제로는 findMatchingWorkout에서 워크아웃 ID를 얻은 후 호출해야 함
      return [];
    } catch (error) {
      console.error('❌ 이동경로 조회 실패:', error);
      return [];
    }
  }

  // 개발용 더미 데이터
  getDummyWorkoutDetails() {
    const distanceFormatted = this.formatDistance(5000);
    const durationFormatted = this.formatDuration(1800);
    const paceFormatted = this.formatPace("6'00\"/km");
    
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
      console.log('🔍 [HealthConnectService] findMatchingWorkout 시작');
      console.log('🔍 [HealthConnectService] event:', JSON.stringify(event, null, 2));
      
      // 이벤트 시간 파싱
      console.log('🔍 [HealthConnectService] 이벤트 시간 파싱 시작');
      const eventTime = this.parseEventTime(event);
      if (!eventTime) {
        console.warn('⚠️ [HealthConnectService] 이벤트 시간을 파싱할 수 없습니다.');
        return null;
      }
      console.log('✅ [HealthConnectService] 이벤트 시간 파싱 완료:', eventTime.toISOString());

      // Health Connect 서비스 사용 가능 여부 확인
      console.log('🔍 [HealthConnectService] Health Connect 서비스 사용 가능 여부 확인');
      const isAvailable = this.isServiceAvailable();
      console.log('🔍 [HealthConnectService] isServiceAvailable 결과:', isAvailable);
      
      if (!isAvailable) {
        console.warn('⚠️ [HealthConnectService] Health Connect 서비스를 사용할 수 없습니다.');
        console.warn('⚠️ [HealthConnectService] 초기화 시도...');
        const initialized = await this.initialize();
        console.log('🔍 [HealthConnectService] 초기화 결과:', initialized);
        
        if (!initialized) {
          console.warn('⚠️ [HealthConnectService] Health Connect 초기화 실패');
          return null;
        }
      }

      console.log('🔍 [HealthConnectService] Health Connect 모듈 로드 시작');
      const HealthConnect = await loadHealthConnectModule();
      console.log('🔍 [HealthConnectService] Health Connect 모듈 로드 완료:', HealthConnect ? '성공' : '실패');
      
      if (!HealthConnect || typeof HealthConnect.getSamples !== 'function') {
        console.warn('⚠️ [HealthConnectService] Health Connect 모듈을 사용할 수 없습니다.');
        return null;
      }
      console.log('✅ [HealthConnectService] Health Connect 모듈 사용 가능');

      // 조회 범위: 이벤트 시간 ±30분
      const searchStartDate = new Date(eventTime.getTime() - 30 * 60 * 1000);
      const searchEndDate = new Date(eventTime.getTime() + 30 * 60 * 1000);

      const startDateISO = searchStartDate.toISOString();
      const endDateISO = searchEndDate.toISOString();

      console.log('🔍 [HealthConnectService] 워크아웃 조회 시작:', {
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
      const workouts = await HealthConnect.getSamples({
        startDate: startDateISO,
        endDate: endDateISO,
        type: 'Workout'
      });

      console.log('🔍 [HealthConnectService] Health Connect 조회 완료');
      
      if (!workouts || workouts.length === 0) {
        console.log('❌ [HealthConnectService] 매칭되는 워크아웃 없음 (조회 결과가 비어있음)');
        return null;
      }

      console.log(`📊 [HealthConnectService] 조회된 워크아웃 수: ${workouts.length}`);
      console.log('🔍 [HealthConnectService] 조회된 워크아웃 샘플:', JSON.stringify(workouts.slice(0, 2), null, 2));

      // 러닝 워크아웃만 필터링
      const runningWorkouts = workouts.filter(workout => {
        const activityName = workout.activityName;
        const isRunning = activityName === 'Running' || workout.activityId === 1;
        
        if (!isRunning) {
          console.log('⚠️ [HealthConnectService] 러닝이 아닌 워크아웃:', { 
            activityId: workout.activityId,
            activityName: activityName
          });
        }
        
        return isRunning;
      });

      if (runningWorkouts.length === 0) {
        console.log('❌ [HealthConnectService] 러닝 워크아웃 없음');
        return null;
      }

      console.log(`🏃 [HealthConnectService] 러닝 워크아웃 수: ${runningWorkouts.length}`);

      // 가장 가까운 워크아웃 찾기
      let closestWorkout = null;
      let minTimeDiff = Infinity;

      for (const workout of runningWorkouts) {
        let workoutStartTime = null;
        
        if (workout.start) {
          if (typeof workout.start === 'string') {
            workoutStartTime = new Date(workout.start);
          } else if (typeof workout.start === 'number') {
            workoutStartTime = new Date(workout.start);
          } else if (workout.start instanceof Date) {
            workoutStartTime = new Date(workout.start);
          }
        } else if (workout.startDate) {
          if (typeof workout.startDate === 'string') {
            workoutStartTime = new Date(workout.startDate);
          } else if (typeof workout.startDate === 'number') {
            workoutStartTime = new Date(workout.startDate);
          }
        }

        if (!workoutStartTime || isNaN(workoutStartTime.getTime())) {
          console.warn('⚠️ 워크아웃 시작 시간을 파싱할 수 없습니다:', {
            startDate: workout.startDate,
            start: workout.start
          });
          continue;
        }

        const timeDiff = Math.abs(workoutStartTime.getTime() - eventTime.getTime());
        
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestWorkout = workout;
        }
      }

      if (!closestWorkout) {
        console.log('❌ [HealthConnectService] 매칭되는 워크아웃 없음 (시간 비교 실패)');
        return null;
      }

      // 매칭된 워크아웃의 시작 시간 파싱
      let matchedWorkoutStartTime = null;
      if (closestWorkout.start) {
        if (typeof closestWorkout.start === 'string') {
          matchedWorkoutStartTime = new Date(closestWorkout.start);
        } else if (typeof closestWorkout.start === 'number') {
          matchedWorkoutStartTime = new Date(closestWorkout.start);
        }
      } else if (closestWorkout.startDate) {
        if (typeof closestWorkout.startDate === 'string') {
          matchedWorkoutStartTime = new Date(closestWorkout.startDate);
        } else if (typeof closestWorkout.startDate === 'number') {
          matchedWorkoutStartTime = new Date(closestWorkout.startDate);
        }
      }

      if (!matchedWorkoutStartTime || isNaN(matchedWorkoutStartTime.getTime())) {
        console.warn('⚠️ 매칭된 워크아웃의 시작 시간을 파싱할 수 없습니다. 기본값 사용');
        matchedWorkoutStartTime = new Date();
      }

      console.log('✅ [HealthConnectService] 매칭되는 워크아웃 발견:', {
        시작시간: {
          로컬: matchedWorkoutStartTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          ISO: matchedWorkoutStartTime.toISOString()
        },
        시간차: `${Math.round(minTimeDiff / 1000 / 60)}분`
      });

      // 워크아웃 데이터 추출 및 포맷팅
      console.log('🔍 [HealthConnectService] closestWorkout 원본 데이터:', JSON.stringify(closestWorkout, null, 2));
      
      // 거리: 마일을 미터로 변환
      const distanceMiles = closestWorkout.distance || 0;
      const distanceMeters = distanceMiles * 1609.34; // 마일을 미터로 변환
      console.log('🔍 [HealthConnectService] 거리:', { 마일: distanceMiles, 미터: distanceMeters });
      
      const distanceFormatted = this.formatDistance(distanceMeters);

      // 워크아웃 종료 시간 파싱
      let workoutEndDate = null;
      if (closestWorkout.end) {
        if (typeof closestWorkout.end === 'string') {
          workoutEndDate = new Date(closestWorkout.end);
        } else if (typeof closestWorkout.end === 'number') {
          workoutEndDate = new Date(closestWorkout.end);
        }
      } else if (closestWorkout.endDate) {
        if (typeof closestWorkout.endDate === 'string') {
          workoutEndDate = new Date(closestWorkout.endDate);
        } else if (typeof closestWorkout.endDate === 'number') {
          workoutEndDate = new Date(closestWorkout.endDate);
        }
      }
      
      // 지속 시간 계산
      let durationSeconds = 0;
      
      if (closestWorkout.duration) {
        durationSeconds = closestWorkout.duration;
        console.log('🔍 [HealthConnectService] duration 필드에서 추출:', durationSeconds);
      } else if (matchedWorkoutStartTime && workoutEndDate && !isNaN(workoutEndDate.getTime())) {
        durationSeconds = Math.floor((workoutEndDate.getTime() - matchedWorkoutStartTime.getTime()) / 1000);
        console.log('🔍 [HealthConnectService] start/end로부터 계산된 duration:', durationSeconds, '초');
      }
      
      console.log('🔍 [HealthConnectService] 최종 duration (초):', durationSeconds);

      // 페이스 계산
      let paceFormatted = '0:00/km';
      
      if (durationSeconds > 0 && distanceMeters > 0) {
        const paceSecondsPerKm = (durationSeconds / distanceMeters) * 1000;
        const paceMinutes = Math.floor(paceSecondsPerKm / 60);
        const paceSeconds = Math.floor(paceSecondsPerKm % 60);
        paceFormatted = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
        console.log('🔍 [HealthConnectService] 계산된 페이스:', paceFormatted);
      } else if (closestWorkout.averagePace) {
        paceFormatted = this.formatPace(closestWorkout.averagePace);
      } else if (closestWorkout.averageSpeed) {
        const speedMps = closestWorkout.averageSpeed;
        if (speedMps > 0) {
          const paceSecondsPerKm = 1000 / speedMps;
          const paceMinutes = Math.floor(paceSecondsPerKm / 60);
          const paceSeconds = Math.floor(paceSecondsPerKm % 60);
          paceFormatted = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
        }
      }

      const durationFormatted = this.formatDuration(durationSeconds);
      console.log('🔍 [HealthConnectService] 포맷팅된 duration:', durationFormatted);

      const calories = closestWorkout.calories || closestWorkout.totalEnergyBurned || closestWorkout.energyBurned || 0;

      // 종료 시간이 없으면 시작 시간 + 지속 시간으로 계산
      if (!workoutEndDate || isNaN(workoutEndDate.getTime())) {
        if (durationSeconds > 0) {
          workoutEndDate = new Date(matchedWorkoutStartTime.getTime() + durationSeconds * 1000);
        } else {
          workoutEndDate = new Date(matchedWorkoutStartTime.getTime() + 30 * 60 * 1000);
        }
      }

      // 이동경로 좌표 조회
      console.log('🔍 [HealthConnectService] 이동경로 좌표 조회 시작');
      
      let routeCoordinates = [];
      const workoutId = closestWorkout.id || closestWorkout.uuid || closestWorkout.workoutId;
      
      if (workoutId && HealthConnect.getWorkoutRouteSamples) {
        try {
          routeCoordinates = await HealthConnect.getWorkoutRouteSamples({
            id: workoutId
          });
          console.log(`✅ [HealthConnectService] 이동경로 좌표 ${routeCoordinates.length}개 조회됨`);
        } catch (error) {
          console.warn('⚠️ [HealthConnectService] 이동경로 조회 실패:', error);
        }
      }
      
      // 폴백: 시간 범위 기반 조회
      if (!routeCoordinates || routeCoordinates.length === 0) {
        console.log('🔍 [HealthConnectService] 시간 범위 기반 이동경로 조회로 폴백');
        routeCoordinates = await this.getRouteCoordinates(matchedWorkoutStartTime, workoutEndDate);
      }
      
      console.log('🔍 [HealthConnectService] 이동경로 좌표 조회 완료:', routeCoordinates ? `${routeCoordinates.length}개` : '0개');

      const result = {
        distance: distanceFormatted,
        duration: durationFormatted,
        pace: paceFormatted,
        calories: Math.round(calories),
        routeCoordinates: routeCoordinates,
      };

      console.log('✅ [HealthConnectService] 워크아웃 데이터 추출 완료:', {
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
      console.error('❌ [HealthConnectService] 운동기록 조회 실패:', {
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

export default new HealthConnectService();

