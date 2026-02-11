#!/bin/bash
# 프로젝트를 처음 사용할 때 Gradle 버전 오류(8.9 vs 8.13+) 해결
# - 기존 Gradle 데몬 중지 후 프로젝트 wrapper(8.14.3) 다운로드 및 사용

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/../android" && pwd)"

echo ">>> Android Gradle wrapper 사용 설정 (Gradle 8.14.3)"
cd "$ANDROID_DIR"

# 기존 Gradle 데몬 중지 (다른 버전이 캐시되어 있을 수 있음)
./gradlew --stop 2>/dev/null || true

# wrapper로 버전 확인 → 필요 시 8.14.3 다운로드
./gradlew --version

echo ">>> 완료. 이제 'npx expo run:android' 또는 'cd android && ./gradlew assembleRelease' 로 빌드하세요."
