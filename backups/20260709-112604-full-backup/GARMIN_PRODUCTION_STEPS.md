# Garmin 프로덕션 승인 - 우선순위별 작업 가이드

> Garmin 개발자팀 답변 기준, 순서대로 진행

---

## 📅 배포 시점 (우선순위별)

| 순위 | 작업 | runon-garmin-eval 배포 | runon-production-app 배포 |
|------|------|------------------------|---------------------------|
| **1** | User Deregistration / User Permission | ✅ 완료 | **이 시점에 배포** (Endpoint Config에 프로덕션 URL 등록 시) |
| **2** | Partner Verification Tool | - | - |
| **3** | 2명 OAuth 연동 | - | - |
| **4** | 브랜드 가이드라인 | - | - |
| **5** | Garmin 제출 | - | - |

**정리**:
- **runon-garmin-eval**: 1순위에서 이미 배포됨 (Partner Verification 시 Eval URL 사용 시)
- **runon-production-app**: **1순위**에서 배포 → Garmin Endpoint Configuration에 프로덕션 URL 등록 가능. (현재 미배포 상태)

---

## ⚠️ Evaluation vs Production Firebase 구분

| 구분 | Firebase 프로젝트 | 용도 |
|------|-------------------|------|
| **Evaluation** | runon-garmin-eval | 테스트 전용 (Data Generator, Partner Verification, 개발 검증) |
| **Production** | runon-production-app | 실제 서비스 (앱 사용자, users/events, garminActivities) |

- **Partner Verification**: Evaluation Key 사용 → runon-garmin-eval URL로 검증
- **프로덕션 승인 후**: runon-production-app에 동일 함수 배포 → Garmin Endpoint Configuration을 프로덕션 URL로 변경

---

## 1순위: User Deregistration / User Permission 엔드포인트

### 1.1 구현 완료 (Cloud Functions)

| 함수 | 역할 |
|------|------|
| `garminUserDeregistration` | Garmin이 사용자 연동 해제 시 호출 → users에서 garminUserId 제거 |
| `garminUserPermission` | Garmin이 권한 변경 시 호출 → 로그 |

### 1.2 해야 할 작업

**Phase A: Partner Verification (Evaluation)**  
- [x] runon-garmin-eval에 배포 완료
- [ ] Garmin Endpoint Configuration (Evaluation 앱)에 URL 등록:
  - User Deregistration: `https://us-central1-runon-garmin-eval.cloudfunctions.net/garminUserDeregistration`
  - User Permission: `https://us-central1-runon-garmin-eval.cloudfunctions.net/garminUserPermission`

**Phase B: runon-production-app 배포 (1순위에서 진행)**  
- [ ] **1순위 단계에서** runon-production-app에 배포 (Endpoint Config에 프로덕션 URL 등록 전 필수)
  ```bash
  firebase use default  # runon-production-app
  firebase deploy --only functions:garminPing,functions:garminGetActivities,functions:garminUserDeregistration,functions:garminUserPermission
  ```
- [ ] Firestore 인덱스 배포 (garminActivities용): `firebase deploy --only firestore:indexes`
- [ ] Garmin Endpoint Configuration을 runon-production-app URL로 등록

- [ ] **추가: 앱에서 "연동 해제" 시 Garmin DELETE 호출**
  - OAuth 연동 시 access_token 저장 필요
  - 사용자가 "Garmin 연동 해제" 클릭 시 → 백엔드에서 `DELETE https://apis.garmin.com/wellness-api/rest/user/registration` (Authorization: Bearer {token}) 호출

---

## 2순위: Partner Verification Tool

### 2.1 Data Generator + User Authorization으로 통과하기

Partner Verification은 "2명 사용자 + 24시간 내 데이터 수신"이 필요합니다. **앱 OAuth 없이** 포털 도구만으로 진행할 수 있습니다.

#### Step A: User Authorization (2명 연동)

1. **Garmin API Tools** 접속: https://healthapi.garmin.com/tools/login  
   (또는 developerportal.garmin.com → API Tools)
