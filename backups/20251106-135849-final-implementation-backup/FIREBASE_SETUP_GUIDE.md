# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 만들기" 클릭
3. 프로젝트 이름: `runon-dev` (개발용), `runon-prod` (운영용)
4. Google Analytics 설정 (선택사항)

## 2. 웹 앱 추가

1. Firebase 프로젝트 대시보드에서 "웹 앱 추가" 클릭
2. 앱 닉네임: `RunOn Web`
3. "Firebase Hosting 설정" 체크 해제
4. "앱 등록" 클릭

## 3. 설정 정보 복사

등록된 웹 앱의 설정 정보를 복사:

```javascript
const firebaseConfig = {
  apiKey: "실제_API_키", // 이 값이 중요합니다!
  authDomain: "runon-dev.firebaseapp.com",
  projectId: "runon-dev",
  storageBucket: "runon-dev.appspot.com",
  messagingSenderId: "실제_메시징_센더_ID",
  appId: "실제_앱_ID"
};
```

### API 키 확인 방법:
1. Firebase Console → 프로젝트 설정 (⚙️ 아이콘)
2. "일반" 탭
3. "내 앱" 섹션에서 웹 앱 선택
4. "Firebase SDK snippet" → "구성" 선택
5. `apiKey` 값을 복사

## 4. 환경 설정 업데이트

### app.json 업데이트
```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "실제_API_키_여기에_입력",
      "weatherApiKey": "c1861b48c1786a9ff6a37560f3b8c63c",
      "kakaoMapApiKey": "a4e8824702e29ee6141edab0149ae982"
    }
  }
}
```

### config/environment.js 업데이트
```javascript
dev: {
  firebaseApiKey: Constants.expoConfig?.extra?.firebaseApiKey || '실제_API_키_여기에_입력',
  firebaseAuthDomain: '실제_프로젝트_ID.firebaseapp.com',
  firebaseProjectId: '실제_프로젝트_ID',
  firebaseStorageBucket: '실제_프로젝트_ID.appspot.com',
  firebaseMessagingSenderId: '실제_메시징_센더_ID',
  firebaseAppId: '실제_앱_ID',
  // ... 기타 설정
}
```

## 5. Authentication 설정

1. Firebase Console → Authentication → Sign-in method
2. "이메일/비밀번호" 활성화
3. "사용자 등록" 활성화
4. "이메일 확인" 선택사항 (필요시 활성화)

## 6. Firestore 설정

1. Firebase Console → Firestore Database
2. "데이터베이스 만들기" 클릭
3. 보안 규칙 설정:

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

## 7. Storage 설정

1. Firebase Console → Storage
2. "시작하기" 클릭
3. 보안 규칙 설정:

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

## 8. 테스트

1. 앱 실행
2. 이메일 회원가입 테스트
3. 이메일 로그인 테스트
4. Firebase Console에서 사용자 확인

## 9. 운영 환경 설정

운영 환경에서는 별도의 Firebase 프로젝트를 생성하고 동일한 설정을 적용하세요.

## 주의사항

- API 키는 공개 저장소에 커밋하지 마세요
- 환경별로 다른 Firebase 프로젝트를 사용하세요
- 보안 규칙을 적절히 설정하세요
- 사용자 데이터 보호를 위해 적절한 권한을 설정하세요 