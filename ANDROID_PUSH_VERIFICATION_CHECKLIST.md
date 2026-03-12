# 안드로이드 푸시 알림 - Firestore & Google Play Console 확인 체크리스트

코드 변경 후 **직접 확인**이 필요한 사항입니다.

---

## 1. Firestore에서 확인할 사항

### 1.1 사용자 문서 `expoPushToken` 확인

- **경로**: Firestore > `users` 컬렉션 > `{userId}` 문서
- **확인 항목**:
  - `expoPushToken` 필드가 존재하는지
  - 값 형식: `ExponentPushToken[xxxxxxxxxxxxxx]` (Android에서도 동일)
- **방법**: 안드로이드 기기에서 앱 로그인 후, 해당 사용자 문서에서 `expoPushToken` 필드 확인
- **문제 시**: 토큰이 비어 있으면 로그인/초기화 후 토큰 저장 여부 확인

### 1.2 `deviceInfo` 확인

- **경로**: Firestore > `users` > `{userId}` > `deviceInfo`
- **확인 항목**:
  - `platform`: `"android"`
  - `updatedAt`: 최근 업데이트 시간

### 1.3 알림 설정 (`notificationSettings`)

- **경로**: Firestore > `users` > `{userId}` > `notificationSettings` (또는 `notifications` 하위)
- **확인 항목**: 채팅 알림이 `false`로 꺼져 있지 않은지 확인

---

## 2. Google Play Console에서 확인할 사항

### 2.1 앱 서명 키 확인

- **경로**: Google Play Console > 앱 선택 > 설정 > 앱 무결성
- **확인**: 앱 서명 키가 Google Play에서 관리되고 있는지 확인
- **참고**: EAS Build에서 업로드 키로 서명한 후, Google Play가 앱 서명 키로 재서명함

### 2.2 Firebase 프로젝트 연결

- **경로**: [Firebase Console](https://console.firebase.google.com/) > 프로젝트 설정 > 일반
- **확인 항목**:
  - Android 앱이 등록되어 있는지
  - 패키지 이름: `com.runon.app`
  - `google-services.json`의 `mobilesdk_app_id`와 Firebase Console의 Android 앱 ID 일치 여부

### 2.3 FCM (Cloud Messaging) 설정

- **경로**: Firebase Console > 프로젝트 설정 > Cloud Messaging
- **확인**: Firebase Cloud Messaging이 활성화되어 있는지
- **참고**: Expo Push는 FCM을 사용하므로, Firebase 프로젝트가 정상적으로 설정되어 있어야 함

---

## 3. Firebase Console에서 확인할 사항

### 3.1 Cloud Functions 로그

- **경로**: Firebase Console > Functions > 로그
- **확인**: `onChatMessageCreated`, `onMeetingCancelled` 등 푸시 발송 함수가 실행되는지
- **에러 확인**: `Invalid token`, `DeviceNotRegistered` 등 에러 메시지가 있는지 확인

### 3.2 Google Cloud 프로젝트

- **확인**: Firebase 프로젝트가 사용하는 Google Cloud 프로젝트에서 결제가 활성화되어 있는지

---

## 4. 테스트 시 확인

### 4.1 안드로이드 기기에서

1. 앱 설치 후 로그인
2. 알림 권한 요청 팝업 확인
3. **설정 > 앱 > RunOn > 알림**: 알림이 활성화되어 있는지 확인
4. Android 13+ 기기: **설정 > 앱 > RunOn > 알림 > RunOn 알림** 채널이 활성화되어 있는지 확인

### 4.2 알림 테스트

1. 채팅 메시지 전송
2. Firestore에서 수신자 문서에 `expoPushToken`이 있는지 확인
3. Firebase Functions 로그에서 함수 실행 여부 확인

---

## 5. 요약 체크리스트

| 구분 | 확인 항목 | 확인 위치 |
|------|----------|----------|
| Firestore | `expoPushToken` 존재 | users/{userId} |
| Firestore | `platform: "android"` | users/{userId}/deviceInfo |
| Firestore | 알림 설정 비활성화 여부 | notificationSettings |
| Firebase | Android 앱 등록 | 프로젝트 설정 |
| Firebase | FCM 활성화 | Cloud Messaging |
| Firebase | Functions 로그 | Functions > 로그 |
| Google Play | 앱 서명 | 앱 무결성 |
