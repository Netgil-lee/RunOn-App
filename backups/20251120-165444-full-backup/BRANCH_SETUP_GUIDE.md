# 브랜치 분리 설정 가이드

## 🎯 목표

- `main` 브랜치: Android 전용
- `latest-app-version` 브랜치: iOS 전용
- 각각 완전히 독립적으로 관리

## ⚠️ 현재 상황

두 브랜치가 많이 달라서 직접 병합하면 충돌이 많이 발생합니다.

## 💡 해결 방법

### 방법 1: main 브랜치를 latest-app-version으로 덮어쓰기 (권장)

이 방법은 Android 프로젝트의 현재 상태(latest-app-version)를 main 브랜치로 설정합니다.

```bash
# Android 프로젝트에서
cd "RunOn-App (Production_android)"

# 1. 현재 latest-app-version의 상태를 백업
git checkout latest-app-version
git push origin latest-app-version  # 현재 상태 저장

# 2. main 브랜치로 전환
git checkout main

# 3. main 브랜치를 latest-app-version의 상태로 리셋
git reset --hard latest-app-version

# 4. 강제 푸시 (주의: 기존 main 브랜치 내용이 사라짐)
git push origin main --force
```

**주의**: 이 방법은 main 브랜치의 기존 내용을 완전히 덮어씁니다.

---

### 방법 2: main 브랜치를 삭제하고 새로 만들기

```bash
# Android 프로젝트에서
cd "RunOn-App (Production_android)"

# 1. latest-app-version에서 main 브랜치 생성
git checkout latest-app-version
git checkout -b main-new

# 2. 원격 main 브랜치 삭제 (GitHub에서)
# 또는 로컬에서만:
git branch -D main  # 로컬 main 삭제
git push origin --delete main  # 원격 main 삭제

# 3. main-new를 main으로 이름 변경
git branch -m main-new main

# 4. 푸시
git push origin main
```

---

### 방법 3: Cherry-pick으로 필요한 커밋만 가져오기

Android 호환성 수정 커밋만 main 브랜치로 가져오기:

```bash
# Android 프로젝트에서
cd "RunOn-App (Production_android)"

# 1. main 브랜치로 전환
git checkout main

# 2. Android 호환성 수정 커밋만 가져오기
git cherry-pick d09cbe9  # "feat: Android 호환성 수정 작업 완료"

# 3. 필요한 다른 커밋들도 cherry-pick
# git cherry-pick <커밋 해시>
```

---

## 🎬 추천 작업 순서

### 1단계: Android 프로젝트를 main 브랜치로 설정

```bash
cd "RunOn-App (Production_android)"
git checkout latest-app-version
# 현재 상태 확인 및 커밋
git status
# 변경사항이 있다면 커밋
git add .
git commit -m "chore: Android 프로젝트 최종 상태"

# main 브랜치로 전환 및 리셋
git checkout main
git reset --hard latest-app-version
git push origin main --force
```

### 2단계: iOS 프로젝트는 latest-app-version 유지

```bash
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
# 현재 상태 확인
git status
# 변경사항이 있다면 커밋
git add .
git commit -m "chore: iOS 프로젝트 최종 상태"
git push origin latest-app-version
```

### 3단계: 각 프로젝트 폴더에 브랜치 설정

**Android 프로젝트 폴더:**
```bash
cd "RunOn-App (Production_android)"
git checkout main
# 앞으로 이 폴더에서는 main 브랜치만 사용
```

**iOS 프로젝트 폴더:**
```bash
cd "RunOn-App (Production_iOS)"
git checkout latest-app-version
# 앞으로 이 폴더에서는 latest-app-version 브랜치만 사용
```

---

## 📝 이후 작업 방식

### Android 개발
```bash
cd "RunOn-App (Production_android)"
git checkout main
# 코드 수정
git commit -m "feat: Android 기능"
git push origin main
```

### iOS 개발
```bash
cd "RunOn-App (Production_iOS)"
git checkout latest-app-version
# 코드 수정
git commit -m "feat: iOS 기능"
git push origin latest-app-version
```

### 공통 코드 수정 (가끔)
```bash
# Android에서 수정
cd "RunOn-App (Production_android)"
git checkout main
# 공통 코드 수정
git commit -m "fix: 공통 버그 수정"
# 커밋 해시 확인
git log --oneline -1

# iOS로 cherry-pick
cd "../RunOn-App (Production_iOS)"
git checkout latest-app-version
git cherry-pick <커밋 해시>
```

---

## ⚠️ 주의사항

1. **강제 푸시(--force) 사용 시**: 기존 main 브랜치 내용이 사라집니다
2. **백업**: 작업 전에 현재 상태를 백업하세요
3. **충돌**: cherry-pick 시 충돌이 발생할 수 있습니다

---

## ✅ 확인 사항

작업 완료 후 확인:

```bash
# Android 프로젝트
cd "RunOn-App (Production_android)"
git branch  # main 브랜치에 있어야 함
git log --oneline -3  # 최신 커밋 확인

# iOS 프로젝트
cd "../RunOn-App (Production_iOS)"
git branch  # latest-app-version 브랜치에 있어야 함
git log --oneline -3  # 최신 커밋 확인
```

