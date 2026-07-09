# 🔐 Google 로그인 보안 문제 해결 가이드

## 📋 현재 상황
Google 계정 로그인에서 보안상 자체적으로 막는 문제가 발생하고 있습니다.

## ✅ 해결된 사항

### 1. 코드 보안 강화
- ✅ PKCE (Proof Key for Code Exchange) 활성화
- ✅ 플랫폼별 Client ID 설정 (iOS/Android 분리)
- ✅ 추가 보안 파라미터 설정
- ✅ openid 스코프 추가
- ✅ 보안 에러 자동 진단 및 해결 가이드 제공

### 2. 의존성 문제 해결
- ✅ @react-native-async-storage/async-storage 버전 충돌 해결
- ✅ Firebase Auth 호환성 확보

## 🔧 Google Cloud Console 필수 설정

### A. OAuth 2.0 클라이언트 ID 설정
1. **Google Cloud Console** 접속: https://console.cloud.google.com
2. **프로젝트**: `net-gil-app-rbn1bz` 선택
3. **API 및 서비스 > 사용자 인증 정보**로 이동

### B. 승인된 리디렉션 URI 등록 (중요!)
다음 URI들을 **모두** 추가해주세요:

```
https://auth.expo.io/@lee_gwang_hee/project-netgill
https://auth.expo.io/@lee_gwang_hee/netgill
exp://192.168.45.141:8081
exp://localhost:8081
netgill://
```

### C. OAuth 동의 화면 설정

#### 테스트 모드 (개발 중)
- **게시 상태**: 테스트
- **테스트 사용자**: 본인의 Gmail 계정 추가 필요
- **제한**: 최대 100명의 테스트 사용자만 로그인 가능

#### 프로덕션 모드 (출시 후)
- **게시 상태**: 프로덕션
- **Google 검토**: 필요할 수 있음
- **제한**: 모든 Google 계정 사용자 로그인 가능

## 🚨 일반적인 보안 문제 및 해결법

### 1. "확인되지 않은 앱" 경고
**증상**: "이 앱은 Google에서 확인하지 않았습니다" 메시지
**해결법**: 
- "고급" 클릭 → "안전하지 않은 페이지로 이동" 선택
- 또는 OAuth 동의 화면을 프로덕션으로 게시

### 2. "redirect_uri_mismatch" 오류
**증상**: 리디렉션 URI 불일치 오류
**해결법**: 
- Google Console에 정확한 URI 등록 확인
- `https://auth.expo.io/@lee_gwang_hee/project-netgill` 등록 필수

### 3. "access_denied" 오류
**증상**: 앱 접근이 차단됨
**해결법**:
- OAuth 동의 화면 설정 확인
- 테스트 모드인 경우 테스트 사용자로 추가
- 앱 도메인 확인 상태 점검

### 4. "unauthorized_client" 오류
**증상**: 클라이언트가 승인되지 않음
**해결법**:
- Client ID 설정 확인
- OAuth 2.0 클라이언트 활성화 상태 확인

## 🧪 테스트 방법

### 1. 개발 환경 테스트
```bash
# 앱 실행
npm start

# Google 로그인 테스트
1. Google 로그인 버튼 클릭
2. 브라우저에서 Google 계정 선택
3. 권한 승인
4. 앱으로 리디렉션 확인
```

### 2. 로그 확인
개발자 도구에서 다음 로그들을 확인하세요:
- `🔗 보안 강화된 Auth URL 생성 완료`
- `✅ PKCE 활성화: ✅`
- `🎉 Google OAuth 성공!`

### 3. 에러 진단
에러 발생 시 자동으로 표시되는 진단 결과를 확인하세요:
- `🔍 Google 로그인 보안 에러 진단 시작`
- `🎯 감지된 보안 문제: [문제 유형]`
- `💡 해결 방법: [구체적인 해결책]`

## 🔍 문제 해결 순서

1. **Google Cloud Console 설정 확인**
   - OAuth 2.0 클라이언트 ID 존재 여부
   - 리디렉션 URI 정확성
   - OAuth 동의 화면 설정

2. **테스트 사용자 등록** (테스트 모드인 경우)
   - 본인 Gmail 계정을 테스트 사용자로 추가

3. **앱 설정 확인**
   - app.json의 googleClientId 정확성
   - 플랫폼별 Client ID 설정

4. **네트워크 및 방화벽 확인**
   - auth.expo.io 도메인 접근 가능 여부
   - 회사/학교 네트워크 제한 확인

## 📞 추가 지원

문제가 지속되면 다음 정보와 함께 문의하세요:
- 에러 메시지 전문
- 브라우저 개발자 도구 콘솔 로그
- Google Cloud Console 설정 스크린샷
- 사용 중인 Google 계정 (테스트 사용자 등록 여부)

## 🎯 성공 지표

다음 조건들이 모두 만족되면 Google 로그인이 정상 작동합니다:
- ✅ Google 로그인 버튼 클릭 시 브라우저 열림
- ✅ Google 계정 선택 화면 표시
- ✅ 권한 승인 후 앱으로 정상 리디렉션
- ✅ 사용자 정보 획득 및 Firebase 인증 완료
- ✅ Home 화면으로 자동 이동 