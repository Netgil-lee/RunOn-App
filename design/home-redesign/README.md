# 홈 화면 리디자인 구현 스펙 (iOS)

> 작성: 2026-11-18 · Claude Code 데스크톱 세션에서 사용자와 함께 확정한 내용을 정리한 문서입니다.
> 대상: **iOS 코드베이스만** (`/Users/lee_mac/RunOn-App (Production_iOS)`, 브랜치 `latest-app-version`).
> Android(`RunOn-App (Production_android)`, `main` 브랜치)는 별도 코드베이스이므로 이 스펙을 그대로 복붙하지 말 것.

## 0. 이 폴더의 파일

| 파일 | 내용 |
|---|---|
| `README.md` | 이 문서. 분석 → 결정 → 구현 스펙 |
| `PROMPT.md` | 터미널 Claude Code 세션을 시작할 때 넣는 첫 지시문 |
| `final-mockup.html` | **최종 확정 목업.** 브라우저로 열어 확인 (다크 홈 + 오른쪽에 ⑤ 칸 후보, 라이트 모드 탭바) |
| `final-mockup.png` | 위 HTML을 렌더링한 이미지 (Claude가 Read 도구로 바로 볼 수 있음) |
| `references/user-selection-red-boxes.png` | 사용자가 앞선 목업 2개에서 "넣고 싶은 부분"을 빨간 네모로 표시한 원본 |
| `references/baemin-pill-tabbar.png` | 탭바 참고 이미지 (배민 알약형 탭바) |

목업 속 이미지·이름·숫자(런브루, 12.4km 등)는 전부 예시 값입니다.

---

## 1. 현재 홈 분석 (변경 전)

진입: `screens/HomeScreen.js` → `navigation/AppNavigator.js`의 `HomeTab`

현재 위→아래 구성:
1. `components/AppBar.js` — 프로필 사진+닉네임 / 검색·알림(빨간 점)·설정
2. `components/InsightCard.js` — 모임참여 목표 진행바(5→10→15… 단계), 선호 코스·시간(온보딩 값)
3. `components/RecommendationCard.js` — RUNNING Lv / WEATHER 태그, 추천 거리·시간·페이스 (온보딩+날짜+날씨로만 계산, 실제 기록 미반영)
4. `components/WeatherCard.js` — 위치·기온·시간별 예보·대기질 (화면 많이 차지, 주기적 갱신, 경보는 `Alert.alert`)
5. `components/MyDashboard.js` — 자주 찾는 러닝카페/러닝푸드/모임장소 (빈 상태 3개가 자주 노출)
6. `components/NewCafesList.js` — 최근 1개월 신규 입점 카페/푸드
7. `components/AdPopupModal.js` — 콜드스타트 1회 광고 팝업 (`adBanners` 컬렉션)

문제점:
- 러닝 앱인데 홈에 **러닝 시작·내 기록·다가오는 모임이 없음**. 러닝 시작은 `MapScreen.js:452`에서만, 통계는 `ScheduleScreen.js:1112`에서만 진입.
- 인사이트/추천 카드는 온보딩 값 기반이라 매일 거의 같은 내용.
- **버그①** `InsightCard.getPreferredCourse()`가 렌더마다 `Math.random()`으로 코스를 고름 + `HomeScreen`의 `onScroll`이 매 스크롤마다 `setCurrentScrollOffset`으로 리렌더 → 선호 코스가 2개 이상이면 스크롤 중 코스 이름이 바뀜(실화면 미확인). `currentScrollOffset`은 어디에도 안 쓰임.
- **버그②** `HomeScreen.js:52` 컨텍스트 미초기화 시 조기 return이 이후 `useRef`/`useState`보다 앞에 있음 → Hooks 규칙 위반.
- 안 쓰는 코드: `notifications`/`getFilteredNotifications`/`getUnreadCount`, "곧 추가됩니다" 핸들러 2개(`handleViewAllEventsPress`, `handleRecommendationPress`), `devToolbar*`/`eventsSection` 등 스타일.
- 로딩은 "홈 화면을 불러오는 중..." 텍스트뿐(스켈레톤 없음).
- 칩 글자가 두 줄로 깨지는 문제(목업 단계에서 발견) → 칩 텍스트는 `numberOfLines={1}` 필수.

## 2. 벤치마크 분석 요약 (사용자 제공 12개 화면 = 11개 앱)

앱: 쿠팡, 레저레디(2장), 다짐, 우리동네GS, 캐치테이블, 배민, 요기요, 오붓, 여기어때, 펫 쇼핑앱(고양이 선택 화면), 무신사

