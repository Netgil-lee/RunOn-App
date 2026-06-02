# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**RunOn** — iOS 전용 러닝 커뮤니티 앱 (React Native + Expo, Firebase 백엔드)
- Bundle ID: `com.runon.app`
- 현재 버전: `1.1.29` (buildNumber: `182`)
- Firebase 프로젝트: `runon-production-app`
- EAS 프로젝트 ID: `b2ec1d33-1054-4404-b072-623c6cd66588`

## 개발 명령어

```bash
# 개발 서버 시작 (LAN 모드)
npm start           # expo start --host lan
npm run ios         # iOS 시뮬레이터
npm run android     # Android

# 테스트
npx jest                          # 전체 테스트
npx jest __tests__/App.test.tsx   # 단일 테스트 파일

# EAS 빌드
eas build --platform ios --profile development
eas build --platform ios --profile production

# Firebase Functions 배포
cd functions && npm run deploy
```

## 아키텍처 구조

### 진입점 및 초기화 흐름

`App.js` → Firebase 초기화(`config/firebase.js`) → 폰트 로딩 → `NavigationContainer` → `AppNavigator`

앱 시작 시 컨텍스트 Provider 중첩 순서 (바깥→안):
`NetworkProvider` → `AuthProvider` → `PremiumProvider` → `NotificationSettingsProvider` → `EventProvider` → `CommunityProvider` → `GuideProvider`

### 네비게이션 구조 (`navigation/AppNavigator.js`)

인증 상태에 따라 세 가지 Stack을 조건부 렌더링:
- **비로그인**: `Login` → `PhoneAuth` → `Verification` → `AppIntro/AppGuide`
- **온보딩 미완료**: `Onboarding` → `AppIntro`
- **로그인 완료**: `Main`(BottomTab) + 모달 스택 전체

BottomTab 5개: `홈(HomeTab)` / `모임(ScheduleTab)` / `지도(MapTab)` / `커뮤니티(CommunityTab)` / `프로필(ProfileTab)`

### 상태 관리 패턴

**Context API** 전용 — Redux/Zustand 없음.
- `AuthContext`: Firebase Auth 상태, 온보딩 완료 여부, 전화번호 인증 흐름
- `PremiumContext`: IAP 구독 상태 (`react-native-iap`), Firestore에서 프리미엄 여부 확인
- `EventContext`: 모임/미팅 알림 배지
- `CommunityContext`: 커뮤니티 알림 배지
- `NetworkContext`: 오프라인 감지

비즈니스 로직의 일부는 `viewmodels/AuthViewModel.js`로 분리 (패턴 미완성, 현재 Auth만 적용).

### 핵심 서비스 레이어 (`services/`)

| 서비스 | 역할 |
|---|---|
| `firestoreService.js` | Firestore CRUD 통합 클래스 (class 패턴) |
| `backgroundLocationService.js` | `expo-task-manager` 백그라운드 위치 태스크, AsyncStorage 버퍼 (`@runon:background_location_buffer_v1`) |
| `runningTrackingSessionService.js` | 러닝 세션 영속화 (`@runon:active_running_session_v1`), 24시간 초과 시 자동 폐기 |
| `appleFitnessService.js` | HealthKit 연동 (iOS only, 동적 임포트로 시뮬레이터 크래시 방지) |
| `runOnRunningService.js` | 러닝 결과를 Firestore에 저장 |
| `paymentService.js` | IAP 구독/일회성 결제 처리, 영수증 검증 |
| `pushNotificationService.js` | FCM 푸시 알림, 네비게이션 핸들러 |
| `kakaoPlacesService.js` | Kakao REST API로 장소 검색 |
| `weatherAlertService.js` | 날씨 API 연동 |
| `geofirestoreService.js` | 위치 기반 Firestore 쿼리 (geofirestore) |

### 러닝 트래킹 아키텍처 (`screens/RunningTrackerScreen.js`)

포그라운드 + 백그라운드 이중 위치 추적:
- **포그라운드**: `expo-location` watchPositionAsync (고정밀)
- **백그라운드**: `backgroundLocationService`의 TaskManager 태스크가 AsyncStorage 버퍼에 좌표 적재 → 포그라운드 복귀 시 `consumeBuffer()`로 소비
- 거리 계산: Haversine 공식 내장, 중복/이상 좌표 필터링 (2.5초/8m 윈도우)
- 세션 복구: 앱 종료 후 재진입 시 `runningTrackingSessionService.load()`로 자동 복구
- 완료 후 Apple Fitness(HealthKit)에 운동 기록 저장 → `RunningResult` 화면으로 이동

### 지도 (`screens/MapScreen.js`)

카카오맵을 **WebView**로 렌더링 (`components/HanRiverMap.js`, `components/RouteMap.js`). React Native ↔ WebView 간 `postMessage`/`onMessage`로 통신.

### 환경 설정 (`config/environment.js`)

`__DEV__`로 dev/staging/prod 자동 분기. 모든 API 키는 `config/environment.js`에서 `Constants.expoConfig.extra`를 통해 로드. TestFlight에서는 `prod` 환경 사용.

### 결제 구독 제품 ID

- `com.runon.app.premium.monthly` (월간 구독)
- `com.runon.app.premium.yearly` (연간 구독)
- `com.runon.app.premium.lifetime` (영구 소비성)

### 딥링크 스킴

`runon://event/{eventId}` → `MapTab`의 해당 이벤트로 이동. iOS 네이티브 스킴(`com.runon.app`), Expo 스킴(`exp+runon`) 모두 허용.

### Firebase Functions (`functions/`)

Cloud Functions 별도 패키지. 주요 용도: 푸시 알림 발송, 영수증 검증(`receiptValidationService`), Garmin 연동.

## iOS 빌드 관련

- `UIBackgroundModes`: `location`, `remote-notification` 활성화 필수
- HealthKit 퍼미션은 `Info.plist`에서 `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` 관리
- EAS `production` 프로필: Node `18.18.0`, `--legacy-peer-deps` 필수

## 디자인 시스템

앱 전체 다크 테마, 핵심 색상:
- `PRIMARY`: `#3AF8FF` (시안)
- `BACKGROUND`: `#000000`
- `SURFACE`: `#1F1F24`
- 폰트: `Pretendard` (기본), `Gold` (브랜드)
