# Firebase 익명 인증 활성화 가이드

## 문제
데모 모드 로그인 시 다음 오류 발생:
```
Firebase: Error (auth/admin-restricted-operation)
```

## 원인
Firebase Console에서 익명 인증(Anonymous Authentication)이 비활성화되어 있음

## 해결 방법

### 1. Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `runon-production-app`

### 2. Authentication 설정
1. 왼쪽 메뉴에서 **Authentication** 클릭
2. **Sign-in method** 탭 클릭

### 3. 익명 인증 활성화
1. **익명** (Anonymous) 인증 방법 찾기
2. **익명** 클릭
3. **사용 설정** 토글을 **활성화**로 변경
4. **저장** 클릭

### 4. 확인
- ✅ **익명** 인증 방법이 **사용 설정됨** 상태로 표시되는지 확인

## 참고
- 익명 인증은 Apple 심사용 데모 모드에서만 사용됩니다
- 앱 승인 후 데모 모드를 제거하면 익명 인증도 비활성화할 수 있습니다
- 익명 인증은 보안상 안전하며, 프로덕션 환경에서도 사용 가능합니다

