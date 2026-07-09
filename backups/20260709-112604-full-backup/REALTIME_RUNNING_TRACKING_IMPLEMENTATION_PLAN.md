# 실시간 러닝 측정 기능 구현 계획

## 📋 현재 상태 분석 (업데이트)

### ✅ 구현 완료
1. **실시간 러닝 측정 핵심 플로우**
   - `RunningTrackerScreen`에서 `watchPositionAsync` 기반 실시간 추적
   - 거리/시간/페이스 실시간 표시
   - 일시정지/재개/종료 동작 구현
   - 종료 시 `RunningResultScreen`으로 결과 전달 및 표시

2. **러닝 데이터 계산/안정화**
   - 좌표 간 거리 누적 + 속도 기반 보정 로직 적용
   - 짧은 세션에서 0m로 남는 문제 완화를 위한 종료 시점 보강
   - 최종 거리 계산 시 누적값/경로합산값 비교 반영

3. **HealthKit 연동 고도화**
   - 읽기/쓰기 권한 사용
   - `saveWorkout` 구현 완료
   - WorkoutRoute 저장 best-effort 시도 로직 추가
   - 최근 러닝 기록 조회 + sourceName 기반 라벨링 보강

4. **러닝 피드 연동**
   - RunOn + Apple Fitness 기록 병합 표시
   - 피드 카드 내 경로 미니맵 표시
   - Apple route 조회 최적화(부분 route 조회 + 캐시)

### 🔄 부분 구현/개선 필요
1. **러닝 측정 화면 내 실시간 지도 경로**
   - 경로 좌표는 수집/저장되나, 측정 화면 본체의 실시간 지도 렌더는 미적용

2. **WorkoutRoute 저장 신뢰성**
   - 기기/OS/네이티브 모듈 API 지원 여부에 따라 route 저장 결과 편차 존재
   - 일부 케이스에서 Apple Fitness 경로 미노출 가능

3. **백그라운드 추적**
   - 백그라운드 러닝 추적은 아직 미구현

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
- [x] HealthKit 쓰기 권한 추가
- [ ] `runningTrackerService.js` 생성 (현재는 `RunningTrackerScreen` 내부 로직으로 대체 구현)
- [x] 거리 계산 함수 구현
- [x] 페이스 계산 함수 구현
- [x] `RunningTrackerScreen.js` 기본 구조 생성

### Phase 2
- [x] 실시간 GPS 추적 구현
- [x] 실시간 통계 업데이트
- [x] 일시정지/재개 기능
- [x] 지도에 경로 표시 (측정 화면 카카오맵 실시간 경로/현재위치/시작-종료 마커/자동줌 반영)
- [x] 지도/지표 레이아웃 분리 (카카오맵 전체화면 + 하단 모달 지표/컨트롤)
- [x] HealthKit 워크아웃 저장 구현

### Phase 3
- [x] `RunningCompleteScreen.js` 생성 (현재 명칭: `RunningResultScreen.js`)
- [x] 결과 화면 UI 구현
- [x] HealthKit 저장 확인
- [x] 네비게이션 연결 (`RunningTracker` -> `RunningResult`)
- [x] 주요 버그 수정 (0m/0페이스, source 라벨, route 조회/표시, 피드 로딩 최적화)

---

## 🔍 요청사항 1~4 점검 결과

### 요청사항
1. 러닝 측정 시 화면 이동이 부자연스럽고 끊김 발생  
2. 현재 위치를 화면 중앙에 두고 지도가 이동해야 함  
3. 시작점으로 화면 이동 불필요  
4. 러닝측정 화면 진입 후 "GPS 수신중..." 안내 후 시작

### 왜 발생했는지 (원인)
- 지도 카메라 로직에서 자동 줌(`setBounds`)과 중심 이동이 섞여 경로가 흔들림
- WebView로 전달되는 지도 경로 갱신 때마다 Polyline을 재생성해 프레임 부하 증가
- 러닝 화면 진입 즉시 추적 로직이 돌아 사용자 입장에서는 준비 단계 없이 시작되는 인상

### 현재 반영 상태
- [x] 카메라 이동 로직 단순화: 현재 위치 기준 추적(`panTo`) 중심으로 변경
- [x] 시작점 위주 재포커싱 제거 (자동 줌 기반 시작점 회귀 동작 제거)
- [x] Polyline 재생성 대신 `setPath` 갱신으로 끊김 완화
- [x] GPS 준비 단계 추가: `GPS 수신중...` 상태 표시 후 버튼 활성화
- [x] GPS 준비 중 `일시정지/종료` 버튼 비활성화 처리

