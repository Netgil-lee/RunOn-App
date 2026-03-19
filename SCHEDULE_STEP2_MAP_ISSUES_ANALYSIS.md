# 모임생성 2단계 지도/장소검색 프로덕션 이슈 원인 분석

프로덕션에서 보고된 세 가지 현상과 그 원인을 코드 기준으로 정리한 문서입니다.

---

## 문제 1. 2단계 진입 시 지도가 서울시청으로만 보임 (현재위치로 나와야 함)

### 원인

1. **초기 상태가 서울시청으로 고정**
   - `selectedLocationData` 초기값이 `{ name: '서울시청', lat: 37.5665, lng: 126.9780 }` 입니다.
   - 2단계에 처음 들어올 때 지도 HTML은 이 값으로 한 번 생성됩니다.

2. **지도 HTML이 한 번만 생성됨**
   - `InlineKakaoMapComponent` 안에서 `webViewSource = useMemo(() => ({ html: createInlineMapHTML() }), [])` 로 **빈 의존성 배열**을 사용합니다.
   - 따라서 **최초 마운트 시점의 center(서울시청)** 로 만든 HTML만 계속 쓰이고, 이후 GPS로 `selectedLocationData`가 바뀌어도 **WebView의 HTML은 갱신되지 않습니다.**

3. **현재위치로 옮기려면 `moveMapToLocation`에만 의존**
   - GPS를 받은 뒤 지도를 현재위치로 옮기는 방법은 **HTML을 바꾸는 게 아니라** `moveMapToLocation(gpsLocation)` 호출뿐입니다.
   - 이 호출은 두 군데서 일어납니다.
     - 지도 로드 완료 시 `onMapLoaded` → `moveMapToLocation(gpsLocation.lat, gpsLocation.lng, false)`
     - `gpsLocation`이 바뀌었을 때 `useEffect` → `moveMapToLocation(gpsLocation.lat, gpsLocation.lng, false)`

4. **프로덕션에서 실제로 깨지는 지점 (Android)**
   - Android에서는 `moveMapToLocation`이 **`postMessage`가 아니라 `injectJavaScript`** 로 WebView 안의 `window.__runOnMoveToLocation`을 호출합니다.
   - `__runOnMoveToLocation`은 카카오맵 SDK 로드 후 `initializeMap()` 안에서만 정의됩니다.
   - 프로덕션(실기기)에서는 SDK 로딩/WebView 준비가 느려서:
     - 지도 로드가 늦게 끝나면, GPS는 먼저 도착하고 `inlineMapLoadedRef`가 아직 false라서 `onMapLoaded`에서의 이동이 실행되지 않을 수 있고,
     - 또는 `gpsLocation` useEffect 실행 시점에 `__runOnMoveToLocation`이 아직 없어서, 50회×100ms 재시도만 하고 실패할 수 있습니다.
   - 그 결과 **항상 서울시청으로 그려진 첫 HTML만 보이고, “현재위치로 이동”이 실행되지 않은 것처럼 보입니다.**

### 요약

- **구조적 원인**: 초기 지도는 서울시청 기준 HTML 1회 생성, 현재위치 반영은 전적으로 `moveMapToLocation`(JS 주입)에 의존.
- **프로덕션에서 드러나는 원인**: Android에서 `injectJavaScript`로 호출하는 시점에 `__runOnMoveToLocation`이 아직 없거나, 지도 로드 완료 전에만 GPS가 반영되어 이동 로직이 실행되지 않음.

---

## 문제 2. 현재위치 버튼 클릭 시 지도탭처럼 “현재위치 표시”가 아니라 노란색 마커만 보임

### 원인

- **지도탭(MapScreen)**  
  - “현재위치” 전용 **파란 원형 마커**가 따로 있고, `updateCurrentLocation` 메시지로 표시/갱신합니다.
- **2단계 인라인 지도(InlineKakaoMapComponent)**  
  - **현재위치 전용 마커(파란 점)가 없습니다.**
  - 있는 것은 (1) **노란색 “선택된 장소” 마커** 하나, (2) 지도 클릭 시 **빨간 “상세 위치” 마커** 뿐입니다.
