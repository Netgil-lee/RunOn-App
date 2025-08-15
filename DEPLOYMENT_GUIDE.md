# RunOn 앱 배포 가이드 📱

## 🎯 배포 전 체크리스트

### ✅ 완료된 작업들

- [x] 테스트 데이터를 실제 데이터로 교체 
- [x] Firebase 연동 완료 및 보안 규칙 설정
- [x] 외부 API 연동 구현 (날씨 API)
- [x] 환경 변수 및 API 키 관리 체계 구축
- [x] 프로덕션 빌드 설정 및 최적화
- [x] 푸시 알림 서비스 구현

### 🔧 추가 작업 필요


- [ ] 프로덕션 Firebase 프로젝트 생성
- [ ] Apple Developer/Google Play Console 설정
- [ ] 앱 아이콘 및 스크린샷 준비
- [ ] 개인정보처리방침 및 이용약관 작성
- [ ] 실제 기기에서 최종 테스트

---

## 📋 배포 단계별 가이드

### 1단계: 프로덕션 환경 설정

#### 1.1 Firebase 프로덕션 프로젝트 생성
```bash
# Firebase CLI 설치 및 로그인
npm install -g firebase-tools
firebase login
firebase init
```

**프로젝트 설정:**
- 프로젝트 이름: RunOn-Production
- 프로젝트 ID: runon-production-app
- 번들 ID(Android): com.lee_gwang_hee.runon
- 번들 ID(IOS): com.lee-gwang-hee.runon

#### 1.2 실제 API 키 설정
- **날씨 API**: OpenWeatherMap Pro 플랜 고려
- **Google Maps API**: 사용량에 따른 결제 계획 설정

#### 1.3 환경 변수 설정
```javascript
// config/environment.js에서 프로덕션 값 업데이트
const ENV = {
  prod: {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    weatherApiKey: process.env.WEATHER_API_KEY,
    // ... 실제 API 키들
  }
};
```

### 2단계: 앱 스토어 계정 설정

#### 2.1 Apple Developer Program
1. Apple Developer 계정 가입 ($99/년)
2. App Store Connect 설정
3. 앱 ID 생성: `com.lee_gwang_hee.runon`
4. 프로비저닝 프로파일 생성

#### 2.2 Google Play Console
1. Google Play Console 계정 가입 ($25 일회성)
2. 개발자 계정 인증
3. 앱 등록 및 기본 정보 설정

### 3단계: 앱 메타데이터 준비

#### 3.1 앱 아이콘 및 스크린샷
```
필요한 이미지들:
📱 iOS:
- 앱 아이콘: 1024x1024px
- 스크린샷: 6.7", 6.5", 5.5" 등 다양한 크기

🤖 Android:
- 앱 아이콘: 512x512px
- 피처 그래픽: 1024x500px
- 스크린샷: 다양한 화면 크기별
```

#### 3.2 앱 설명 작성
```markdown
제목: RunOn - 한강 러닝 메이트
부제목: 서울 한강에서 러닝 모임을 찾고 만나보세요

설명:
🏃‍♂️ 한강에서 함께 뛸 러닝 메이트를 찾고 계신가요?

RunOn은 서울 한강공원에서 러닝을 즐기는 사람들을 위한 모임 플랫폼입니다.

✨ 주요 기능:
• 한강공원 러닝 모임 찾기/만들기
• 실시간 위치 기반 코스 추천
• 날씨 정보 및 안전 알림
• 러닝 메이트와 소통할 수 있는 채팅
• 개인 러닝 기록 관리

🌊 안전한 러닝 환경:
• 본인인증을 통한 신뢰할 수 있는 커뮤니티
• 실시간 날씨 및 한강 수위 모니터링
• 응급상황 대응 시스템

지금 RunOn과 함께 한강에서 새로운 러닝 경험을 시작해보세요!
```

#### 3.3 개인정보처리방침 및 이용약관
```
주요 포함 사항:
- 수집하는 개인정보 항목
- 개인정보 이용 목적
- 개인정보 보관 및 이용 기간
- 개인정보 제3자 제공
- 개인정보 처리 위탁
- 이용자의 권리
```

### 4단계: 빌드 및 배포

#### 4.1 EAS Build 설정
```bash
# EAS CLI 설치
npm install -g @expo/eas-cli

# EAS 로그인
eas login

# 빌드 설정
eas build:configure

# iOS 빌드
eas build --platform ios --profile production

# Android 빌드  
eas build --platform android --profile production
```

#### 4.2 테스트 배포
```bash
# 내부 테스트용 빌드
eas build --platform all --profile preview

# TestFlight (iOS) / Internal Testing (Android) 배포
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### 5단계: 최종 검증

#### 5.1 기능 테스트 체크리스트
- [ ] 회원가입/로그인 플로우
- [ ] SMS 인증
- [ ] 모임 생성/참여/취소
- [ ] 채팅 기능
- [ ] 푸시 알림
- [ ] 날씨 정보 및 경고
- [ ] 지도 및 위치 서비스
- [ ] 결제 기능 (있을 경우)

#### 5.2 성능 테스트
- [ ] 앱 시작 시간 < 3초
- [ ] 메모리 사용량 정상 범위
- [ ] 배터리 소모량 테스트
- [ ] 네트워크 오류 상황 대응

#### 5.3 보안 검증
- [ ] API 키 노출 여부 확인
- [ ] 사용자 데이터 암호화
- [ ] 네트워크 통신 HTTPS 사용
- [ ] 민감 정보 로그 출력 제거

---

## 🚀 배포 명령어

### 프로덕션 빌드
```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 확인
echo $EXPO_PUBLIC_FIREBASE_API_KEY

# 3. 프로덕션 빌드
eas build --platform all --profile production

# 4. 앱 스토어 제출
eas submit --platform ios
eas submit --platform android
```

### 빌드 상태 확인
```bash
# 빌드 진행 상황 확인
eas build:list

# 특정 빌드 상태 확인
eas build:view [build-id]
```

---

## 📈 배포 후 모니터링

### 1. 앱 성능 모니터링
- Firebase Analytics 설정
- Crashlytics 오류 추적
- 사용자 행동 분석

### 2. 사용자 피드백 수집
- 앱 스토어 리뷰 모니터링
- 인앱 피드백 시스템
- 고객 지원 채널 운영

### 3. 업데이트 계획
- 버그 수정 우선순위
- 새 기능 개발 로드맵
- 정기 업데이트 일정

---

## ⚠️ 주의사항

### 보안
1. **API 키 관리**: 프로덕션 환경에서는 환경 변수나 시크릿 매니저 사용
2. **데이터 암호화**: 민감한 사용자 데이터는 반드시 암호화
3. **권한 최소화**: 앱에서 요청하는 권한을 최소한으로 제한

### 법적 준수
1. **개인정보보호법**: 국내법 및 GDPR 준수
2. **위치정보법**: 위치 정보 수집/이용 동의

### 기술적 고려사항
1. **API 사용량**: 외부 API 요금제 및 사용량 모니터링
2. **서버 용량**: Firebase 요금제 및 확장성 고려
3. **업데이트 전략**: OTA 업데이트 vs 스토어 업데이트

---

## 📞 지원 및 문의

배포 과정에서 문제가 발생하면:
1. Expo 공식 문서 확인
2. Firebase 콘솔에서 오류 로그 확인
3. 각 플랫폼별 개발자 문서 참조

**배포 완료 후에도 지속적인 모니터링과 업데이트가 필요합니다!** 🎉 