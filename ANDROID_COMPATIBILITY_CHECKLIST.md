# Android 호환성 수정 작업 체크리스트

## 📋 개요
현재 RunOn 앱은 iOS 기반으로 개발되어 Android 호환을 위해 다음 수정 작업이 필요합니다.

---

## 🔴 1. 건강 데이터 연동 (HealthKit → Samsung Health)

### 1.1 문제점
- `services/appleFitnessService.js`는 iOS HealthKit 전용으로 구현됨
- Android에서는 Samsung Health SDK를 사용해야 함
- 현재 코드는 `Platform.OS !== 'ios'`일 때 단순히 false 반환

### 1.2 수정 필요 파일
- `services/appleFitnessService.js` - Android 지원 추가 또는 별도 서비스 생성
- ✅ `screens/SettingsScreen.js` - HealthKit 관련 UI/텍스트 수정 **완료**
- ✅ `screens/AppIntroScreen.js` - HealthKit 권한 체크 수정 **완료**
- ✅ `components/RunningShareModal.js` - HealthKit 데이터 조회 로직 수정 **완료**

### 1.3 작업 내용

#### ✅ 완료된 작업 (임시 조치)
1. **Android에서 HealthKit UI 숨기기** ✅
   - `screens/SettingsScreen.js`: 설정 화면의 건강데이터 접근 메뉴를 iOS에서만 표시
   - `screens/AppIntroScreen.js`: 온보딩 화면의 건강데이터 권한 섹션을 iOS에서만 표시
   - `components/RunningShareModal.js`: Android에서 운동기록 조회 시 안내 메시지 표시
   - 모든 HealthKit 관련 함수에 `Platform.OS !== 'ios'` 체크 추가

#### 🔴 남은 작업 (향후 구현 필요)
2. **Samsung Health 서비스 생성**
   - `services/samsungHealthService.js` 새로 생성
   - Samsung Health SDK 연동
   - HealthKit과 동일한 인터페이스 제공

3. **통합 Fitness 서비스 생성**
   - `services/fitnessService.js` 생성 (플랫폼별 분기 처리)
   - iOS: appleFitnessService 사용
   - Android: samsungHealthService 사용

4. **의존성 추가**
   - ✅ Samsung Health SDK AAR 파일 추가 완료 (`android/app/libs/samsung-health-data-api-1.0.0.aar`)
   - ✅ `android/app/build.gradle`에 의존성 추가 완료
   - ✅ `android/build.gradle`에 flatDir repository 추가 완료

5. **Android 권한 설정**
   - ✅ `android/app/src/main/AndroidManifest.xml`에 Samsung Health 권한 추가 완료
   - ✅ `app.json`의 Android permissions에 Samsung Health 권한 추가 완료

---

## 🟡 2. UI/UX 플랫폼 차이 처리

### 2.1 KeyboardAvoidingView
**현재 상태**: 이미 플랫폼 분기 처리됨 ✅
- `screens/PostDetailScreen.js` (line 557)
- `screens/PostCreateScreen.js` (line 381)
- `screens/VerificationScreen.js` (line 276)
- `screens/ChatScreen.js` (line 459)
- `screens/OnboardingScreen.js` (line 660)

**확인 필요**: Android에서 동작 테스트 필요

### 2.2 SafeAreaView 및 패딩
**파일**: `screens/ScheduleScreen.js`
- ✅ Line 3757: `paddingTop: Platform.OS === 'ios' ? 60 : 40` **완료** (50 → 40으로 조정)
- ✅ Line 3779: `paddingBottom: Platform.OS === 'ios' ? 34 : 20` **완료** (16 → 20으로 조정)
- Line 3792: `paddingBottom: Platform.OS === 'ios' ? 16 : 16` (변경 불필요)

**파일**: `screens/OnboardingScreen.js`
- ✅ Line 929: `paddingBottom: Platform.OS === 'ios' ? 34 : 20` **완료** (16 → 20으로 조정)

---

## 🟢 3. 결제 시스템

### 3.1 현재 상태
**파일**: `services/paymentService.js`, `services/receiptValidationService.js`
- ✅ 이미 플랫폼 분기 처리됨
- iOS: App Store 영수증 검증
- Android: Google Play 영수증 검증

