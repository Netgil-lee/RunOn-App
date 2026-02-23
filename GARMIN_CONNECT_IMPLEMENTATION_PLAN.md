# Garmin Connect 공유 이미지 기능 구축 계획

> **목적**: Apple Fitness(HealthKit)와 동일한 방식으로 Garmin Connect 앱 데이터를 활용하여 러닝 공유 이미지를 생성하는 기능 구현
>
> **참고**: Activity_API-1.2.4.pdf 기반 검토 반영 (2025.11 기준)

---

## ⚠️ 중요: Activity API 아키텍처 (PDF Section 3)

**Activity API는 Server-to-Server 통신만 지원합니다.**

- 모바일 앱에서 Garmin API를 **직접 호출할 수 없음**
- Garmin이 **우리 서버(백엔드)** 로 이벤트 알림(Ping/Push)을 보내고, 우리가 그에 응답하는 구조
- 따라서 **백엔드 서버(Cloud Functions 등) 구축이 필수**

---

## 1. 현재 구현 (Apple Fitness 기준)

### 1.1 데이터 흐름
1. **ScheduleScreen** → 모임 이벤트 선택 시 "공유" 버튼 → `RunningShareModal` 오픈
2. **RunningShareModal** → place 입력 후 `appleFitnessService.findMatchingWorkout(eventData)` 호출
3. **appleFitnessService** → HealthKit에서 이벤트 시간 ±30분 범위 내 러닝 워크아웃 조회 → 매칭된 워크아웃 데이터 반환
4. **RunningShareCard** → `distance`, `pace`, `duration`, `location`, `calories`, `routeCoordinates`로 공유 카드 렌더링
5. **captureRef** → View를 PNG로 캡처 → 갤러리 저장

### 1.2 findMatchingWorkout 반환 형식
```javascript
{
  distance: string,      // "5.2km" 또는 "530m"
  duration: string,      // "34m 0s" 또는 "54m 19s"
  pace: string,          // "6:40/km"
  calories: number,      // 300
  routeCoordinates: Array<{ latitude: number, longitude: number }>
}
```

### 1.3 eventData 형식 (findMatchingWorkout 입력)
```javascript
{
  title: string,
  location: string,
  date: string | Date,   // "2024-01-18" 또는 Date
  time: string,          // "오전 9:00" 또는 "오후 2:30"
  organizer: string
}
```

---

## 2. Activity API PDF 검토 요약 (Activity_API-1.2.4.pdf)

### 2.1 핵심 아키텍처

| 항목 | 내용 |
|------|------|
| **통신 방식** | Server-to-Server **전용** (모바일 앱 직접 호출 불가) |
| **엔드포인트 설정** | https://apis.garmin.com/tools/endpoints (consumer key/secret 로그인) |
| **프로토콜** | HTTPS POST만 지원, 비표준 포트 불가 |

### 2.2 데이터 수신 방식 (둘 중 선택)

#### A. Ping Service (Ping/Pull)
- Garmin이 **Ping 알림**을 우리 서버로 POST
- Ping 본문에 `callbackURL` 포함 → 우리가 이 URL을 **호출**해서 데이터 Pull
- **주의**: Ping 수신 후 **즉시 HTTP 200 응답** 필수. 그 다음 비동기로 callbackURL 호출
- Ping 타임아웃: 30초

#### B. Push Service
- Garmin이 **실제 데이터(JSON)** 를 우리 서버로 직접 POST
- callbackURL 호출 없음, 수신 즉시 저장 처리
- Activity Details는 **Push 전용** (Ping/Pull로는 불가)

### 2.3 Summary 타입별 특징

| Summary 타입 | 용도 | 경로(GPS) | Push 지원 |
|-------------|------|-----------|-----------|
| **Activity Summaries** | 활동 요약 (거리, 시간, 페이스, 칼로리 등) | startingLatitude/Longitude만 | ✅ |
| **Activity Details** | 상세 (samples에 GPS 좌표 포함) | ✅ samples 배열 | ✅ Push만 |
| **Activity Files** | FIT/GPX/TCX 원본 파일 | ✅ 파싱 필요 | ❌ Ping만 |
| **Manually Updated** | 사용자가 수동 수정한 활동 | ✅ | ✅ |
| **Move IQ** | 자동 감지 활동 (사용자 시작 아님) | ❌ | ✅ |

