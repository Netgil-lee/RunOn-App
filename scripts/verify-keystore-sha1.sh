#!/bin/bash

# 키스토어 SHA-1 검증 스크립트
# 사용법: ./verify-keystore-sha1.sh [키스토어경로]

EXPECTED_SHA1="00:12:5F:D4:CD:61:EB:5F:B8:CA:01:86:E1:7A:DD:DC:E7:51:A4:6C"
KEYSTORE_PATH="${1:-android/app/upload-keystore.jks}"
KEY_ALIAS="upload"
STORE_PASS="runon2024!"

echo "🔍 키스토어 SHA-1 검증 중..."
echo "키스토어 경로: $KEYSTORE_PATH"
echo ""

if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "❌ 오류: 키스토어 파일을 찾을 수 없습니다: $KEYSTORE_PATH"
    exit 1
fi

# SHA-1 추출
ACTUAL_SHA1=$(keytool -list -v -keystore "$KEYSTORE_PATH" -alias "$KEY_ALIAS" -storepass "$STORE_PASS" 2>/dev/null | grep -i "SHA1:" | sed 's/.*SHA1: //' | tr -d ' ')

if [ -z "$ACTUAL_SHA1" ]; then
    echo "❌ 오류: 키스토어에서 SHA-1을 추출할 수 없습니다."
    echo "키스토어 경로, 별칭, 또는 비밀번호를 확인하세요."
    exit 1
fi

# 공백 제거 및 대문자 변환
EXPECTED_SHA1_CLEAN=$(echo "$EXPECTED_SHA1" | tr -d ' ' | tr '[:lower:]' '[:upper:]')
ACTUAL_SHA1_CLEAN=$(echo "$ACTUAL_SHA1" | tr -d ' ' | tr '[:lower:]' '[:upper:]')

echo "📋 SHA-1 비교:"
echo "예상 SHA-1: $EXPECTED_SHA1"
echo "실제 SHA-1: $ACTUAL_SHA1"
echo ""

if [ "$EXPECTED_SHA1_CLEAN" = "$ACTUAL_SHA1_CLEAN" ]; then
    echo "✅ 성공! 키스토어의 SHA-1이 Google Play Console에 등록된 값과 일치합니다."
    echo "이 키스토어를 사용하여 AAB를 빌드할 수 있습니다."
    exit 0
else
    echo "❌ 불일치! 키스토어의 SHA-1이 Google Play Console에 등록된 값과 일치하지 않습니다."
    echo ""
    echo "이 키스토어로는 Google Play Console에 업로드할 수 없습니다."
    echo "올바른 키스토어 파일을 찾아서 사용하세요."
    exit 1
fi

