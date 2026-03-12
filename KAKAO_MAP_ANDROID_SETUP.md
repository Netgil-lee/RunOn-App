# 카카오맵 Android 설정 가이드

## 📋 개요
Android에서 카카오맵이 표시되지 않는 문제를 해결하기 위한 설정 가이드입니다.

---

## ✅ 1. Android Studio 설정 (완료)

### 1.1 AndroidManifest.xml 설정
- ✅ `INTERNET` 권한 추가 완료
- ✅ `usesCleartextTraffic="true"` 추가 완료 (WebView를 위한 설정)

### 1.2 WebView 설정
- ✅ `screens/MapScreen.js` 및 `screens/ScheduleScreen.js` WebView 속성 추가:
  - `allowsInlineMediaPlayback={true}`
  - `mediaPlaybackRequiresUserAction={false}`
  - `mixedContentMode="always"`

---

## 🔑 2. 카카오 개발자 콘솔 설정 (필수)

### 2.1 Android 플랫폼 등록

카카오 개발자 콘솔(https://developers.kakao.com)에 로그인 후:

1. **내 애플리케이션** 선택
2. **앱 설정** > **플랫폼** 메뉴
3. **Android 플랫폼 등록** 클릭

### 2.2 입력해야 할 정보

#### 패키지명 (필수)
```
com.runon.app
```
- `app.json`의 `android.package` 값과 동일
- `android/app/build.gradle`의 `applicationId` 값과 동일

#### 마켓 URL
- **구글 플레이** 선택
- URL은 선택 사항 (나중에 추가 가능)

#### 키 해시 (필수)

**⚠️ 중요**: Google Play App Signing을 사용하는 경우, **앱 서명 키 SHA-1**을 반드시 등록해야 합니다!

다음 세 개의 키 해시를 각각 한 줄씩 입력하세요:

**1. 디버그 키 해시** (개발/테스트용):
```
0D:62:B3:93:3A:47:D8:DC:A2:EA:8F:99:F7:7B:42:BC:33:EF:DE:4B
```

**2. 업로드 키 해시** (AAB 업로드용):
```
02:48:73:8E:D2:E3:5E:BD:06:69:FB:9C:6E:4D:90:30:4C:F4:13:B8
```

**3. 앱 서명 키 해시** (구글 플레이 스토어 배포용) ⭐ **가장 중요**:
```
45:0A:1A:A7:9B:C8:C8:4E:15:AE:C1:68:0A:FB:2C:D4:A0:9C:BB:C2
```

> **핵심**: 
> - 에뮬레이터/디버그 빌드에서는 디버그 키 해시가 사용됩니다.
> - **구글 플레이 스토어를 통해 설치한 앱은 앱 서명 키로 서명되므로, 앱 서명 키 SHA-1 (`45:0A:1A:A7:9B:C8:C8:4E:15:AE:C1:68:0A:FB:2C:D4:A0:9C:BB:C2`)을 반드시 등록해야 합니다!**
> - 이것이 구글 플레이 스토어 앱에서 카카오맵이 표시되지 않는 주요 원인입니다.

> **참고**: 카카오 개발자 콘솔에는 콜론(:) 없이 입력하거나, 콜론 포함하여 입력할 수 있습니다.
> - 콜론 포함: `45:0A:1A:A7:9B:C8:C8:4E:15:AE:C1:68:0A:FB:2C:D4:A0:9C:BB:C2`
> - 콜론 제거: `450A1AA79BC8C84E15AEC1680AFB2CD4A09CBBC2`

**여러 개의 키 해시 등록 방법:**
- 각 키 해시를 한 줄씩 입력 (줄바꿈으로 구분)
- 또는 콤마로 구분하여 입력

---

## 🔍 3. 추가 확인 사항

### 3.1 카카오맵 API 키 확인
- 현재 API 키: `464318d78ffeb1e52a1185498fe1af08`
- 위치: `app.json` > `extra.kakaoMapApiKey`
- 카카오 개발자 콘솔에서 **JavaScript 키**를 사용해야 함

### 3.2 도메인 등록 확인
카카오 개발자 콘솔에서:
1. **앱 설정** > **플랫폼** > **Web 플랫폼**
2. **사이트 도메인**에 다음 추가:
   - `localhost` (개발용)
   - 실제 도메인이 있다면 추가

> **참고**: Android WebView는 `file://` 프로토콜을 사용하므로, Web 플랫폼 설정이 필요할 수 있습니다.

### 3.3 Android 네이티브 설정 확인

#### MainActivity.kt에 WebView 설정 추가 (필요시)
현재는 기본 설정으로 작동하지만, 문제가 지속되면 다음을 추가할 수 있습니다:

```kotlin
import android.webkit.WebView

// MainActivity.kt의 onCreate에 추가
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
    WebView.setWebContentsDebuggingEnabled(true)
}
```

---

## 🧪 4. 테스트 방법

### 4.1 디버그 빌드 테스트
1. 디버그 키 해시가 등록되었는지 확인
2. 디버그 빌드로 앱 실행
3. 카카오맵이 표시되는지 확인

### 4.2 릴리즈 빌드 테스트
1. 릴리즈 키 해시가 등록되었는지 확인
2. 릴리즈 빌드로 앱 실행
3. 카카오맵이 표시되는지 확인

---

## ⚠️ 5. 문제 해결

### 5.1 카카오맵이 여전히 표시되지 않는 경우

1. **키 해시 재확인**
   ```bash
   # 디버그 키 해시 확인
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
   
   # 릴리즈 키 해시 확인
   keytool -list -v -keystore android/app/upload-keystore.jks -alias upload -storepass runon2024! -keypass runon2024! | grep SHA1
   ```

2. **카카오 개발자 콘솔 확인**
   - Android 플랫폼이 등록되었는지 확인
   - 키 해시가 정확히 입력되었는지 확인
   - 저장 버튼을 눌렀는지 확인

3. **앱 재시작**
   - 카카오 개발자 콘솔 설정 변경 후 앱을 완전히 종료하고 재시작

4. **로그 확인**
   - Android Studio Logcat에서 "kakaoMapError" 검색
   - WebView 로드 오류 확인

### 5.2 WebView 오류 확인

Android Studio Logcat에서 다음 키워드로 검색:
- `WebView`
- `kakaoMapError`
- `ERR_`
- `Mixed Content`

---

## 📝 6. 체크리스트

- [ ] AndroidManifest.xml에 `usesCleartextTraffic="true"` 추가 완료
- [ ] WebView에 `mixedContentMode="always"` 추가 완료
- [ ] 카카오 개발자 콘솔에 Android 플랫폼 등록
- [ ] 패키지명 `com.runon.app` 입력
- [ ] 디버그 키 해시 등록
- [ ] 릴리즈 키 해시 등록
- [ ] 카카오맵 API 키 확인 (JavaScript 키 사용)
- [ ] 앱 재시작 후 테스트

---

## 📚 참고 자료

- [카카오 개발자 콘솔](https://developers.kakao.com)
- [카카오맵 API 가이드](https://apis.map.kakao.com/)
- [Android WebView 문서](https://developer.android.com/reference/android/webkit/WebView)

---

**작성일**: 2025-01-XX
**최종 업데이트**: 2025-01-XX

