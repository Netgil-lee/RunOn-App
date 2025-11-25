# RunOn 앱 코드 관리 논의 문서

## 📋 질문에 대한 답변 정리

### 1. "develop 브랜치를 분기한다"는 의미

**간단히 설명하면:**
```
현재: latest-app-version 브랜치 (iOS + 공통 코드)

develop 브랜치 생성 후:
├── develop (공통 코드만)
├── main (develop + Android 전용 코드)
└── latest-app-version (develop + iOS 전용 코드)
```

**분기(Branch)의 의미:**
- Git에서 브랜치는 코드의 독립적인 버전을 만드는 것
- `develop` 브랜치를 만들면 → 공통 코드만 있는 별도 버전 생성
- `main`과 `latest-app-version`이 `develop`에서 "분기"되면 → 각각 독립적으로 발전 가능

**예시:**
```
develop 브랜치 (공통 코드)
  │
  ├─→ main (Android) ← develop의 코드를 가져와서 Android 전용 코드 추가
  │
  └─→ latest-app-version (iOS) ← develop의 코드를 가져와서 iOS 전용 코드 추가
```

---

### 2. 공통 코드 수정 빈도: 아주 가끔

**이 경우 develop 브랜치는 오버킬일 수 있습니다.**

공통 코드 수정이 거의 없다면:
- ✅ **간단한 방법 권장**: 각 브랜치에 공통 코드를 중복으로 유지
- ❌ **복잡한 방법 불필요**: develop 브랜치로 관리할 필요 없음

**대신:**
- 공통 코드 수정이 필요할 때만 수동으로 양쪽에 적용
- 평소에는 각 브랜치가 완전히 독립적으로 운영

---

### 3. "두 프로젝트를 동시에 개발"의 의미

**의미:**
- 같은 시간에 Android와 iOS 기능을 함께 개발하는지
- 아니면 한 번에 하나씩(예: 먼저 iOS, 나중에 Android) 개발하는지

**예시:**
- **동시 개발**: "이번 주에 Android와 iOS 모두에 새 기능 추가"
- **순차 개발**: "이번 달은 iOS만, 다음 달은 Android만"

**현재 상황 추정:**
- 독립 배포를 한다고 하셨으므로 → **순차 개발**일 가능성 높음
- 이 경우 각 브랜치를 완전히 독립적으로 관리하는 것이 더 간단

---

### 4. 배포: 독립적으로 함

**이것이 핵심입니다!**

독립 배포라면:
- Android와 iOS가 서로 다른 시점에 배포
- 각각의 버전 관리가 독립적
- → **각 브랜치를 완전히 독립적으로 관리하는 것이 최적**

---

## 💡 현재 상황에 맞는 최적 방안

### 상황 분석
- ✅ 공통 코드 수정 빈도: 아주 가끔
- ✅ 배포: 독립적
- ✅ 기능 추가: 현재 없음, 향후 확장 가능
- ✅ 두 프로젝트 폴더가 이미 분리되어 있음

### 추천: **완전 독립 운영** (가장 간단)

```
main 브랜치 (Android)
  └── 공통 코드 + Android 전용 코드
  └── 완전히 독립적으로 관리

latest-app-version 브랜치 (iOS)
  └── 공통 코드 + iOS 전용 코드
  └── 완전히 독립적으로 관리
```

**작업 방식:**
1. **평소**: 각 브랜치에서 독립적으로 개발
2. **공통 코드 수정 필요 시**: 
   - 한쪽에서 수정
   - 다른 쪽으로 수동 복사 또는 cherry-pick
3. **플랫폼별 코드**: 각 브랜치에서만 수정

---

## 🛠️ 구체적인 관리 방법

### 방법 1: 완전 독립 (가장 간단, 권장)

#### 구조
```
Git 저장소
├── main (Android)
│   └── 모든 코드 (공통 + Android 전용)
│
└── latest-app-version (iOS)
    └── 모든 코드 (공통 + iOS 전용)
```

#### 로컬 프로젝트
```
RunOn-App (Production_android) → main 브랜치
RunOn-App (Production_iOS) → latest-app-version 브랜치
```

