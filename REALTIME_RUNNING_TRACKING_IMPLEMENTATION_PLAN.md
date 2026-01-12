# 실시간 러닝 측정 기능 구현 계획

## 📋 현재 상태 분석

### ✅ 이미 구현된 기능
1. **HealthKit 연동** (`services/appleFitnessService.js`)
   - HealthKit에서 기존 러닝 기록 읽기 (read 권한)
   - 워크아웃 데이터 조회 및 매칭
   - 이동경로 좌표 조회

2. **위치 추적** (`expo-location`)
   - 현재 위치 가져오기 (`getCurrentPositionAsync`)
   - 위치 권한 관리
   - 한강 지도에 위치 표시

3. **기존 인프라**
   - `react-native-health`: HealthKit 연동 라이브러리
   - `expo-location`: 위치 추적 라이브러리
   - 위치 권한 설정 완료 (Info.plist)

### ❌ 아직 구현되지 않은 기능
1. **실시간 GPS 추적**
   - 현재는 일회성 위치 조회만 사용
   - 실시간 위치 업데이트 (`watchPositionAsync`) 미사용

2. **HealthKit 쓰기 권한**
   - 현재는 읽기 권한만 요청 (`write: []`)
   - 워크아웃 저장 기능 없음

3. **러닝 측정 화면**
   - 실시간 측정을 위한 전용 화면 없음
   - 거리, 시간, 페이스 실시간 표시 UI 없음

4. **러닝 데이터 계산**
   - GPS 좌표 간 거리 계산 로직 없음
   - 페이스 계산 로직 없음
   - 칼로리 추정 로직 없음

---

## 🎯 구현 목표

스트라바, 나이키 러닝 클럽과 유사한 실시간 러닝 측정 기능 구현:
- ✅ 실시간 GPS 추적
- ✅ 거리, 시간, 페이스 실시간 표시
- ✅ 러닝 경로 지도에 표시
- ✅ HealthKit에 워크아웃 저장
- ✅ 일시정지/재개 기능
- ✅ 러닝 완료 후 결과 화면

---

## 📐 구현 계획

### Phase 1: 핵심 인프라 구축

#### 1.1 HealthKit 쓰기 권한 추가
**파일**: `services/appleFitnessService.js`

```javascript
// 현재 (108줄)
write: []

// 변경 후
write: [
  P.Workout || 'Workout',
  P.DistanceWalkingRunning || 'DistanceWalkingRunning',
  P.ActiveEnergyBurned || 'ActiveEnergyBurned',
  P.HeartRate || 'HeartRate', // 선택사항
]
```

**작업 내용**:
- `initialize()` 메서드의 권한 요청에 write 권한 추가
- `requestPermissions()` 메서드에도 write 권한 추가
- HealthKit 워크아웃 저장 메서드 구현

#### 1.2 실시간 위치 추적 서비스 생성
**새 파일**: `services/runningTrackerService.js`

**기능**:
- `expo-location`의 `watchPositionAsync` 사용
- GPS 좌표 배열 저장
- 거리 계산 (Haversine 공식)
- 페이스 계산
- 칼로리 추정

**주요 메서드**:
```javascript
class RunningTrackerService {
  startTracking() // 러닝 시작
  pauseTracking() // 일시정지
  resumeTracking() // 재개
  stopTracking() // 종료
  getCurrentStats() // 현재 통계 반환
  calculateDistance(coords) // 거리 계산
  calculatePace(distance, time) // 페이스 계산
  estimateCalories(distance, time, weight) // 칼로리 추정
}
```

#### 1.3 HealthKit 워크아웃 저장 기능
**파일**: `services/appleFitnessService.js`

**새 메서드 추가**:
```javascript
async saveWorkout(workoutData) {
  // workoutData: {
  //   startDate: Date,
  //   endDate: Date,
  //   distance: number (meters),
  //   calories: number,
  //   routeCoordinates: Array<{latitude, longitude}>
  // }
}
```

---

### Phase 2: 러닝 측정 화면 구현

#### 2.1 러닝 측정 화면 생성
**새 파일**: `screens/RunningTrackerScreen.js`

**UI 구성**:
- 상단: 시간 표시 (타이머)
- 중앙: 거리, 페이스, 칼로리 표시
- 하단: 지도 (러닝 경로 표시)
- 하단 버튼: 시작/일시정지/종료

