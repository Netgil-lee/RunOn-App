# RunOn 앱 코드 관리 전략

## 📋 현재 상황

### 프로젝트 구조
```
/Users/lee_mac/
├── RunOn-App (Production_android)  ← Android 전용 프로젝트
│   └── Git 브랜치: latest-app-version
│
└── RunOn-App (Production_iOS)      ← iOS 전용 프로젝트
    └── Git 브랜치: latest-app-version
```

### Git 저장소
- **원격 저장소**: `https://github.com/Netgil-lee/RunOn-App.git`
- **브랜치 구조**:
  - `main`: (현재 상태 확인 필요)
  - `latest-app-version`: iOS/Android 공통 브랜치 (현재 사용 중)

---

## 🎯 목표

1. **main 브랜치**: Android 전용 앱
2. **latest-app-version 브랜치**: iOS 전용 앱
3. **공통 코드**: 양쪽에서 공유하되 독립적으로 관리

---

## 📦 공통 코드 vs 플랫폼별 코드 분석

### ✅ 공통 코드 (양쪽에서 동일하게 사용)

#### 1. 서비스 레이어 (services/)
- `firestoreService.js` - Firebase Firestore 연동
- `paymentService.js` - 결제 처리 (Platform 체크 내장)
- `pushNotificationService.js` - 푸시 알림 (Platform 체크 내장)
- `receiptValidationService.js` - 영수증 검증 (Platform 체크 내장)
- `blacklistService.js` - 블랙리스트 관리
- `evaluationService.js` - 평가 서비스
- `mannerDistanceService.js` - 매너 거리 서비스
- `reportService.js` - 신고 서비스
- `storageService.js` - 스토리지 서비스
- `updateService.js` - 업데이트 서비스
- `airQualityService.js` - 대기질 서비스
- `weatherAlertService.js` - 날씨 알림 서비스
- `contentFilterService.js` - 콘텐츠 필터링

#### 2. 컨텍스트 (contexts/)
- `AuthContext.js` - 인증 컨텍스트
- `CommunityContext.js` - 커뮤니티 컨텍스트
- `EventContext.js` - 이벤트 컨텍스트
- `GuideContext.js` - 가이드 컨텍스트
- `NetworkContext.js` - 네트워크 컨텍스트
- `NotificationSettingsContext.js` - 알림 설정 컨텍스트
- `PremiumContext.js` - 프리미엄 컨텍스트

#### 3. 네비게이션 (navigation/)
- `AppNavigator.js` - 앱 네비게이터
- `StackNavigator.js` - 스택 네비게이터

#### 4. 설정 파일 (config/)
- `firebase.js` - Firebase 설정
- `environment.js` - 환경 설정
- `performance.js` - 성능 설정
- `weather.js` - 날씨 설정

#### 5. 컴포넌트 (components/)
- 대부분의 컴포넌트 (Platform 체크로 분기 처리)
- `AppBar.js`, `CustomText.js`, `ImageUploader.js` 등

#### 6. 스크린 (screens/)
- 대부분의 스크린 (Platform 체크로 분기 처리)
- `HomeScreen.js`, `LoginScreen.js`, `ProfileScreen.js` 등

#### 7. 설정 파일
- `package.json` - 의존성 관리 (일부 차이 가능)
- `babel.config.js` - Babel 설정
- `metro.config.js` - Metro 설정
- `app.json` - Expo 설정 (플랫폼별 섹션 분리)

#### 8. 유틸리티 (utils/)
- `locationMapper.js`
- `privacyDetection.js`
- `timeoutPromise.js`
- `timestampUtils.js`

---

### 🔴 플랫폼별 코드 (각각 독립적으로 관리)

#### iOS 전용 (latest-app-version 브랜치)
- `services/appleFitnessService.js` - HealthKit 연동
- `ios/` 폴더 전체
- `app.json`의 `ios` 섹션
- `package.json`의 `react-native-health` 의존성

#### Android 전용 (main 브랜치)
- `services/googleFitService.js` - Google Fit 연동 (생성 필요)
- `android/` 폴더 전체
- `app.json`의 `android` 섹션
- `package.json`의 Google Fit 관련 의존성 (추가 필요)

---

## 🛠️ 관리 방법 옵션

### 옵션 A: Git Submodule 방식 (복잡하지만 체계적)

```
RunOn-Common (별도 저장소)
  └── 공통 코드만 포함

RunOn-App (Production_android)
  └── Git Submodule로 RunOn-Common 연결
  └── Android 전용 코드

RunOn-App (Production_iOS)
  └── Git Submodule로 RunOn-Common 연결
  └── iOS 전용 코드
```

**장점**:
- 공통 코드를 완전히 분리
- 버전 관리 명확

**단점**:
- Git Submodule 관리 복잡
- 초기 설정 복잡

---