#### 작업 흐름

**일반적인 개발 (대부분의 경우):**
```bash
# Android 개발
cd "RunOn-App (Production_android)"
git checkout main
# 코드 수정
git commit -m "feat: Android 기능 추가"
git push origin main

# iOS 개발
cd "RunOn-App (Production_iOS)"
git checkout latest-app-version
# 코드 수정
git commit -m "feat: iOS 기능 추가"
git push origin latest-app-version
```

**공통 코드 수정이 필요한 경우 (가끔):**
```bash
# 1. Android 프로젝트에서 수정
cd "RunOn-App (Production_android)"
git checkout main
# 공통 코드 수정 (예: services/firestoreService.js)
git commit -m "fix: 공통 버그 수정"

# 2. iOS 프로젝트로 복사
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
# 같은 파일 수정 (또는 cherry-pick 사용)
git commit -m "fix: 공통 버그 수정 (Android에서 동기화)"
```

**Cherry-pick 사용 (더 깔끔한 방법):**
```bash
# Android에서 공통 코드 수정 후
cd "RunOn-App (Production_android)"
git checkout main
# 수정 및 커밋
git commit -m "fix: 공통 버그 수정"
git push origin main

# iOS 프로젝트에서 해당 커밋만 가져오기
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
git cherry-pick <커밋 해시>
# 또는
git cherry-pick main  # main의 최신 커밋 가져오기
```

---

### 방법 2: 공통 파일 목록 관리 (선택사항)

공통 코드 수정 시 어떤 파일을 동기화해야 하는지 명확히 하기 위해:

```markdown
# 공통 파일 목록 (COMMON_FILES.md)

## 필수 동기화 파일
- services/firestoreService.js
- services/paymentService.js
- services/pushNotificationService.js
- contexts/AuthContext.js
- contexts/CommunityContext.js
- ... (전체 목록)

## 조건부 동기화 (Platform 체크 포함)
- screens/SettingsScreen.js
- screens/AppIntroScreen.js
- components/RunningShareModal.js

## 플랫폼별 파일 (동기화 불필요)
### iOS 전용
- services/appleFitnessService.js
- ios/ 폴더

### Android 전용
- services/googleFitService.js
- android/ 폴더
```

---

## 📊 방법 비교

### 방법 1: 완전 독립 (추천)
- **복잡도**: ⭐ (매우 간단)
- **유지보수**: ⭐⭐ (쉬움)
- **공통 코드 수정**: 수동 (가끔이므로 문제없음)
- **적합성**: 현재 상황에 최적

### 방법 2: develop 브랜치 사용
- **복잡도**: ⭐⭐⭐ (복잡)
- **유지보수**: ⭐⭐⭐ (보통)
- **공통 코드 수정**: 자동 (하지만 가끔이므로 오버킬)
- **적합성**: 공통 코드 수정이 자주 있을 때만 유리

---

## 🎯 최종 추천: 완전 독립 운영

### 이유
1. **공통 코드 수정이 가끔** → develop 브랜치 불필요
2. **독립 배포** → 각 브랜치 독립 관리가 자연스러움
3. **이미 폴더가 분리** → 각각 다른 브랜치 체크아웃하기 쉬움
4. **단순함** → 복잡한 브랜치 전략 불필요

### 설정 방법

#### 1단계: 현재 상태 확인
```bash
# Android 프로젝트
cd "RunOn-App (Production_android)"
git branch  # 현재 브랜치 확인

# iOS 프로젝트
cd "../RunOn-App (Production_iOS)"
git branch  # 현재 브랜치 확인
```

#### 2단계: 브랜치 연결
```bash
# Android 프로젝트를 main 브랜치로 설정
cd "RunOn-App (Production_android)"
git checkout main
# 또는 main이 없으면 생성
git checkout -b main

# iOS 프로젝트는 latest-app-version 유지
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
```

#### 3단계: 각 브랜치에 플랫폼별 코드 정리
- **main 브랜치**: Android 전용 코드 추가/유지
- **latest-app-version 브랜치**: iOS 전용 코드 유지

---