2. **Consumer Key, Consumer Secret**으로 로그인
3. **OAuth2** 또는 **User Authorization** 메뉴 선택
4. **2개의 Garmin Connect 계정**으로 각각 인증:
   - Garmin Connect 로그인 → 앱 권한 동의 → 완료
   - 각 인증 완료 시 **User ID** 발급 (예: `5ba36c17-13ec-49d4-bbf8-1bb4c10aa01c`)
5. **2명의 User ID**를 메모

#### Step B: Data Generator (시뮬레이션 데이터 생성)

1. **Data Generator** 메뉴 선택 (같은 API Tools 내)
2. **StartTime, EndTime** 설정: 오늘 날짜, 최근 24시간 범위
3. **사용자 선택**: Step A에서 인증한 2명의 User ID 입력/선택
4. **Summary 타입**: Activities, Activity Details 등 활성화
5. **Generate** 또는 **Send** 실행
6. 데이터가 **runon-production-app** 엔드포인트로 전송됨 (Endpoint Configuration에 등록된 URL)

#### Step C: 데이터 수신 확인

1. **Firebase Console** → runon-production-app → Firestore
2. `garminActivities` 컬렉션에 문서 생성 확인
3. **Partner Verification Tool** 재실행 (몇 분~수십 분 후)
4. Endpoint Coverage Test, Active User Test 통과 확인

#### 주의사항

- Endpoint Configuration이 **runon-production-app** URL을 가리키는지 확인
- Data Generator 실행 후 **24시간 이내**에 Partner Verification 실행
- 2명 모두에 대해 데이터가 생성되어야 함

### 2.2 Partner Verification 실행

- [ ] **Garmin Developer Portal** → **Partner Verification** 메뉴
- [ ] Evaluation Key로 도구 실행
- [ ] 결과 스크린샷 저장

---

## 3순위: 2명 이상 사용자 OAuth 연동

### 3.1 해야 할 작업

- [ ] **OAuth2 PKCE 플로우** 구현 (또는 기존 구현 확인)
  - docs/garmin/oauth/callback/index.html 이미 존재
  - 앱에서 Garmin 로그인 페이지로 이동 → callback에서 code 수신 → 토큰 교환
- [ ] **2명의 Garmin Connect 계정**으로 각각 연동 테스트
- [ ] users/{uid}에 garminUserId 저장 확인

---

## 4순위: 브랜드 가이드라인 및 Attribution

### 4.1 해야 할 작업

- [ ] **developerportal.garmin.com** → GCDP Branding Assets v2 → API BRAND GUIDELINES 확인
- [ ] **Activities (p.2), Health (p.4)** 필수 attribution 문구 확인
- [ ] 앱 내 Garmin 데이터 노출 위치에 attribution 추가
- [ ] Garmin 로고/상표 사용 시 가이드라인 준수

---

## 5순위: Garmin에 제출

### 5.1 제출 자료

- [ ] Partner Verification Tool 결과
- [ ] 사용 중 API 목록 (Activity API)
- [ ] 2명 사용자 인증 증빙
- [ ] User Deregistration / User Permission URL (Endpoint Configuration 등록 완료)
- [ ] Garmin 데이터 노출 위치 스크린샷
- [ ] UX 플로우 설명

---

## 배포 URL 정리

### Evaluation (runon-garmin-eval) – 테스트/검증용

| 함수 | URL |
|------|-----|
| garminPing | https://us-central1-runon-garmin-eval.cloudfunctions.net/garminPing |
| garminGetActivities | https://us-central1-runon-garmin-eval.cloudfunctions.net/garminGetActivities |
| garminUserDeregistration | https://us-central1-runon-garmin-eval.cloudfunctions.net/garminUserDeregistration |
| garminUserPermission | https://us-central1-runon-garmin-eval.cloudfunctions.net/garminUserPermission |

### Production (runon-production-app) – 실제 서비스용 (승인 후 배포)

| 함수 | URL |
|------|-----|
| garminPing | https://us-central1-runon-production-app.cloudfunctions.net/garminPing |
| garminGetActivities | https://us-central1-runon-production-app.cloudfunctions.net/garminGetActivities |
| garminUserDeregistration | https://us-central1-runon-production-app.cloudfunctions.net/garminUserDeregistration |
| garminUserPermission | https://us-central1-runon-production-app.cloudfunctions.net/garminUserPermission |
