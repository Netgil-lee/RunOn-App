# Cloud Functions 배포 가이드

## 📋 배포 전 체크리스트

### 현재 상태
- ✅ Firebase CLI 설치 및 로그인 완료
- ✅ Firebase 프로젝트: `runon-production-app`
- ✅ Functions 코드 작성 완료
- ⏳ 이메일 설정 필요
- ⏳ 환경 변수 설정 필요
- ⏳ Functions 배포 필요

---

## 🔧 단계별 배포 가이드

### 1단계: Gmail 앱 비밀번호 생성

**Gmail을 사용하는 경우 (권장)**

1. 브라우저에서 [Google 계정 설정](https://myaccount.google.com/) 접속
2. **보안** 섹션으로 이동
3. **2단계 인증** 확인
   - 활성화되어 있지 않으면 먼저 활성화
4. **앱 비밀번호** 생성
   - 2단계 인증 설정 페이지에서 "앱 비밀번호" 클릭
   - 앱 선택: "메일"
   - 기기 선택: "기타(맞춤 이름)" → "RunOn Functions" 입력
   - **생성** 클릭
   - **16자리 비밀번호 복사** (예: `abcd efgh ijkl mnop`)

**중요**: 일반 Gmail 비밀번호가 아닌 **앱 비밀번호**를 사용해야 합니다!

---

### 2단계: Firebase 프로젝트 확인

터미널에서 실행:

```bash
cd "/Users/lee_mac/RunOn-App (Production)"
firebase use runon-production-app
```

프로젝트가 올바르게 설정되었는지 확인:

```bash
firebase projects:list
```

---

### 3단계: Firebase Functions 환경 변수 설정

터미널에서 실행 (앱 비밀번호를 입력하세요):

```bash
# Gmail 계정과 앱 비밀번호 설정
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-16-digit-app-password"
firebase functions:config:set email.service="gmail"
firebase functions:config:set admin.email="dlrhdkgml12@gmail.com"
```

**예시**:
```bash
firebase functions:config:set email.user="dlrhdkgml12@gmail.com"
firebase functions:config:set email.password="abcd efgh ijkl mnop"
firebase functions:config:set email.service="gmail"
firebase functions:config:set admin.email="dlrhdkgml12@gmail.com"
```

**설정 확인**:
```bash
firebase functions:config:get
```

---

### 4단계: Functions 배포

터미널에서 실행:

```bash
# 프로젝트 루트에서
cd "/Users/lee_mac/RunOn-App (Production)"

# Functions 디렉토리로 이동
cd functions

# 의존성 확인 (이미 설치되어 있으면 생략)
npm install

# Functions 배포
firebase deploy --only functions
```

배포가 성공하면 다음과 같은 메시지가 표시됩니다:

```
✔  functions[onReportCreated(us-central1)] Successful create operation.
✔  Deploy complete!
```

---

### 5단계: 배포 확인 및 테스트

#### 1. Functions 상태 확인

```bash
firebase functions:list
```

#### 2. Functions 로그 확인

```bash
firebase functions:log
```

#### 3. 실제 테스트

1. **앱에서 신고 기능 사용**
   - 게시글 상세 화면에서 신고 아이콘(⚠️) 클릭
   - 또는 댓글을 장기 누름 후 신고
   - 신고 사유 선택 및 제출

2. **Firestore 콘솔에서 확인**
   - [Firebase Console](https://console.firebase.google.com/project/runon-production-app/firestore)
   - `reports` 컬렉션에서 새 문서 생성 확인

3. **이메일 수신 확인**
   - 관리자 이메일(`dlrhdkgml12@gmail.com`) 확인
   - 신고 알림 이메일 수신 확인

---

## 🔍 문제 해결

### 이메일 전송 실패

**증상**: Functions 로그에 이메일 전송 실패 오류

**해결 방법**:
1. 앱 비밀번호 확인
   ```bash
   firebase functions:config:get
   ```
2. Gmail 앱 비밀번호 재생성
3. Functions 재배포

### Functions 배포 실패

**증상**: 배포 중 오류 발생

**해결 방법**:
1. Node.js 버전 확인 (18 이상)
   ```bash
   node --version
   ```

2. 의존성 재설치
   ```bash
   cd functions
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Firebase CLI 업데이트
   ```bash
   npm install -g firebase-tools
   ```

### 환경 변수 설정 오류

**증상**: 환경 변수 설정 후 작동하지 않음

**해결 방법**:
1. 환경 변수 확인
   ```bash
   firebase functions:config:get
   ```

2. 환경 변수 재설정
   ```bash
   firebase functions:config:unset email.user email.password email.service admin.email
   firebase functions:config:set email.user="..."
   # ... 나머지 설정
   ```

---

## 📊 배포 후 모니터링

### Functions 로그 확인

```bash
# 모든 Functions 로그
firebase functions:log

# 특정 함수 로그만
firebase functions:log --only onReportCreated

# 실시간 로그 확인
firebase functions:log --follow
```

### Firestore에서 신고 확인

1. [Firebase Console](https://console.firebase.google.com/project/runon-production-app/firestore) 접속
2. `reports` 컬렉션 확인
3. 신고 문서 상태 확인 (`status: pending`)

---

## ✅ 배포 완료 체크리스트

- [ ] Gmail 앱 비밀번호 생성 완료
- [ ] Firebase 프로젝트 설정 확인 (`runon-production-app`)
- [ ] Firebase Functions 환경 변수 설정 완료
- [ ] Functions 배포 성공
- [ ] 앱에서 신고 기능 테스트
- [ ] Firestore에 신고 문서 생성 확인
- [ ] 관리자 이메일로 신고 알림 수신 확인

---

## 📞 추가 도움

문제가 발생하면:
1. Functions 로그 확인: `firebase functions:log`
2. Firebase Console에서 Functions 상태 확인
3. 이메일 설정 재확인

---

## 🎯 다음 단계

배포 완료 후:
1. 앱에서 실제 신고 기능 테스트
2. 24시간 내 조치 프로세스 문서화
3. 관리자 대시보드 구축 (선택사항)

