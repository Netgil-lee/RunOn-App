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

## 🔴 10. 환경 설정 파일

### 10.1 config/environment.js
**현재 상태**: ✅ 수정 완료
- ✅ `simulateHealthKitOnSimulator` 옵션이 iOS에서만 동작하도록 Platform 체크 추가
- Android에서는 항상 `false`로 설정됨

---

## 📝 우선순위별 작업 요약

### ✅ 완료된 작업
- **Android에서 HealthKit UI 숨기기** - iOS 전용 기능으로 처리 ✅
- **UI 패딩/마진 조정** - Android 화면 크기에 맞게 조정 ✅
- **플랫폼 체크 추가** - 모든 HealthKit 관련 함수에 Platform.OS 체크 추가 ✅
- **Android 권한 설정 완료** - Samsung Health 권한 추가, 중복 권한 제거 ✅
- **환경 설정 파일 개선** - simulateHealthKitOnSimulator iOS 전용 처리 ✅
- **결제 검증 서비스 확인** - Google Play 영수증 검증 로직 확인 완료 ✅

### 🔴 높은 우선순위 (필수 - 향후 구현)
1. **Samsung Health 서비스 구현** - 건강 데이터 연동 필수
2. **통합 Fitness 서비스 생성** - 기존 코드 수정 최소화

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

---

## 📌 추가 참고사항

1. **빌드 설정**: `eas.json`에서 Android 빌드 타입이 `app-bundle`로 설정되어 있음 ✅
2. **패키지 이름**: `com.runon.app`로 설정되어 있음 ✅
3. **버전 코드**: `app.json`에서 `versionCode: 4`로 설정되어 있음 ✅

---

## 📅 작업 이력

### 2025-01-XX (최신 업데이트)
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
**최종 업데이트**: 2025-01-XX
**작성자**: AI Assistant
**버전**: 1.1.0

