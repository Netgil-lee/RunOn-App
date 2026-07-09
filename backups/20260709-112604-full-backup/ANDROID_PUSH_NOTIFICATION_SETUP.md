# 안드로이드 푸시 알림 기능 적용 계획

## 📋 현재 상황 분석

### ✅ 이미 완료된 사항
1. **expo-notifications 플러그인**: `app.json`에 이미 포함됨
2. **pushNotificationService.js**: 플랫폼 독립적으로 작성되어 iOS/Android 모두 지원
3. **Firebase Cloud Functions**: iOS/Android 모두 동일하게 작동
4. **AuthContext**: 사용자 로그인 시 푸시 알림 서비스 초기화

### ⚠️ 안드로이드에 추가로 필요한 사항
1. **Android 알림 채널 설정** (Android 8.0+)
2. **Android 13+ (API 33+) 알림 권한** (POST_NOTIFICATIONS)
3. **app.json Android 설정 확인 및 추가**

---

## 🎯 작업 계획

### 1단계: app.json Android 설정 업데이트

#### 1.1 알림 권한 추가
- Android 13+ (API 33+)에서는 `POST_NOTIFICATIONS` 권한이 필요합니다.
- `app.json`의 `android.permissions` 배열에 추가

#### 1.2 알림 채널 설정 추가
- Android 8.0+ (API 26+)에서는 알림 채널이 필요합니다.
- `app.json`의 `android` 섹션에 알림 채널 설정 추가

#### 1.3 Google Services 설정 확인
- Firebase를 사용하므로 `google-services.json` 파일이 필요합니다.
- EAS Build가 자동으로 처리하지만 확인 필요

---

### 2단계: 코드 레벨 확인

#### 2.1 pushNotificationService.js 확인
- ✅ 이미 플랫폼 독립적으로 작성됨
- ✅ `Platform.OS`로 플랫폼 구분
- ✅ 추가 수정 불필요

#### 2.2 Android 알림 채널 생성 확인
- `expo-notifications`가 자동으로 처리하지만
- 필요시 커스텀 알림 채널 설정 가능

---

### 3단계: Firebase Cloud Functions 확인

#### 3.1 서버 측 코드
- ✅ 이미 iOS/Android 모두 지원
- ✅ Expo Push API는 플랫폼 독립적
- ✅ 추가 수정 불필요

---

### 4단계: 테스트

#### 4.1 안드로이드 빌드
- EAS Build로 안드로이드 빌드 생성
- 실제 디바이스에서 테스트

#### 4.2 알림 테스트
- 채팅 메시지 알림
- 모임 취소 알림
- 새 참여자 알림
- 좋아요/댓글 알림

---

## 📝 구체적인 작업 내용

### 작업 1: app.json Android 설정 업데이트

```json
{
  "expo": {
    "android": {
      "package": "com.runon.app",
      "versionCode": 5,  // 버전 코드 증가
      "permissions": [
        // 기존 권한들...
        "android.permission.POST_NOTIFICATIONS",  // Android 13+ 알림 권한 추가
        "android.permission.RECEIVE_BOOT_COMPLETED",  // 이미 있음
        "android.permission.VIBRATE",  // 이미 있음
        "android.permission.WAKE_LOCK"  // 이미 있음
      ],
      "googleServicesFile": "./google-services.json",  // Firebase 설정 파일 (필요시)
      "notification": {
        "icon": "./assets/notification-icon.png",  // 알림 아이콘 (선택사항)
        "color": "#3AF8FF",  // 알림 색상 (선택사항)
        "sound": "default"  // 알림 사운드 (선택사항)
      }
    }
  }
}
```

### 작업 2: 알림 채널 설정 (선택사항)

`expo-notifications`가 기본 채널을 자동 생성하지만, 커스텀 채널이 필요하면:

```javascript
// services/pushNotificationService.js에 추가 (선택사항)
import * as Notifications from 'expo-notifications';

// Android 알림 채널 설정
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('runon-notifications', {
    name: 'RunOn 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3AF8FF',
  });
}
```

---

## ✅ 체크리스트

### 필수 작업
- [ ] `app.json`에 `POST_NOTIFICATIONS` 권한 추가
- [ ] `app.json`의 `android.versionCode` 증가 (4 → 5)
- [ ] 안드로이드 빌드 생성 및 테스트
- [ ] 실제 디바이스에서 알림 권한 요청 확인
- [ ] 각 알림 타입별 테스트 (채팅, 모임, 커뮤니티)

### 선택 작업
- [ ] 커스텀 알림 채널 설정
- [ ] 알림 아이콘 추가
- [ ] 알림 색상 커스터마이징

---

## 🔍 확인 사항

### 1. Firebase 설정
- Google Services 파일이 올바르게 설정되어 있는지 확인
- EAS Build가 자동으로 처리하는지 확인

### 2. 알림 권한
- Android 13+ (API 33+)에서는 런타임 권한 요청 필요
- `expo-notifications`가 자동으로 처리

### 3. 알림 채널
- Android 8.0+ (API 26+)에서는 알림 채널 필요
- `expo-notifications`가 기본 채널 자동 생성

---

## 📱 테스트 방법

### 1. 로컬 테스트
```bash
# 안드로이드 빌드
eas build --platform android --profile production

# 또는 개발 빌드
eas build --platform android --profile development
```

### 2. 알림 테스트
1. 앱 설치 후 로그인
2. 알림 권한 요청 확인
3. 각 알림 타입별 테스트:
   - 다른 사용자가 채팅 메시지 전송
   - 모임 취소
   - 새 참여자 추가
   - 게시글 좋아요/댓글

---

## 🚨 주의사항

1. **Android 13+ (API 33+)**: `POST_NOTIFICATIONS` 권한이 필수입니다.
2. **알림 채널**: Android 8.0+에서는 알림 채널이 필요합니다.
3. **버전 코드**: 안드로이드 버전 코드를 증가시켜야 합니다.
4. **Firebase 설정**: Google Services 파일이 필요할 수 있습니다.

---

## 📚 참고 자료

- [Expo Notifications 문서](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Android 알림 권한 가이드](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- [Android 알림 채널 가이드](https://developer.android.com/develop/ui/views/notifications/channels)

---

*작성일: 2024년 11월 18일*