### 2.4 Activity Summary 필드 (공유 이미지에 필요한 것)

| 필드 | 타입 | 설명 |
|------|------|------|
| `summaryId` | string | 고유 ID |
| `activityType` | string | RUNNING, CYCLING 등 (Appendix A 참조) |
| `startTimeInSeconds` | integer | Unix timestamp (UTC 초) |
| `startTimeOffsetInSeconds` | integer | 디바이스 로컬 시간 오프셋 |
| `durationInSeconds` | integer | 운동 시간(초) |
| `distanceInMeters` | float | 거리(m) |
| `averagePaceInMinutesPerKilometer` | float | 평균 페이스 (분/km) |
| `activeKilocalories` | integer | 칼로리 |
| `deviceName` | string | 기기명 |

**경로 좌표**가 필요하면 → **Activity Details** 또는 **Activity Files** 사용.

### 2.5 쿼리 제약사항

- **조회 기준**: `uploadStartTimeInSeconds`, `uploadEndTimeInSeconds` (업로드 시각, 활동 시각 아님)
- **최대 조회 범위**: 24시간
- Activity Details: 24시간 초과 활동은 전송/조회 불가 (Activity Files로만 접근)

### 2.6 시간 값 규칙 (Section 6.1)

- 모든 타임스탬프: **UTC 초(Unix Time)**
- `startTimeOffsetInSeconds`: 디바이스 표시 시간과 UTC 차이 (타임존과 다를 수 있음)

### 2.7 Web Tools (Section 6.2)

- **Data Viewer**: 사용자 데이터 조회/디버깅
- **Backfill**: 과거 데이터 요청 (최대 30일 단위)
- **Summary Resender**: 알림 재전송 (장애 복구용)
- **Data Generator**: 시뮬레이션 데이터 생성 (실기기 데이터 없이 테스트)
- **Partner Verification**: 프로덕션 키 요건 검증
- **Pull Token tool**: 임시 Pull 토큰 생성 (로컬 Ping 시뮬레이션용)
- **API Configuration**: 앱별 API 활성화/비활성화

### 2.8 프로덕션 키 요건 (Section 9)

- 최소 2명 Garmin Connect 사용자 인증
- User Deregistration / User Permission 엔드포인트 구현
- **PING 또는 PUSH 처리 필수** (PULL만으로는 프로덕션 불가)
- 수신 시 **30초 이내 HTTP 200** 응답
- 최소 페이로드: 10MB (Activity Details: 100MB)
- UX 및 브랜드 가이드라인 준수

### 2.9 Evaluation vs Production 버전 (PDF Section 9, 8)

| 구분 | Evaluation (평가판) | Production (프로덕션) |
|------|---------------------|------------------------|
| **발급 시점** | Developer Portal 최초 Consumer Key 발급 시 자동 부여 | 별도 요청 및 심사 후 발급 |
| **용도** | 테스트, 평가, 개발 **전용** | 실제 서비스 운영 |
| **Rate Limit** | Backfill: 100일/분 | Backfill: 10,000일/분/키 |
| **제한** | 가이드라인 위반 시 사전 통보 없이 비활성화 가능 | 정식 운영용 |
| **프로덕션 전환** | connect-support@developer.garmin.com 문의 → 기술·UX 심사 통과 필요 | - |

**Evaluation 버전이란?**  
Garmin Developer Portal에서 앱을 처음 생성하면 받는 Consumer Key는 **Evaluation(평가) 키**입니다. 개발·테스트용으로 제한된 환경이며, Data Generator로 시뮬레이션 데이터를 생성해 연동을 검증할 수 있습니다. **실제 프로덕션 앱(App Store 등)에 적용하려면** 별도 심사를 거쳐 Production 키를 발급받아야 합니다.

---

## 3. 수정된 구현 계획

### Phase 0: 백엔드 인프라 (필수)

#### 3.0.1 Firebase Cloud Functions (또는 별도 서버)