| 패턴 | 쓰는 앱 |
|---|---|
| 상단 큰 배너 + 넘기기(n/N 또는 점) | 11개 중 10개 |
| 바로가기 아이콘 줄(1줄 5개, 1~2줄) | 쿠팡·레저레디·다짐·캐치테이블·배민·요기요·오붓·여기어때·펫·무신사 |
| 상단바 위치 표시 | 다짐·배민·요기요·캐치테이블·펫 |
| 개인화 카드(나만의 ○○, 회원님 추천, 관심사 설정) | GS·레저레디·오붓·여기어때·요기요 |
| 떠 있는 요소(알약 탭바, 가운데 버튼, AI 버튼) | 레저레디·배민·GS·오붓·무신사 |
| 벤토 타일 / 2칸 타일 | 다짐·GS |
| '제목 + 더보기 ›' 가로 카드 줄 + 칩 필터 | 쿠팡·레저레디·오붓 |

가장 가까운 경쟁 사례: 레저레디(아이콘에 러닝·운동모임). GS 첫 배너가 "러너를 위한 전해질" 광고 → 러너 대상 광고 수요 근거.

## 3. 결정 과정 (요약)

1. 첫 제안(포털형): 상단바+날씨칩 / 배너 / 바로가기 / 다가오는 내 모임(큰 카드) / 이번 주 내 러닝(큰 카드) / 내 주변 모임 / 러닝카페·푸드
2. 벤치마크 밖 앱(NRC·스트라바·당근) 기반 대안 → **사용자 요청으로 제외** ("12개 벤치마크 분석 기반이어야 함")
3. 벤치마크 기반 3안(벤토형·히어로형·혜택형) → 첫 제안의 섹션별 대체안 목업
4. **사용자가 두 목업에서 빨간 네모로 최종 선택** (`references/user-selection-red-boxes.png`):
   - 첫 제안에서: ① 상단바(날씨 칩 3개) + ② 배너 + ③ 바로가기(모임 만들기 포함), ⑥ 내 주변 모임 + ⑦ 러닝카페·푸드
   - 대체안에서: ④ 한 줄 내 모임 띠 + ⑤ 2칸 타일, 알약 탭바
   - ⑤ 오른쪽 칸("우리 크루")은 **다른 요소로 교체** 요청 → **A. 나의 모임·참여 목표** 적용
   - 탭바는 **배민 알약형 느낌**으로 (`references/baemin-pill-tabbar.png`)
   - 선택하지 않은 것: 검색창(상단바 아래), 배너 '광고' 표시, 한강 코스 아이콘, 큰 내 모임 카드, 큰 주간 러닝 카드, 다짐 안내 배너, 신규 입점 원형 아이콘 줄

## 4. 최종 홈 구성 (확정 스펙)

`final-mockup.html` 기준, 위→아래:

### ① 상단바
- 왼쪽: 현재 지역명 `반포한강 ▾` — WeatherCard가 이미 쓰는 위치(`location.name`, expo-location 역지오코딩) 재사용
- 오른쪽: 검색(`navigate('Search')`), 알림(`navigate('Notification')`, 기존 `unreadCount` 빨간 점 유지)
- 아래 칩 3개(가로 한 줄, `numberOfLines={1}`):
  - `☀ 12° 맑음` — 기온+날씨 아이콘
  - `미세먼지 좋음` — 등급별 색 (좋음 `#00FF88` 계열)
  - `달리기 좋은 날` — `RecommendationCard.getWeatherCondition()`(PERFECT/GOOD/HOT/COLD/RAINY) 로직을 한글 문구로 매핑
- 칩 탭 → 기존 WeatherCard 상세(예보·대기질)를 바텀시트로 표시
- 기존 AppBar의 프로필 사진·닉네임·설정 아이콘은 홈 상단바에서 제거 (설정은 `ProfileScreen`에서도 진입 가능 — 확인됨)

### ② 히어로 배너
- 데이터: 기존 `adBanners` 컬렉션 + `services/adBannerService.js` 재사용 (`active`, `order`, `imageUrl`, `linkUrl`)
- 팝업용/홈 배너용 구분 필드 추가 제안: `placement: 'popup' | 'home' | 'both'` — **필드 없는 기존 문서는 `popup`으로 취급**해 현재 팝업 동작 유지
- 우하단 `2 / 5` 카운터, 자동 넘김 주기는 `fetchAdRotationIntervalMs()` 재사용
- 탭 → `linkUrl` 열기 (`AdPopupModal.js:139` 로직 재사용)
- 배너 0개면 섹션 숨김
- 관리자 대시보드 쪽 `placement` 입력 UI는 이 레포 밖일 수 있음 → 확인 필요

