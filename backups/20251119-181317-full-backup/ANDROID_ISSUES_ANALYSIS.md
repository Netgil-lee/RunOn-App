# Android 호환성 문제 분석

## 🔴 심각한 문제 (빌드 실패 또는 크래시 가능)

### 1. react-native-health 패키지
**위치**: `services/appleFitnessService.js`
**문제점**:
- Line 23: `require('react-native-health')` - Android에서 네이티브 모듈이 없어 빌드 실패 가능
- `Platform.OS !== 'ios'` 체크가 있지만, `require()`는 빌드 타임에 평가될 수 있음

**현재 상태**:
- ✅ `loadHealthKitModule()` 함수에 `Platform.OS !== 'ios'` 체크 있음
- ⚠️ 하지만 `require()`는 정적 분석 시점에 평가될 수 있어 문제 가능

**해결 방법**:
- `require()`를 try-catch로 감싸고 있음 (현재 상태)
- Android 빌드 시 실제 테스트 필요

---

## 🟡 중간 우선순위 문제 (기능 미작동)

### 2. HealthKit 관련 서비스 호출
**위치**: 
- `services/appleFitnessService.js` - 모든 메서드
- `components/RunningShareModal.js` - HealthKit 데이터 조회
- 기타 HealthKit을 사용하는 모든 파일

**문제점**:
- Android에서 HealthKit 관련 함수 호출 시 에러 발생 가능
- 일부 함수에 `Platform.OS !== 'ios'` 체크가 없을 수 있음

**확인 필요 파일**:
- `services/appleFitnessService.js`의 모든 public 메서드
- `components/RunningShareModal.js`의 `fetchActualWorkoutData`

---

### 3. KeyboardAvoidingView 설정
**위치**: 
- `screens/ChatScreen.js`
- `screens/VerificationScreen.js`
- `screens/PostDetailScreen.js`
- `screens/PostCreateScreen.js`
- `screens/OnboardingScreen.js`

**현재 상태**:
- ✅ `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` 설정됨
- ⚠️ Android에서 실제 동작 테스트 필요

---

### 4. SafeAreaView 사용
**위치**: 여러 화면 파일들

**문제점**:
- `react-native-safe-area-context`의 `SafeAreaProvider`가 루트에 없을 수 있음
- Android에서 `useSafeAreaInsets()`가 0을 반환할 수 있음

**확인 필요**:
- `App.js`에 `SafeAreaProvider` 설정 여부
- 각 화면에서 `SafeAreaView` vs `useSafeAreaInsets` 사용 방식

---

## 🟢 낮은 우선순위 (스타일/UX 문제)

### 5. StatusBar 설정
**위치**: `App.js`

**현재 상태**:
- `translucent={false}` 설정됨
- Android에서 동작 확인 필요

---

### 6. 폰트 로딩
**위치**: `App.js`

**현재 상태**:
- `.otf`, `.ttf` 파일 사용
- Android에서 폰트 경로 확인 필요

---

## 📋 체크리스트

### 빌드 시 확인 필요
- [ ] `react-native-health` 패키지가 Android 빌드에 영향을 주는지 확인
- [ ] 네이티브 모듈 링크 오류 확인

### 런타임 확인 필요
- [ ] HealthKit 관련 함수 호출 시 Android에서 에러 발생 여부
- [ ] `KeyboardAvoidingView` 동작 확인
- [ ] `SafeAreaView` / `useSafeAreaInsets` 동작 확인
- [ ] StatusBar 표시 확인
- [ ] 폰트 로딩 확인

---

## 🔍 다음 단계

1. Android Studio에서 빌드 실행
2. 에러 로그 확인
3. 크래시 발생 시 스택 트레이스 분석
4. 문제가 되는 파일/함수 식별
5. Platform.OS 체크 추가 또는 조건부 처리