### 남은 리스크/추가 점검
- 카카오맵 SDK 로딩 실패 환경(네트워크/키 설정)에 대한 실기기 재현 테스트 필요
- 장시간 러닝(30분+)에서 카메라 추적 부드러움 추가 검증 필요

---

## ⏭️ 다음 단계(우선순위)

1. **카카오맵 로드 안정화(실기기)**
   - `MAP_LOAD_TIMEOUT`, `KAKAO_SDK_NOT_READY` 재현 케이스 수집
   - 카카오 JavaScript 키의 플랫폼/도메인(웹뷰) 허용 설정 점검
   - 로딩 실패 시 재시도/대체 표시 UX 강화
2. **화면 잠금/백그라운드 추적 단계 구현**
   - iOS 백그라운드 위치 추적(`TaskManager` + `startLocationUpdatesAsync`) 적용
   - 측정 중 화면 잠금 정책(`expo-keep-awake`) 결정 및 적용
   - 복귀 시 경로/통계/지도 동기화 보강
3. **HealthKit route 저장 검증 강화**
   - 실제 디바이스/OS 조합별 route 저장 성공률 로그 수집
   - 저장 실패 케이스 폴백(로컬 경로 기반 표시) 명확화
4. **러닝피드 성능 고도화**
   - 현재 점진 로딩(페이지 + route 단계 조회) 튜닝
   - 필요 시 백그라운드 선조회/프리페치 범위 조정
5. **동일 세션 dedupe 정밀화**
   - RunOn/Apple 동시 저장 시 시작시간+지속시간+거리 기반 매칭 정확도 개선
   - 중복 제거 정책에 대한 QA 데이터셋 정리
6. **서비스 구조 정리**
   - `runningTrackerService.js` 분리로 화면 로직 경량화
7. **QA 시나리오 확장**
   - 짧은 세션/일시정지 반복/권한 거부/오프라인 등 회귀 테스트 케이스 문서화

---

## 🆕 새롭게 추가된 내용(최근 반영)

- **공유 이미지 출처 분기**
  - RunOn 측정 기록은 로컬 데이터를 우선 사용
  - Apple/Fitness 데이터는 외부 조회 분기 유지
- **러닝피드 인터랙션**
  - 좋아요 아이콘: 0~10 훈련강도 컬러 바 저장(로컬)
  - 메모 아이콘: 카드별 메모 저장(로컬)
  - 공유 아이콘: 기존 이미지 생성 동작 연결
- **RunOn 기록 UX**
  - 피드 배지 컬러를 프라이머리 색상으로 구분
  - RunOn 로컬 기록 롱프레스 삭제 지원
- **알림(커뮤니티 탭) 개선**
  - 알림 카드 롱프레스 삭제
  - 삭제 시 알림/미읽음/배지 동기화
- **측정 화면 카카오맵 실시간 트래킹**
  - 카카오맵 WebView 위 경로 Polyline 실시간 표시
  - 현재 위치 마커 + 시작(초록)/종료(빨강) 마커 반영
  - 일시정지 시 카메라 고정, 러닝 중 주기적 자동 줌 적용
- **측정 화면 UI 구조 변경**
  - 카카오맵을 전체화면으로 배치
  - 시간/거리/페이스/컨트롤 버튼을 하단 모달로 분리
- **지도 오류 대응 보강**
  - SDK 로드/초기화 오류를 RN으로 전달하는 진단 채널 추가
  - 지도 로딩 실패 오버레이가 컨트롤 터치를 막지 않도록 수정(`pointerEvents="none"`)

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
**최종 업데이트**: 2026-05-03
**작성자**: AI Assistant
**버전**: 1.6






---

## 부록: 화면 꺼짐/백그라운드 러닝 측정 구현 계획

### 목표
- 러닝 측정 중 화면이 꺼지거나 앱이 백그라운드로 가도 거리/시간/경로 측정이 안정적으로 이어지게 한다.
- iOS 정책에 맞는 권한 및 백그라운드 실행 설정을 적용한다.
- 복귀 시 UI가 즉시 최신 상태로 동기화되도록 한다.

---

### 현재 상태 요약
- `RunningTrackerScreen`의 포그라운드 `watchPositionAsync` 기반 추적은 구현됨.
- 백그라운드 전용 추적(`TaskManager` + `startLocationUpdatesAsync`)은 미구현.
- 장시간 측정/화면 OFF 시 누락 가능성에 대한 보호 로직(세션 상태 영속화, 복구)이 부족함.

---

### 우선순위별 실행 항목