**상태 관리**:
- `isRunning`: 러닝 중 여부
- `isPaused`: 일시정지 여부
- `startTime`: 시작 시간
- `pausedTime`: 일시정지된 시간 누적
- `distance`: 누적 거리 (미터)
- `pace`: 현재 페이스 (초/km)
- `calories`: 추정 칼로리
- `routeCoordinates`: GPS 좌표 배열

#### 2.2 실시간 업데이트
- 1초마다 통계 업데이트
- GPS 좌표 수집 (최소 5초 간격 또는 10m 이동)
- 지도에 경로 표시

---

### Phase 3: 러닝 완료 및 결과 화면

#### 3.1 러닝 완료 화면
**새 파일**: `screens/RunningCompleteScreen.js`

**표시 정보**:
- 총 거리
- 총 시간
- 평균 페이스
- 칼로리
- 경로 지도
- HealthKit 저장 여부

**기능**:
- HealthKit에 워크아웃 저장
- 결과 공유 (이미지 생성)
- 홈으로 돌아가기

---

### Phase 4: 네비게이션 및 통합

#### 4.1 네비게이션 추가
**파일**: `navigation/AppNavigator.js` 또는 해당 네비게이션 파일

**추가할 화면**:
- `RunningTrackerScreen`: 러닝 측정 화면
- `RunningCompleteScreen`: 러닝 완료 화면

**접근 경로**:
- 홈 화면에서 "러닝 시작" 버튼
- 또는 프로필 화면에서 "러닝 기록" 메뉴

#### 4.2 기존 기능과 통합
- 러닝 완료 후 `RunningShareCard` 컴포넌트 재사용
- HealthKit 저장 후 기존 `findMatchingWorkout` 로직과 호환

---

## 🔧 기술 스택

### 필요한 라이브러리
- ✅ `expo-location`: 이미 설치됨
- ✅ `react-native-health`: 이미 설치됨
- 추가 라이브러리 필요 없음 (기존 인프라 활용)

### 필요한 권한
- ✅ 위치 권한: 이미 설정됨
- ✅ HealthKit 읽기 권한: 이미 설정됨
- ⚠️ HealthKit 쓰기 권한: 추가 필요

---

## 📝 구현 상세 사항

### 1. 거리 계산 (Haversine 공식)
```javascript
function calculateDistance(coord1, coord2) {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 미터 단위
}
```

### 2. 페이스 계산
```javascript
function calculatePace(distanceMeters, timeSeconds) {
  if (distanceMeters === 0) return 0;
  const paceSecondsPerKm = (timeSeconds / distanceMeters) * 1000;
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}
```

### 3. 칼로리 추정
```javascript
function estimateCalories(distanceMeters, timeSeconds, weightKg = 70) {
  // MET (Metabolic Equivalent) 값: 러닝은 약 8-10 MET
  const MET = 9.0; // 평균값
  const hours = timeSeconds / 3600;
  const calories = MET * weightKg * hours;
  return Math.round(calories);
}
```

### 4. HealthKit 워크아웃 저장
```javascript
async saveWorkout(workoutData) {
  const AppleHealthKit = await loadHealthKitModule();
  
  return new Promise((resolve, reject) => {
    AppleHealthKit.saveWorkout(
      {
        type: 'Running',
        startDate: workoutData.startDate.toISOString(),
        endDate: workoutData.endDate.toISOString(),
        distance: workoutData.distance, // 미터 단위
        energyBurned: workoutData.calories,
        energyBurnedUnit: 'kilocalorie',
        // 경로 데이터는 별도로 저장 필요
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}
```

---

## ⚠️ 주의사항 및 고려사항

### 1. 배터리 최적화
- GPS 추적은 배터리를 많이 소모함
- 위치 업데이트 간격 조절 (최소 5초 또는 10m 이동)
- 백그라운드 모드 고려 (추후 구현)

### 2. 정확도
- GPS 정확도는 환경에 따라 다름 (실내, 터널 등)
- 부정확한 좌표 필터링 필요
- 이동 속도 기반 이상치 제거

### 3. 권한 관리
- 위치 권한: "항상 허용" 권한 필요할 수 있음 (백그라운드 추적)
- HealthKit 쓰기 권한: 사용자에게 명확한 설명 필요

