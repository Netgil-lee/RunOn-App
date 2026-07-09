# 안드로이드 프로젝트에 푸시 알림 기능 적용 프롬프트

## 📋 프롬프트 내용

다음 프롬프트를 안드로이드 프로젝트에서 사용하세요:

---

```
안드로이드 프로젝트에 iOS 프로젝트의 푸시 알림 기능을 cherry-pick으로 적용하고 싶습니다.

현재 상황:
- iOS 프로젝트: RunOn-App (Production_iOS) - 푸시 알림 기능 구현 완료
- 안드로이드 프로젝트: RunOn-App (Production_android) - 푸시 알림 기능 미구현
- 두 프로젝트는 같은 GitHub 저장소(https://github.com/Netgil-lee/RunOn-App.git)를 사용합니다

Cherry-pick 대상 커밋 (순서대로):
1. a72ce87 - "feat: 푸시 알림 권한 설정 추가 및 서버 기반 알림 시스템 준비"
2. 9a0adaa - "feat: 서버 기반 푸시 알림 시스템 구현"
3. 538ae31 - "feat: 버전 1.0.2 업데이트 및 안드로이드 푸시 알림 지원"

적용해야 할 주요 파일:
- services/pushNotificationService.js (푸시 알림 서비스 핵심)
- contexts/AuthContext.js (푸시 알림 초기화)
- contexts/NotificationSettingsContext.js (Firestore 동기화)
- contexts/CommunityContext.js (getPostById async 변경)
- screens/ChatScreen.js (클라이언트 알림 제거)
- screens/NotificationScreen.js (async 처리 및 게시글 조회 개선)
- screens/PostDetailScreen.js (클라이언트 알림 제거)
- functions/index.js (Firebase Cloud Functions)
- functions/package.json (expo-server-sdk 추가)
- app.json (안드로이드 알림 설정만 적용, iOS 설정은 제외)

주의사항:
1. app.json에서 iOS 설정(ios.buildNumber, ios.infoPlist)은 변경하지 말고, Android 설정만 적용
2. iOS 전용 파일(ios/RunOn/Info.plist, ios/RunOn/RunOn.entitlements)은 제외
3. 충돌 발생 시 iOS 프로젝트의 변경사항을 참고하여 해결

작업 순서:
1. 현재 안드로이드 프로젝트 상태 확인
2. 원격 저장소에서 최신 커밋 가져오기
3. 순서대로 cherry-pick 실행 (a72ce87 → 9a0adaa → 538ae31)
4. 충돌 발생 시 해결
5. app.json에서 iOS 설정 제외하고 Android 설정만 적용 확인
6. 테스트 및 커밋

진행해주세요.
```

---

## 📝 사용 방법

1. 안드로이드 프로젝트 디렉토리로 이동
2. 위의 프롬프트를 복사하여 AI 어시스턴트에 붙여넣기
3. AI가 cherry-pick을 자동으로 실행하고 충돌을 해결

---

## 🔍 추가 확인 사항

Cherry-pick 후 다음을 확인하세요:

1. **app.json 확인**
   - `android.permissions`에 `POST_NOTIFICATIONS` 추가되었는지
   - `android.notification` 설정 추가되었는지
   - iOS 설정은 변경되지 않았는지

2. **코드 파일 확인**
   - `services/pushNotificationService.js`가 플랫폼 독립적으로 작성되었는지
   - `contexts/AuthContext.js`에 `pushNotificationService.initialize()` 호출이 있는지

3. **Firebase Cloud Functions**
   - `functions/index.js`에 푸시 알림 함수들이 있는지
   - `functions/package.json`에 `expo-server-sdk`가 추가되었는지

---

*작성일: 2024년 11월 18일*

