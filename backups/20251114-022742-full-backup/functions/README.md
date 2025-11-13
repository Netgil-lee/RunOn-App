# RunOn Cloud Functions

## 개요

이 디렉토리는 Firebase Cloud Functions를 포함합니다. 신고 접수 시 관리자에게 이메일 알림을 자동으로 전송하는 기능을 제공합니다.

## 주요 기능

- **신고 알림 자동화**: Firestore에 신고가 생성되면 자동으로 관리자 이메일로 알림 전송
- **신고 정보 수집**: 신고자, 신고 대상, 신고 내용 등 상세 정보 수집
- **이메일 전송**: nodemailer를 사용한 이메일 전송

## 설정 방법

### 1. 이메일 계정 설정 (Gmail)

Gmail을 사용하는 경우:

1. Gmail 계정에서 [앱 비밀번호 생성](https://myaccount.google.com/apppasswords)
2. 2단계 인증이 활성화되어 있어야 합니다
3. 앱 비밀번호를 생성합니다

### 2. Firebase Functions 환경 변수 설정

#### 방법 1: Firebase CLI 사용 (권장)

```bash
# Firebase 프로젝트에 로그인
firebase login

# 환경 변수 설정
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
firebase functions:config:set email.service="gmail"
firebase functions:config:set admin.email="dlrhdkgml12@gmail.com"
```

#### 방법 2: 로컬 환경 변수 (.env 파일)

프로젝트 루트에 `.env` 파일 생성:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SERVICE=gmail
ADMIN_EMAIL=dlrhdkgml12@gmail.com
```

### 3. Firebase Functions 배포

```bash
# Functions 디렉토리로 이동
cd functions

# 의존성 설치 (이미 설치되어 있으면 생략)
npm install

# Functions 배포
firebase deploy --only functions
```

### 4. 배포 확인

```bash
# Functions 로그 확인
firebase functions:log

# 특정 함수 로그 확인
firebase functions:log --only onReportCreated
```

## 함수 설명

### onReportCreated

- **트리거**: `reports/{reportId}` 컬렉션에 새 문서가 생성될 때
- **기능**: 신고 데이터를 수집하고 관리자 이메일로 알림 전송
- **이메일 내용**:
  - 신고 ID
  - 신고 사유
  - 신고 대상 (게시글/댓글/사용자)
  - 신고자 정보
  - 신고 시간
  - Firestore 콘솔 링크

## 테스트

### 로컬 테스트

```bash
# Firebase Emulators 실행
firebase emulators:start --only functions

# 다른 터미널에서 테스트
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/us-central1/onReportCreated
```

### 프로덕션 테스트

1. 앱에서 실제로 신고 기능 사용
2. Firestore 콘솔에서 신고 문서 생성 확인
3. 관리자 이메일 수신 확인

## 문제 해결

### 이메일 전송 실패

1. **이메일 설정 확인**
   ```bash
   firebase functions:config:get
   ```

2. **Gmail 앱 비밀번호 확인**
   - 일반 비밀번호가 아닌 앱 비밀번호를 사용해야 합니다
   - 2단계 인증이 활성화되어 있어야 합니다

3. **로그 확인**
   ```bash
   firebase functions:log --only onReportCreated
   ```

### Functions 배포 실패

1. **Node.js 버전 확인**
   - Functions는 Node.js 18을 사용합니다
   - `package.json`의 `engines.node` 확인

2. **의존성 확인**
   ```bash
   cd functions
   npm install
   ```

## 참고 자료

- [Firebase Functions 문서](https://firebase.google.com/docs/functions)
- [nodemailer 문서](https://nodemailer.com/about/)
- [Gmail 앱 비밀번호 설정](https://support.google.com/accounts/answer/185833)