| 역할 | 설명 |
|------|------|
| **Ping/Push 수신 엔드포인트** | Garmin이 POST하는 HTTPS URL 제공 |
| **데이터 저장** | Firestore 등에 사용자별 활동 데이터 저장 |
| **앱용 API** | 앱이 `findMatchingWorkout`에 해당하는 데이터 조회 |

#### 3.0.2 엔드포인트 URL 예시

```
https://us-central1-runon-production-app.cloudfunctions.net/garminPing
```

- Firebase 프로젝트 ID에 맞게 `runon-production-app` 수정
- Garmin Endpoint Configuration Tool에서 위 URL 등록
- Summary 타입별로 activities, activityDetails 등 활성화

#### 3.0.3 기존 프로덕션 앱에 API 추가 시 (PDF 6.2.7)

**RunOn은 이미 App Store에 배포된 프로덕션 앱입니다.** PDF에 따르면, 기존 프로덕션 앱에 API를 추가할 때는 **connect-support@developer.garmin.com**에 문의해야 합니다.

**문의 예시 (영문)**:
```
Subject: Adding Activity API to Existing Production App - RunOn

Hello Garmin Connect Developer Program Support,

We are the developers of RunOn, a running community app that is already 
in production (App Store). We would like to add the Garmin Connect 
Activity API to our existing production app.

According to the Activity API documentation (Section 6.2.7), we understand 
that adding APIs to an existing production app requires contacting your 
team. Could you please advise on:

1. The process and requirements for adding the Activity API to our 
   existing production application
2. Any additional steps or approvals needed beyond the standard 
   Endpoint Configuration and API Configuration
3. Whether we need to create a new app/project in the Developer Portal 
   or can use our existing consumer key

Our app details:
- App name: RunOn (러논)
- Platform: iOS (React Native/Expo)
- Use case: Display user's running activity data for share image generation 
  (similar to Apple Fitness integration we already have)
- Consumer Key: [발급받은 Consumer Key]

Thank you for your assistance.
```

**추가 문의 가능 항목**: OAuth2 사용자 연동 절차, Evaluation → Production 전환, User Deregistration 엔드포인트 요구사항

#### 3.0.4 사용자 연동 플로우 (OAuth / UAT)

- 사용자가 Garmin Connect와 RunOn 연동 시 **User Access Token(UAT)** 발급
- PDF 1.0.8: "user access token reference" 퇴출 예정 → OAuth2 PKCE 등 최신 방식 확인 필요
- UAT는 Garmin → 우리 서버 Ping/Push 시 `userId`와 함께 전달됨
- 우리는 `userId` ↔ RunOn `user.uid` 매핑 저장 필요

### Phase 1: 백엔드 구현

#### 3.1.0 Firebase Cloud Functions 구현 (권장)

RunOn 프로젝트에 이미 `functions/`가 있으며 `recalculateMannerDistance` 등 `functions.https.onRequest`로 HTTP 요청을 처리하고 있음. **Firebase Cloud Functions로 Garmin Ping/Push 수신 가능.**

**Garmin Ping 수신 함수 예시**:
```javascript
// functions/index.js에 추가
exports.garminPing = functions.https.onRequest(async (req, res) => {
  // 1. 즉시 HTTP 200 응답 (PDF 요구사항 - 30초 이내)
  res.status(200).send('OK');
  
  // 2. 그 다음 비동기로 callbackURL 호출
  if (req.method === 'POST' && req.body) {
    const body = req.body;
    const activities = body.activities || [];
    for (const item of activities) {
      if (item.callbackURL) {
        // 비동기로 Garmin callbackURL 호출 → 데이터 가져오기 → Firestore 저장
        fetch(item.callbackURL)
          .then(res => res.json())
          .then(data => { /* Firestore users/{uid}/garminActivities 저장 */ })
          .catch(err => console.error(err));
      }
    }
  }
});
```

**배포 후 URL**: `https://us-central1-<projectId>.cloudfunctions.net/garminPing`

