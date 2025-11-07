# Firebase 사용자 관리 가이드

## 테스트 사용자 삭제 방법

### 1. Firebase Console에서 사용자 삭제

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. `runon-production-app` 프로젝트 선택
3. **Authentication** → **Users** 탭 클릭
4. 삭제할 사용자 찾기 (예: `p0107222@daum.com`)
5. 사용자 행의 오른쪽 **⋮** 메뉴 클릭
6. **Delete User** 선택
7. 확인 대화상자에서 **Delete** 클릭

### 2. Firestore에서 사용자 데이터 삭제

1. **Firestore Database** → **Data** 탭 클릭
2. `users` 컬렉션 선택
3. 해당 사용자 UID 문서 찾기
4. 문서 삭제

### 3. 회원가입 테스트 방법

#### 방법 1: 새로운 이메일 사용
- 다른 이메일 주소로 회원가입 테스트
- 예: `test1@test.com`, `test2@test.com`

#### 방법 2: 기존 사용자 삭제 후 재가입
1. Firebase Console에서 사용자 삭제
2. 동일한 이메일로 다시 회원가입

### 4. 로그인 플로우 확인

#### 정상적인 플로우:
1. **앱 시작** → **로그인 화면**
2. **이메일로 회원가입** → **회원가입 화면**
3. **회원가입 완료** → **온보딩 화면**
4. **온보딩 완료** → **홈 화면**

#### 로그인 시:
1. **이메일로 로그인** → **로그인 화면**
2. **로그인 완료** → **온보딩 상태에 따라 화면 결정**

### 5. 디버깅 정보

회원가입/로그인 시 다음 로그를 확인:

```
🚀 이메일 회원가입 시작: [이메일]
✅ Firebase 회원가입 성공: [사용자 UID]
✅ 사용자 정보 저장 완료
🔐 AuthContext: Firebase 인증 상태 변경
🔐 AuthContext: 로그인된 사용자 발견 [UID]
🔐 AuthContext: 새 사용자 문서 생성 - 온보딩 미완료
🧭 AppNavigator: 온보딩 화면으로 이동
```

### 6. 문제 해결

#### "이미 가입된 이메일" 오류
- Firebase Console에서 해당 사용자 삭제
- 또는 다른 이메일 주소 사용

#### 회원가입 후 온보딩 화면으로 이동하지 않음
- AuthContext 로그 확인
- `onboardingCompleted` 상태 확인
- Firestore 데이터 확인

#### 로그인 화면이 나타나지 않음
- `FORCE_LOGOUT_ON_START` 설정 확인
- Firebase Auth 자동 로그인 상태 확인 