### P0 (필수): 백그라운드 추적 기반 만들기
1. **권한/설정 정비**
   - `app.json`에 iOS background mode (`location`) 설정 확인/보강.
   - iOS 위치 권한 문구 점검 (`When In Use` + 필요 시 `Always` 전략).
   - Expo Location + TaskManager 조합이 현재 워크플로우에서 정상 동작하는지 확인.

2. **백그라운드 위치 Task 정의**
   - 예: `BACKGROUND_RUNNING_LOCATION_TASK`
   - `TaskManager.defineTask(...)`에서 수신 좌표를 세션 스토어에 적재.
   - 이상치 필터(점프 좌표, 비정상 speed) 최소 규칙 적용.

3. **러닝 시작/종료 시 백그라운드 추적 제어**
   - 시작: `startLocationUpdatesAsync(taskName, options)`
   - 종료: `stopLocationUpdatesAsync(taskName)`
   - 중복 시작 방지: `hasStartedLocationUpdatesAsync(taskName)` 체크.

4. **포그라운드 추적과 역할 분리**
   - 포그라운드: UI 반응성용 `watchPositionAsync`
   - 백그라운드: 연속성 보장용 Task 업데이트
   - 두 소스 병합 시 중복 포인트 제거 로직(시간/거리 기준) 적용.

---

### P1 (중요): 세션 유실 방지/복구
1. **세션 상태 영속화**
   - 러닝 활성 상태, 시작 시각, 누적 거리, 마지막 좌표/타임스탬프를 저장.
   - 후보 저장소: `AsyncStorage` (단기), 필요 시 DB 확장.

2. **앱 복귀 시 복구 플로우**
   - 앱 active 전환 시 백그라운드 수집분 반영 후 UI 재계산.
   - 타이머는 시작 시각 기반으로 재계산하여 드리프트 최소화.

3. **비정상 종료 대비**
   - 앱 재실행 시 진행 중 러닝 세션 감지 -> 복구/종료 선택 UX 제공.

---

### P2 (완성도): 배터리/정확도/UX 최적화
1. **위치 옵션 튜닝**
   - `accuracy`, `timeInterval`, `distanceInterval`, `activityType` 실측 튜닝.
   - 배터리 우선/정확도 우선 프리셋 검토.

2. **화면 꺼짐 UX 정책**
   - 기본: 화면 꺼져도 백그라운드 추적 유지.
   - 선택: `expo-keep-awake`로 “화면 켜짐 유지 모드” 토글 제공(사용자 선택형).

3. **중단 원인 가시화**
   - 권한 부족/시스템 중단/저전력 모드 영향 안내 문구 추가.

---

### P3 (고급): 신뢰성 강화
1. **세션 무결성 검사**
   - 구간별 이동거리/시간 기반 이상 세그먼트 마스킹.
2. **저장 파이프라인 안정화**
   - 종료 시 HealthKit/Firebase 저장 재시도 큐 도입.
3. **운영 로그/디버그 지표**
   - 백그라운드 수집 성공률, 세션 복구율, 누락률 추적.

---

### P4 (미래 기능): 잠금 화면 Live Activities

#### 개요
러닝 측정 중 화면이 꺼진 상태에서도 잠금 화면과 Dynamic Island에 **시간 / 이동거리 / 현재 페이스 / 평균 페이스**를 실시간으로 표시하는 기능.
나이키 러닝 클럽, Strava 등에서 이미 제공 중인 UX.

#### 요구 조건
- iOS **16.1 이상** (Live Activities API 최소 버전)
- iPhone 14 Pro 이상: Dynamic Island에도 동시 표시
- Expo SDK 50+ 또는 네이티브 모듈 직접 구현

#### 화면 예시
```
📱 잠금 화면
┌─────────────────────────────┐
│  오전 10:23  화요일 5월 5일   │
│                             │
│  ┌───────────────────────┐  │
│  │  🏃 RunOn 러닝 중      │  │
│  │  25:30        5.2km   │  │
│  │  현재 4:48/km  평균 4:52│  │
│  └───────────────────────┘  │
│                             │
│  [밀어서 잠금 해제]           │
└─────────────────────────────┘

Dynamic Island (아이폰 Pro)
┌─────────────────────────────┐
│       [● 25:30 · 5.2km]    │
└─────────────────────────────┘
```

#### 구현 구조
```
[RunningTrackerScreen.js]
  ↓ 1초마다 데이터 전달
[LiveActivitiesModule (RN 브릿지)]
  ↓ 네이티브 호출
[iOS Swift - ActivityKit]
  ↓ 잠금 화면 / Dynamic Island 렌더
[RunOnLiveActivityWidget.swift]
```

