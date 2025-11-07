# HealthKit 디버깅 가이드

## 🔍 디버깅 도구 및 방법

### 1. 콘솔 로그 모니터링

#### HealthKit 관련 로그 필터링
```bash
# Metro bundler에서 HealthKit 로그만 확인
npx react-native log-ios | grep -E "(🏥|✅|❌|HealthKit)"
```

#### 주요 로그 패턴
```javascript
// 권한 관련 로그
console.log('🏥 HealthKit 권한 상태:', permissionStatus);
console.log('✅ HealthKit 권한 요청 성공');
console.log('❌ HealthKit 권한 요청 실패:', error);

// 데이터 관련 로그
console.log('🔍 HealthKit에서 가져온 워크아웃 데이터:', workouts);
console.log('🔍 매칭된 워크아웃:', matchingWorkout);
console.log('🔍 워크아웃 상세 정보:', workoutDetails);
```

### 2. 권한 상태 디버깅

#### 권한 상태 상세 확인
```javascript
const debugHealthKitPermissions = async () => {
  try {
    const permissionStatus = await appleFitnessService.checkPermissions();
    console.log('=== HealthKit 권한 상태 디버깅 ===');
    console.log('사용 가능:', permissionStatus.isAvailable);
    console.log('권한 있음:', permissionStatus.hasPermissions);
    console.log('권한 상태:', permissionStatus.permissionStatus);
    console.log('에러:', permissionStatus.error);
    console.log('================================');
  } catch (error) {
    console.error('❌ 권한 상태 확인 실패:', error);
  }
};
```

#### AsyncStorage 상태 확인
```javascript
const debugAsyncStorage = async () => {
  try {
    const healthPermission = await AsyncStorage.getItem('healthPermissionGranted');
    console.log('AsyncStorage 권한 상태:', healthPermission);
  } catch (error) {
    console.error('❌ AsyncStorage 확인 실패:', error);
  }
};
```

### 3. 데이터 가져오기 디버깅

#### 워크아웃 데이터 확인
```javascript
const debugWorkoutData = async () => {
  try {
    console.log('=== 워크아웃 데이터 디버깅 ===');
    
    // 최근 워크아웃 가져오기
    const workouts = await appleFitnessService.getRecentWorkouts(5);
    console.log('워크아웃 개수:', workouts.length);
    console.log('워크아웃 데이터:', workouts);
    
    // 각 워크아웃 상세 정보
    for (let i = 0; i < workouts.length; i++) {
      const workout = workouts[i];
      console.log(`워크아웃 ${i + 1}:`, {
        id: workout.id,
        type: workout.type,
        startDate: workout.startDate,
        duration: workout.duration,
        totalDistance: workout.totalDistance
      });
    }
    
    console.log('============================');
  } catch (error) {
    console.error('❌ 워크아웃 데이터 디버깅 실패:', error);
  }
};
```

#### 매칭 로직 디버깅
```javascript
const debugMatchingLogic = async (event) => {
  try {
    console.log('=== 매칭 로직 디버깅 ===');
    console.log('이벤트 시간:', event.date);
    console.log('이벤트 ID:', event.id);
    
    const matchingWorkout = await appleFitnessService.findMatchingWorkout(event);
    console.log('매칭된 워크아웃:', matchingWorkout);
    
    if (matchingWorkout) {
      const workoutDetails = await appleFitnessService.getWorkoutDetails(matchingWorkout.id);
      console.log('워크아웃 상세 정보:', workoutDetails);
    } else {
      console.log('❌ 매칭되는 워크아웃 없음');
    }
    
    console.log('========================');
  } catch (error) {
    console.error('❌ 매칭 로직 디버깅 실패:', error);
  }
};
```

## 🐛 일반적인 문제 및 해결 방법

### 1. 권한 관련 문제

#### 문제: 권한 요청이 나타나지 않음
**증상**: 
- HealthKit 권한 다이얼로그가 표시되지 않음
- 권한 상태가 항상 false

**원인**:
- Xcode 프로젝트 설정 문제
- HealthKit Capability 누락
- Bundle Identifier 문제

**해결 방법**:
```bash
# 1. Xcode에서 프로젝트 설정 확인
open ios/RunOn.xcworkspace

# 2. HealthKit Capability 추가 확인
# TARGETS → RunOn → Signing & Capabilities → + Capability → HealthKit

# 3. Bundle Identifier 고유성 확인
# Bundle Identifier가 고유한지 확인

# 4. 개발자 계정 설정 확인
# Team 설정이 올바른지 확인
```

#### 문제: 권한은 허용했지만 데이터 접근 불가
**증상**:
- 권한은 허용했지만 워크아웃 데이터를 가져올 수 없음
- `hasPermissions: false` 상태

**원인**:
- Apple Health 앱에 데이터 없음
- 권한 상태 확인 로직 오류

**해결 방법**:
```javascript
// 1. Apple Health 앱에서 데이터 확인
// Apple Health 앱 → 브라우징 → 활동 → 워크아웃

// 2. 권한 상태 재확인
const recheckPermissions = async () => {
  const permissionStatus = await appleFitnessService.checkPermissions();
  console.log('권한 상태 재확인:', permissionStatus);
  
  if (!permissionStatus.hasPermissions) {
    // 권한 재요청
    const result = await appleFitnessService.requestPermissions();
    console.log('권한 재요청 결과:', result);
  }
};
```

### 2. 데이터 관련 문제

#### 문제: 워크아웃 데이터가 비어있음
**증상**:
- `getRecentWorkouts()` 결과가 빈 배열
- 더미 데이터만 반환됨

