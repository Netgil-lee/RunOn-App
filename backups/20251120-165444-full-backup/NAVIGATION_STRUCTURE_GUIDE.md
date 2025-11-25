# 네비게이션 구조 가이드

## 🚨 중요 원칙

### 1. 네비게이션 구조 설계 시 주의사항

#### ❌ 잘못된 구조 (현재 문제)
```javascript
// 문제: AppIntroScreen이 !onboardingCompleted Stack에 있음
if (!onboardingCompleted) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Onboarding" />
      <Stack.Screen name="AppIntro" />  // 여기에 있음
    </Stack.Navigator>
  );
} else {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" />  // 여기에 있음
    </Stack.Navigator>
  );
}
```

#### ✅ 올바른 구조
```javascript
// 해결: 공통 스크린은 모든 Stack에 포함
if (!onboardingCompleted) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Onboarding" />
      <Stack.Screen name="AppIntro" />
      <Stack.Screen name="Main" />  // 공통 스크린 포함
    </Stack.Navigator>
  );
} else {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" />
      <Stack.Screen name="AppIntro" />  // 공통 스크린 포함
    </Stack.Navigator>
  );
}
```

### 2. 네비게이션 방식 선택 가이드

#### 상황별 권장 방식:
- **같은 Stack 내 이동**: `navigation.navigate()` 또는 `navigation.replace()`
- **다른 Stack으로 이동**: `navigation.reset()` (주의 필요)
- **조건부 렌더링**: AuthContext 상태 변경 활용

### 3. 상태 관리와 네비게이션 동기화

#### 권장 패턴:
```javascript
// 1. 상태 업데이트
await updateUserStatus();

// 2. 로컬 상태 업데이트
setUserStatus(newStatus);

// 3. 짧은 지연 (상태 변경 보장)
await new Promise(resolve => setTimeout(resolve, 100));

// 4. 네비게이션 (필요시)
navigation.navigate('NextScreen');
```

## 🔧 현재 수정사항

### AppIntroScreen.js
- `navigation.reset()` → `navigation.replace()` 변경
- 상태 변경 대기 로직 추가
- 강제 네비게이션 트리거 추가

### AuthContext.js
- 상태 업데이트 후 지연 추가
- 강제 리렌더링 보장

## 📋 체크리스트

새로운 화면 추가 시:
- [ ] 네비게이션 구조 확인
- [ ] 공통 스크린 포함 여부 확인
- [ ] 네비게이션 방식 적절성 검토
- [ ] 상태 관리와 네비게이션 동기화 확인

## 🔍 점검 완료된 Screen들

### ✅ 안전한 Screen들:
- **OnboardingScreen.js**: `navigation.replace('AppIntro')` - 같은 Stack 내 이동
- **LoginScreen.js**: `navigation.navigate()` - 같은 Stack 내 이동
- **EmailSignupScreen.js**: 네비게이션 직접 호출 없음
- **EmailLoginScreen.js**: 네비게이션 직접 호출 없음

### 🔧 수정된 Screen들:
- **VerificationScreen.js**: 직접 네비게이션 제거, AuthContext 상태 변경으로 자동 처리
- **AppIntroScreen.js**: `navigation.reset()` → `navigation.replace()` 변경

## 🚨 주의사항

### 다른 Stack으로 이동하는 네비게이션은 피해야 함:
```javascript
// ❌ 위험한 방식
navigation.replace('Main');  // 다른 Stack으로 이동 시도

// ✅ 안전한 방식
// AuthContext 상태 변경으로 AppNavigator가 자동 처리
```