**Firebase Cloud Functions 적합성**:
| 항목 | 가능 여부 |
|------|-----------|
| HTTPS POST 수신 | ✅ `onRequest` |
| 30초 이내 200 응답 | ✅ 즉시 `res.status(200).send()` |
| 비동기 callback 호출 | ✅ `res.send()` 후 `fetch()` |
| Firestore 저장 | ✅ `admin.firestore()` |
| 공개 HTTPS URL | ✅ 배포 시 자동 생성 |

**주의**: Activity Details 최대 100MB → `runWith({ timeoutSeconds: 120, memory: '512MB' })` 등 설정 검토.

#### 3.1.1 Cloud Functions (또는 Node 서버)

1. **Ping 수신 핸들러**
   - POST 수신 → 즉시 HTTP 200 반환
   - 본문에서 `activities` 등 배열 추출 → 각 `callbackURL` 비동기 호출
   - 응답 데이터를 Firestore `users/{uid}/garminActivities` 등에 저장

2. **Push 수신 핸들러**
   - POST 수신 → 본문 JSON 파싱 → Firestore 저장
   - HTTP 200 반환 (30초 이내)

3. **앱용 REST API**
   - `GET /garmin/activities?userId=xxx&startTime=xxx&endTime=xxx`
   - 이벤트 시간 ±30분 범위의 활동 조회
   - RUNNING 타입 필터링 후 가장 가까운 활동 반환

#### 3.1.2 Activity Summary → 공유 이미지 형식 변환

```javascript
// Garmin Activity Summary → RunOn shareCardData
{
  distance: formatDistance(activity.distanceInMeters),
  duration: formatDuration(activity.durationInSeconds),
  pace: formatPaceFromMinutesPerKm(activity.averagePaceInMinutesPerKilometer),
  calories: activity.activeKilocalories,
  routeCoordinates: []  // Activity Details 또는 Files에서 추출
}
```

### Phase 2: 앱 측 구현

#### 3.2.1 `services/garminConnectService.js`

- **역할**: 백엔드 API 호출만 담당 (Garmin API 직접 호출 없음)
- `findMatchingWorkout(eventData)` → `fetch(ourBackendUrl, { userId, startTime, endTime })`
- 응답을 `appleFitnessService`와 동일한 형식으로 변환

#### 3.2.2 사용자 연동 UI

- 설정 또는 공유 모달에서 "Garmin Connect 연동" 버튼
- Garmin OAuth/연동 페이지로 이동 (웹뷰 또는 외부 브라우저)
- 연동 완료 후 callback에서 UAT 또는 연동 상태를 백엔드에 저장

### Phase 3: RunningShareModal 확장

- 데이터 소스 선택: Apple Fitness / Garmin Connect
- Garmin 선택 시 `garminConnectService.findMatchingWorkout()` 호출
- 미연동 시 "Garmin Connect 연동하기" 유도

---

## 4. 필요한 것 체크리스트

### 4.1 Garmin 측

- [x] Garmin Connect Developer Program 접근 권한 신청
- [x] Consumer Key, Consumer Secret 발급
- [ ] Endpoint Configuration Tool에서 Ping/Push URL 등록
- [ ] API Configuration에서 Activity (및 필요 시 Activity Details) 활성화
- [ ] 사용자 연동(OAuth/UAT) 플로우 문서 확인 (PDF는 UAT 퇴출 언급)

### 4.2 백엔드

- [ ] 공개 HTTPS URL (Cloud Functions 또는 별도 서버)
- [ ] Ping 또는 Push 수신 핸들러 구현
- [ ] 30초 이내 HTTP 200 응답 보장
- [ ] Firestore (또는 DB) 스키마 설계: `users/{uid}/garminActivities`
- [ ] 앱용 활동 조회 API 구현
- [ ] userId ↔ RunOn user.uid 매핑 저장

### 4.3 앱

- [ ] `garminConnectService.js` (백엔드 API 클라이언트)
- [ ] Garmin 연동/해제 UI
- [ ] RunningShareModal 데이터 소스 선택
- [ ] 에러 처리 (미연동, 데이터 없음, 네트워크 오류)

### 4.4 확인 필요 사항