#### 필요 작업 목록
- [ ] `ios/RunOn/` 하위에 Widget Extension 타겟 추가 (Xcode)
- [ ] `RunOnLiveActivityAttributes.swift` — 표시 데이터 구조 정의
  - `elapsedSeconds`, `distanceMeters`, `currentPaceText`, `averagePaceText`
- [ ] `RunOnLiveActivityView.swift` — 잠금 화면 UI (WidgetKit)
- [ ] `RunOnDynamicIslandView.swift` — Dynamic Island compact/expanded UI
- [ ] `LiveActivitiesModule.swift` — React Native 브릿지
  - `startActivity(data)`, `updateActivity(data)`, `endActivity()`
- [ ] `NativeLiveActivitiesModule.js` — JS 래퍼
- [ ] `RunningTrackerScreen.js` 연결
  - 러닝 시작 시 `startActivity` 호출
  - 1초 타이머마다 `updateActivity` 호출
  - 러닝 종료 시 `endActivity` 호출

#### 주의사항
- Live Activities는 **Expo Go에서 동작하지 않음** → 개발 빌드(`expo run:ios`) 필요
- `ActivityKit` import 시 최소 배포 타겟을 iOS 16.1로 맞춰야 함
- 업데이트 빈도 제한: Apple 권장 최대 1회/초 (현재 계획과 동일)
- `expo-live-activities` 서드파티 패키지 사용 가능하나, 커스텀 UI 구현엔 네이티브 직접 작성 권장

---

### 파일 단위 작업 예정안
- `screens/RunningTrackerScreen.js`
  - 시작/일시정지/재개/종료 시 백그라운드 추적 제어 연결
  - AppState 복귀 시 동기화 처리
- `services/runningTrackingSessionService.js` (신규 권장)
  - 세션 상태 영속화, 좌표 병합/필터링, 통계 재계산
- `services/backgroundLocationService.js` (신규 권장)
  - Task 정의/등록/해제, 옵션 관리
- `app.json`
  - iOS 백그라운드 위치 관련 설정/권한 문구 점검

---

### 구현 순서 (실행 체크리스트)
- [x] 1단계: `app.json` 권한/백그라운드 모드 설정 점검 (`UIBackgroundModes`에 `location` 추가 완료)
- [x] 2단계: `TaskManager.defineTask` + `start/stopLocationUpdatesAsync` 최소 구현 (`services/backgroundLocationService.js` 신규 추가)
- [x] 3단계: `RunningTrackerScreen` 시작/종료 플로우 연결 (백그라운드 추적 시작/중지, 포그라운드 로직 `processIncomingLocation`으로 통합)
- [x] 4단계: 세션 영속화(시작시각/거리/좌표 요약) 적용 (`services/runningTrackingSessionService.js` 신규 추가, 5초 debounce 업데이트)
- [x] 5단계: 앱 복귀 시 동기화 및 UI 복구 (AppState 감지 → 버퍼 즉시 소비, 화면 진입 시 저장 세션 감지 → 복구 다이얼로그)
- [ ] 6단계: 실기기 테스트(화면 OFF 10분/30분, 앱 전환, 잠금해제 복귀)
- [ ] 7단계: 정확도/배터리 튜닝

---

### QA 시나리오 (필수)
1. **화면 잠금 15분 러닝**
   - 기대: 거리/시간 증가 지속, 종료 시 결과 누락 없음
2. **앱 백그라운드 전환 후 복귀**
   - 기대: 복귀 즉시 최신 통계/경로 반영
3. **권한 거부/부분 허용**
   - 기대: 명확한 안내 + 설정 이동 + 안전한 실패 처리
4. **일시정지/재개 반복**
   - 기대: 정지 구간 거리 누적 없음, 시간 계산 정확
5. **저전력 모드/네트워크 불안정**
   - 기대: 측정 지속, 저장은 재시도 또는 안전한 폴백

---

### 리스크 및 대응
- **iOS 권한 정책 제약**: Always 권한 유도 UX 필요 -> 단계형 권한 요청.
- **배터리 소모 증가**: 기본 옵션 보수적으로 시작 후 튜닝.
- **좌표 품질 편차**: 속도/거리 기반 필터와 최소 이동 임계치 적용.
- **중복 누적 위험**: foreground/background 좌표 merge 키(시간+근접거리) 사용.

---

### 바로 다음 액션 (같이 진행)
1. P0-1: `app.json`과 iOS 권한 문자열/백그라운드 모드부터 먼저 점검
2. P0-2: 백그라운드 Task 최소 코드 뼈대 추가
3. P0-3: `RunningTrackerScreen` 시작/종료에 연결

위 1~3을 먼저 완료하면, 화면이 꺼져도 측정 연속성을 확보할 수 있다.
