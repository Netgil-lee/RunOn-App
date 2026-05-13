# RunOn Android / iOS 포팅 — 에이전트·개발자 참고 메모

이 문서는 **iOS → Android 포팅** 및 **실제 이슈 해결** 과정에서 확인된 내용을 정리한 것이다.  
이후 동일 프로젝트에서 작업할 때 **우선 이 파일과** `.cursor/rules/ios-to-android-porting.mdc`를 함께 참고한다.

---

## 1. WebView(Kakao 지도) — RN → Web `postMessage`

- **현상:** 지도 탭에서 토글을 눌러도 마커가 안 바뀜.
- **원인:** Android `react-native-webview`는 RN이 보낸 메시지가 **`document`의 `message` 이벤트**로 올 수 있음. HTML이 **`window.addEventListener('message')`만** 쓰면 수신 실패.
- **조치:** 인라인 HTML/스크립트에서 **동일 핸들러를 `window`와 `document` 둘 다**에 등록.  
  적용 예: `screens/MapScreen.js`, `components/HanRiverMap.js`.
- **데이터 파싱:** `event.data`가 문자열이면 `JSON.parse`, 이미 객체면 그대로 사용하는 분기 권장.

---

## 2. 탭 화면 + `SafeAreaView` — 탭 바 위 **검은 띠**·콘텐츠 가림

- **현상:** 커뮤니티·모임 등 탭에서 **하단 탭 바 바로 위에 검은 영역**이 생기고, 스크롤 콘텐츠가 가려짐.
- **원인:** `SafeAreaView`에 **`edges={['top', 'bottom']}`**를 주면 하단 safe area가 **탭 바가 이미 쓰는 `insets.bottom`과 중복**되어 빈 공간(배경색)이 생김.
- **조치 (커뮤니티와 동일 패턴):**
  - `react-native-safe-area-context`의 **`SafeAreaView`** 사용.
  - **`edges={['top']}`만** 사용 (하단은 탭 네비게이터·`getTabBarInsetsStyle`에 맡김).
  - 하단 여백은 **`ScrollView`의 `contentContainerStyle`**에서  
    `paddingBottom: Math.max(최소값, insets.bottom + 여유)` 형태로 처리.
- **적용 파일 예:** `screens/CommunityScreen.js`, `screens/ScheduleScreen.js`.

---

## 3. 하단 탭 바 — 시스템 내비게이션과 겹침

- **원인:** 고정 `height: 85`, `paddingBottom: 36` 등은 iOS 홈 인디케이터 가정에 가깝고, Android **3버튼 내비** 높이를 반영하지 못함.
- **조치:** `constants/tabBarInsets.js`의 **`getTabBarInsetsStyle(insets, { withTopBorder })`** 사용.  
  `navigation/AppNavigator.js`의 `MainTabNavigator`에서 `useSafeAreaInsets()`로 `insets` 전달.  
  `MapScreen`의 `setOptions(tabBarStyle)`도 동일 헬퍼로 맞출 것.

---

## 4. Expo `[runtime not ready]` — `Property 'Platform' doesn't exist`

- **원인:** 모듈 **최상단**에서 `Platform.OS`로 분기해 `require`하거나, **`StyleSheet.create` 안에서 `Platform`** 사용 시, 네이티브 브릿지 준비 전에 평가될 수 있음.
- **조치 요약:**
  - **`config/firebase.js`:** Firebase `appId` 분기에 `react-native`의 `Platform` 대신 **`expo-constants`의 `Constants.platform?.android`** 등 사용.
  - **HealthKit(iOS):** `services/getAppleFitnessService.js` — `Constants.platform?.ios`로 판별 후 **지연 `require`**.  
    `ScheduleScreen`, `RunningTrackerScreen`, `AppIntroScreen`, `SettingsScreen`, `RunningShareModal` 등에서 **모듈 최상단 `Platform` + `require` 패턴 제거**.
  - **`StyleSheet.create`:** `Platform` 넣지 말고, iOS/Android용 **정적 스타일 분리** 후 JSX에서 `Platform.OS`로 선택 (예: `MapScreen` 토글·검색찉).
- **`RunningShareModal`:** `LayoutAnimation` 활성화는 모듈 로드 시 `Platform.OS === 'android'` 대신 **`Constants.platform?.android`** 사용.

---

## 5. 지도 상단 UI — Android에서 회색·박스 그림자

- **원인:** **`rgba` 배경 + `elevation`** 조합은 Android에서 회색 사각형처럼 보이는 경우가 많음. 투명 컨테이너에 `elevation`만 준 경우도 동일.
- **조치:** 지도 오버레이는 Android에서 **불투명 배경(`#1F1F24`)** + **`elevation: 0`** + 필요 시 얇은 테두리. iOS만 그림자 유지하는 패턴( `MapScreen` 스타일 참고).

---

## 6. 기타 규칙 파일

- 상세 체크리스트·SafeArea·StatusBar: **`.cursor/rules/ios-to-android-porting.mdc`**

---

## 변경 시 확인할 주요 파일 (빠른 점검)

| 주제 | 파일 |
|------|------|
| 탭 바 insets | `constants/tabBarInsets.js`, `navigation/AppNavigator.js` |
| 지도 WebView 메시지 | `screens/MapScreen.js`, `components/HanRiverMap.js` |
| 모임 탭 safe area | `screens/ScheduleScreen.js` |
| 커뮤니티 탭 safe area | `screens/CommunityScreen.js` |
| Firebase 초기화 OS | `config/firebase.js` |
| HealthKit 지연 로드 | `services/getAppleFitnessService.js` |

---

*마지막으로 이 문서를 반영한 주요 작업 시기: 2026년 5월 (대화 기준).*
