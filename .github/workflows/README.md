# GitHub Actions 워크플로우 가이드

## 현재 워크플로우 구조

### android.yml
- **트리거**: `main` 브랜치에 push/pull_request
- **목적**: Android 빌드 체크
- **제외**: iOS 관련 파일 변경 시 실행 안 함

### ios.yml
- **트리거**: `latest-app-version` 브랜치에 push/pull_request
- **목적**: iOS 빌드 체크
- **제외**: Android 관련 파일 변경 시 실행 안 함

## 기존 워크플로우 문제 해결

"RunOn | Default" 워크플로우가 여전히 실행되는 경우:

1. **GitHub 저장소에서 확인**
   - Settings → Actions → General
   - 또는 Actions 탭에서 워크플로우 파일 확인

2. **기존 워크플로우 수정**
   - `.github/workflows/` 폴더에서 기존 워크플로우 파일 찾기
   - `on:` 섹션에 브랜치 필터 추가:
     ```yaml
     on:
       push:
         branches:
           - latest-app-version  # iOS 브랜치만
     ```

3. **또는 기존 워크플로우 삭제**
   - 더 이상 필요하지 않다면 삭제