### ③ 바로가기 5개 (1줄)
| 아이콘 | 이동 |
|---|---|
| 러닝 시작 (시안 채움, 강조) | `navigate('RunningTracker')` |
| 모임 찾기 | `navigate('ScheduleTab')` |
| 모임 만들기 | ScheduleScreen의 생성 흐름은 내부 상태(`showCreateFlow`)라 라우트가 없음 → `navigate('ScheduleTab', { openCreateFlow: true })` 파라미터를 받아 `setShowCreateFlow(true)` 하도록 추가 |
| 러닝카페 (+ `N` 배지) | `navigate('MapTab', { activeToggle: 'cafes' })`. `N`은 최근 신규 입점(`firestoreService.getNewCafes`) 있을 때 |
| 내 기록 | `navigate('RunningStats')` |

### ④ 다가오는 내 모임 (한 줄 띠)
- 데이터: `EventContext`의 `userJoinedEvents` + `userCreatedEvents`, 종료 안 된 미래 모임 중 가장 가까운 1개
- 표시: `D-1` 배지(당일은 `오늘` 또는 시간), 제목(말줄임), `토 07:00 · 장소`, 오른쪽 `채팅 ›`
- 탭 → `EventDetail`, `채팅 ›` → 해당 모임 채팅방(`Chat`)
- 모임이 없으면 섹션 숨김 (기본값, §7 결정 필요)

### ⑤ 2칸 타일
- **왼쪽 · 나의 러닝 · 이번 주**: 이번 주(월~일) 누적 거리 / 주간 목표 + 시안 진행바. 데이터는 `services/runningStatsService.js`(`loadAllWorkouts`, 로컬 AsyncStorage 기록) — RunningStatsScreen과 같은 집계 규칙 사용. 탭 → `RunningStats`
- **오른쪽 · 나의 모임 · 참여 목표 (A안)**: `users/{uid}.communityStats.totalParticipated` 기준 `현재 / 다음 목표`(InsightCard의 `goalSteps` 단계 로직 이동) + 노란 진행바 `#FFB800` + `★ averageMannerScore`. HomeScreen이 이미 불러오는 `communityActivity` 재사용
- 보류 후보: B. 연속 기록(로직 신규 필요), C. 내 혜택함(쿠폰 기능 생긴 뒤)

### ⑥ 내 주변 모임
- 제목 + `더보기 ›`(→ `ScheduleTab`), 칩 `전체 · 한강 · 서울 · 경기`
- 가로 카드: 대표 이미지, 제목, `오늘 20:00 · 5/10`
- 데이터: `EventContext.allEvents` 중 모집 중·미래 모임, 현재 위치 기준 가까운 순 (`geofirestoreService` 참고)
- 탭 → 해당 모임 상세 (딥링크 규칙과 동일하게 MapTab 이벤트 포커스 또는 `EventDetail`)

### ⑦ 러닝카페·푸드
- 기존 `NewCafesList` + `MyDashboard`를 하나로 통합. 칩 `신규 입점 · 자주 가는 곳`
- 신규 입점: `firestoreService.getNewCafes(10)` + `getNewFoods(10)` 합쳐 입점일 최신순, `NEW` 배지, `11월 10일 입점`
- 자주 가는 곳: `getFrequentCafes` / `getFrequentFoods` (MyDashboard에서 쓰던 것)
- 탭 → `navigate('MapTab', { targetCafeId | targetFoodId, activeToggle })` (기존과 동일)

### ⑧ 알약 탭바 (앱 전체 BottomTab 변경)
배민처럼 화면 위에 떠 있는 알약 + 선택된 탭 뒤에만 알약 모양 바탕.

| 속성 | 다크 | 라이트 |
|---|---|---|
| 컨테이너 배경 | `rgba(32,36,43,0.94)` (또는 `expo-blur` BlurView — 설치됨 `~15.0.7`) | `rgba(255,255,255,0.96)` |
| 테두리 | 0.5 `#3A404B` | 0.5 `#D9D9DE` |
| 선택 탭 바탕(캡슐) | `#343A45` | `#E9E9EE` |
| 선택 아이콘 | `PRIMARY` 시안, 채운 아이콘(`home`) | `#1C1C1E` 채운 아이콘 — **라이트에선 시안 금지**(흰 배경 대비 부족) |
| 선택 라벨 | 흰색 | `#1C1C1E` 굵게 |
| 비선택 아이콘·라벨 | `TEXT_SECONDARY_STRONG`(`#D8D8DD`) 선 아이콘(`home-outline`) | `#1C1C1E` 선 아이콘 |

