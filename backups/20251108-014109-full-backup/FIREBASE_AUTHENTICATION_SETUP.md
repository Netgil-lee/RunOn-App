# Firebase Authentication 설정 가이드

## 1. Firebase Console에서 Authentication 설정

### 1.1 Authentication 활성화
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `runon-production-app`
3. 왼쪽 메뉴에서 **Authentication** 클릭
4. **시작하기** 클릭

### 1.2 이메일/비밀번호 인증 활성화
1. **Sign-in method** 탭 클릭
2. **이메일/비밀번호** 선택
3. **사용 설정** 토글 활성화
4. 다음 옵션들 설정:
   - ✅ **이메일/비밀번호** 활성화
   - ✅ **사용자 등록** 활성화 (회원가입 허용)
   - ⚪ **이메일 확인** 선택사항 (필요시 활성화)
5. **저장** 클릭

### 1.3 보안 규칙 설정 (선택사항)
1. **사용자** 탭에서 **사용자 관리** 설정
2. **사용자 등록 제한** 설정 (필요시)

## 2. Firestore Database 설정

### 2.1 데이터베이스 생성
1. Firebase Console에서 **Firestore Database** 클릭
2. **데이터베이스 만들기** 클릭
3. **테스트 모드에서 시작** 선택 (개발용)
4. **다음** 클릭
5. 위치 선택 (예: `asia-northeast3 (서울)`)
6. **완료** 클릭

### 2.2 보안 규칙 설정
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 커뮤니티 게시물
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // 이벤트
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 3. Storage 설정 (선택사항)

### 3.1 Storage 활성화
1. Firebase Console에서 **Storage** 클릭
2. **시작하기** 클릭
3. **테스트 모드에서 시작** 선택
4. 위치 선택 (예: `asia-northeast3 (서울)`)

### 3.2 Storage 보안 규칙
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /posts/{postId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 4. 테스트

### 4.1 앱에서 테스트
1. 앱 실행
2. 이메일 회원가입 테스트
3. 이메일 로그인 테스트

### 4.2 Firebase Console에서 확인
1. **Authentication** → **사용자** 탭에서 생성된 사용자 확인
2. **Firestore Database** → **데이터** 탭에서 사용자 데이터 확인

## 5. 주의사항

- **API 키 보안**: API 키는 공개 저장소에 커밋하지 마세요
- **환경 분리**: 개발/운영 환경별로 다른 Firebase 프로젝트 사용 권장
- **보안 규칙**: 실제 운영 시에는 더 엄격한 보안 규칙 적용
- **사용자 데이터**: GDPR 등 개인정보보호법 준수

## 6. 문제 해결

### API 키 오류
- Firebase Console에서 올바른 프로젝트 선택 확인
- 앱 설정의 API 키가 올바른지 확인

### 인증 오류
- Authentication에서 이메일/비밀번호 인증 활성화 확인
- Firestore 보안 규칙 확인

### 데이터베이스 오류
- Firestore Database 생성 확인
- 보안 규칙 설정 확인 