**확인 필요**: 
- ✅ Google Play 영수증 검증 로직 확인 완료
- ✅ `receiptValidationService.js`의 `getGooglePlayAccessToken()` 구현 확인 완료
- ⚠️ `generateJWT()`는 현재 mock 토큰 반환 (프로덕션에서는 서버에서 처리 필요)

---

## 🟡 4. 권한 설정

### 4.1 AndroidManifest.xml
**현재 상태**: 기본 권한은 설정되어 있음 ✅
- 위치, 카메라, 인터넷, 저장소 등
- ✅ Samsung Health 관련 권한 추가 완료
  - `android.permission.ACTIVITY_RECOGNITION`
  - `com.samsung.android.sdk.healthdata.permission.READ_HEALTH_DATA`
  - `com.samsung.android.sdk.healthdata.permission.WRITE_HEALTH_DATA`

**추가 필요**:
- Google Play Services 관련 권한 (결제 검증용) - 서버에서 처리하므로 클라이언트 권한 불필요

### 4.2 app.json
**현재 상태**: Android permissions 설정됨 ✅
- ✅ 중복 권한 제거 완료 (ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION)
- ✅ Samsung Health 권한 추가 완료
  - `android.permission.ACTIVITY_RECOGNITION`
  - `com.samsung.android.sdk.healthdata.permission.READ_HEALTH_DATA`
  - `com.samsung.android.sdk.healthdata.permission.WRITE_HEALTH_DATA`

**확인 필요**:
- Android 13+ (API 33+) 런타임 권한 처리 확인

---

## 🟡 5. 네이티브 모듈

### 5.1 react-native-health
**문제점**: iOS 전용 패키지
- `package.json`에 `react-native-health: ^1.19.0` 포함
- Android에서는 사용 불가

**작업**:
- ✅ Android에서 HealthKit 관련 UI 숨김 처리 완료
- ✅ HealthKit 초기화 함수에 Platform 체크 추가 완료
- ⚠️ Android 빌드 시 해당 패키지가 문제를 일으키지 않는지 확인 필요
- ⚠️ 필요시 조건부 import 처리 (현재는 appleFitnessService가 자체적으로 Platform 체크함)

### 5.2 기타 네이티브 모듈
**확인 필요**:
- 모든 네이티브 모듈의 Android 지원 여부 확인
- `react-native-iap` - ✅ Android 지원
- `expo-*` 패키지들 - ✅ 대부분 Android 지원

---

## 🟡 6. 스타일링 및 레이아웃

### 6.1 StatusBar
**파일**: `App.js`
- Line 107-110, 123-126, 137-140: StatusBar 설정
- `barStyle="light-content"` - Android에서도 동작 확인 필요

### 6.2 폰트
**파일**: `App.js`
- Line 40-47: 폰트 로딩
- Android에서 폰트 파일 경로 확인 필요

### 6.3 아이콘
**확인 필요**:
- `@expo/vector-icons`의 Ionicons - ✅ Android 지원
- 커스텀 아이콘 이미지 - Android 해상도별 확인

---

## 🟢 7. 네비게이션

### 7.1 현재 상태
**파일**: `navigation/AppNavigator.js`, `navigation/StackNavigator.js`
- React Navigation 사용 - ✅ Android 지원
- 특별한 수정 불필요

---

## 🟡 8. 알림 (Push Notifications)

### 8.1 현재 상태
**파일**: `services/pushNotificationService.js`
- Line 102: `platform: Platform.OS` - 플랫폼 분기 처리됨 ✅

**확인 필요**:
- Android FCM (Firebase Cloud Messaging) 설정 완료 여부
- `expo-notifications` 패키지의 Android 설정 확인

---

## 🟡 9. 이미지 업로드

### 9.1 현재 상태
**파일**: `components/ImageUploader.js`
- Line 32: `Platform.OS !== 'web'` 체크 있음 ✅
- `expo-image-picker` 사용 - ✅ Android 지원

**확인 필요**:
- Android 권한 요청 플로우 확인
- Android 13+ 미디어 권한 처리 확인

---

## 🟢 10. WebView postMessage (RN → WebView)