- 현재위치 버튼을 누르면 `moveToCurrentLocation` → `moveMapToLocation(gpsLocation.lat, gpsLocation.lng, false)` 가 호출되고,
- `__runOnMoveToLocation(lat, lng, false, ...)` 에서 `addMarker === false` 이므로 **노란 마커를 해당 좌표로 옮기는 동작만** 합니다 (`marker.setPosition(pos)` 등).
- 즉, “현재위치 전용” 시각 요소는 구현되어 있지 않고, **같은 노란 마커가 현재 좌표로 이동**하기 때문에 “검색해서 나오는 노란 마커가 나타난다”고 느껴지는 것입니다.

### 요약

- **원인**: 2단계 인라인 지도에는 “지도탭 같은 현재위치 표시(파란 점)” UI가 없고, 현재위치 버튼은 “선택된 장소” 노란 마커를 현재 좌표로 옮기는 것만 하기 때문.

---

## 문제 3. 장소 검색 후 해당 위치로 지도가 이동하지 않음

### 원인

1. **검색 결과 선택 시 흐름**
   - `handleLocationSearchResultSelect(result)` 에서
     - `setSelectedLocationData({ name, lat, lng, address })` 로 상태 갱신
     - `requestAnimationFrame(() => moveMapToLocation(locationLat, locationLng, false, locationName))` 로 지도 이동 요청

2. **Android에서의 이동 방식**
   - iOS: `postMessage(JSON.stringify({ type: 'moveToLocation', lat, lng, ... }))` → WebView가 메시지 수신 후 `__runOnMoveToLocation` 호출.
   - Android: **`injectJavaScript`** 로 WebView 내부에서 곧바로 `window.__runOnMoveToLocation(lat, lng, addMarker, locationName)` 를 호출하는 스크립트를 실행합니다.

3. **프로덕션에서 실패할 수 있는 지점**
   - `__runOnMoveToLocation` 은 카카오맵 SDK가 로드된 뒤 `waitForKakaoSDK()` → `initializeMap()` 안에서만 정의됩니다.
   - inject되는 스크립트는 “지금 당장” 실행되므로, **실행 시점에 `window.__runOnMoveToLocation` 이 아직 없으면** 호출이 불가능합니다.
   - 현재는 “최대 50회, 100ms 간격” 재시도로 약 5초까지 기다리지만,
     - 프로덕션 실기기에서 SDK/네트워크가 느리면 5초 안에 정의되지 않을 수 있고,
     - 또는 WebView/스크립트 컨텍스트 문제로 `injectJavaScript` 실행 자체가 실패하거나, 다른 페이지로 바뀐 뒤 주입되는 등 타이밍 이슈가 있을 수 있습니다.
   - 그 결과 **검색으로 위치는 선택되지만, “해당 위치로 지도 이동”이 실행되지 않아** 지도가 움직이지 않는 것처럼 보입니다.

### 요약

- **원인**: Android에서 “지도 이동”이 **injectJavaScript 한 번에 의존**하고, 그 시점에 `__runOnMoveToLocation` 이 없거나 실행이 실패하는 경우가 프로덕션에서 발생하고 있음.

---

## 세 가지 문제의 공통점

- **1번·3번**: Android에서 지도 제어가 **`injectJavaScript` + `__runOnMoveToLocation`** 에만 의존하는데, 카카오맵 SDK 비동기 로드/WebView 준비와의 **타이밍이 프로덕션에서 어긋나거나** 재시도로도 커버되지 않음.
- **2번**: 2단계 인라인 지도에 **“현재위치 전용” 마커(파란 점)** 가 없어, 현재위치 버튼을 눌러도 노란 “선택된 장소” 마커만 움직이는 것이 정상 동작으로 구현되어 있음.

이 문서는 원인 확인용이며, 수정 방안(예: postMessage 통일, 현재위치 마커 추가, 재시도/대기 강화 등)은 별도로 적용하면 됩니다.