## 🔄 실제 작업 시나리오

### 시나리오 1: Android 전용 기능 추가 (일반적인 경우)
```bash
cd "RunOn-App (Production_android)"
git checkout main
# Google Fit 서비스 추가
# services/googleFitService.js 생성
git add services/googleFitService.js
git commit -m "feat: Google Fit 연동 추가"
git push origin main
```
→ iOS 프로젝트에는 영향 없음

### 시나리오 2: iOS 전용 기능 추가 (일반적인 경우)
```bash
cd "RunOn-App (Production_iOS)"
git checkout latest-app-version
# HealthKit 기능 개선
# services/appleFitnessService.js 수정
git add services/appleFitnessService.js
git commit -m "feat: HealthKit 기능 개선"
git push origin latest-app-version
```
→ Android 프로젝트에는 영향 없음

### 시나리오 3: 공통 코드 수정 (가끔 발생)
```bash
# 방법 A: 수동 복사
# 1. Android에서 수정
cd "RunOn-App (Production_android)"
git checkout main
# services/firestoreService.js 수정
git commit -m "fix: Firestore 쿼리 최적화"

# 2. iOS로 복사
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
# 같은 파일 수정 (복사-붙여넣기)
git commit -m "fix: Firestore 쿼리 최적화 (Android에서 동기화)"

# 방법 B: Cherry-pick (더 깔끔)
# 1. Android에서 수정 및 커밋
cd "RunOn-App (Production_android)"
git checkout main
# 수정
git commit -m "fix: Firestore 쿼리 최적화"
# 커밋 해시 확인
git log --oneline -1  # 예: abc1234

# 2. iOS에서 해당 커밋만 가져오기
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
git cherry-pick abc1234
# 충돌 발생 시 수동 해결
```

---

## ❓ 추가 논의 사항

### 1. 공통 코드 수정 시 충돌 처리
**질문**: 공통 코드를 수정할 때 양쪽 브랜치에서 동시에 수정했을 경우 어떻게 할까요?

**제안**:
- 한쪽(예: Android)을 "메인"으로 정하고, 거기서 먼저 수정
- 그 다음 iOS로 동기화
- 또는 수정 전에 양쪽 브랜치 상태 확인

### 2. 공통 파일 목록 관리
**질문**: 어떤 파일이 공통 코드인지 명확히 해야 할까요?

**제안**:
- `COMMON_FILES.md` 파일 생성
- 공통 파일 목록 명시
- 수정 시 참고

### 3. 버전 관리
**질문**: `package.json`의 버전은 어떻게 관리할까요?

**제안**:
- 각 브랜치에서 독립적으로 관리
- Android: `main` 브랜치에서 버전 관리
- iOS: `latest-app-version` 브랜치에서 버전 관리
- 공통 의존성은 동일하게 유지

### 4. 배포 태그 관리
**질문**: 배포 시 Git 태그를 어떻게 관리할까요?

**제안**:
- Android 배포: `main` 브랜치에 태그 (예: `android-v1.0.1`)
- iOS 배포: `latest-app-version` 브랜치에 태그 (예: `ios-v1.0.1`)

---

## 🎬 다음 단계 제안

### 옵션 A: 현재 구조 유지 (가장 간단)
- `latest-app-version` 브랜치를 iOS 전용으로 사용
- `main` 브랜치를 Android 전용으로 사용
- 각각 독립적으로 개발
- 공통 코드 수정 시 수동 동기화

### 옵션 B: develop 브랜치 추가 (향후 확장 대비)
- `develop` 브랜치 생성 (공통 코드)
- `main`과 `latest-app-version`이 `develop`에서 분기
- 공통 코드 수정 시 `develop`에서 하고 양쪽에 병합

---

## 💬 결정이 필요한 사항

1. **브랜치 전략**: 완전 독립 vs develop 브랜치 사용
2. **공통 코드 동기화 방법**: 수동 복사 vs cherry-pick vs 병합
3. **공통 파일 목록 문서화**: 필요 여부
4. **버전 관리**: 독립적 vs 통합

---

**작성일**: 2025-01-XX
**버전**: 1.0.0

