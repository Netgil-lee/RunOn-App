// 애플 피트니스 연동 서비스
import AppleHealthKit from 'react-native-health';

class AppleFitnessService {
  constructor() {
    this.isAvailable = false;
    this.isInitialized = false;
    this.defaultTimeout = 10000; // 10초 기본 타임아웃
  }

  /**
   * 타임아웃과 함께 Promise 실행
   * @param {Promise} promise - 실행할 Promise
   * @param {number} timeoutMs - 타임아웃 시간 (밀리초)
   * @returns {Promise} 타임아웃이 적용된 Promise
   */
  withTimeout(promise, timeoutMs = this.defaultTimeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('HealthKit API 타임아웃')), timeoutMs)
      )
    ]);
  }

  /**
   * 성능 모니터링을 위한 로그
   * @param {string} operation - 작업명
   * @param {number} startTime - 시작 시간
   */
  logPerformance(operation, startTime) {
    const duration = Date.now() - startTime;
    console.log(`⏱️ ${operation} 실행 시간: ${duration}ms`);
    
    if (duration > 3000) {
      console.warn(`⚠️ ${operation} 실행 시간이 길어짐: ${duration}ms`);
    }
  }

  /**
   * 에러 분류 및 처리
   * @param {Error} error - 발생한 에러
   * @param {string} operation - 작업명
   * @returns {Object} 분류된 에러 정보
   */
  classifyError(error, operation) {
    const errorInfo = {
      type: 'unknown',
      message: error.message,
      operation: operation,
      timestamp: new Date().toISOString()
    };

    if (error.message.includes('타임아웃')) {
      errorInfo.type = 'timeout';
      errorInfo.message = `${operation} 타임아웃 발생`;
    } else if (error.message.includes('권한')) {
      errorInfo.type = 'permission';
      errorInfo.message = `${operation} 권한 관련 오류`;
    } else if (error.message.includes('초기화')) {
      errorInfo.type = 'initialization';
      errorInfo.message = `${operation} 초기화 오류`;
    } else if (error.message.includes('네트워크')) {
      errorInfo.type = 'network';
      errorInfo.message = `${operation} 네트워크 오류`;
    }

    console.error(`❌ [${errorInfo.type.toUpperCase()}] ${errorInfo.message}:`, error);
    return errorInfo;
  }

  /**
   * HealthKit 초기화 및 권한 요청
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  async initialize() {
    const startTime = Date.now();
    try {
      console.log('🏥 HealthKit 초기화 시작');
      
      // HealthKit 사용 가능 여부 확인 (콜백 방식으로 변경)
      this.isAvailable = await this.withTimeout(
        new Promise((resolve) => {
          AppleHealthKit.isAvailable((error, results) => {
            if (error) {
              console.error('❌ HealthKit 사용 가능 여부 확인 실패:', error);
              resolve(false);
            } else {
              resolve(results);
            }
          });
        }),
        5000 // 5초 타임아웃
      );
      
      if (this.isAvailable) {
        // 필요한 권한 요청
        const options = {
          permissions: {
            read: [
              'DistanceWalkingRunning',
              'ActiveEnergyBurned',
              'HeartRate',
              'Workout',
              'StepCount'
            ],
            write: []
          }
        };
        
        // HealthKit 초기화 및 권한 요청 (타임아웃 적용)
        await this.withTimeout(
          new Promise((resolve, reject) => {
            AppleHealthKit.initHealthKit(options, (err, results) => {
              if (err) {
                console.error('❌ HealthKit 초기화 실패:', err);
                reject(err);
              } else {
                console.log('✅ HealthKit 초기화 성공:', results);
                this.isInitialized = true;
                resolve(results);
              }
            });
          }),
          8000 // 8초 타임아웃
        );
        
        this.logPerformance('HealthKit 초기화', startTime);
        console.log('✅ Apple Fitness Service 초기화 완료');
        return true;
      } else {
        console.log('❌ HealthKit을 사용할 수 없습니다 (iOS 8.0 이상 필요)');
        return false;
      }
    } catch (error) {
      this.logPerformance('HealthKit 초기화 (실패)', startTime);
      this.classifyError(error, 'HealthKit 초기화');
      return false;
    }
  }

  /**
   * 최근 워크아웃 데이터 가져오기
   * @param {number} limit - 가져올 워크아웃 개수
   * @returns {Promise<Array>} 워크아웃 데이터 배열
   */
  async getRecentWorkouts(limit = 10) {
    const startTime = Date.now();
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult) {
          throw new Error('HealthKit 초기화 실패');
        }
      }

      console.log('🔍 워크아웃 데이터 가져오기 시작');

      // 최근 7일간의 워크아웃 데이터 가져오기 (타임아웃 적용)
      const workouts = await this.withTimeout(
        HealthKit.getSamples({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 최근 7일
          endDate: new Date(),
          limit: limit,
          dataType: 'Workout'
        }),
        5000 // 5초 타임아웃
      );

      this.logPerformance('워크아웃 데이터 가져오기', startTime);
      console.log('🔍 HealthKit에서 가져온 워크아웃 데이터:', workouts);

      return workouts.map(workout => ({
        id: workout.id,
        type: workout.workoutActivityType || workout.type,
        startDate: workout.startDate,
        endDate: workout.endDate,
        duration: workout.duration,
        totalDistance: workout.totalDistance,
        totalEnergyBurned: workout.totalEnergyBurned,
        metadata: workout.metadata
      }));
    } catch (error) {
      this.logPerformance('워크아웃 데이터 가져오기 (실패)', startTime);
      this.classifyError(error, '워크아웃 데이터 가져오기');
      
      // 에러 발생 시 더미 데이터 반환 (개발/테스트용)
      return this.getDummyWorkouts();
    }
  }

  /**
   * 더미 워크아웃 데이터 반환 (개발/테스트용)
   * @returns {Array} 더미 워크아웃 데이터
   */
  getDummyWorkouts() {
    const now = new Date();
    const dummyWorkouts = [
      {
        id: 'workout_1',
        type: 'Running',
        startDate: new Date(now.getTime() - 30 * 60 * 1000), // 30분 전
        endDate: new Date(now.getTime() - 5 * 60 * 1000), // 5분 전
        duration: 25 * 60, // 25분 (초 단위)
        totalDistance: 5200, // 5.2km (미터 단위)
        totalEnergyBurned: 320, // 칼로리
        metadata: {}
      }
    ];

    return dummyWorkouts.map(workout => ({
      id: workout.id,
      type: workout.workoutActivityType || workout.type,
      startDate: workout.startDate,
      endDate: workout.endDate,
      duration: workout.duration,
      totalDistance: workout.totalDistance,
      totalEnergyBurned: workout.totalEnergyBurned,
      metadata: workout.metadata
    }));
  }

  /**
   * 특정 워크아웃의 상세 정보 가져오기
   * @param {string} workoutId - 워크아웃 ID
   * @returns {Promise<Object|null>} 워크아웃 상세 정보
   */
  async getWorkoutDetails(workoutId) {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult) {
          throw new Error('HealthKit 초기화 실패');
        }
      }

      // 특정 워크아웃의 상세 정보 가져오기
      const workout = await HealthKit.getSamples({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 1,
        dataType: 'Workout',
        predicate: `HKWorkout == ${workoutId}`
      });

      if (workout && workout.length > 0) {
        const workoutData = workout[0];
        
        // 거리 데이터 가져오기
        const distanceData = await HealthKit.getSamples({
          startDate: workoutData.startDate,
          endDate: workoutData.endDate,
          dataType: 'DistanceWalkingRunning'
        });

        // 칼로리 데이터 가져오기
        const caloriesData = await HealthKit.getSamples({
          startDate: workoutData.startDate,
          endDate: workoutData.endDate,
          dataType: 'ActiveEnergyBurned'
        });

        // 심박수 데이터 가져오기
        const heartRateData = await HealthKit.getSamples({
          startDate: workoutData.startDate,
          endDate: workoutData.endDate,
          dataType: 'HeartRate'
        });

        const totalDistance = distanceData.reduce((sum, sample) => sum + sample.value, 0);
        const totalCalories = caloriesData.reduce((sum, sample) => sum + sample.value, 0);
        const avgHeartRate = heartRateData.length > 0 
          ? heartRateData.reduce((sum, sample) => sum + sample.value, 0) / heartRateData.length 
          : null;

        const details = {
          distance: totalDistance, // 미터 단위
          duration: workoutData.duration, // 초 단위
          pace: this.calculatePace(totalDistance, workoutData.duration),
          calories: Math.round(totalCalories),
          startTime: workoutData.startDate,
          endTime: workoutData.endDate,
          avgHeartRate: avgHeartRate ? Math.round(avgHeartRate) : null,
          routeCoordinates: await this.getWorkoutRoute(workoutId) // 실제 경로 데이터
        };

        console.log('🔍 워크아웃 상세 정보:', details);
        return details;
      }

      // 워크아웃을 찾을 수 없는 경우 더미 데이터 반환
      return this.getDummyWorkoutDetails();
    } catch (error) {
      console.error('❌ 워크아웃 상세 정보 가져오기 실패:', error);
      // 에러 발생 시 더미 데이터 반환
      return this.getDummyWorkoutDetails();
    }
  }

  /**
   * 더미 워크아웃 상세 정보 반환 (개발/테스트용)
   * @returns {Object} 더미 워크아웃 상세 정보
   */
  getDummyWorkoutDetails() {
    const now = new Date();
    return {
      distance: 5200, // 5.2km (미터 단위)
      duration: 25 * 60, // 25분 (초 단위)
      pace: this.calculatePace(5200, 25 * 60),
      calories: 320,
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      endTime: new Date(now.getTime() - 5 * 60 * 1000),
      avgHeartRate: 150,
      routeCoordinates: this.generateDummyRoute() // 더미 이동경로 데이터
    };
  }

  /**
   * 페이스 계산 (km당 시간)
   * @param {number} distance - 거리 (미터)
   * @param {number} duration - 시간 (초)
   * @returns {string} 페이스 (예: "5:30")
   */
  calculatePace(distance, duration) {
    if (!distance || !duration) return '0:00';
    
    const pacePerKm = duration / (distance / 1000); // 초 단위
    const minutes = Math.floor(pacePerKm / 60);
    const seconds = Math.floor(pacePerKm % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 모임 시간과 매칭되는 워크아웃 찾기
   * @param {Object} event - 모임 데이터
   * @returns {Promise<Object|null>} 매칭되는 워크아웃
   */
  async findMatchingWorkout(event) {
    try {
      const workouts = await this.getRecentWorkouts(5);
      
      if (!event.date || workouts.length === 0) {
        return null;
      }

      const eventTime = new Date(event.date);
      
      // 더미 데이터의 경우 항상 첫 번째 워크아웃을 반환 (개발/테스트용)
      if (workouts.length > 0 && workouts[0].id === 'workout_1') {
        console.log('🔍 더미 워크아웃 매칭 성공:', {
          eventTime: eventTime.toISOString(),
          workoutTime: new Date(workouts[0].startDate).toISOString()
        });
        return workouts[0];
      }
      
      // 실제 데이터의 경우 기존 로직 사용
      let bestMatch = null;
      let minTimeDiff = Infinity;

      for (const workout of workouts) {
        const timeDiff = Math.abs(
          new Date(workout.startDate) - eventTime
        );
        
        // 30분 이내의 워크아웃만 매칭
        if (timeDiff <= 30 * 60 * 1000 && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          bestMatch = workout;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('❌ 매칭 워크아웃 찾기 실패:', error);
      return null;
    }
  }

  /**
   * 워크아웃의 실제 경로 데이터 가져오기
   * @param {string} workoutId - 워크아웃 ID
   * @returns {Promise<Array>} GPS 좌표 배열
   */
  async getWorkoutRoute(workoutId) {
    try {
      // HealthKit에서 경로 데이터 가져오기
      const routeData = await HealthKit.getSamples({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
        dataType: 'Workout',
        predicate: `HKWorkout == ${workoutId}`
      });

      if (routeData && routeData.length > 0) {
        const workout = routeData[0];
        
        // 워크아웃의 메타데이터에서 경로 정보 추출
        if (workout.metadata && workout.metadata.HKWorkoutRoute) {
          const route = workout.metadata.HKWorkoutRoute;
          return route.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude
          }));
        }
      }

      // 경로 데이터가 없는 경우 더미 데이터 반환
      return this.generateDummyRoute();
    } catch (error) {
      console.error('❌ 워크아웃 경로 데이터 가져오기 실패:', error);
      return this.generateDummyRoute();
    }
  }

  /**
   * 더미 이동경로 데이터 생성 (여의도한강공원 기준)
   * @returns {Array} GPS 좌표 배열
   */
  generateDummyRoute() {
    // 여의도한강공원 기준 더미 경로 (실제 러닝 코스와 유사)
    const baseLat = 37.5263;
    const baseLng = 126.9351;
    
    return [
      { latitude: baseLat, longitude: baseLng },
      { latitude: baseLat + 0.001, longitude: baseLng + 0.002 },
      { latitude: baseLat + 0.002, longitude: baseLng + 0.001 },
      { latitude: baseLat + 0.003, longitude: baseLng - 0.001 },
      { latitude: baseLat + 0.002, longitude: baseLng - 0.003 },
      { latitude: baseLat, longitude: baseLng - 0.002 },
      { latitude: baseLat - 0.001, longitude: baseLng - 0.001 },
      { latitude: baseLat - 0.002, longitude: baseLng + 0.001 },
      { latitude: baseLat - 0.001, longitude: baseLng + 0.003 },
      { latitude: baseLat + 0.001, longitude: baseLng + 0.002 },
      { latitude: baseLat + 0.002, longitude: baseLng },
      { latitude: baseLat, longitude: baseLng }
    ];
  }

  /**
   * HealthKit 권한 상태 확인
   * @returns {Promise<Object>} 권한 상태 정보
   */
  async checkPermissions() {
    const startTime = Date.now();
    try {
      console.log('🔍 HealthKit 사용 가능 여부 확인');
      
      // HealthKit 사용 가능 여부 확인 (콜백 방식으로 변경)
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
      this.logPerformance('권한 상태 확인', startTime);
      
      return {
        isAvailable: true,
        hasPermissions: this.isInitialized,
        error: null
      };
    } catch (error) {
      this.logPerformance('권한 상태 확인 (실패)', startTime);
      const errorInfo = this.classifyError(error, '권한 상태 확인');
      
      return {
        isAvailable: false,
        hasPermissions: false,
        error: errorInfo.message
      };
    }
  }

  /**
   * HealthKit 권한 요청
   * @returns {Promise<boolean>} 권한 요청 성공 여부
   */
  async requestPermissions() {
    const startTime = Date.now();
    try {
      console.log('🔍 HealthKit 권한 요청 시작');

      // 간단한 권한 요청
      const options = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.StepCount,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.Workout
          ],
          write: []
        }
      };

      // HealthKit 권한 요청
      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(options, (error, results) => {
          this.logPerformance('HealthKit 권한 요청', startTime);
          
          if (error) {
            console.error('❌ HealthKit 권한 요청 실패:', error);
            this.classifyError(error, 'HealthKit 권한 요청');
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
      this.logPerformance('HealthKit 권한 요청 (실패)', startTime);
      this.classifyError(error, 'HealthKit 권한 요청');
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
}

export default new AppleFitnessService();

