# 푸시 알림 기능 작동 확인 및 설정 체크리스트

## ✅ 현재 완료된 설정

### 1. 코드 레벨 설정 (완료)
- ✅ `Info.plist`에 `UIBackgroundModes` (remote-notification) 추가
- ✅ `Info.plist`에 `NSUserNotificationsUsageDescription` 추가
- ✅ `RunOn.entitlements`에 `aps-environment: production` 설정
- ✅ `app.json`에 iOS 알림 설정 추가
- ✅ `pushNotificationService.initialize()`가 `AuthContext`에서 호출됨
- ✅ Firebase Cloud Functions 배포 완료

### 2. Firebase 설정 (완료)
- ✅ Cloud Functions 배포 완료
- ✅ 서비스 계정 권한 확인 완료

## 🔍 확인 필요 사항

### 1. Apple Developer 설정

#### Push Notifications Capability 확인
1. [Apple Developer](https://developer.apple.com/) 접속
2. **Certificates, Identifiers & Profiles** 메뉴
3. **Identifiers** > **App IDs** 선택
4. `com.runon.app` 찾기
5. **Push Notifications**가 **Enabled** 상태인지 확인
   - ❌ 비활성화되어 있다면:
     - **Edit** 클릭
     - **Push Notifications** 체크박스 선택
     - **Save** 클릭

#### APNs 인증 키 확인 (Expo 자동 처리)
- Expo를 사용하는 경우, EAS Build가 자동으로 APNs 인증 키를 관리합니다.
- 별도 설정이 필요하지 않습니다.

### 2. Xcode 설정

#### Capabilities 확인
1. Xcode에서 프로젝트 열기
2. 프로젝트 네비게이터에서 **RunOn** 프로젝트 선택
3. **TARGETS** > **RunOn** 선택
4. **Signing & Capabilities** 탭 확인
5. 다음 Capabilities가 있는지 확인:
   - ✅ **Push Notifications** (자동으로 추가되어야 함)
   - ✅ **Background Modes** > **Remote notifications** 체크

#### Entitlements 확인
- `RunOn.entitlements` 파일에 다음이 있는지 확인:
  ```xml
  <key>aps-environment</key>
  <string>production</string>
  ```

### 3. App Store Connect 설정

#### 특별한 설정 필요 없음
- App Store Connect에서는 푸시 알림에 대한 별도 설정이 필요하지 않습니다.
- 앱 심사 시 자동으로 확인됩니다.

### 4. EAS Build 설정

#### eas.json 확인
- `eas.json`에 Push Notifications 관련 설정이 있는지 확인
- Expo SDK 49+ 버전에서는 자동으로 처리됩니다.

## 🧪 실제 작동 테스트 방법

### 1. 앱 설치 및 권한 확인
1. 실제 iOS 디바이스에 앱 설치
2. 앱 실행 시 알림 권한 요청 팝업 확인
3. **허용** 선택
4. iPhone 설정 > 알림 > RunOn에서 알림이 활성화되어 있는지 확인

### 2. 채팅 메시지 알림 테스트
1. 두 개의 계정으로 로그인 (디바이스 A, 디바이스 B)
2. 디바이스 A에서 디바이스 B에게 채팅 메시지 전송
3. 디바이스 B가 백그라운드 또는 종료 상태에서 알림 수신 확인

### 3. 모임 취소 알림 테스트
1. 모임 생성 및 참여
2. 모임 삭제
3. 참여자 디바이스에서 알림 수신 확인

### 4. 로그 확인
```bash
# Firebase Functions 로그 확인
firebase functions:log --only onChatMessageCreated

# 앱 로그 확인 (Xcode Console 또는 React Native Debugger)
```

## ⚠️ 주의사항

### 1. 시뮬레이터 vs 실제 디바이스
- ⚠️ **시뮬레이터에서는 푸시 알림이 작동하지 않습니다**
- ✅ **반드시 실제 iOS 디바이스에서 테스트해야 합니다**

### 2. Development vs Production
- 현재 `aps-environment`가 `production`으로 설정되어 있습니다.
- App Store에 배포된 앱에서는 정상 작동합니다.
- 개발 중 테스트를 위해서는:
  - Development 빌드: `aps-environment: development`
  - Production 빌드: `aps-environment: production` (현재 설정)

### 3. Expo Push Token 확인
- 앱 실행 후 Firestore의 `users/{userId}` 문서에서 `expoPushToken` 필드 확인
- 토큰이 저장되어 있어야 서버에서 알림을 보낼 수 있습니다.

## 🔧 문제 해결

### 알림이 오지 않는 경우

1. **알림 권한 확인**
   - iPhone 설정 > 알림 > RunOn
   - 알림 허용 상태 확인

2. **Expo Push Token 확인**
   - Firestore에서 사용자 문서의 `expoPushToken` 필드 확인
   - 토큰이 없으면 `pushNotificationService.initialize()`가 실행되지 않은 것

3. **Cloud Functions 로그 확인**
   ```bash
   firebase functions:log
   ```
   - 함수 실행 여부 확인
   - 오류 메시지 확인

4. **앱 로그 확인**
   - Xcode Console에서 `📱 푸시 알림 서비스 초기화 완료` 메시지 확인
   - 오류 메시지 확인

5. **Firestore 트리거 확인**
   - 채팅 메시지가 실제로 Firestore에 저장되는지 확인
   - `chatRooms/{chatRoomId}/messages/{messageId}` 문서 생성 확인

## 📋 최종 체크리스트

- [ ] Apple Developer에서 Push Notifications Capability 활성화 확인
- [ ] Xcode에서 Push Notifications Capability 확인
- [ ] 실제 iOS 디바이스에서 앱 설치 및 알림 권한 허용
- [ ] Firestore에서 `expoPushToken` 저장 확인
- [ ] 실제 채팅 메시지 전송 테스트
- [ ] 백그라운드/종료 상태에서 알림 수신 확인
- [ ] Cloud Functions 로그에서 함수 실행 확인

## 📚 참고 자료

- [Expo Notifications 문서](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Functions 문서](https://firebase.google.com/docs/functions)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)

