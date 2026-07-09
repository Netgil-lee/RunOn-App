#!/bin/bash

# Firebase Functions 환경 변수 설정 스크립트
# 사용법: ./setup-firebase-config.sh

echo "🔥 Firebase Functions 환경 변수 설정 시작..."

# Gmail 계정 주소 (여기를 수정하세요)
EMAIL_USER="dlrhdkgml12@gmail.com"

# Gmail 앱 비밀번호 (공백 없이 입력)
EMAIL_PASSWORD="zcmn gphx bkeg jeev"

# 관리자 이메일 주소
ADMIN_EMAIL="dlrhdkgml12@gmail.com"

echo "📧 이메일 설정: $EMAIL_USER"
echo "🔐 앱 비밀번호: $EMAIL_PASSWORD"
echo "👤 관리자 이메일: $ADMIN_EMAIL"
echo ""

# Firebase Functions 환경 변수 설정
echo "설정 중..."
firebase functions:config:set \
  email.user="$EMAIL_USER" \
  email.password="$EMAIL_PASSWORD" \
  email.service="gmail" \
  admin.email="$ADMIN_EMAIL"

echo ""
echo "✅ 설정 완료!"
echo ""
echo "설정 확인:"
firebase functions:config:get