### 옵션 B: 심볼릭 링크 방식 (간단하지만 제한적)

```
RunOn-Common (공통 폴더)
  └── 공통 코드

RunOn-App (Production_android)
  └── services/ → 심볼릭 링크 → RunOn-Common/services/
  └── contexts/ → 심볼릭 링크 → RunOn-Common/contexts/
  └── Android 전용 코드

RunOn-App (Production_iOS)
  └── services/ → 심볼릭 링크 → RunOn-Common/services/
  └── contexts/ → 심볼릭 링크 → RunOn-Common/contexts/
  └── iOS 전용 코드
```

**장점**:
- 설정 간단
- 실시간 동기화

**단점**:
- Git에서 심볼릭 링크 관리 복잡
- 플랫폼별 파일이 섞일 수 있음

---

### 옵션 C: 수동 동기화 스크립트 (실용적, 권장)

```
RunOn-App (Production_android)
  └── 공통 코드 + Android 전용 코드

RunOn-App (Production_iOS)
  └── 공통 코드 + iOS 전용 코드

동기화 스크립트
  └── 공통 파일 목록 정의
  └── 한쪽에서 다른 쪽으로 자동 복사
```

**장점**:
- Git 구조 단순
- 명시적 동기화
- 플랫폼별 커스터마이징 가능

**단점**:
- 수동 실행 필요
- 충돌 가능성

---

### 옵션 D: Git 브랜치 전략 (현재 구조 활용)

```
develop (공통 코드 베이스)
  ├── main (Android) ← develop에서 분기
  │   └── Android 전용 코드 추가
  │
  └── latest-app-version (iOS) ← develop에서 분기
      └── iOS 전용 코드 추가
```

**작업 흐름**:
1. 공통 기능 개발: `develop` 브랜치
2. Android 적용: `develop` → `main` 병합
3. iOS 적용: `develop` → `latest-app-version` 병합
4. 플랫폼별 기능: 각 브랜치에서 직접 개발

**장점**:
- Git으로 버전 관리
- 공통 코드 중복 없음
- 병합 히스토리 추적 가능

**단점**:
- 브랜치 관리 필요
- 병합 충돌 해결 필요

---

## 💡 추천 방안: 옵션 C + 옵션 D 하이브리드

### 구조
```
Git 저장소 (하나)
├── develop 브랜치 (공통 코드 베이스)
│   └── 공통 코드만 포함
│
├── main 브랜치 (Android)
│   └── develop + Android 전용 코드
│
└── latest-app-version 브랜치 (iOS)
    └── develop + iOS 전용 코드
```

### 로컬 프로젝트 폴더
```
/Users/lee_mac/
├── RunOn-App (Production_android)
│   └── Git: main 브랜치 체크아웃
│
└── RunOn-App (Production_iOS)
    └── Git: latest-app-version 브랜치 체크아웃
```

### 작업 흐름

#### 1. 공통 코드 수정 시
```bash
# develop 브랜치에서 수정
git checkout develop
# 공통 코드 수정
git commit -m "feat: 공통 기능 추가"

# Android에 적용
git checkout main
git merge develop

# iOS에 적용
git checkout latest-app-version
git merge develop
```

#### 2. 플랫폼별 코드 수정 시
```bash
# Android 전용 기능
cd "RunOn-App (Production_android)"
git checkout main
# Android 코드 수정
git commit -m "feat: Android 전용 기능"

# iOS 전용 기능
cd "RunOn-App (Production_iOS)"
git checkout latest-app-version
# iOS 코드 수정
git commit -m "feat: iOS 전용 기능"
```

#### 3. 동기화 스크립트 (선택사항)
```javascript
// sync-common-code.js
// 공통 파일 목록
const commonFiles = [
  'services/firestoreService.js',
  'services/paymentService.js',
  'contexts/AuthContext.js',
  // ... 공통 파일 목록
];

// 한쪽에서 다른 쪽으로 복사
```

---

## 📝 구체적인 파일 분류

### 공통 파일 목록 (동기화 대상)

#### 필수 동기화
- `services/firestoreService.js`
- `services/paymentService.js`
- `services/pushNotificationService.js`
- `services/receiptValidationService.js`
- `services/blacklistService.js`
- `services/evaluationService.js`
- `services/mannerDistanceService.js`
- `services/reportService.js`
- `services/storageService.js`
- `services/updateService.js`
- `services/airQualityService.js`
- `services/weatherAlertService.js`
- `services/contentFilterService.js`

- `contexts/*.js` (모든 컨텍스트)

- `navigation/*.js` (모든 네비게이션)

- `config/*.js` (모든 설정)

- `utils/*.js` (모든 유틸리티)

- `components/*.js` (대부분의 컴포넌트)

- `screens/*.js` (대부분의 스크린)