### 4. 데이터 저장
- 러닝 중 데이터는 메모리에만 저장 (앱 종료 시 손실 가능)
- 완료 후 즉시 HealthKit에 저장
- 선택적으로 Firebase에 백업 (추후 구현)

### 5. iOS 백그라운드 모드
- 현재 Info.plist에 `location` 백그라운드 모드 없음
- 백그라운드 추적을 위해서는 추가 설정 필요

---

## 🚀 구현 우선순위

### Phase 1 (필수) - 핵심 기능
1. ✅ HealthKit 쓰기 권한 추가
2. ✅ 실시간 위치 추적 서비스 구현
3. ✅ 러닝 측정 화면 기본 UI
4. ✅ 거리/시간/페이스 계산 및 표시

### Phase 2 (중요) - 완성도 향상
5. ✅ 일시정지/재개 기능
6. ✅ 러닝 경로 지도 표시
7. ✅ HealthKit 워크아웃 저장
8. ✅ 러닝 완료 화면

### Phase 3 (선택) - 고급 기능
9. ⚪ 칼로리 추정 (사용자 체중 입력)
10. ⚪ 목표 설정 (거리/시간 목표)
11. ⚪ 음성 안내 (1km마다 페이스 안내)
12. ⚪ 백그라운드 추적
13. ⚪ Firebase 백업

---

## 📱 예상 UI/UX

### 러닝 측정 화면
```
┌─────────────────────────┐
│  [뒤로]  러닝 중  [일시정지] │
├─────────────────────────┤
│                         │
│       00:25:30          │  ← 시간
│                         │
│       5.2 km            │  ← 거리
│                         │
│       4:48 /km          │  ← 페이스
│                         │
│       320 kcal          │  ← 칼로리
│                         │
├─────────────────────────┤
│                         │
│      [지도 영역]         │  ← 러닝 경로
│                         │
├─────────────────────────┤
│  [일시정지]    [종료]     │
└─────────────────────────┘
```

### 러닝 완료 화면
```
┌─────────────────────────┐
│         완료! 🎉          │
├─────────────────────────┤
│  총 거리: 5.2 km         │
│  총 시간: 25분 30초       │
│  평균 페이스: 4:48/km    │
│  칼로리: 320 kcal        │
├─────────────────────────┤
│      [경로 지도]         │
├─────────────────────────┤
│  [HealthKit 저장]        │
│  [공유하기]  [홈으로]    │
└─────────────────────────┘
```

---

## ✅ 체크리스트

### Phase 1
- [ ] HealthKit 쓰기 권한 추가
- [ ] `runningTrackerService.js` 생성
- [ ] 거리 계산 함수 구현
- [ ] 페이스 계산 함수 구현
- [ ] `RunningTrackerScreen.js` 기본 구조 생성

### Phase 2
- [ ] 실시간 GPS 추적 구현
- [ ] 실시간 통계 업데이트
- [ ] 일시정지/재개 기능
- [ ] 지도에 경로 표시
- [ ] HealthKit 워크아웃 저장 구현

### Phase 3
- [ ] `RunningCompleteScreen.js` 생성
- [ ] 결과 화면 UI 구현
- [ ] HealthKit 저장 확인
- [ ] 네비게이션 연결
- [ ] 테스트 및 버그 수정

---

## 📚 참고 자료

- [expo-location 문서](https://docs.expo.dev/versions/latest/sdk/location/)
- [react-native-health 문서](https://github.com/agencyenterprise/react-native-health)
- [HealthKit 워크아웃 가이드](https://developer.apple.com/documentation/healthkit/hkworkout)
- [Haversine 공식](https://en.wikipedia.org/wiki/Haversine_formula)

---

## 💡 향후 개선 사항

1. **음성 안내**: 1km마다 페이스 안내
2. **목표 설정**: 거리/시간 목표 설정 및 달성 알림
3. **통계 분석**: 주간/월간 통계, 그래프
4. **소셜 기능**: 러닝 기록 공유, 친구와 경쟁
5. **AI 코칭**: 페이스 분석 및 개선 제안
6. **워치 앱**: Apple Watch 연동

---

**작성일**: 2025-01-XX
**작성자**: AI Assistant
**버전**: 1.0