### 10.1 문제점
**react-native-webview**에서 React Native가 `webViewRef.current.postMessage()`로 WebView에 메시지를 보낼 때, **플랫폼별로 이벤트 dispatch 대상이 다름**:
- **iOS**: `window.dispatchEvent(MessageEvent)` → `window.addEventListener('message')`로 수신
- **Android**: `document.dispatchEvent(MessageEvent)` → `document.addEventListener('message')`로만 수신

`window.addEventListener('message')`만 사용하면 **Android에서 메시지를 전혀 수신하지 못함**.

### 10.2 영향받는 기능
- 지도 탭: `updateCafes` (러닝카페 마커), `updateEvents` (러닝모임 마커), `updateCurrentLocation`, `switchToggle`, `moveToCafe` 등
- RN → WebView로 postMessage하는 모든 기능

### 10.3 해결 방법
WebView HTML/JS 내에서 **window와 document 둘 다** 리스너 등록:

```javascript
var handleRnMessage = function(event) {
  try {
    var data = JSON.parse(event.data);
    // ... 메시지 처리
  } catch (e) { /* ... */ }
};
window.addEventListener('message', handleRnMessage);
document.addEventListener('message', handleRnMessage);
```

- iOS: window 리스너만 호출됨
- Android: document 리스너만 호출됨
- 중복 호출 없음 (플랫폼별로 한 대상에만 dispatch)

### 10.4 수정 완료 파일
- ✅ `screens/MapScreen.js` - createKakaoMapHTML 내 메시지 리스너 수정 완료

### 10.5 확인 필요
- HanRiverMap 삭제됨. MapScreen, ScheduleScreen 인라인 지도에서 RN→WebView postMessage 사용 시 동일 수정 필요

