# 홈 리디자인 구현 계획 (iOS)

> 작성: 2026-11-18 · `README.md` 스펙을 현재 코드(`latest-app-version`, 1.1.47 빌드 200)와 대조한 결과입니다.
> 상태: **계획 단계 — 코드 수정 전.** §3 결정 항목이 정해지면 단계별로 진행합니다.
> 2026-11-19: 사용자 메모 6건 반영 → 목업 `final-mockup-v2.html/png`, 결정 항목 D10~D15 추가.

## 1. 현재 홈 분석 (코드 확인 결과)

`screens/HomeScreen.js` 619줄. README §1의 진단은 코드와 일치합니다. 추가로 확인된 것:

| 항목 | 위치 | 내용 |
|---|---|---|
| Hooks 규칙 위반 | `HomeScreen.js:52` | 조기 return 뒤에 `useRef`/`useState`/`useEffect`가 이어짐 |
| 스크롤마다 리렌더 | `HomeScreen.js:76`, `onScroll` | `currentScrollOffset`은 읽는 곳이 없음 |
| 같은 문서 2번 읽기 | `fetchCommunityActivity` / `fetchUserProfile` | 둘 다 `users/{uid}`를 `getDoc` → 1번으로 합칠 수 있음 |
| 새로고침 1초 고정 지연 | `onRefresh` | `setTimeout(1000)` — 실제 작업과 무관 |
| 프로필 조회 | `fetchUserProfile` (약 90줄) | 상단바에서 프로필이 빠지면 Storage 이미지 조회까지 통째로 불필요 |
| 날씨 로직이 카드 안에 있음 | `components/WeatherCard.js` (834줄) | 위치·날씨·대기질 조회, 5분 주기 갱신, 경보 `Alert.alert`가 UI와 한 파일 |
| 안 쓰는 코드 | `notifications`, `getFilteredNotifications`, `getUnreadCount`, 핸들러 2개, `devToolbar*`·`eventsSection` 스타일 | 삭제 대상 |

## 2. 스펙과 실제 코드가 다른 점

스펙대로 만들 때 그대로는 안 되는 부분입니다. 각 항목의 처리 방향은 §3 결정에 따릅니다.

1. **배너 개수** — 목업은 `2 / 5`인데 `adBannerService.MAX_AD_BANNERS = 3`이고 대시보드도 활성 3개로 제한합니다. `fetchActiveAdBanners()`는 3개로 자른 뒤 반환하므로, `placement`를 추가하면 **자르기 전에 placement로 먼저 걸러야** 팝업용과 홈용이 서로 자리를 뺏지 않습니다.
2. **배너 문구** — `adBanners` 문서에는 `imageUrl`/`title`/`linkUrl`/`order`/`active`만 있습니다. 목업의 "파트너 · 런카페 반포점" + 큰 제목 2줄을 텍스트로 그리려면 필드가 더 필요합니다. 이미지에 문구를 넣어 올리면 필드 추가가 없습니다.
3. **모임 대표 이미지 없음** — 모임 문서에 이미지 필드가 없습니다(`title`, `location`, `date`, `time`, `pace`, `maxParticipants`, `customMarkerCoords`, `organizerImage` 등). ⑥ 카드의 이미지 자리는 목업처럼 색 타일+아이콘으로 그리거나 다른 값을 써야 합니다.
4. **모임 지역 정보 없음** — `한강/서울/경기` 칩을 나눌 필드가 없습니다. `location` 문자열(예: `반포한강공원`)과 좌표만 있습니다. 한강은 `utils/locationMapper.js`의 한강공원 10곳 이름으로 판별 가능하지만, 서울/경기는 좌표로 판정하는 로직이 새로 필요합니다.
5. **모임 날짜가 문자열** — `date`가 `2026-11-21` 형식과 `2026년 11월 21일` 형식이 섞여 있고, 이를 Date로 바꾸는 함수는 `functions/index.js`(`parseEventStartDateTime`)에만 있습니다. ④ D-day와 ⑥ "미래 모임" 판정을 위해 앱 쪽 유틸(`utils/eventDateTime.js`)을 새로 만들어야 합니다.
6. **주간 목표 없음** — 앱 어디에도 주간 거리 목표 값이 없습니다(검색 결과 0건). ⑤ 왼쪽 타일의 `/ 20km`는 새로 정의해야 합니다. 주간 합계는 `utils/runningStats.js`의 `getPeriodRange('week')` + `buildPeriodStats`(월요일 시작)를 그대로 씁니다.
7. **홈에서 HealthKit 조회** — `runningStatsService.loadAllWorkouts()`는 Apple Fitness도 조회합니다. 지금은 통계 화면에 들어갈 때만 실행되는데, 홈 타일에 쓰면 앱을 켤 때마다 실행됩니다. 권한 요청 창이 홈에서 뜨는지 **구현 전에 확인 필요**(뜨면 홈에서는 로컬 기록만 쓰거나 권한이 이미 있을 때만 조회).
8. **화면 이동 파라미터** — `Chat`은 `{ chatRoom }` 객체가 필요하고(`EventContext.chatRooms`에서 `eventId`로 찾음), `EventDetail`은 직렬화한 `event` 객체 + `isJoined` + `isCreatedByMe`가 필요합니다(`ScheduleScreen.js:728` 방식).
9. **탭바 스타일을 지도 화면이 덮어씀** — `MapScreen.js:554`, `:655`가 포커스 때마다 `navigation.setOptions({ tabBarStyle: { height: 85, ... } })`를 호출합니다. 알약 탭바로 바꾸면 이 두 곳을 지워야 합니다.
10. **하단 여백 하드코딩** — 홈 `80`, 커뮤니티 `100`(`CommunityScreen.js:1127`), 모임 `100`(`ScheduleScreen.js:3817`), 지도 `insets.bottom + 80`(`:1560`)·`bottom: 110`(`:2317`). 탭바가 떠 있게 되면 전부 한 상수 기준으로 다시 맞춥니다.
11. **`AppBar`는 삭제 불가** — `ProfileScreen.js:21`에서도 씁니다. 홈에서만 import를 뺍니다. (나머지 5개 컴포넌트는 홈에서만 쓰는 것이 맞습니다.)
12. **관리자 대시보드는 로컬에 있음** — `~/runon-admin-dashboard`의 `src/components/AdBannerManager.jsx`, `backend/server.js`. `placement` 필드는 아직 없습니다. 별도 저장소이므로 수정은 승인 후 따로 진행합니다.

