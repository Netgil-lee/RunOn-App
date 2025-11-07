# 🍎 App Store 제출 완전 가이드

## 📋 현재 상태
- **iOS 프로젝트**: ✅ 설정 완료
- **버전**: v1.0.1 (Build 3)
- **Bundle ID**: com.runon.app
- **로컬 빌드**: ✅ 성공

## 🚨 필수 준비사항

### 1. Apple Developer Program 가입 ($99/년)
```
1. https://developer.apple.com 접속
2. "Join the Apple Developer Program" 클릭
3. Apple ID로 로그인
4. 개인/법인 선택
5. 연간 $99 결제
6. 개발자 계약 동의
```

### 2. App Store Connect 메타데이터

#### 기본 정보
- **앱 이름**: RunOn - 한강 러닝 파트너
- **부제목**: 나와 맞는 러닝 메이트를 찾아보세요
- **카테고리**: 건강 및 피트니스
- **연령 등급**: 4+

#### 앱 설명 (한국어)
```
🏃‍♂️ RunOn - 한강에서 함께 뛸 러닝 파트너를 찾아보세요!

✨ 주요 기능:
• 🗺️ 한강 11개 러닝 코스 정보 제공
• 👥 실시간 러닝 모임 매칭
• 📅 러닝 일정 관리
• 🌤️ 실시간 날씨 정보
• 💬 러닝 커뮤니티
• 📊 러닝 기록 관리

🎯 특별한 점:
• 내 위치 기반 가까운 러닝 코스 추천
• 비슷한 페이스의 러닝 메이트 매칭
• 안전한 야간 러닝을 위한 그룹 모임
• 초보자부터 전문가까지 레벨별 모임

🛡️ 안전 정책:
• 아동 안전 보호 정책 준수
• 24시간 신고 시스템 운영
• 부적절한 콘텐츠 자동 필터링

📞 고객 지원:
• 이메일: dlrhdkgml12@gmail.com
• 정책 페이지: https://netgil-lee.github.io/RunOn-App/

지금 바로 RunOn과 함께 건강한 러닝 라이프를 시작하세요! 🌟
```

#### 키워드 (App Store 검색용)
```
러닝,조깅,한강,운동,피트니스,헬스,마라톤,달리기,러닝메이트,러닝크루,건강,운동친구,야외활동,스포츠
```

### 3. 필수 스크린샷 (준비 필요)

#### iPhone 스크린샷 (필수)
- **6.7인치**: 1290 x 2796 픽셀 (iPhone 14 Pro Max)
- **6.5인치**: 1242 x 2688 픽셀 (iPhone 11 Pro Max)
- **5.5인치**: 1242 x 2208 픽셀 (iPhone 8 Plus)

#### iPad 스크린샷 (선택)
- **12.9인치**: 2048 x 2732 픽셀

**필요한 화면들:**
1. 메인 홈 화면
2. 한강 지도 화면
3. 러닝 모임 목록
4. 커뮤니티 화면
5. 프로필/설정 화면

### 4. 앱 아이콘 (1024x1024 PNG)
- 현재 위치: `/Users/lee_mac/RunOn-App/assets/icon.png`
- App Store용 고해상도 버전 필요

## 🔐 Code Signing 설정 (Apple Developer 가입 후)

### 1. Certificates 생성
```bash
# Keychain Access에서 Certificate Signing Request 생성
# → developer.apple.com에서 iOS Distribution Certificate 생성
```

### 2. App ID 등록
- Bundle ID: `com.runon.app`
- Services: Push Notifications, Associated Domains

### 3. Provisioning Profile 생성
- Type: App Store Distribution
- App ID: com.runon.app 선택
- Certificates: Distribution Certificate 선택

## 📱 Xcode에서 Archive & Upload

### 1. 프로젝트 설정
```
1. Xcode에서 RunOn.xcworkspace 열기
2. General → Identity → Bundle Identifier 확인: com.runon.app
3. Signing & Capabilities → Team 설정
4. Release 설정 확인
```

### 2. Archive 생성
```
1. Product → Destination → Any iOS Device (arm64)
2. Product → Archive
3. Archive 완료 후 Organizer 열림
```

### 3. App Store Connect 업로드
```
1. Distribute App 클릭
2. App Store Connect 선택
3. Upload 선택
4. Distribution Certificate 선택
5. Upload 완료까지 대기
```

## 📊 App Store Connect에서 앱 심사 제출

### 1. 빌드 선택
- Uploaded된 빌드 선택
- TestFlight 테스트 (선택사항)

### 2. 메타데이터 완성
- 앱 정보 입력
- 스크린샷 업로드
- 개인정보처리방침 URL 입력

### 3. 심사 제출
- Submit for Review 클릭
- 심사 완료까지 보통 1-7일 소요

## 🔗 관련 링크
- Apple Developer: https://developer.apple.com
- App Store Connect: https://appstoreconnect.apple.com
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

---

**마지막 업데이트**: 2024년 8월 17일