### 10.6 참고 이슈
- [react-native-webview #3776](https://github.com/react-native-webview/react-native-webview/issues/3776): `postMessage` does not work on Android

---

## 🔴 11. 환경 설정 파일

### 11.1 config/environment.js
**현재 상태**: ✅ 수정 완료
- ✅ `simulateHealthKitOnSimulator` 옵션이 iOS에서만 동작하도록 Platform 체크 추가
- Android에서는 항상 `false`로 설정됨

---

## 🔴 12. 지도/위치: iOS→Android 포팅 시 발생하는 핵심 이슈

> **⚠️ 반드시 기억해야 할 항목** — iOS 프로젝트에서 기능을 가져올 때마다 아래 두 가지를 반드시 확인할 것.
> 프로덕션 Android 빌드에서 실제로 확인된 문제임 (2026-03-12).

### 12.1 🔴 MapScreen — 현재 위치 마커 자동 표시 실패

**iOS 동작**: GPS가 잡히면 자동으로 현재 위치 마커가 지도에 표시됨 (버튼 클릭 불필요)
**Android 동작**: 현재 위치 마커가 자동으로 표시되지 않음 (수동으로 현재위치 버튼을 눌러야만 표시됨)

**원인 — 레이스 컨디션 + 동기화 누락**:
1. `useEffect([], [])` → `loadAllEvents()`, `loadCafes()`만 호출. **위치 요청 안 함**
2. `useFocusEffect` → `getCurrentLocation()`을 **비동기** 호출
3. WebView `mapLoaded` 핸들러 → `if (currentLocation && webViewRef.current)` 검사
   - 이 시점에 `currentLocation`은 아직 `null`인 경우가 대부분 (GPS 응답이 WebView 로드보다 늦음)
   - → `"현재 위치 없음"` 로그 출력, 위치 전송 안 됨
4. **`currentLocation` 상태가 나중에 업데이트되어도 WebView로 전송하는 `useEffect`가 없음**
   - 기존 동기화 `useEffect`(라인 ~1199)는 `events`, `cafes`, `activeToggle`만 감시
   - `currentLocation`은 dependency에 포함되어 있지 않음
5. `initialLocation` = `useMemo(() => ..., [])` → 빈 deps이므로 항상 `DEFAULT_LOCATION` 반환

**수정 필요 사항**:
- `currentLocation` 변경 시 WebView로 `updateCurrentLocation` 메시지를 전송하는 `useEffect` 추가
- 예시:
```javascript
useEffect(() => {
  if (!currentLocation || !mapLoadedRef.current || !webViewRef.current) return;
  webViewRef.current.postMessage(JSON.stringify({
    type: 'updateCurrentLocation',
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
  }));
}, [currentLocation]);
```

**영향 범위**: `screens/MapScreen.js`

---

### 12.2 🔴 ScheduleScreen (모임생성 2단계) — 현재 위치 표시 안 됨 + 장소 검색 후 지도 이동 안 됨

**iOS 동작**: 2단계 지도에서 현재 위치가 자동 표시되고, 장소 검색 결과 선택 시 해당 위치로 지도가 이동
**Android 동작**: 현재 위치 표시 안 되고, 장소 검색 후 지도가 해당 위치로 이동하지 않음

**원인 분석**:
1. **현재 위치 미표시**: MapScreen과 동일한 레이스 컨디션 (GPS 응답이 WebView 로드보다 늦으면 위치 전송 누락)
2. **장소 검색 후 지도 이동 실패**: `moveMapToLocation()`에서 Android용 `injectJavaScript` → `window.__runOnMoveToLocation()` 호출 시:
   - 카카오맵 SDK가 아직 비동기 로딩 중이면 `__runOnMoveToLocation`이 undefined
   - 재시도 로직(50회 × 100ms)이 있지만, 카카오맵 로드 자체가 실패하거나 지연되면 미동작
   - iOS는 `postMessage` 방식이라 WebView 준비 후 자연스럽게 처리되지만, Android는 `injectJavaScript` 방식이라 타이밍에 민감
3. **Kakao REST API 키 혼동 가능성**: `environment.js`의 fallback이 JavaScript 키(`464318d78ffeb1e52a1185498fe1af08`)로 되어 있음
   - `Constants.expoConfig?.extra?.kakaoRestApiKey` 로딩 실패 시 REST API 호출에 JavaScript 키 사용 → 401 에러
   - `app.json`에는 올바른 REST 키(`e7407cb4e58959ce10a694d40c327641`)가 별도로 존재함

**영향 범위**: `screens/ScheduleScreen.js`, `services/kakaoPlacesService.js`, `config/environment.js`

---

### 12.3 📋 iOS→Android 포팅 시 지도/위치 필수 체크리스트

iOS 프로젝트에서 지도/위치 관련 코드를 가져올 때 **반드시** 아래 사항을 확인:

| # | 체크 항목 | 설명 |
|---|-----------|------|
| 1 | **`currentLocation` → WebView 동기화 `useEffect` 존재 여부** | `currentLocation` 변경 시 `updateCurrentLocation`을 WebView에 전송하는 `useEffect`가 있는지 확인. 없으면 추가 필수 |
| 2 | **WebView 메시지 리스너 등록 (window + document)** | Android는 `document.addEventListener('message')`만 수신. `window`와 `document` 둘 다 등록 필수 (섹션 10 참고) |
| 3 | **`injectJavaScript` vs `postMessage` 분기** | Android에서 RN→WebView 통신 시 `postMessage`가 미동작하는 경우 `injectJavaScript`로 대체. 단, 카카오맵 SDK 비동기 로드 완료 후 호출해야 함 |
| 4 | **Kakao API 키 분리 확인** | JavaScript 키(웹뷰용)와 REST API 키(장소 검색용)가 서로 다른 값인지 확인. fallback이 JavaScript 키로 되어있으면 REST API 401 에러 발생 |
| 5 | **비동기 위치 요청 타이밍** | iOS는 WebView 로드와 GPS 응답 순서가 맞는 경우가 많지만, Android는 레이스 컨디션 가능성 높음. GPS 응답 후 별도 동기화 로직 필요 |
| 6 | **`useMemo` deps 빈 배열 주의** | `initialLocation` 등에서 `useMemo(() => ..., [])`로 1회만 계산하면, `currentLocation`이 나중에 업데이트되어도 반영 안 됨 |

---

## 📝 우선순위별 작업 요약

### ✅ 완료된 작업
- **Android에서 HealthKit UI 숨기기** - iOS 전용 기능으로 처리 ✅
- **UI 패딩/마진 조정** - Android 화면 크기에 맞게 조정 ✅
- **플랫폼 체크 추가** - 모든 HealthKit 관련 함수에 Platform.OS 체크 추가 ✅
- **Android 권한 설정 완료** - Samsung Health 권한 추가, 중복 권한 제거 ✅
- **환경 설정 파일 개선** - simulateHealthKitOnSimulator iOS 전용 처리 ✅
- **결제 검증 서비스 확인** - Google Play 영수증 검증 로직 확인 완료 ✅
- **WebView postMessage Android 호환** - window + document 리스너 등록으로 러닝카페/러닝모임 마커 표시 수정 ✅

### 🔴 높은 우선순위 (필수 - 향후 구현)
1. **Samsung Health 서비스 구현** - 건강 데이터 연동 필수
2. **통합 Fitness 서비스 생성** - 기존 코드 수정 최소화
3. **MapScreen 현재 위치 자동 표시 수정** - `currentLocation` → WebView 동기화 `useEffect` 추가 (섹션 12.1)
4. **ScheduleScreen 2단계 지도 수정** - 현재 위치 표시 + 장소 검색 후 지도 이동 (섹션 12.2)

### 🟡 중간 우선순위 (권장)
3. ⚠️ **네이티브 모듈 호환성 확인** - react-native-health 처리 (임시 조치 완료, 빌드 테스트 필요)
4. **결제 검증 서버 구현** - Google Play JWT 토큰 생성은 서버에서 처리 필요

### 🟢 낮은 우선순위 (선택)
7. **스타일링 미세 조정** - Android 디자인 가이드라인 준수
8. **성능 최적화** - Android 특화 최적화

---

## 🧪 테스트 체크리스트

### 필수 테스트 항목
- [ ] Samsung Health 연동 및 권한 요청
- [ ] 건강 데이터 조회 (러닝 기록)
- [ ] 결제 시스템 (Google Play)
- [ ] 푸시 알림 수신
- [ ] 이미지 업로드
- [ ] 위치 권한 및 지도 표시
- [ ] **지도 마커 표시 (러닝카페, 러닝모임)** - WebView postMessage Android 호환 확인
- [ ] **MapScreen 현재 위치 마커 자동 표시** - 버튼 클릭 없이 GPS 잡히면 자동 표시 (iOS 동일 동작)
- [ ] **ScheduleScreen 2단계 현재 위치 표시** - 모임 생성 시 지도에 현재 위치 표시
- [ ] **ScheduleScreen 2단계 장소 검색 후 지도 이동** - 검색 결과 선택 시 해당 위치로 지도 이동
- [ ] 키보드 동작 (KeyboardAvoidingView)
- [ ] SafeAreaView 동작

### 권장 테스트 항목
- [ ] 다양한 Android 버전 (API 21+)
- [ ] 다양한 화면 크기
- [ ] 다크 모드 (Android 10+)
- [ ] 백그라운드 동작
- [ ] 앱 재시작 시 상태 복원

---

## 📚 참고 자료

### Samsung Health 연동
- [Samsung Health SDK 문서](https://developer.samsung.com/health)
- [Samsung Health SDK 가이드](https://developer.samsung.com/health/android/data/guide.html)

### Android 권한
- [Android 권한 가이드](https://developer.android.com/guide/topics/permissions/overview)
- [Expo 권한 가이드](https://docs.expo.dev/guides/permissions/)

### 결제 시스템
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [react-native-iap 문서](https://github.com/dooboolab/react-native-iap)

### WebView postMessage
- [react-native-webview #3776](https://github.com/react-native-webview/react-native-webview/issues/3776) - Android postMessage 이벤트는 `document`에 dispatch됨
- **RN→WebView postMessage**: Android에서 postMessage/MessageEvent 미동작 시 `injectJavaScript`로 WebView 내 `window.__runOnMoveToLocation(lat,lng,addMarker)` 직접 호출 (ScheduleScreen 모임생성 장소선택)

### 그림자 (Shadow)
- **Android**: `shadowOffset`, `shadowOpacity`, `shadowRadius`는 **무시됨** (iOS 전용). `elevation`만 적용
- **rgba 배경**: Android elevation은 반투명 배경에서 미동작 → `#1F1F24` 등 불투명 색 사용
- **boxShadow**: New Architecture에서 iOS/Android 모두 지원 (RN 0.76+)
- 대안: `react-native-shadow-2` (bitmap 기반, 양쪽 플랫폼 동일 렌더링)

---

## 📌 추가 참고사항

1. **빌드 설정**: `eas.json`에서 Android 빌드 타입이 `app-bundle`로 설정되어 있음 ✅
2. **패키지 이름**: `com.runon.app`로 설정되어 있음 ✅
3. **버전 코드**: `app.json`에서 `versionCode: 4`로 설정되어 있음 ✅

---

## 📅 작업 이력

### 2026-03-12 (지도/위치 iOS→Android 핵심 이슈 기록)
- 🔴 **MapScreen 현재 위치 마커 자동 표시 실패** 확인 (프로덕션 Android 빌드에서 재현)
  - **원인**: `currentLocation` 비동기 업데이트 후 WebView 전송 `useEffect` 누락 (레이스 컨디션)
  - iOS에서는 자동으로 GPS 잡히면서 마커 표시되지만, Android에서는 수동 버튼 클릭 필요
- 🔴 **ScheduleScreen 2단계 지도 이슈** 확인 (프로덕션 Android 빌드에서 재현)
  - 현재 위치 표시 안 됨 + 장소 검색 후 지도 이동 안 됨
  - **원인**: (1) 동일한 레이스 컨디션, (2) `injectJavaScript`로 카카오맵 함수 호출 시 SDK 로드 타이밍 문제
- 📋 iOS→Android 포팅 시 지도/위치 필수 체크리스트 6항목 추가 (섹션 12.3)

### 2025-02-12 (WebView postMessage Android 호환)
- ✅ WebView postMessage Android 호환 수정 완료
  - **원인**: react-native-webview에서 RN→WebView postMessage 시, Android는 `document`에, iOS는 `window`에 이벤트 dispatch
  - **증상**: Android에서 러닝카페/러닝모임 마커 미표시 (updateCafes, updateEvents 메시지 미수신)
  - **수정**: `screens/MapScreen.js` createKakaoMapHTML 내 `window.addEventListener` + `document.addEventListener` 둘 다 등록
  - 참고: [react-native-webview #3776](https://github.com/react-native-webview/react-native-webview/issues/3776)

### 2025-01-XX
- ✅ Android에서 HealthKit UI 숨기기 완료
  - `screens/SettingsScreen.js`: 설정 화면 건강데이터 메뉴 iOS 전용 처리
  - `screens/AppIntroScreen.js`: 온보딩 화면 건강데이터 섹션 iOS 전용 처리
  - `components/RunningShareModal.js`: Android에서 안내 메시지 표시
- ✅ UI 패딩 값 조정 완료
  - `screens/ScheduleScreen.js`: Android 패딩 조정 (50→40, 16→20)
  - `screens/OnboardingScreen.js`: Android 하단 패딩 조정 (16→20)
- ✅ 플랫폼 체크 추가 완료
  - 모든 HealthKit 관련 함수에 `Platform.OS !== 'ios'` 체크 추가
- ✅ Android 권한 설정 개선 완료
  - `app.json`: 중복 위치 권한 제거, Samsung Health 권한 추가
  - `android/app/src/main/AndroidManifest.xml`: Samsung Health 권한 추가
- ✅ Samsung Health SDK 통합 완료
  - `android/app/libs/samsung-health-data-api-1.0.0.aar`: SDK 파일 추가
  - `android/app/build.gradle`: SDK 의존성 추가
  - `android/build.gradle`: flatDir repository 추가
- ✅ 환경 설정 파일 개선 완료
  - `config/environment.js`: `simulateHealthKitOnSimulator` iOS 전용 처리
- ✅ 결제 검증 서비스 확인 완료
  - `services/receiptValidationService.js`: Google Play 검증 로직 확인 및 주석 개선

---

**작성일**: 2025-01-XX
**최종 업데이트**: 2026-03-12
**작성자**: AI Assistant
**버전**: 1.3.0