## 3. 결정 항목 — 2026-11-19 전부 권장안으로 확정 (D15만 불투명도 20%로 변경)

| # | 항목 | 권장안 | 이유 |
|---|---|---|---|
| D1 | 상단바 지역명 `▾` 탭 | 현재 위치 다시 잡기 | 지역 선택은 스펙에 없는 새 기능 |
| D2 | ④ 다가오는 모임 없을 때 | 섹션 숨김 | README 기본값. 바로 아래 ⑥이 주변 모임을 보여줌 |
| D3 | ⑤ 주간 목표 출처 | 온보딩 레벨별 기본값(예: 초급 10 / 중급 20 / 고급 30km), 수정 UI는 후속 | 설정 화면이 스펙에 없음 |
| D4 | ⑥ 칩 분류 기준 | 한강 = 장소명에 한강공원 이름 포함, 서울/경기 = 모임 좌표의 행정구역 | 모임에 지역 필드가 없음 (§2-4) |
| D5 | ② `placement` 입력 | 대시보드 등록 폼에 `팝업 / 홈 배너 / 둘 다` 선택 추가 | 기존 문서는 `popup`으로 취급 |
| D6 | ⑤ 오른쪽 타일 탭 | `ScheduleTab` + `showMyJoined: true` | 이미 있는 파라미터, 새 화면 불필요 |
| D7 | ② 배너 문구 | 이미지에 문구 포함(이미지만 표시) | 필드·대시보드 입력란 추가 없음 (§2-2) |
| D8 | ② 홈 배너 개수 상한 | 팝업 3개 유지, 홈 배너는 별도 5개 | 목업 `2 / 5` (§2-1) |
| D9 | ⑥ 모임 카드 이미지 | 목업처럼 색 타일 + 아이콘 | 모임에 이미지 필드 없음 (§2-3) |
| D10 | ① 지역명 표시 형식 | 동 이름(`반포동`) | 실제 값은 `현재위치 - 역삼동 강남대로` 형식. `반포한강` 같은 공원 이름은 현재 데이터로 못 만듦 |
| D11 | ① `달리기 좋은 날` 칩에 미세먼지 반영 | 반영 (나쁨 이상이면 `마스크 챙기세요` 등으로 교체) | 현재 로직은 기온·강수확률만 봄 → 미세먼지 나쁨인데 `달리기 좋은 날`이 뜰 수 있음 |
| D12 | ③ 바로가기 아이콘 스타일 | A. 채운 아이콘 + 항목별 색 (`final-mockup-v2` 적용) | 벤치마크 앱 대부분이 항목별 색 아이콘. B(시안 단색)·C(선 아이콘) 후보는 목업 오른쪽 |
| D13 | ⑥ `더보기`·③ `모임 찾기` 이동 위치 | `MapTab`(모임 토글) | README는 `ScheduleTab`인데, 모임 탭 첫 화면은 메뉴 카드(새 모임 만들기·내가 만든·내가 참여한·종료된)라 모임 목록이 없음 |
| D14 | ⑦ `더보기` 이동 위치 | `MapTab` + `activeToggle: 'cafes'` | README에 정의 없음. 카페·푸드 전체 목록 화면이 따로 없음 |
| D15 | ⑧ 탭바 `80% 투명`의 의미 | **확정(2026-11-19): 불투명도 20% (뒤가 80% 비침)** + 블러 | 사용자 결정. 글자가 묻히지 않도록 `expo-blur`로 뒤를 흐림 |