- 위치: 좌우 10~12pt, 하단 `insets.bottom + 8` 정도, 모서리 30, 안쪽 패딩 5, 캡슐 모서리 24
- 기존 `AppNavigator.js`의 `TabIconWithBadge`(채움/선 아이콘 전환, 모임·커뮤니티 빨간 점) **유지**
- 탭바가 떠 있으므로 **모든 탭 화면의 하단 여백**을 탭바 높이만큼 확보 (홈 `bottomSpacing` 80 → 탭바 높이 기준으로 재계산). 지도 탭 지도 컨트롤·FAB 위치도 확인
- 구현 방식: `tabBar` 커스텀 컴포넌트 또는 `tabBarStyle`(position absolute) + `tabBarButton` 커스텀

### 홈에서 빠지는 것
`InsightCard`, `RecommendationCard`, `WeatherCard`(바텀시트로 이동), `MyDashboard`, `NewCafesList` — 모두 `HomeScreen.js`에서만 import됨(확인됨). 재사용할 로직(목표 단계, 날씨 컨디션, 신규/자주 가는 곳 조회)은 옮긴 뒤 파일 정리. 광고 팝업(`AdPopupModal`)은 유지.

## 5. 디자인 토큰

`constants/colors.js` / `useTheme()`의 `colors`만 사용, 하드코딩 금지(특히 `#3AF8FF`).
- 다크: `BACKGROUND #0F1115`, `CARD #181B20`, `SURFACE #20242B`, `BORDER #2C313A`, `PRIMARY #3AF8FF`, `TEXT_SECONDARY #9A9AA0`, `TEXT_SECONDARY_STRONG #D8D8DD`
- 라이트: `BACKGROUND #F2F2F7`, `SURFACE #FFFFFF`, `CARD #F8F8FA`, `PRIMARY #30DEE4`, `TEXT #1C1C1E`, `BORDER #D9D9DE`
- 새로 필요한 색(토큰으로 추가 권장): 모임 진행바 노랑 `#FFB800`, 미세먼지 좋음 `#00FF88`, 배너 기본 배경 `#13343A`, 알약 탭바 색(§4-⑧) — 각각 라이트 모드 값도 정의
- **시안 위의 글자는 흰색 금지** → 진한 색(`#04342C` 또는 `BACKGROUND`) 사용
- 폰트: `Pretendard`, 칩·라벨은 `numberOfLines={1}`

## 6. 함께 고칠 것
1. `HomeScreen.js:52` 조기 return을 모든 Hook 선언 뒤로 이동
2. `onScroll`/`currentScrollOffset` 제거 (안 쓰임, 스크롤마다 전체 리렌더 유발)
3. InsightCard의 랜덤 코스 선택 제거 (카드 자체가 빠지면 자동 해결)
4. 안 쓰는 알림 배열·핸들러·스타일 삭제
5. 로딩 화면을 카드 모양 스켈레톤으로
6. WeatherCard 경보 `Alert.alert` 반복 → 상단 얇은 띠 또는 칩 강조로 (권장)

## 7. 결정 필요 항목 (구현 전에 사용자에게 확인)
1. 상단바 지역명 `▾` 탭 시 동작 (위치 다시 잡기? 지역 선택?)
2. ④ 다가오는 모임이 없을 때: 숨김(기본) vs "내 주변 모임 보기" 안내 한 줄
3. ⑤ 주간 러닝 목표(20km)의 출처: 사용자 설정 vs 레벨별 기본값
4. ⑥ 칩 `한강/서울/경기` 분류 기준 (모임 좌표·주소 기반?)
5. ② `placement` 필드를 관리자 대시보드에서 어떻게 입력할지
6. ⑤ 오른쪽 '나의 모임' 칸 탭 시 이동할 곳

## 8. 구현 순서 제안
1. **탭바**(⑧) — 앱 전체 영향 큼, 먼저 하고 모든 탭 하단 여백 확인
2. 홈 뼈대 정리 + 버그 수정(§6) + ①상단바 + ③바로가기 + ④내 모임 띠
3. ②배너(placement) + ⑤2칸 타일
4. ⑥내 주변 모임 + ⑦카페·푸드 통합
5. 정리: 안 쓰는 컴포넌트 삭제, 스켈레톤

## 9. 검증
- iOS 시뮬레이터에서 다크/라이트 모두 확인 (작은 화면 iPhone SE 포함, 칩 줄바꿈·말줄임)
- 신규 사용자(기록·모임 0) / 기존 사용자 데이터 둘 다 확인
- 탭 전환 시 빨간 점 배지, 각 탭 마지막 콘텐츠가 탭바에 가리지 않는지
- `npx jest` (환경 메모: `<rootDir>` 경로 괄호 함정, App.test.tsx 미해결)

## 10. 주의
- iOS 전용 스펙. Android 브랜치(`main`)는 지도 구현 등이 달라 별도 작업
- 홈에 `react-native-maps`를 올리지 말 것 (New Arch 인자 타입 크래시 이력)
- 출시 시 버전 변경은 `app.json` + `Info.plist` + `project.pbxproj` 3곳 동시