- [ ] **OAuth2 vs UAT**: 최신 Garmin 문서에서 사용자 연동 방식 확인
- [ ] **Activity Details vs Activity Summary**: 경로 좌표 필요 시 Details 또는 Files 선택
- [ ] **Evaluation vs Production**: 테스트용 Data Generator, 프로덕션 시 실기기 데이터 필수

---

## 5. 기술적 고려사항

### 5.1 Ping 처리 시 주의사항 (PDF Section 4.1)

> **가장 흔한 실수**: Ping 수신 후 connection을 열어둔 채 callbackURL 호출 → HTTP 타임아웃, 데이터 손실

- Ping 수신 → **즉시 HTTP 200** 반환 → **연결 종료**
- 그 **다음** 비동기로 callbackURL 호출

### 5.2 Activity Details 24시간 제한

- 24시간 초과 활동은 Activity Details로 전달되지 않음
- 해당 경우 Activity Files (FIT/GPX/TCX) 파싱 필요

### 5.3 HealthKit 대안

- Garmin 앱이 HealthKit에 동기화하면, **HealthKit만으로도** Garmin 데이터 조회 가능
- Activity API 연동은 HealthKit 미동기화 사용자, Android 확장 시 유리

---

## 6. 작업 순서 권장

1. ~~Garmin Developer Program 접근 권한 신청~~ (완료)
2. ~~Consumer Key, Consumer Secret 발급~~ (완료)
3. **기존 프로덕션 앱**: connect-support@developer.garmin.com 문의 (API 추가 절차 확인)
4. Firebase Cloud Functions에 `garminPing` 엔드포인트 구축
5. Endpoint Configuration에 배포된 URL 등록
6. Data Generator로 시뮬레이션 데이터 수신 테스트 (Evaluation 환경)
7. 앱용 조회 API 및 `garminConnectService` 구현
8. RunningShareModal 확장
9. 사용자 연동(OAuth/UAT) 플로우 구현
10. Partner Verification 통과 후 프로덕션 키 요청

---

## 7. Evaluation 진행 우선순위

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| **1** | Cloud Functions `garminPing` 구현 및 배포 | URL이 있어야 Endpoint Configuration 등록 가능 |
| **2** | Endpoint Configuration에 URL 등록 | activities Summary 활성화 |
| **3** | API Configuration에서 Activity API 활성화 | |
| **4** | 사용자 연동(OAuth2) 및 UAT 발급 | Data Generator 사용을 위해 필요 |
| **5** | Data Generator로 시뮬레이션 테스트 | 연동 검증 |

**확인 필요**: 사용자 연동(OAuth2) 절차, Evaluation 최소 사용자 수

---

## 8. Cloud Functions 구현 계획

### 8.1 개요

| 함수명 | HTTP 메서드 | 역할 |
|--------|-------------|------|
| `garminPing` | POST | Garmin Ping 수신 → 즉시 200 → 비동기 callbackURL 호출 → Firestore 저장 |
| `garminPush` | POST | (선택) Garmin Push 수신 → 본문 JSON 파싱 → Firestore 저장 |
| `garminGetActivities` | GET | 앱용 활동 조회 API (이벤트 시간 ±30분, RUNNING 필터) |

**우선 구현**: `garminPing` (Ping 방식이 Activity Summaries 기본)

### 8.2 Firestore 스키마

```
users/{runonUserId}
  └── garminUserId: string | null   // 연동 시 저장

garminActivities/{docId}   // docId = garminUserId_summaryId 또는 uuid
  ├── garminUserId: string
  ├── runonUserId: string | null    // 매핑된 경우
  ├── summaryId: string
  ├── activityType: string          // RUNNING, CYCLING 등
  ├── startTimeInSeconds: number
  ├── durationInSeconds: number
  ├── distanceInMeters: number
  ├── averagePaceInMinutesPerKilometer: number
  ├── activeKilocalories: number
  ├── deviceName: string
  ├── rawData: object               // 원본 전체 (디버깅용)
  └── createdAt: Timestamp
```

**인덱스**: `garminUserId` + `startTimeInSeconds` (조회용)

### 8.3 garminPing 함수 상세

#### 8.3.1 처리 흐름