### 목업 v2에 바로 반영한 것 (결정 불필요)
- ⑤ 타일 제목(`나의 러닝 · 이번 주`, `나의 모임 · 참여 목표`) 글자색 흰색
- ⑦ 카페·푸드 사진 세로 70 → 104
- ③ 아이콘은 `@expo/vector-icons`의 `MaterialCommunityIcons`(`run-fast`, `account-search`, `calendar-plus`, `coffee`, `chart-bar`) — Ionicons에는 달리기 아이콘이 없음

## 4. 구현 단계 (README §8 순서)

각 단계 끝에 시뮬레이터에서 다크/라이트 확인 후 다음 단계로 넘어갑니다.

### 1단계 · 알약 탭바 (앱 전체) — 코드 반영 완료(2026-11-19), 기기 확인 전
- 신규 `components/PillTabBar.js` — `Tab.Navigator`의 `tabBar` prop으로 넣는 커스텀 컴포넌트. 기존 `TabIconWithBadge`(채움/선 아이콘, 빨간 점) 재사용
- 신규 `constants/layout.js` — `TAB_BAR_HEIGHT`, `getTabBarBottomSpace(insets)` (떠 있는 탭바가 차지하는 높이)
- `navigation/AppNavigator.js` — `tabBarStyle` 블록 제거, `tabBar={(props) => <PillTabBar {...props} />}`
- `constants/colors.js` — 탭바 토큰 추가(다크/라이트): 컨테이너 배경, 테두리, 선택 캡슐, 선택 아이콘·라벨
- `screens/MapScreen.js` — `:554`, `:655` `setOptions({ tabBarStyle })` 삭제, `:1560`·`:2317` 여백 재계산
- `screens/CommunityScreen.js:1127`, `screens/ScheduleScreen.js:3817`, `screens/ProfileScreen.js` — 하단 여백을 `getTabBarBottomSpace` 기준으로
- 확인할 것: 모임 만들기 흐름·지도 바텀시트의 하단 버튼이 탭바에 가리지 않는지

### 2단계 · 홈 뼈대 + 버그 수정 + ① ③ ④ — 코드 반영 완료(2026-11-19), 기기 확인 전
- `screens/HomeScreen.js` — 조기 return을 Hook 뒤로, `onScroll`·안 쓰는 코드 삭제, `users/{uid}` 조회 1회로 통합, 프로필 조회 제거
- 신규 `hooks/useHomeWeather.js` — `WeatherCard`의 위치·날씨·대기질 조회와 5분 갱신을 옮김. 칩과 상세 시트가 조회 1번을 함께 사용
- 신규 `utils/weatherCondition.js` — `RecommendationCard.getWeatherCondition()` + 한글 문구 매핑
- 신규 `components/home/HomeTopBar.js` — 지역명, 검색, 알림(빨간 점), 칩 3개
- 신규 `components/home/WeatherDetailSheet.js` — 기존 `WeatherCard` 상세 UI를 바텀시트로 (`@gorhom/bottom-sheet`, 지도 화면에서 이미 사용)
- 신규 `components/home/HomeShortcuts.js` — 바로가기 5개
- `screens/ScheduleScreen.js` — `route.params.openCreateFlow`를 받아 `setShowCreateFlow(true)` 후 파라미터 비움 (`MapScreen`의 `setParams` 방식과 동일)
- 신규 `utils/eventDateTime.js` — 모임 `date`+`time` → Date, D-day 계산 (+ jest 테스트)
- 신규 `components/home/UpcomingEventStrip.js` — 가장 가까운 내 모임 1개, `채팅 ›`

### 3단계 · ② 배너 + ⑤ 2칸 타일 — 앱 코드 반영 완료(2026-11-19), 대시보드 `placement` 입력도 반영(배포 전)
- `services/adBannerService.js` — `fetchActiveAdBanners({ placement })`: placement로 먼저 거른 뒤 상한 적용. 필드 없는 문서 = `popup`
- 신규 `components/home/HomeHeroBanner.js` — 가로 넘김, `n / N` 카운터, 자동 넘김, 탭 시 `linkUrl` (`AdPopupModal.js:139` 로직을 공용 함수로 분리)
- 신규 `components/home/HomeStatTiles.js` — 왼쪽 주간 러닝(`runningStats` 유틸), 오른쪽 참여 목표(`InsightCard`의 `goalSteps`를 `utils/participationGoal.js`로 이동) + 매너 점수
- `constants/colors.js` — 모임 진행바 노랑, 배너 기본 배경 토큰
- (별도 저장소) `runon-admin-dashboard` — `placement` 입력·저장, 홈 배너 상한

