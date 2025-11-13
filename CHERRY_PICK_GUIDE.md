# Cherry-pick 가이드

## 🍒 Cherry-pick이란?

**Cherry-pick**은 Git에서 **특정 커밋만 선택해서 다른 브랜치에 적용**하는 명령어입니다.

### 비유로 이해하기
- **Merge (병합)**: 다른 브랜치의 모든 변경사항을 가져옴
- **Cherry-pick (체리 따기)**: 다른 브랜치에서 원하는 커밋만 골라서 가져옴

---

## 📊 예시로 이해하기

### 상황
```
Android 브랜치 (main)
  커밋 A: "공통 버그 수정" ← 이 커밋만 가져오고 싶음
  커밋 B: "Android 전용 기능"
  커밋 C: "Android UI 개선"

iOS 브랜치 (latest-app-version)
  커밋 X: "iOS 전용 기능"
  커밋 Y: "iOS UI 개선"
  (아직 공통 버그 수정이 없음)
```

### Cherry-pick 사용
```bash
# iOS 브랜치에서
git cherry-pick <커밋 A의 해시>
```

### 결과
```
iOS 브랜치 (latest-app-version)
  커밋 X: "iOS 전용 기능"
  커밋 Y: "iOS UI 개선"
  커밋 A': "공통 버그 수정" ← Android에서 가져옴 (새로운 해시)
```

**중요**: 커밋 해시는 달라지지만 내용은 동일합니다.

---

## 🔄 실제 사용 시나리오

### 시나리오: 공통 코드 수정을 양쪽에 적용

#### 1단계: Android에서 공통 코드 수정
```bash
cd "RunOn-App (Production_android)"
git checkout main
# services/firestoreService.js 수정
git add services/firestoreService.js
git commit -m "fix: Firestore 쿼리 최적화"
# 커밋 해시 확인
git log --oneline -1
# 출력: abc1234 fix: Firestore 쿼리 최적화
```

#### 2단계: iOS로 해당 커밋만 가져오기
```bash
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
# 커밋 해시를 사용하여 cherry-pick
git cherry-pick abc1234
```

#### 3단계: 충돌 발생 시 (선택사항)
```bash
# 충돌 발생 시
# 1. 충돌 파일 수동 해결
# 2. 해결 후
git add <충돌 해결한 파일>
git cherry-pick --continue
```

---

## 🆚 Cherry-pick vs 다른 방법

### 방법 1: 수동 복사
```bash
# Android에서 수정
# iOS로 파일 복사-붙여넣기
# 수동으로 커밋
```
- ✅ 간단함
- ❌ Git 히스토리 추적 어려움
- ❌ 실수 가능성 높음

### 방법 2: Cherry-pick
```bash
git cherry-pick <커밋 해시>
```
- ✅ Git 히스토리 유지
- ✅ 정확한 코드 복사
- ✅ 추적 가능
- ⚠️ 충돌 시 해결 필요

### 방법 3: Merge
```bash
git merge main
```
- ✅ 모든 변경사항 가져옴
- ❌ 불필요한 변경사항도 포함
- ❌ 브랜치가 섞일 수 있음

---

## 💡 언제 Cherry-pick을 사용하나요?

### ✅ 사용하기 좋은 경우
1. **공통 코드 수정**: 양쪽 브랜치에 동일한 수정 적용
2. **버그 수정**: 한쪽에서 발견한 버그를 다른 쪽에도 적용
3. **특정 기능만 선택**: 여러 커밋 중 일부만 가져오고 싶을 때

### ❌ 사용하지 않는 경우
1. **플랫폼별 코드**: Android 전용 코드는 iOS에 적용 불필요
2. **전체 브랜치 병합**: 모든 변경사항을 가져올 때는 merge 사용

---

## 📝 실전 예제

### 예제 1: 공통 버그 수정
```bash
# Android에서 버그 수정
cd "RunOn-App (Production_android)"
git checkout main
# 버그 수정
git commit -m "fix: 로그인 오류 수정"
git log --oneline -1
# 출력: def5678 fix: 로그인 오류 수정

# iOS로 적용
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
git cherry-pick def5678
```

### 예제 2: 여러 커밋 중 일부만 가져오기
```bash
# Android의 최근 커밋 확인
cd "RunOn-App (Production_android)"
git log --oneline -5
# 출력:
# ghi9012 feat: Android 전용 기능
# jkl3456 fix: 공통 버그 수정  ← 이것만 가져오고 싶음
# mno7890 fix: 공통 성능 개선  ← 이것도 가져오고 싶음
# pqr1234 feat: Android UI 개선

# iOS로 선택적으로 가져오기
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
git cherry-pick jkl3456  # 첫 번째 커밋
git cherry-pick mno7890  # 두 번째 커밋
```

---

## ⚠️ 주의사항

### 1. 커밋 해시 변경
- Cherry-pick된 커밋은 **새로운 해시**를 가집니다
- 내용은 동일하지만 Git에서는 다른 커밋으로 인식

### 2. 충돌 가능성
- 같은 파일을 양쪽에서 수정했을 경우 충돌 발생
- 충돌 해결 후 `git cherry-pick --continue` 실행

### 3. 커밋 순서
- Cherry-pick은 **현재 브랜치의 최신 커밋 뒤**에 추가됩니다
- 원래 브랜치의 커밋 순서와 다를 수 있습니다

---

## 🎯 요약

**Cherry-pick = 다른 브랜치에서 원하는 커밋만 골라서 가져오기**

**사용법:**
```bash
git cherry-pick <커밋 해시>
```

**장점:**
- 정확한 코드 복사
- Git 히스토리 유지
- 선택적 적용 가능

**단점:**
- 충돌 시 해결 필요
- 커밋 해시가 변경됨