```
1. POST 수신
2. 즉시 res.status(200).send('OK')  ← 30초 이내 필수
3. res.end() 또는 연결 종료
4. (비동기) 본문 파싱: activities, activityDetails, activityFiles, manuallyUpdatedActivities, moveIQActivities
5. (비동기) 각 항목의 callbackURL 호출 (GET)
6. (비동기) 응답 JSON을 Firestore에 저장 (garminUserId 기준)
```

#### 8.3.2 Ping 본문 구조 (PDF 4.2)

```json
{
  "activities": [{
    "userId": "4aacafe82427c251df9c9592d0c06768",
    "callbackURL": "https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=xxx&uploadEndTimeInSeconds=xxx&token=XXX"
  }]
}
```

- `userId`: Garmin 사용자 식별자 (RunOn user.uid와 별개)
- `callbackURL`: 데이터 Pull용 URL (24시간 유효, 1회 다운로드)

#### 8.3.3 구현 시 주의사항

- **res.send() 후 fetch**: `res.status(200).send('OK')` 호출 후에만 callbackURL 호출
- **에러 처리**: callbackURL 호출 실패 시 로그만 남기고 재시도는 Garmin Summary Resender 활용
- **중복 방지**: `summaryId` 기준으로 upsert (이미 있으면 덮어쓰기)

### 8.4 garminGetActivities 함수 상세

#### 8.4.1 요청

```
GET /garminGetActivities?runonUserId=xxx&startTime=xxx&endTime=xxx
```

- `runonUserId`: Firebase Auth user.uid
- `startTime`, `endTime`: Unix timestamp (초) – 이벤트 시간 ±30분

#### 8.4.2 처리 로직

1. `users/{runonUserId}`에서 `garminUserId` 조회
2. `garminUserId` 없으면 → 401 또는 `{ connected: false }`
3. `garminActivities` 쿼리: `garminUserId == X`, `startTimeInSeconds` in [startTime, endTime]
4. `activityType`이 RUNNING 계열 필터 (RUNNING, TRAIL_RUNNING, TREADMILL_RUNNING 등)
5. 이벤트 시간과 가장 가까운 활동 1건 반환
6. RunOn shareCardData 형식으로 변환

#### 8.4.3 응답 형식

```json
{
  "success": true,
  "workout": {
    "distance": "5.2km",
    "duration": "34m 0s",
    "pace": "6:40/km",
    "calories": 300,
    "routeCoordinates": []
  }
}
```

### 8.5 구현 단계 (Cloud Functions)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| 1 | `garminPing` 함수 추가 (즉시 200 + callbackURL 호출 스켈레톤) | Ping 수신 가능 |
| 2 | callbackURL 응답 → Firestore 저장 로직 | `garminActivities` 컬렉션 |
| 3 | `activities` 외 summary 타입 처리 (activityDetails 등) | 확장성 |
| 4 | `garminGetActivities` 함수 추가 | 앱용 조회 API |
| 5 | Firestore 인덱스 생성 (firestore.indexes.json) | 쿼리 성능 |
| 6 | 배포 및 URL 확인 | Endpoint Configuration 등록용 |

### 8.6 의존성

- `functions/package.json`: `node-fetch` 또는 `axios` (callbackURL 호출용) – Node 18+는 `fetch` 내장
- 기존: `firebase-admin`, `firebase-functions`

### 8.7 함수 설정 (runWith)

```javascript
exports.garminPing = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(async (req, res) => { ... });
```

- Ping 응답은 즉시 반환하므로 120초는 callback 처리용
- Activity Details(100MB) 수신 시 512MB 검토

---

## 9. 참고 문서 및 연락처

- **Activity_API-1.2.4.pdf** (첨부 문서) – 본 검토의 기준
- [GARMIN_CONNECT_DEVELOPER_RESPONSE.md](./GARMIN_CONNECT_DEVELOPER_RESPONSE.md) – 개발자 프로그램 활용 계획 (답변용)
- [Garmin Connect Activity API](https://developer.garmin.com/gc-developer-program/activity-api/)
- [Endpoint Configuration](https://apis.garmin.com/tools/endpoints)
- **Garmin Support**: connect-support@developer.garmin.com (기존 프로덕션 앱 API 추가, 프로덕션 키 문의)