### 4단계 · ⑥ 내 주변 모임 + ⑦ 카페·푸드 — 코드 반영 완료(2026-11-19)
- 신규 `components/home/NearbyEventsSection.js` — `allEvents` 중 종료 안 된 미래 모임을 현재 위치와의 거리순 정렬(좌표 계산은 앱 안에서, 지도 컴포넌트 사용 안 함), 칩 필터
- 신규 `components/home/CafeFoodSection.js` — `NewCafesList` + `MyDashboard` 통합, 칩 `신규 입점 · 자주 가는 곳`
- 신규 입점 조회는 홈에서 1번만 하고 ③의 `N` 배지와 ⑦이 함께 사용

### 5단계 · 정리 — 코드 반영 완료(2026-11-19)
- 삭제: `components/InsightCard.js`, `RecommendationCard.js`, `WeatherCard.js`, `MyDashboard.js`, `NewCafesList.js` (옮길 로직 이동 확인 후)
- 신규 `components/home/HomeSkeleton.js` — 카드 모양 로딩
- 날씨 경보 `Alert.alert` 반복 → 칩 강조로 변경
- `CLAUDE.md` 홈 관련 설명 갱신

## 5. 검증
- iOS 시뮬레이터 다크/라이트, iPhone SE 포함 (칩 한 줄, 말줄임)
- 신규 사용자(기록·모임 0개)와 기존 사용자 계정 각각
- 모든 탭에서 마지막 콘텐츠가 탭바에 가리지 않는지, 빨간 점 배지
- `npx jest` — `utils/eventDateTime`, `utils/participationGoal`, `utils/weatherCondition` 테스트 추가
- 광고 팝업이 기존과 똑같이 뜨는지 (placement 추가 후 회귀 확인)

## 6. 범위 밖
- Android 브랜치(`main`) — 별도 작업
- 버전 올리기 — 출시 시점에 `app.json` + `Info.plist` + `project.pbxproj` 3곳 동시
- 연속 기록(B안), 혜택함(C안), 주간 목표 수정 UI

## 7. 구현하면서 계획과 달라진 점 (2026-11-19)
- `WeatherCard.js`는 삭제하지 않고 표시 전용으로 바꿔 날씨 상세 시트에서 재사용 (별도 `HomeSkeleton` 대신 섹션별 자리 표시)
- 날씨 경보 팝업 제거는 2단계에서 함께 처리 (시트 안 목록으로 표시)
- 예전 '자주 찾는 모임장소'(MyDashboard)는 스펙에 없어 홈에서 빠짐. 기록 저장(`recordMeetingLocation`)은 그대로 둠
- 서울/경기 분류는 좌표 근사 경계(`utils/eventRegion.js`) — 시 경계 근처는 반대로 분류될 수 있음
- 홈 주간 러닝은 통계 화면과 같은 기록(HealthKit 포함)을 읽음 → 건강 권한을 한 번도 묻지 않은 사용자는 홈에서 권한 창이 뜰 수 있음
- 대시보드(`~/runon-admin-dashboard`)에 노출 위치(팝업 / 홈 배너) 전환과 위치별 활성 상한(팝업 3·홈 5) 추가 — `backend/server.js`, `src/components/AdBannerManager.jsx`. 수정 전 원본은 `backups-before-placement-20261119-194725/`. 서버·화면 배포는 별도로 해야 반영됨
- 홈 배너 이미지 비율: 정사각형 1:1(예: 1200×1200)로 확정 (사용자 결정, 2026-11-19). 앱 `HomeHeroBanner`와 대시보드 안내 문구 모두 반영
- 빈 섹션은 숨기지 않고 안내 카드 + 버튼을 보여줌 (사용자 결정 2026-11-19, D2 변경): 내 모임 띠·내 주변 모임 → '모임 만들기', 러닝카페·푸드 → '둘러보기'. 공용 컴포넌트는 `components/home/HomeSection.js`의 `EmptyCard`. 홈 배너만 예외로 등록된 광고가 없으면 숨김
- 바로가기 아이콘: A안 → B안(동그란 바탕 + 시안 한 가지 색)으로 변경 (사용자 결정 2026-11-19, D12 변경). 라이트 모드 아이콘은 진한 청록 `SHORTCUT_ICON`
