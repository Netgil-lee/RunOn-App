# 장소 선택 지도 개선 계획

## 개요

모임 생성 2단계의 장소 선택 플로우에서 WebView 지도 복잡성과 오류를 줄이기 위한 개선 계획입니다.

**핵심 원칙**: 지도는 "명령만 받는 뷰"로, 상태는 React에만 유지

---

## 현재 복잡성 원인

| 원인 | 설명 |
|------|------|
| 양방향 동기화 | React state ↔ WebView 내부 상태를 맞추려다 보니 경로가 여러 개 생김 |
| HTML에 상태 반영 | selectedLocation, customMarkerCoords, hasCustomMarker를 HTML에 넣다 보니 상태 변경 시마다 source가 바뀌고 WebView가 리로드됨 |
| 타이밍 의존 | WebView 로드 완료 시점에 따라 injectJavaScript가 동작하지 않을 수 있음 |
| 컴포넌트 위치 | InlineKakaoMapComponent가 부모 내부에 있어 리렌더 시마다 새 타입으로 인식되어 불필요한 리마운트 발생 |

---

## 개선 방안

### A. HTML 고정
- HTML = 고정 (서울 중심, 기본 마커만)
- 로드 완료 시 postMessage('loaded')
- RN이 필요 시 moveMapToLocation 등으로 지도 제어

### B. 단일 명령 인터페이스
- moveMapToLocation({ lat, lng, locationName, removeCustomMarker })
- removeCustomMarker: 검색 결과 선택 시 기존 빨간 마커 제거

### C. InlineKakaoMapComponent를 모듈 레벨로 분리
- 부모 리렌더 시 컴포넌트 타입이 바뀌지 않아 불필요한 리마운트 방지

### D. 이벤트 흐름 단순화
- 지도 클릭 → postMessage('markerAdded', lat, lng)
- 검색 결과 선택 → moveMapToLocation(lat, lng, { removeCustomMarker: true })

---

## 구현 순서 및 체크리스트

| 순서 | 작업 | 상태 |
|------|------|------|
| 1 | InlineKakaoMapComponent를 부모 밖으로 이동 | ✅ |
| 2 | HTML에서 customMarkerCoords 제거, 로드 후 inject로 복원 | ✅ |
| 3 | __runOnMoveToLocation에 removeCustomMarker 처리 추가 | ✅ |
| 4 | (선택) moveMapToLocation을 단일 옵션 객체로 통합 | ⬜ |

---

## 진행 상황

- [x] 1단계 완료 (InlineKakaoMapComponent 모듈 레벨 분리)
- [x] 2단계 완료 (HTML 고정, onMapLoaded에서 커스텀 마커 복원)
- [x] 3단계 완료 (addMarker=false 시 빨간 마커 제거)
- [ ] 4단계 완료 (선택, 미적용)

---

## 🔴 Android 프로덕션에서 확인된 이슈 (2026-03-12)

> iOS 프로젝트에서 기능을 가져올 때 발생한 문제. **프로덕션 Android 빌드에서 실제 재현 확인됨.**

### 이슈 A: MapScreen — 현재 위치 마커 자동 표시 안 됨

**iOS**: GPS가 잡히면 자동으로 현재 위치 마커가 지도에 나타남 (별도 버튼 불필요)
**Android**: 현재 위치 마커가 자동으로 나타나지 않음 (수동으로 현재위치 버튼을 눌러야만 표시)

**원인**: `currentLocation` 비동기 업데이트 → WebView 전송 `useEffect` 누락
- `useFocusEffect`에서 `getCurrentLocation()`을 비동기 호출
- WebView `mapLoaded` 시점에 `currentLocation`이 아직 null (GPS 응답이 WebView 로드보다 늦음)
- `currentLocation`이 나중에 set되어도 WebView에 `updateCurrentLocation`을 전송하는 `useEffect`가 없음
- 기존 동기화 useEffect는 `[events, cafes, activeToggle]`만 감시 → `currentLocation` 미포함

**수정 방향**: `currentLocation` 변경을 감시하는 `useEffect` 추가 → WebView에 `updateCurrentLocation` 전송

### 이슈 B: ScheduleScreen 2단계 — 현재 위치 미표시 + 장소 검색 후 지도 이동 안 됨

**iOS**: 2단계 지도에서 현재 위치 자동 표시, 장소 검색 결과 선택 시 해당 위치로 지도 이동
**Android**: 현재 위치 표시 안 됨, 장소 검색 후 지도가 해당 위치로 이동하지 않음

**원인**:
1. MapScreen과 동일한 레이스 컨디션 (GPS 응답 vs WebView 로드 타이밍)
2. `moveMapToLocation()`에서 Android용 `injectJavaScript` → `window.__runOnMoveToLocation()` 호출 시,
   카카오맵 SDK가 아직 비동기 로딩 중이면 함수가 undefined → 재시도(50×100ms)로도 해결 안 되는 경우 있음
3. iOS는 `postMessage` 방식이라 WebView 준비 후 자연스럽게 처리되지만,
   Android는 `injectJavaScript` 방식이라 타이밍에 민감

### ⚠️ iOS→Android 포팅 시 필수 확인 사항

| # | 항목 |
|---|------|
| 1 | `currentLocation` → WebView 동기화 `useEffect` 존재 여부 |
| 2 | WebView 메시지 리스너: `window` + `document` 둘 다 등록 |
| 3 | Android에서 `injectJavaScript` 사용 시 카카오맵 SDK 로드 완료 확인 |
| 4 | `useMemo(() => ..., [])` 빈 deps에 `currentLocation` 의존하는지 확인 |
| 5 | Kakao REST API 키 ≠ JavaScript 키인지 확인 (fallback 값 주의) |