#### 조건부 동기화 (Platform 체크 포함)
- `screens/SettingsScreen.js` - Platform 체크로 분기
- `screens/AppIntroScreen.js` - Platform 체크로 분기
- `components/RunningShareModal.js` - Platform 체크로 분기

### 플랫폼별 파일 (독립 관리)

#### iOS 전용
- `services/appleFitnessService.js`
- `ios/` 폴더 전체
- `app.json`의 `ios` 섹션

#### Android 전용
- `services/googleFitService.js` (생성 필요)
- `android/` 폴더 전체
- `app.json`의 `android` 섹션

---

## 🔄 실제 작업 예시

### 시나리오 1: 공통 기능 추가 (예: 새로운 평가 시스템)

```bash
# 1. develop 브랜치에서 작업
cd "RunOn-App (Production_android)"
git checkout develop
# 또는 새로 생성
git checkout -b develop

# 2. 공통 코드 수정
# services/evaluationService.js 수정
git add services/evaluationService.js
git commit -m "feat: 새로운 평가 시스템 추가"

# 3. Android에 적용
git checkout main
git merge develop

# 4. iOS에 적용
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
git merge develop
```

### 시나리오 2: Android 전용 기능 추가 (예: Google Fit 연동)

```bash
# Android 프로젝트에서만 작업
cd "RunOn-App (Production_android)"
git checkout main

# Google Fit 서비스 생성
# services/googleFitService.js 생성
git add services/googleFitService.js
git commit -m "feat: Google Fit 연동 추가"

# iOS에는 영향 없음
```

### 시나리오 3: iOS 전용 기능 추가 (예: HealthKit 개선)

```bash
# iOS 프로젝트에서만 작업
cd "RunOn-App (Production_iOS)"
git checkout latest-app-version

# HealthKit 서비스 개선
# services/appleFitnessService.js 수정
git add services/appleFitnessService.js
git commit -m "feat: HealthKit 기능 개선"

# Android에는 영향 없음
```

### 시나리오 4: 공통 버그 수정

```bash
# 1. develop에서 수정
cd "RunOn-App (Production_android)"
git checkout develop
# 버그 수정
git commit -m "fix: 공통 버그 수정"

# 2. 양쪽에 적용
git checkout main && git merge develop
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version && git merge develop
```

---

## ⚠️ 주의사항

### 1. 병합 충돌 처리
- 공통 코드 수정 시 양쪽 브랜치에서 충돌 가능
- 충돌 해결 후 양쪽에 적용 필요

### 2. 버전 관리
- `package.json`의 버전은 각 브랜치에서 독립적으로 관리
- 공통 의존성은 동일하게 유지

### 3. 테스트
- 공통 코드 수정 시 양쪽 플랫폼 모두 테스트 필요

### 4. 배포
- Android: `main` 브랜치에서 빌드
- iOS: `latest-app-version` 브랜치에서 빌드

---

## 🚀 초기 설정 방법

### 1단계: develop 브랜치 생성
```bash
cd "RunOn-App (Production_android)"
git checkout -b develop
# 공통 코드만 포함하도록 정리
git push origin develop
```

### 2단계: main 브랜치를 Android 전용으로 설정
```bash
git checkout main
# Android 전용 코드 추가
# Google Fit 서비스 생성
git commit -m "feat: Android 전용 설정"
```

### 3단계: latest-app-version 브랜치를 iOS 전용으로 설정
```bash
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
# iOS 전용 코드 유지
# HealthKit 서비스 유지
```

---

## 📊 비교표

| 방식 | 복잡도 | 유지보수 | 확장성 | 추천도 |
|------|--------|----------|--------|--------|
| 옵션 A (Submodule) | 높음 | 어려움 | 높음 | ⭐⭐ |
| 옵션 B (심볼릭 링크) | 중간 | 보통 | 낮음 | ⭐ |
| 옵션 C (수동 동기화) | 낮음 | 쉬움 | 중간 | ⭐⭐⭐ |
| 옵션 D (Git 브랜치) | 중간 | 보통 | 높음 | ⭐⭐⭐⭐ |
| 하이브리드 (C+D) | 중간 | 보통 | 높음 | ⭐⭐⭐⭐⭐ |

---

## 💬 논의 필요 사항

1. **공통 코드 비중**: 현재 약 80-90%가 공통 코드로 추정
   - 이 경우 Git 브랜치 전략이 효율적

2. **팀 규모**: 1명이면 수동 동기화도 가능
   - 여러 명이면 Git 브랜치 전략 권장

3. **배포 주기**: Android와 iOS를 동시에 배포하는가?
   - 독립 배포면 브랜치 분리 유리

4. **기능 동기화**: 새 기능을 양쪽에 항상 동시에 추가하는가?
   - 그렇다면 develop 브랜치 활용 권장

---

**작성일**: 2025-01-XX
**버전**: 1.0.0