**원인**:
- Apple Health 앱에 워크아웃 데이터 없음
- HealthKit API 호출 오류

**해결 방법**:
```javascript
// 1. Apple Health 앱에서 워크아웃 데이터 추가
// Apple Health 앱 → + → 워크아웃 → 러닝

// 2. 데이터 확인
const checkHealthAppData = async () => {
  try {
    // HealthKit에서 직접 데이터 확인
    const workouts = await HealthKit.getSamples({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      limit: 10,
      dataType: 'Workout'
    });
    console.log('HealthKit 직접 조회 결과:', workouts);
  } catch (error) {
    console.error('HealthKit 직접 조회 실패:', error);
  }
};
```

#### 문제: 매칭되는 워크아웃을 찾을 수 없음
**증상**:
- 모임 시간과 워크아웃 시간이 매칭되지 않음
- `findMatchingWorkout()` 결과가 null

**원인**:
- 시간 차이가 30분 이상
- 워크아웃 타입 불일치
- 시간대 차이

**해결 방법**:
```javascript
// 1. 매칭 로직 디버깅
const debugMatching = async (event) => {
  const workouts = await appleFitnessService.getRecentWorkouts(10);
  const eventTime = new Date(event.date);
  
  console.log('이벤트 시간:', eventTime.toISOString());
  
  workouts.forEach((workout, index) => {
    const workoutTime = new Date(workout.startDate);
    const timeDiff = Math.abs(workoutTime - eventTime);
    console.log(`워크아웃 ${index + 1}:`, {
      시간: workoutTime.toISOString(),
      차이: Math.round(timeDiff / (1000 * 60)) + '분',
      매칭: timeDiff <= 30 * 60 * 1000
    });
  });
};

// 2. 매칭 조건 완화 (개발용)
const findMatchingWorkoutRelaxed = async (event) => {
  const workouts = await appleFitnessService.getRecentWorkouts(10);
  const eventTime = new Date(event.date);
  
  // 2시간 이내로 완화
  const maxTimeDiff = 2 * 60 * 60 * 1000;
  
  for (const workout of workouts) {
    const timeDiff = Math.abs(new Date(workout.startDate) - eventTime);
    if (timeDiff <= maxTimeDiff) {
      return workout;
    }
  }
  
  return null;
};
```

### 3. 에러 처리 문제

#### 문제: HealthKit API 호출 시 크래시
**증상**:
- HealthKit API 호출 시 앱 크래시
- try-catch로 잡히지 않는 에러

**원인**:
- 권한 없이 API 호출
- 잘못된 파라미터 전달
- HealthKit 초기화 실패

**해결 방법**:
```javascript
// 1. 권한 확인 후 API 호출
const safeHealthKitCall = async (apiCall) => {
  try {
    // 권한 상태 확인
    const permissionStatus = await appleFitnessService.checkPermissions();
    if (!permissionStatus.hasPermissions) {
      throw new Error('HealthKit 권한이 없습니다');
    }
    
    // API 호출
    return await apiCall();
  } catch (error) {
    console.error('❌ HealthKit API 호출 실패:', error);
    throw error;
  }
};

// 2. 안전한 워크아웃 데이터 가져오기
const safeGetWorkouts = async () => {
  return await safeHealthKitCall(async () => {
    return await appleFitnessService.getRecentWorkouts();
  });
};
```

## 📊 성능 모니터링

### 1. API 호출 시간 측정
```javascript
const measureApiCall = async (apiName, apiCall) => {
  const startTime = Date.now();
  try {
    const result = await apiCall();
    const endTime = Date.now();
    console.log(`⏱️ ${apiName} 실행 시간: ${endTime - startTime}ms`);
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.log(`❌ ${apiName} 실패 (${endTime - startTime}ms):`, error);
    throw error;
  }
};

// 사용 예시
const workouts = await measureApiCall(
  '워크아웃 데이터 가져오기',
  () => appleFitnessService.getRecentWorkouts()
);
```

### 2. 메모리 사용량 모니터링
```javascript
const monitorMemoryUsage = () => {
  if (__DEV__) {
    const memoryInfo = performance.memory;
    console.log('메모리 사용량:', {
      used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    });
  }
};
```

## 🚀 최적화 팁

### 1. 권한 상태 캐싱
```javascript
// 권한 상태를 캐싱하여 불필요한 API 호출 방지
let permissionCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

const getCachedPermissionStatus = async () => {
  const now = Date.now();
  if (permissionCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return permissionCache;
  }
  
  permissionCache = await appleFitnessService.checkPermissions();
  cacheTimestamp = now;
  return permissionCache;
};
```

### 2. 데이터 로딩 최적화
```javascript
// 필요한 데이터만 가져오기
const getOptimizedWorkoutData = async (event) => {
  try {
    // 최근 1일간의 데이터만 가져오기
    const workouts = await appleFitnessService.getRecentWorkouts(5);
    
    // 이벤트 시간과 가까운 워크아웃만 필터링
    const eventTime = new Date(event.date);
    const relevantWorkouts = workouts.filter(workout => {
      const timeDiff = Math.abs(new Date(workout.startDate) - eventTime);
      return timeDiff <= 2 * 60 * 60 * 1000; // 2시간 이내
    });
    
    return relevantWorkouts;
  } catch (error) {
    console.error('❌ 최적화된 워크아웃 데이터 가져오기 실패:', error);
    return [];
  }
};
```

이 디버깅 가이드를 통해 HealthKit 관련 문제를 체계적으로 해결할 수 있습니다.
