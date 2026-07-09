# Cloud Functions 권한 관리 가이드

## 개요

Cloud Functions가 Firestore에 접근할 때 필요한 IAM 권한 설정 가이드입니다.

## 문제 상황

Cloud Functions가 Firestore 데이터를 읽거나 쓸 때 권한 오류가 발생할 수 있습니다.

## 해결 방법

### 1. Firebase Console에서 확인

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `runon-production-app`
3. 왼쪽 메뉴에서 **"설정"** (톱니바퀴 아이콘) 클릭
4. **"프로젝트 설정"** 선택
5. **"서비스 계정"** 탭 클릭
6. **"App Engine 기본 서비스 계정"** 확인
   - 이메일: `runon-production-app@appspot.gserviceaccount.com`

### 2. Google Cloud Console에서 권한 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택: `runon-production-app`
3. 왼쪽 메뉴에서 **"IAM 및 관리자"** > **"IAM"** 선택
4. 다음 서비스 계정을 검색:
   - `runon-production-app@appspot.gserviceaccount.com`
   - `[PROJECT_NUMBER]-compute@developer.gserviceaccount.com`
5. 각 서비스 계정에 다음 역할이 있는지 확인:
   - ✅ **Cloud Datastore User** (또는 **Firestore User**)
   - ✅ **Cloud Functions Invoker**
   - ✅ **Service Account User**

### 3. 권한이 없는 경우 추가 방법

#### 방법 1: Google Cloud Console에서 직접 추가

1. Google Cloud Console > IAM 및 관리자 > IAM
2. 서비스 계정 찾기
3. **"역할 편집"** 클릭
4. **"역할 추가"** 클릭
5. 다음 역할 추가:
   - `Cloud Datastore User`
   - `Cloud Functions Invoker`
6. **"저장"** 클릭

#### 방법 2: Firebase CLI 사용 (권장)

```bash
# 프로젝트 디렉토리에서 실행
cd "/Users/lee_mac/RunOn-App (Production_iOS)"

# App Engine 기본 서비스 계정에 Firestore 권한 부여
gcloud projects add-iam-policy-binding runon-production-app \
  --member="serviceAccount:runon-production-app@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"

# Cloud Functions 서비스 계정에 권한 부여
gcloud projects add-iam-policy-binding runon-production-app \
  --member="serviceAccount:runon-production-app@appspot.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker"
```

### 4. Cloud Functions 실행 로그 확인

함수가 실제로 실행될 때 권한 오류가 발생하는지 확인:

```bash
# Firebase CLI로 로그 확인
firebase functions:log

# 특정 함수 로그만 확인
firebase functions:log --only onChatMessageCreated
```

### 5. 일반적인 권한 오류 메시지

- `PERMISSION_DENIED`: 서비스 계정에 Firestore 접근 권한이 없음
- `7 PERMISSION_DENIED`: IAM 권한 부족
- `Missing or insufficient permissions`: 역할이 부족함

### 6. 자동 권한 부여 확인

Firebase 프로젝트를 생성하면 일반적으로 다음 권한이 자동으로 부여됩니다:

- App Engine 기본 서비스 계정: `Cloud Datastore User`
- Cloud Functions 서비스 계정: `Cloud Functions Invoker`

하지만 프로젝트 설정에 따라 다를 수 있으므로 위의 방법으로 확인하는 것이 좋습니다.

## 참고 사항

- Cloud Functions는 **Firebase Admin SDK**를 사용하므로 **Firestore 보안 규칙을 우회**합니다.
- 하지만 **IAM 권한**은 여전히 필요합니다.
- 서비스 계정 권한은 프로젝트 레벨에서 관리됩니다.

## 문제 해결 체크리스트

- [ ] App Engine 기본 서비스 계정 확인
- [ ] Cloud Functions 서비스 계정 확인
- [ ] `Cloud Datastore User` 역할 확인
- [ ] `Cloud Functions Invoker` 역할 확인
- [ ] 함수 실행 로그 확인
- [ ] 실제 함수 테스트 (채팅 메시지 전송 등)

## 추가 도움말

- [Firebase Admin SDK 문서](https://firebase.google.com/docs/admin/setup)
- [Cloud Functions IAM 권한](https://cloud.google.com/functions/docs/concepts/iam)
- [Firestore IAM 권한](https://cloud.google.com/firestore/docs/security/iam)

