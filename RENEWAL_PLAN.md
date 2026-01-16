# 러논 앱 리뉴얼 계획

> **상태**: 구현 준비 완료  
> **작성일**: 2026-01-08  
> **최종 수정일**: 2026-01-14  
> **목적**: 홈화면 리뉴얼 및 새로운 '지도' 탭 추가, 전국 단위 확장

---

## 📋 목차

1. [리뉴얼 개요](#리뉴얼-개요)
2. [핵심 결정 사항](#핵심-결정-사항)
3. [기능별 상세 사양](#기능별-상세-사양)
4. [기술적 구현 사항](#기술적-구현-사항)
5. [지도 탭 전체 플로우 및 시나리오](#지도-탭-전체-플로우-및-시나리오)
6. [통합 구현 계획](#통합-구현-계획) ⭐ **새로 추가**
7. [구현 순서 및 체크리스트](#구현-순서-및-체크리스트) (기존 체크리스트 유지)
8. [남은 논의 사항](#남은-논의-사항)
9. [구현 준비 상태](#구현-준비-상태)
10. [러닝카페 입점 기능 프로젝트](#러닝카페-입점-기능-프로젝트)

---

## 📋 리뉴얼 개요

### 현재 상황
- 홈화면에 카카오인라인맵(`HanRiverMap` 컴포넌트)이 포함되어 있음
- 바텀탭 네비게이션: 홈, 모임, 커뮤니티, 프로필 (4개 탭)
- 지도 기능이 홈화면 내부에 임베드되어 있음
- 서울 지역 중심으로 제한됨 (서울 경계 체크 로직 존재)

### 리뉴얼 목표
1. 홈화면을 더 개인화된 대시보드로 전환
2. 지도 기능을 독립적인 탭으로 분리하여 전체 화면으로 제공
3. 전국 단위로 확장하여 대한민국 어디서나 사용 가능
4. 사용자 경험 개선 (자주 사용하는 정보에 빠르게 접근)

---

## ✅ 핵심 결정 사항

1. Kakao Places API: "부산 해운대" 검색 → 좌표 획득
2. GeoFirestore: 해당 좌표 기준 반경 3km 내 모임/카페 검색

### 1. 데이터 구조 및 저장소

#### 1.1 GeoFirestore 사용
- **결정**: ✅ GeoFirestore 사용 (반경 기반 쿼리)
- **목적**: 특정 위치 기준 반경 내 모임/카페 효율적 검색
- **사용 시점**:
  - 지도 탭 최초 진입 시: 현재 위치 기준 반경 3km 내 모임/카페 표시
  - "이 지역에서 재검색" 버튼 클릭 시: 지도 중심 기준 반경 3km 내 모임/카페 표시

#### 1.2 GeoFirestore 마이그레이션 전략
- **결정**: ✅ **옵션 B - 기존 데이터는 그대로 두고, 새 모임만 새 형식으로 저장**
- **기존 모임**: `customMarkerCoords` 필드 유지 (하위 호환)
- **새 모임**: `coordinates` 필드 (GeoPoint 형식)만 저장
- **하위 호환성**: 읽기 시 두 필드 모두 확인하여 사용

#### 1.3 카페 데이터 구조
- **결정**: ✅ Firestore `cafes` 컬렉션 사용
- **이미지 관리**: 로컬 `assets/images/cafe/{카페명}/` 폴더에 저장, Firestore에 경로만 저장
- **GeoFirestore 연동**: `coordinates` 필드로 위치 기반 쿼리 지원

### 2. 검색 기능

#### 2.1 Kakao Places API 사용
- **결정**: ✅ Kakao Places API 활용 (전국 장소 검색)
- **목적**: 장소 검색 ("어디를 찾을까?")
- **사용 시점**: 지도 탭 검색바, 모임 생성 시 위치 선택
- **무료 여부**: ✅ 무료 (일일 300,000건 할당량)

#### 2.2 Kakao Places API vs GeoFirestore
- **중복 없음**: 각각 다른 목적으로 사용
  - **Kakao Places API**: 장소 검색 (카카오맵 데이터베이스)
  - **GeoFirestore**: 반경 내 데이터 검색 (우리가 저장한 데이터)
- **통합 사용**: Kakao Places API로 장소 찾기 → GeoFirestore로 해당 위치 주변 모임/카페 검색

#### 2.3 검색 결과 표시 방식
- **결정**: ✅ **드롭다운 형식, 리스트 형식**
- **결정**: ✅ **검색 결과 개수 5개로 제한**
- **결정**: ✅ **리스트 형식으로 표시**
  - 각 결과 항목: 장소명, 주소, 카테고리 (Kakao Places API 결과)
  - 또는 모임 제목, 날짜, 시간 (Firestore 검색 결과)
  - 리스트 형태로 수직 스크롤 가능

#### 2.4 검색어 타입 자동 감지 로직
- **결정**: ✅ **Firestore 우선 검색 방식** (UX/UI적으로 가장 적합)
- **로직**:
  1. **1단계: Firestore 검색 먼저 실행**
     - 사용자가 입력한 검색어로 Firestore에서 모임/카페 검색
     - 검색 범위: 모임 제목, 카페 상호명, 모임 태그
     - 결과가 있으면 → Firestore 결과를 드롭다운에 표시
     - 결과가 없으면 → 2단계로 진행
  2. **2단계: Kakao Places API 검색**
     - Firestore 검색 결과가 없으면 자동으로 Kakao Places API 검색 실행
     - 장소 검색 결과를 드롭다운에 표시
- **장점**:
  - 사용자가 별도로 선택할 필요 없음 (자동으로 적절한 검색 실행)
  - 우리 데이터(모임/카페)가 우선적으로 표시되어 사용자 경험 향상
  - 검색어가 모임/카페명이든 장소명이든 모두 처리 가능
  - 다른 앱(네이버 지도, 카카오맵 등)에서도 사용하는 일반적인 패턴
- **예시**:
  - 검색어 "모닝러닝" → Firestore에서 모임 검색 → 결과 있음 → 모임 목록 표시
  - 검색어 "부산 해운대" → Firestore 검색 → 결과 없음 → Kakao Places API 검색 → 장소 목록 표시

### 3. 클러스터링

#### 3.1 클러스터링 방식
- **결정**: ✅ **일반 클러스터링** (모임/카페 마커만)
- **활성화 조건**: 마커 5개 이상일 때만 클러스터링
- **표시 방식**: 원형 아이콘, 배경 투명도 0.5, 숫자 표시 (5+, 10+, 15+), 파란색 (`#3AF8FF`)
- **클러스터 위치**: `averageCenter: true` 설정으로 클러스터 내 마커들의 평균 위치에 클러스터 생성
  - 예: 반포한강공원 부근에 3km 반경 내 5개 이상 모임이 있을 때, 해당 모임들의 가운데 위치(평균 좌표)에 클러스터 표시
- **클러스터 위치**: `averageCenter: true` 설정으로 클러스터 내 마커들의 평균 위치에 클러스터 생성
  - 예: 반포한강공원 부근에 3km 반경 내 5개 이상 모임이 있을 때, 해당 모임들의 가운데 위치(평균 좌표)에 클러스터 표시

#### 3.2 클러스터 클릭 시 동작
- **결정**: ✅ Bottom Sheet에 간단한 모임/카페 정보 카드 표시
- **컴포넌트**: 기존 홈화면 인라인맵의 `MeetingCard` 컴포넌트 재사용
- **타입별 vs 통합 표시**: ✅ **불필요** (토글로 이미 필터링됨)
  - 클러스터 내에는 선택한 타입 마커만 포함
  - Bottom Sheet 목록에는 모임/카페만 표시

### 4. 마커 타입 및 표시

#### 4.1 마커 종류
1. **모임 마커**: 동적 마커 (Firestore `events`, 토글 선택에 따라 표시/숨김)
2. **카페 마커**: 동적 마커 (Firestore `cafes`, 토글 선택에 따라 표시/숨김)

#### 4.2 마커 시각적 구분
- **결정**: 모든 마커 동일한 스타일 (파란색 `#3AF8FF`, 핀 모양)
- **구분 방법**: 토글 선택에 따라 해당 타입 마커만 표시

### 5. UI/UX 결정 사항

#### 5.1 Bottom Sheet
- **라이브러리**: ✅ `@gorhom/bottom-sheet` 사용
- **제스처 지원**: ✅ 드래그, 스와이프 지원
- **최초 진입 높이**: 부분 확장 (아주 약간만 표시)
- **전체 확장 높이**: 지도탭의 검색바 하단까지 확장
- **네비게이션 처리**: MapScreen으로 돌아올 때 기본 상태로 초기화
- **구현 시 확인 필요**: `EventDetailScreen`이 Bottom Sheet 내부에서 제대로 동작하는지, 네비게이션 처리 확인

#### 5.2 지도 인터랙션
- **지도 클릭/드래그 시**: Bottom Sheet가 최초 진입 높이로 자동 복귀 (부드러운 모션)
- **마커 동적 업데이트**: "이 지역에서 재검색" 버튼 클릭 시에만 업데이트

#### 5.3 GPS 위치 권한
- **거부 시**: 기본 위치 서울 중심 (37.5665, 126.9780), 얼러트 표시
- **승인 시**: 현재 위치로 지도 중심 이동
- **로딩 상태**: 로딩 인디케이터 표시

### 6. 전국 확장 관련 결정

#### 6.1 서울 경계 체크 로직
- **결정**: ✅ 제거
- **수정 파일**: `components/HanRiverMap.js`, `screens/ScheduleScreen.js`

#### 6.2 기본 위치
- **결정**: ✅ 서울 중심 유지, GPS 권한 승인 시 현재 위치 사용, 지도 자유 이동 가능

#### 6.3 모임 생성 시 위치 선택
- **결정**: ✅ 한강공원/강변 선택 제거, Kakao Places API 검색으로 통합
- **플로우**:
  1. 지도 위에 모임장소를 검색할 수 있는 검색바 표시
  2. 검색바 하단에 모임생성 2단계 최초 진입 시, 앱유저의 현재위치가 표시되는 지도 표시
  3. 지도는 상세위치를 설정하는 기존 기능 유지
  4. 검색바를 통해 검색하여 검색어를 클릭했을 때, 지도는 해당 검색어의 위치로 이동
  5. 검색한 검색어 장소 위치로 이동한 곳에서 상세 위치 설정을 할 수 있도록 함
  6. **중요**: Kakao Places API 검색을 필수적으로 선행할 필요 없음 (검색 없이도 지도에서 직접 상세 위치 설정 가능)
- **상세 위치 설정**: ✅ **기존 기능 그대로 사용** (모임 생성 2단계에 이미 구현된 기능 재사용)

#### 6.4 공유 이미지 place 입력
- **결정**: ✅ 추가 (메모리만 사용, Firestore 저장 안 함)
- **UI/UX 플로우**:
  1. 공유 이미지 생성 모달창 열기
  2. **공유 이미지 생성에 필요한 데이터를 불러오기 전에**:
     - 모달창 내부에 **'place를 입력해주세요'** 문구 표시
     - 문구 하단에 입력 창 표시 (오직 영어로만 입력 가능)
     - 하단 버튼: **'입력'** 버튼
  3. **'입력' 버튼 클릭**:
     - 하단 버튼이 기존에 있던 **'이미지 저장'** 버튼으로 변경
     - 공유 이미지 생성에 필요한 데이터값을 가져옴
     - 입력한 텍스트가 공유 이미지 항목 중 **장소에 표시**됨
  4. 공유 이미지 다운로드 가능

---

## 🎯 기능별 상세 사양

### 1. 홈화면 리뉴얼

#### 1.1 카카오인라인맵 삭제
- **대상 파일**: `screens/HomeScreen.js`
- **삭제 대상**: 
  - `HanRiverMap` 컴포넌트 import 및 사용 부분
  - `hanRiverMapRef` 관련 코드
  - 지도 관련 핸들러 함수들
- **이유**: 지도 기능은 새로운 '지도' 탭으로 이동

#### 1.2 마이 대시보드 구현
**기능 요구사항**:
- **자주 찾아가는 러닝카페 목록**
  - 방문 횟수 기반 정렬
  - 카드 형태 표시 (이름, 위치, 방문 횟수)
  - 클릭 시 카페 상세 정보 또는 지도로 이동

- **자주 개설하는 모임장소 목록**
  - 개설 횟수 기반 정렬
  - 카드 형태 표시 (장소명, 개설 횟수, 마지막 개설일)
  - 클릭 시 해당 장소로 지도 이동 또는 모임 생성 화면으로 이동

**데이터 수집**:
- **시작 시점**: 리뉴얼 이후부터
- **저장 위치**: `users/{userId}` 문서에 `frequentCafes` 및 `frequentMeetingLocations` 필드

#### 1.3 신규 입점 카페 목록
**기능 요구사항**:
- 최근 1개월 내 입점한 카페 목록 표시
- 심플한 카드 형태 (카페명, 위치, 입점일)
- 클릭 시 카페 상세 정보 또는 지도로 이동

**데이터 기준**:
- **입점일 기준**: `cafes` 컬렉션의 `createdAt` 필드
- **필터링**: 최근 1개월 내 생성된 카페
- **정렬**: `createdAt` 내림차순 (최신순)
- **표시 개수**: 최대 10개

**구현 우선순위**:
1. 마이 대시보드 먼저 구현
2. 이후 신규 입점 카페 목록 구현

---

### 2. 지도 탭 - 새로운 기능

#### 2.1 바텀탭에 '지도' 탭 추가
- **대상 파일**: `navigation/AppNavigator.js`
- **변경 사항**:
  - `MainTabNavigator`에 새로운 `MapTab` 추가
  - 탭 순서: 홈, **지도**, 모임, 커뮤니티, 프로필 (5개 탭)
  - 아이콘: `map` / `map-outline` (Ionicons)
  - 라벨: "지도"

#### 2.2 새로운 MapScreen 생성
- **파일 생성**: `screens/MapScreen.js`
- **기능**:
  - 기존 `HanRiverMap` 컴포넌트의 카카오맵 기능을 전체 화면으로 구현
  - WebView를 사용한 카카오맵 표시
  - 현재 위치 표시
  - 지도 줌/팬 제스처 지원

#### 2.3 지도 화면 레이아웃 (상단 → 하단 순서)

**최상단 - 검색바**:
- 위치/장소 검색 기능
- Kakao Places API 사용

**검색바 하단 - 토글 버튼**:
- "러닝모임" / "러닝카페" 두 개의 버튼
- 가로로 나란히 배치
- 시각적으로 강조되지만, 눈에 너무 띄지 않도록
- **동작**: 클릭한 토글 항목에 따라 해당 마커만 지도에 표시
  - "러닝모임" 클릭 → 모임 마커 표시
  - "러닝카페" 클릭 → 카페 마커 표시
- **기본 선택**: 최초 진입 시 "러닝모임" 기본 선택

**지도 영역**:
- 카카오맵 전체 화면 표시
- **마커 종류**:
  1. **러닝모임 마커**: 토글 선택에 따라 표시 (Firestore `events`)
     - **마커 위치**: 모임 생성 시 설정한 상세 위치 좌표 (`customMarkerCoords` 또는 `coordinates` 필드)
     - GeoFirestore로 반경 3km 내 모임을 검색하고, 검색된 모임의 좌표를 사용하여 마커 표시
     - **종료된 모임(`status: 'ended'`)은 제외**하여 검색
     - **마커 UI**: 러닝모임 마커 UI로 표시 (파란색 `#3AF8FF`, 핀 모양)
     - **모임 종료/삭제 시**: 지도에서 마커 제거, Bottom Sheet 목록에서도 제거
  2. **러닝카페 마커**: 토글 선택에 따라 표시 (Firestore `cafes`)

- **마커 클릭 시**: 마커 위에 간단한 푯말(InfoWindow) 표시
  - **카페 마커**: 상호명 + 대표 러닝인증 혜택 1개 (텍스트)
  - **모임 마커**: 모임 제목 / 날짜 / 시간

- **지도 클릭/드래그 시**:
  - 지도가 움직임 (정상 동작)
  - Bottom Sheet가 부드러운 모션과 함께 최초 진입 시 높이로 자동 복귀

**하단 버튼**:
- **[현재위치]**: 현재 위치로 지도 이동
- **[이 지역에서 재검색]**: 
  - 위치: Bottom Sheet 위에 표시
  - 동작: 현재 지도 중심 좌표 기준 반경 3km 내 모임/카페 재검색
  - 트리거: 버튼 클릭 시에만 동작

#### 2.4 Bottom Sheet 기능

**라이브러리**: `@gorhom/bottom-sheet`

**러닝모임 모드**:

- **최초 진입 시**:
  - 내 주변 반경 **3km** 내 러닝모임 목록 표시
  - **종료된 모임(`status: 'ended'`)은 목록에서 제외**
  - Bottom Sheet 높이: **아주 약간만 표시** (부분 확장)
  - 목록: 기존 홈화면 인라인맵의 **간단한 러닝정보 카드** (`MeetingCard` 컴포넌트) 재사용

- **모임 클릭 시**:
  - 해당 마커가 지도 가운데에 나타나도록 **자동 이동**
  - Bottom Sheet: **전체 확장** (지도탭의 검색바 하단까지)
  - **모임 상세 화면 표시**:
    - `EventDetailScreen`과 **동일한 레이아웃 및 기능**
    - Bottom Sheet 내부에 `EventDetailScreen` 컴포넌트를 그대로 렌더링
    - 하단 버튼: "참여하기" / "종료하기" / "나가기" (상황에 따라)
    - `EventContext`의 `joinEvent` 함수 활용
    - 참여하기 후 채팅방 이동 등 모든 기능 동일하게 동작
    - **구현 시 확인 필요**: Bottom Sheet 내부에서 제대로 동작하는지, 네비게이션 처리 확인

- **앱 유저별 표시 방식**:
  - **내가 생성한 모임**: "종료하기" 버튼 (검은 배경, 흰 아이콘)
  - **내가 참여한 모임**: "나가기" 버튼 (빨간 배경, 흰 아이콘)
  - **참여하지 않은 모임**: "참여하기" 버튼 또는 "마감되었습니다" (비활성화)

**러닝카페 모드**:

- **최초 진입 시**:
  - 내 주변 반경 **700m** 내 입점 러닝카페 목록 표시
  - Bottom Sheet 높이: **아주 약간만 표시** (부분 확장)
  - **시트 상단**: 검색바 (카페 검색용)
  - **카페 카드 표시**:
    - 카페 상호명
    - 카페 소개
    - 대표사진 2장

- **러닝모임 모드에도 검색바 추가**:
  - Bottom Sheet 상단에 검색바 표시 (모임 검색용)
  - 모임 제목, 모임 태그로 필터링

- **카페 클릭 시**:
  - 해당 마커가 지도 가운데에 나타나도록 **자동 이동**
  - Bottom Sheet: **전체 확장** (지도탭의 검색바 하단까지)
  - **카페 상세 정보 표시**:
    - **[상호명] 카페** (라벨)
    - **현재 위치에서 xx km** (거리 표시)
    - **[사진 3장]** - 가로로 슬라이드 가능, 사진 클릭 시 크게 보기
    - **[현재 날짜에 따라 영업시간 표시]** (각 카페마다 다른 로직 적용)
    - 폰트 크기 및 사진 크기: UX 친화적으로 설정
    - **데이터 입력**: 러논 대시보드(admin 대시보드)에서 카페 상세 정보를 입력하면 앱에 등록됨
      - 위치: `lee_mac` 폴더 - `runon-admin-dashboard`
      - 현재 admin 대시보드는 이미 구현되어 있음

**Bottom Sheet 네비게이션 처리**:
- `ParticipantScreen`으로 이동: 전체 화면으로 이동
- `ChatScreen`으로 이동: 전체 화면으로 이동
- `MapScreen`으로 돌아올 때: Bottom Sheet는 기본 상태(부분 확장, 목록 표시)로 초기화

**성능 최적화**:
- `FlatList` 사용 (화면에 보이는 항목만 렌더링)

---

### 3. 전국 단위 확장

#### 3.1 서울 경계 체크 로직 제거
- **결정**: ✅ 제거
- **현재 상태**:
  - `components/HanRiverMap.js`: 서울 경계 벗어남 시 자동으로 서울 중심으로 이동 (485-509줄, 949-968줄)
  - `screens/ScheduleScreen.js`: 서울 경계 체크 로직 존재 (2599-2628줄)
- **수정 필요**:
  - 서울 경계 체크 함수 제거 (`isWithinSeoulBoundary`, `notifyOutOfSeoulBoundary`)
  - 지도 이동 제한 해제
  - 서울 경계 벗어남 알림 제거

#### 3.2 기본 위치 변경
- **결정**: ✅ 서울 중심 유지, GPS 권한 승인 시 현재 위치 사용
- **설정**:
  - **기본 위치**: 서울 중심 (37.5665, 126.9780) 유지
  - **GPS 권한 승인 시**: 사용자의 현재 위치로 지도 중심 이동
  - **GPS 권한 거부 시**: 기본 위치(서울 중심)로 설정, 지도는 자유롭게 이동 가능

#### 3.3 검색 기능 확장

**Kakao Places API 통합**:
- **목적**: 전국 장소 검색
- **API 엔드포인트**: `https://dapi.kakao.com/v2/local/search/keyword.json`
- **구현 파일**: `services/kakaoPlacesService.js` (새 파일)

**검색 동작 방식** (Firestore 우선 검색):
1. 사용자가 검색어 입력 (예: "모닝러닝", "부산 해운대")
2. 검색 버튼 클릭 또는 Enter 키 입력
3. **1단계: Firestore 검색 먼저 실행**
   - 모임 제목, 카페 상호명, 모임 태그로 검색
   - 결과가 있으면 → Firestore 결과를 드롭다운에 리스트 형식으로 표시
   - 결과가 없으면 → 2단계로 진행
4. **2단계: Kakao Places API 검색** (Firestore 결과가 없을 때만)
   - Kakao Places API로 장소 검색
   - 장소 검색 결과를 드롭다운에 리스트 형식으로 표시
5. 사용자가 검색 결과 선택
6. 선택한 결과의 좌표로 지도 이동
   - Firestore 결과 선택 시: 해당 모임/카페 위치로 이동
   - Kakao Places API 결과 선택 시: 해당 장소 위치로 이동
7. 해당 좌표 기준 반경 3km 내 모임/카페 표시 (GeoFirestore 사용)
8. 검색 결과가 없으면 "검색 결과가 없습니다" 알림 표시

**API 응답 구조**:
- **Kakao Places API는 항상 배열을 반환** (빈 배열일 수 있음)
- **의미**: 검색 결과가 없어도 에러가 발생하지 않고, 정상적으로 빈 배열 `[]`을 반환
- **예시**:
  - 검색어 "부산 해운대" → 결과 있음: `[{ place_name: "해운대해수욕장", ... }, ...]`
  - 검색어 "존재하지않는장소123" → 결과 없음: `[]` (빈 배열)
- **처리 방법**: 빈 배열인 경우 "검색 결과가 없습니다" 메시지 표시

**검색 범위** (지도 탭 검색바):
- **결정**: ✅ **Firestore 우선 검색 방식**
  1. Firestore 검색 먼저 실행 (모임 제목, 카페 상호명, 모임 태그)
  2. 결과가 없으면 Kakao Places API 검색 자동 실행
- **검색 결과 표시**: ✅ **드롭다운 형식, 리스트 형식, 최대 5개 결과**
  - 각 결과 항목: 
    - Firestore 결과: 모임 제목, 날짜, 시간 또는 카페 상호명, 주소
    - Kakao Places API 결과: 장소명, 주소, 카테고리
  - 리스트 형태로 수직 스크롤 가능

#### 3.4 모임 생성 시 위치 선택 확장

**현재 구현** (제거 예정):
- 1단계: "한강공원" / "강변" 버튼 선택
- 2단계: 드롭다운에서 구체적 장소 선택
- 3단계: 지도에서 상세 위치 설정

**새로운 구현**:
- **레이아웃**:
  1. 지도 위에 모임장소를 검색할 수 있는 검색바 표시
  2. 검색바 하단에 모임생성 2단계 최초 진입 시, 앱유저의 현재위치가 표시되는 지도 표시
  3. 지도는 상세위치를 설정하는 기존 기능 유지

- **검색 플로우**:
  - 검색바를 통해 검색하여 검색어를 클릭했을 때, 지도는 해당 검색어의 위치로 이동
  - 검색한 검색어 장소 위치로 이동한 곳에서 상세 위치 설정을 할 수 있도록 함
  - **중요**: Kakao Places API 검색을 필수적으로 선행할 필요 없음 (검색 없이도 지도에서 직접 상세 위치 설정 가능)

**수정 파일**:
- `screens/ScheduleScreen.js` (대폭 수정)
- `services/kakaoPlacesService.js` (새 파일)

#### 3.5 공유 이미지 생성 시 'place' 입력 기능

**결정**: ✅ 추가 (메모리만 사용, Firestore 저장 안 함)

**UI/UX 플로우**:
1. 공유 이미지 생성 모달창 열기
2. **공유 이미지 생성에 필요한 데이터를 불러오기 전에**:
   - 모달창 내부에 **'place를 입력해주세요'** 문구 표시
   - 문구 하단에 입력 창 표시 (오직 영어로만 입력 가능)
   - 하단 버튼: **'입력'** 버튼
3. **'입력' 버튼 클릭**:
   - 하단 버튼이 기존에 있던 **'이미지 저장'** 버튼으로 변경
   - 공유 이미지 생성에 필요한 데이터값을 가져옴
   - 입력한 텍스트가 공유 이미지 항목 중 **장소에 표시**됨
4. 공유 이미지 다운로드 가능

**구현**:
- `RunningShareModal`에 입력 필드 추가
- 사용자가 입력한 `customPlace`는 컴포넌트 상태로만 관리
- Firestore에는 저장하지 않음 (메모리만 사용)

**수정 파일**:
- `components/RunningShareModal.js` (필수)
- `components/RunningShareCard.js` (수정 불필요, prop만 전달)

---

## 🔧 기술적 구현 사항

### 1. 데이터 구조

#### 1.1 Firestore 컬렉션

**`events` 컬렉션** (모임):
```javascript
{
  // 기존 모임 (하위 호환)
  customMarkerCoords: { latitude: 37.5234, longitude: 127.1267 },
  
  // 새 모임 (GeoFirestore)
  coordinates: GeoPoint(37.5234, 127.1267),
  g: 'wyb1',  // Geohash (GeoFirestore가 자동 생성)
  l: GeoPoint(37.5234, 127.1267),  // GeoPoint (GeoFirestore가 자동 생성)
  
  // 기타 필드
  title: '모닝러닝',
  location: '뚝섬한강공원',
  // ...
}
```

**`cafes` 컬렉션** (카페):
```javascript
{
  id: "cafe-id-123",
  name: "카페 상호명",
  description: "카페 소개",
  coordinates: GeoPoint(37.5234, 127.1267),  // GeoFirestore용
  g: "wyb1",  // Geohash (GeoFirestore가 자동 생성)
  l: GeoPoint(37.5234, 127.1267),  // GeoPoint (GeoFirestore가 자동 생성)
  address: "서울시 강동구...",
  operatingHours: "10:00 - 22:00",
  mainMenu: "아메리카노, 라떼, 케이크",
  images: [
    "assets/images/cafe/A카페/image1.png",
    "assets/images/cafe/A카페/image2.png",
    "assets/images/cafe/A카페/image3.png"
  ],
  runningCertificationImage: "assets/images/cafe/A카페/running-cert.png",
  runningCertificationBenefit: "러닝인증 시 10% 할인",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**`users` 컬렉션** (사용자 활동):
```javascript
{
  frequentCafes: [
    { cafeId: 'cafe-1', visitCount: 5, lastVisit: Timestamp }
  ],
  frequentMeetingLocations: [
    { location: '뚝섬한강공원', createCount: 3, lastCreate: Timestamp }
  ]
}
```

#### 1.2 GeoFirestore 설정

**라이브러리 설치**:
```bash
npm install geofirestore
```

**초기화** (`services/geofirestoreService.js`):
```javascript
import { GeoFirestore } from 'geofirestore';
import { firestore } from '../config/firebase';

const geofirestore = new GeoFirestore(firestore);

export default geofirestore;
```

**반경 쿼리** (`services/firestoreService.js`):
```javascript
// 반경 3km 내 모임 검색
async getEventsNearby(latitude, longitude, radiusInKm = 3) {
  const geocollection = geofirestore.collection('events');
  const center = new GeoPoint(latitude, longitude);
  
  const query = geocollection.near({
    center: center,
    radius: radiusInKm
  });
  
  const snapshot = await query.get();
  const events = [];
  snapshot.forEach((doc) => {
    const eventData = doc.data();
    // 종료된 모임(status: 'ended')은 제외
    if (eventData.status !== 'ended') {
      events.push({ id: doc.id, ...eventData });
    }
  });
  
  return events;
}

// 하위 호환성: 기존 모임(customMarkerCoords)도 검색하기 위한 하이브리드 쿼리
// 참고: GeoFirestore near 쿼리는 coordinates 필드가 있는 문서만 검색 가능
// 기존 모임은 customMarkerCoords만 있으므로 별도 처리 필요
async getEventsNearbyHybrid(latitude, longitude, radiusInKm = 3) {
  // 1. GeoFirestore 쿼리 (새 모임 - coordinates 필드가 있는 모임)
  const geocollection = geofirestore.collection('events');
  const center = new GeoPoint(latitude, longitude);
  const geoQuery = geocollection.near({
    center: center,
    radius: radiusInKm
  });
  const geoSnapshot = await geoQuery.get();
  
  // 2. 일반 Firestore 쿼리 (기존 모임 - customMarkerCoords만 있는 모임)
  const eventsRef = collection(firestore, 'events');
  const allEventsSnapshot = await getDocs(eventsRef);
  
  // 3. 기존 모임 중 반경 내에 있는 모임 필터링 (클라이언트 측 계산)
  const nearbyEvents = [];
  
  // GeoFirestore 결과 추가
  geoSnapshot.forEach((doc) => {
    const eventData = doc.data();
    if (eventData.status !== 'ended') {
      nearbyEvents.push({ id: doc.id, ...eventData });
    }
  });
  
  // 기존 모임 중 반경 내 모임 추가
  allEventsSnapshot.forEach((doc) => {
    const eventData = doc.data();
    // coordinates가 없고 customMarkerCoords만 있는 모임
    if (!eventData.coordinates && eventData.customMarkerCoords) {
      const distance = calculateDistance(
        latitude,
        longitude,
        eventData.customMarkerCoords.latitude,
        eventData.customMarkerCoords.longitude
      );
      if (distance <= radiusInKm && eventData.status !== 'ended') {
        nearbyEvents.push({ id: doc.id, ...eventData });
      }
    }
  });
  
  return nearbyEvents;
}

// 반경 700m 내 카페 검색
async getCafesNearby(latitude, longitude, radiusInKm = 0.7) {
  const geocollection = geofirestore.collection('cafes');
  const center = new GeoPoint(latitude, longitude);
  
  const query = geocollection.near({
    center: center,
    radius: radiusInKm
  });
  
  const snapshot = await query.get();
  const cafes = [];
  snapshot.forEach((doc) => {
    cafes.push({ id: doc.id, ...doc.data() });
  });
  
  return cafes;
}
```

**하위 호환성 유지**:
```javascript
// 읽기 시 두 필드 모두 확인하여 좌표 추출
const getEventCoordinates = (eventData) => {
  if (eventData.coordinates) {
    // GeoFirestore 형식 (새 모임, 우선)
    return eventData.coordinates;
  } else if (eventData.customMarkerCoords) {
    // 기존 형식 (기존 모임, 하위 호환)
    return new GeoPoint(
      eventData.customMarkerCoords.latitude,
      eventData.customMarkerCoords.longitude
    );
  }
  return null;
};

// 기존 모임과 새 모임 구분
// - 기존 모임: customMarkerCoords 필드만 있음 (리뉴얼 구현 전에 생성된 모임)
// - 새 모임: coordinates 필드만 저장 (리뉴얼 구현 후 생성되는 모임)
```

**새 모임 생성 시**:
```javascript
async createEvent(eventData) {
  const geocollection = geofirestore.collection('events');
  
  // customMarkerCoords가 있으면 GeoPoint로 변환하여 coordinates에 저장
  // (모임 생성 시 지도에서 설정한 상세 위치 좌표)
  let coordinates = null;
  if (eventData.customMarkerCoords) {
    coordinates = new GeoPoint(
      eventData.customMarkerCoords.latitude,
      eventData.customMarkerCoords.longitude
    );
  }
  
  await geocollection.add({
    ...eventData,
    coordinates: coordinates,  // GeoPoint로 저장 (새 필드)
    // customMarkerCoords는 저장하지 않음 (새 모임은 새 형식만 사용)
    // GeoFirestore가 자동으로 'g', 'l' 필드 추가
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// 참고: 기존 모임은 customMarkerCoords 필드만 있고 coordinates 필드가 없음
// 리뉴얼 후에도 기존 모임은 그대로 유지 (하위 호환성)
```

#### 1.3 검색 기능 구현

**Firestore 검색 함수** (`services/firestoreService.js`):
```javascript
// 모임/카페 검색 (제목, 상호명, 태그)
async searchEventsAndCafes(query) {
  const eventsRef = collection(firestore, 'events');
  const cafesRef = collection(firestore, 'cafes');
  
  // 모임 검색 (제목, 태그)
  const eventsQuery = query(
    eventsRef,
    where('status', '!=', 'ended'), // 종료된 모임 제외
    // 제목 또는 태그에 검색어가 포함된 모임 검색
    // (Firestore는 OR 쿼리가 제한적이므로 여러 쿼리 실행 후 클라이언트 측에서 필터링)
  );
  const eventsSnapshot = await getDocs(eventsQuery);
  
  // 카페 검색 (상호명)
  const cafesQuery = query(
    cafesRef,
    // 상호명에 검색어가 포함된 카페 검색
  );
  const cafesSnapshot = await getDocs(cafesQuery);
  
  const results = [];
  
  // 모임 결과 필터링 및 추가
  eventsSnapshot.forEach((doc) => {
    const data = doc.data();
    const titleMatch = data.title?.toLowerCase().includes(query.toLowerCase());
    const tagMatch = data.tags?.some(tag => 
      tag.toLowerCase().includes(query.toLowerCase())
    );
    if (titleMatch || tagMatch) {
      results.push({ type: 'event', id: doc.id, ...data });
    }
  });
  
  // 카페 결과 필터링 및 추가
  cafesSnapshot.forEach((doc) => {
    const data = doc.data();
    const nameMatch = data.name?.toLowerCase().includes(query.toLowerCase());
    if (nameMatch) {
      results.push({ type: 'cafe', id: doc.id, ...data });
    }
  });
  
  return results.slice(0, 5); // 최대 5개 결과
}
```

**Kakao Places API 설정** (`services/kakaoPlacesService.js`):
```javascript
import ENV from '../config/environment';

const KAKAO_REST_API_KEY = ENV.kakaoRestApiKey; // REST API 키
const PLACES_API_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

// 장소 검색
export const searchPlace = async (query, options = {}) => {
  try {
    const { size = 5, page = 1 } = options; // 기본값: 최대 5개 결과
    
    const response = await fetch(
      `${PLACES_API_URL}?query=${encodeURIComponent(query)}&size=${size}&page=${page}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
    );
    
    const data = await response.json();
    // API는 항상 배열을 반환 (검색 결과가 없으면 빈 배열 [])
    // 에러가 발생하지 않고 정상적으로 빈 배열을 반환하는 것이 정상 동작
    return data.documents || []; // 검색 결과 배열 (빈 배열일 수 있음)
  } catch (error) {
    console.error('장소 검색 실패:', error);
    return []; // 네트워크 에러 등 실제 에러 발생 시에도 빈 배열 반환
  }
};
```

**환경 변수** (`config/environment.js`):
```javascript
export default {
  // ... 기존 설정
  kakaoRestApiKey: 'YOUR_KAKAO_REST_API_KEY', // REST API 키 추가
};
```

### 2. 클러스터링 구현

#### 2.1 카카오맵 MarkerClusterer 설정

**설정**:
```javascript
const clusterer = new kakao.maps.MarkerClusterer({
  map: map,
  markers: allMarkers, // 모임/카페 마커 (러닝 코스 마커 제거됨)
  gridSize: 60, // 클러스터 그리드 크기
  minClusterSize: 5, // 최소 클러스터 크기 (5개 이상일 때만 클러스터링)
  averageCenter: true, // 클러스터 중심을 평균 위치로 (클러스터 내 마커들의 평균 좌표)
  styles: [{
    width: '50px',
    height: '50px',
    background: 'rgba(58, 248, 255, 0.5)', // 배경 투명도 0.5
    borderRadius: '50%', // 원형
    textAlign: 'center',
    lineHeight: '50px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold'
  }]
});
```

**클러스터링 로직**:
- 지도 화면에 표시된 모임/카페 마커를 기준으로 클러스터링
- 5개 이상 마커가 가까이 있을 때만 클러스터로 표시
- 5개 미만이면 개별 마커로 표시
- 클러스터 위치: `averageCenter: true` 설정으로 클러스터 내 마커들의 평균 위치에 생성
- 클러스터 클릭 시: Bottom Sheet에 간단한 모임/카페 정보 카드 표시

**클러스터 숫자 표시 로직**:
- 5+, 10+, 15+ (5단위)
- 예: 7개 → "5+", 12개 → "10+", 18개 → "15+"
- 로직: `Math.ceil(개수 / 5) * 5 + "+"`

### 3. 성능 최적화

#### 3.1 마커 렌더링
- **클러스터링**: 마커 5개 이상일 때 클러스터로 묶어서 표시
- **토글 필터링**: 선택한 타입 마커만 표시하여 렌더링 부하 감소

#### 3.2 리스트 렌더링
- **FlatList 사용**: Bottom Sheet 내부 목록에 `FlatList` 사용
- **설정**: `INITIAL_NUM_TO_RENDER: 10`, `MAX_TO_RENDER_PER_BATCH: 5`

#### 3.3 데이터 캐싱
- **캐시 무효화 전략**: ✅ **수동 새로고침** ("이 지역에서 재검색" 버튼 클릭 시만)
- **오프라인 동작**: ✅ **에러 표시** (오프라인 시 "인터넷 연결이 필요합니다" 메시지 표시)

---

## 📝 통합 구현 계획

> **목적**: 리뉴얼 계획과 러닝카페 입점 기능을 유기적으로 통합하여 구현  
> **원칙**: 공통 인프라 먼저 구축 → 핵심 기능 구현 → 확장 기능 구현

---

### 🏗️ Phase 0: 공통 인프라 구축 (모임 + 카페 공통)

**목표**: 모임과 카페 모두에서 사용할 공통 인프라 구축

#### 0-1. GeoFirestore 설정
- [x] GeoFirestore 라이브러리 설치 (`npm install geofirestore`)
- [x] `services/geofirestoreService.js` 생성
- [x] `services/firestoreService.js`에 공통 반경 쿼리 함수 추가
  - `getEventsNearbyHybrid`: 모임 반경 쿼리 (하위 호환성 포함)
  - `getCafesNearby`: 카페 반경 쿼리
- [x] 하위 호환성 유지 코드 작성 (`getEventCoordinates` 함수)

#### 0-2. Kakao Places API 통합
- [x] Kakao Places API REST API 키 발급 완료
- [x] `config/environment.js`에 REST API 키 추가 완료
- [x] `services/kakaoPlacesService.js` 생성
- [x] `services/searchService.js` 생성 (통합 검색 함수)
- [x] `services/firestoreService.js`에 `searchEventsAndCafes` 함수 추가
- [x] Firestore 우선 검색 방식 구현
  - 1단계: Firestore 검색 (모임 제목, 카페 상호명, 모임 태그)
  - 2단계: 결과 없으면 Kakao Places API 검색 자동 실행

#### 0-3. 지도 탭 기본 구조
- [x] `screens/MapScreen.js` 생성
- [x] `navigation/AppNavigator.js`에 '지도' 탭 추가
- [x] 기본 카카오맵 WebView 구현
- [x] GPS 위치 권한 처리
- [x] 기본 위치 설정 (서울 중심, GPS 권한 승인 시 현재 위치)

---

### 🗺️ Phase 1: 지도 탭 핵심 기능 (모임 + 카페 통합)

**목표**: 지도 탭에서 모임과 카페를 모두 표시하는 핵심 기능 구현

#### 1-1. 마커 표시 및 토글
- [x] 모임 마커 GeoFirestore로 로드
  - `getEventsNearbyHybrid` 함수로 반경 3km 내 모임 검색 ✅
  - 종료된 모임(`status: 'ended'`) 제외 ✅
  - 하위 호환성 고려 (기존 모임 + 새 모임 모두 포함) ✅
- [x] 카페 마커 GeoFirestore로 로드
  - `getCafesNearby` 함수로 반경 700m 내 카페 검색 ✅
- [x] 토글 버튼 구현 (러닝모임/러닝카페) ✅
- [x] 토글별 마커 필터링 ✅
- [x] 새 모임 생성 시 `coordinates` 필드만 저장하도록 수정 ✅

#### 1-2. 클러스터링
- [x] 카카오맵 MarkerClusterer 설정 ✅
- [x] 클러스터링 구현 (모임/카페 마커 통합 클러스터링) ✅
- [x] 클러스터 클릭 시 Bottom Sheet 표시 ✅

#### 1-3. Bottom Sheet 기본 구조
- [x] `@gorhom/bottom-sheet` 라이브러리 설치 ✅
- [x] Bottom Sheet 기본 구조 구현 ✅
- [x] 최초 진입 시 부분 확장 상태 구현 ✅
- [x] 지도 클릭/드래그 시 Bottom Sheet 자동 축소 ✅
- [x] 네비게이션 처리 (MapScreen으로 돌아올 때 초기화) ✅

#### 1-4. Bottom Sheet - 러닝모임 모드
- [x] 목록 표시 (`MeetingCard` 컴포넌트 재사용) ✅
- [x] 모임 상세 화면 표시 (`EventDetailScreen` 통합) ✅
- [x] 검색바 추가 (모임 제목, 모임 태그로 필터링) ✅

#### 1-5. Bottom Sheet - 러닝카페 모드
- [x] 목록 표시 (카페 카드 컴포넌트) ✅
- [x] 카페 상세 정보 표시 ✅
- [x] 검색바 추가 (카페 상호명으로 필터링) ✅

#### 1-6. 검색 기능
- [x] 지도 탭 검색바에 통합 검색 함수 연결 ✅
- [x] 검색 결과 드롭다운 표시 (리스트 형식, 최대 5개 결과) ✅
- [x] 검색 결과 선택 후 지도 이동 ✅
- [x] 검색 실패 처리 ("장소를 찾을 수 없습니다" 알림) ✅
- [x] 검색 결과 선택 후 해당 위치에 마커 자동 표시 (금색 마커) ✅
- [x] 검색 시 지도 확대 레벨 조정 (level 3으로 더 확대) ✅
- [x] 검색바와 토글 버튼의 StatusBar 높이 고려한 위치 조정 ✅
- [x] StatusBar 깜빡임 문제 해결 (useFocusEffect dependency 최적화) ✅

---

### 🏪 Phase 2: 관리자 대시보드 - 카페 등록 기능

**목표**: 관리자가 카페를 등록하고 관리할 수 있는 기능 구현

#### 2-1. 인증 및 권한 관리
- [ ] Firebase Auth 인증 구현 (이메일/비밀번호)
  - 로그인 화면 UI/UX 구현 (기존 사용자 관리 화면과 통합)
  - 로그인 상태 유지 기능 구현
- [ ] Firestore `admins` 컬렉션 생성 및 관리자 UID 등록
  - 기존 관리자 대시보드에 관리자 UID 등록 기능 추가
- [ ] 관리자 권한 체크 기능 구현
  - 로그인 시 한 번만 권한 체크
  - 권한 없는 사용자 접근 시 에러 메시지 표시

#### 2-2. 카페 등록 폼
- [ ] 러닝카페 등록 폼 UI 구현
  - 업종 선택 필드 (카페, 음식점, 러닝샵)
  - 요일별 운영시간 입력 필드 (TimePicker, 휴무일 체크박스)
  - 인스타그램 링크 입력 필드
- [ ] 이미지 업로드 기능 구현
  - Firebase Storage 연동
  - 파일 선택 및 드래그 앤 드롭 지원
  - 이미지 리사이징 (Bottom Sheet 표시 사이즈)
  - 카페 사진 2장, 러닝인증 이미지 1장 업로드
- [ ] 지도에서 위치 선택 기능 구현
  - Kakao Maps API (웹 SDK) 사용
  - 지도 클릭 선택
  - 주소 검색 기능 (Kakao Places API)
- [ ] 폼 유효성 검사 구현
  - 카페 상호명/소개 30자 제한
  - 주소 한국 주소 형식
  - 인스타그램 URL 형식 검증
  - 이미지 업로드 검증
- [ ] Firestore에 카페 데이터 저장 기능 구현
- [ ] GeoFirestore `coordinates` 필드 자동 생성

#### 2-3. 카페 관리 기능
- [ ] 카페 목록 조회 기능 구현
  - 페이지네이션 구현
  - 검색 기능 (상호명, 주소)
  - 정렬 기능 (등록일순서)
- [ ] 카페 정보 수정 기능 구현
  - 모든 필드 수정 가능
  - 이미지 교체 시 기존 이미지 삭제
  - 수정 이력 기록
- [ ] 카페 삭제 기능 구현
  - 완전 삭제 (하드 삭제)
  - 연관된 이미지도 함께 삭제

---

### 🔄 Phase 3: 모임 생성 및 홈화면 리뉴얼

**목표**: 모임 생성 위치 선택 개선 및 홈화면 리뉴얼

#### 3-1. 모임 생성 위치 선택 변경
- [ ] `screens/ScheduleScreen.js`에서 한강공원/강변 버튼 제거
- [ ] 검색바 + 검색 결과 리스트로 변경
- [ ] Kakao Places API 검색 통합 (Phase 0-2에서 구현한 서비스 재사용)
- [ ] 서울 경계 체크 로직 제거
- [ ] 기존 모임 수정 시 하위 호환성 유지

#### 3-2. 공유 이미지 place 입력
- [ ] `components/RunningShareModal.js`에 입력 필드 추가
- [ ] 입력한 값이 이미지에 반영되는지 확인

#### 3-3. 홈화면 리뉴얼
- [ ] `screens/HomeScreen.js`에서 `HanRiverMap` 제거
- [ ] 마이 대시보드 컴포넌트 생성 (`components/MyDashboard.js`)
- [ ] 사용자 활동 데이터 수집 로직 구현 (추후 논의)
- [ ] 신규 입점 카페 목록 컴포넌트 생성 (`components/NewCafesList.js`)
- [ ] Firestore 데이터 구조 설계 및 구현

---

### ⚡ Phase 4: 성능 최적화 및 테스트

**목표**: 성능 최적화 및 전체 기능 테스트

#### 4-1. 성능 최적화
- [ ] 캐싱 전략 구현 (구현하면서 테스트)
- [ ] 지연 로딩 구현
- [ ] 마커 렌더링 최적화

#### 4-2. 통합 테스트
- [ ] 지도 탭 전체 플로우 테스트
- [ ] 모임 생성 → 지도 탭 표시 테스트
- [ ] 카페 등록 → 지도 탭 표시 테스트
- [ ] 검색 기능 테스트
- [ ] 클러스터링 테스트
- [ ] Bottom Sheet 네비게이션 테스트

---

## 📋 구현 순서 요약

### 우선순위 1: 공통 인프라 (Phase 0)
- GeoFirestore 설정
- Kakao Places API 통합
- 지도 탭 기본 구조

### 우선순위 2: 핵심 기능 (Phase 1)
- 마커 표시 및 토글
- 클러스터링
- Bottom Sheet (모임 + 카페)
- 검색 기능

### 우선순위 3: 관리자 기능 (Phase 2)
- 인증 및 권한 관리
- 카페 등록 폼
- 카페 관리 기능

### 우선순위 4: 개선 및 확장 (Phase 3, 4)
- 모임 생성 위치 선택 변경
- 홈화면 리뉴얼
- 성능 최적화
- 통합 테스트

---

## 🔗 기능 간 연결 관계

### 공통 인프라 → 모든 기능
- **GeoFirestore**: 모임 반경 쿼리, 카페 반경 쿼리 모두 사용
- **Kakao Places API**: 지도 탭 검색, 모임 생성 위치 선택, 카페 등록 위치 선택 모두 사용
- **Firestore 검색**: 지도 탭 검색, Bottom Sheet 내부 검색 모두 사용

### 지도 탭 → 모임 + 카페
- **마커 표시**: 모임 마커와 카페 마커를 동일한 방식으로 표시
- **클러스터링**: 모임/카페 마커를 통합하여 클러스터링
- **Bottom Sheet**: 모임 모드와 카페 모드를 토글로 전환
- **검색**: 모임과 카페를 통합 검색

### 관리자 대시보드 → 앱 표시
- **카페 등록**: Firestore `cafes` 컬렉션에 저장
- **앱 표시**: 지도 탭에서 `getCafesNearby`로 로드하여 마커 표시
- **Bottom Sheet**: 카페 목록 및 상세 정보 표시

### 모임 생성 → 지도 탭 표시
- **모임 생성**: `coordinates` 필드로 저장 (GeoFirestore 형식)
- **지도 탭**: `getEventsNearbyHybrid`로 로드하여 마커 표시
- **하위 호환성**: 기존 모임(`customMarkerCoords`)도 표시 가능

---

## 📌 참고 파일

- `screens/HomeScreen.js` - 홈화면 (리뉴얼 대상)
- `components/HanRiverMap.js` - 카카오맵 컴포넌트 (재사용 또는 리팩토링)
- `navigation/AppNavigator.js` - 바텀탭 네비게이션 (지도 탭 추가)
- `contexts/EventContext.js` - 모임 데이터 컨텍스트
- `screens/ScheduleScreen.js` - 모임 생성 화면 (위치 선택 변경)
- `components/RunningShareModal.js` - 공유 이미지 모달 (place 입력 추가)
- `firestore.rules` - Firestore 보안 규칙 (필요시 수정)

---

## 🔄 지도 탭 전체 플로우 및 시나리오

> **작성일**: 2026-01-14  
> **목적**: 지도 탭의 모든 사용자 시나리오를 체계적으로 정리하여 구현 시 누락 방지

---

### 📍 상태 정의

**지도 탭의 주요 상태**:
- **토글 상태**: "러닝모임" | "러닝카페"
- **Bottom Sheet 상태**: "부분 확장 (목록)" | "전체 확장 (상세)"
- **Bottom Sheet 내용**: "목록" | "모임 상세" | "카페 상세"
- **지도 중심 위치**: GPS 위치 | 검색 위치 | 마커 위치 | 사용자 이동 위치

---

### 🚀 시나리오 1: 최초 진입

#### 1-1. GPS 권한 승인 시

**플로우**:
```
1. 지도 탭 진입
   ↓
2. GPS 위치 권한 요청
   ↓
3. 권한 승인 ✅
   ↓
4. 현재 위치 가져오기 (로딩 인디케이터 표시)
   ↓
5. 지도 중심을 현재 위치로 설정
   ↓
6. 토글: "러닝모임" 기본 선택
   ↓
7. GeoFirestore 쿼리:
   - 모임 마커: 현재 위치 기준 반경 3km 내 모임 검색
   ↓
8. 지도에 마커 표시:
   - 모임 마커: 표시 (토글 "러닝모임" 선택)
   - 카페 마커: 숨김 (토글 "러닝카페" 미선택)
   ↓
9. 클러스터링 적용 (5개 이상 마커가 가까이 있을 때)
   ↓
10. Bottom Sheet 부분 확장 (아주 약간만 표시)
    ↓
11. Bottom Sheet 내용: 반경 3km 내 러닝모임 목록 (`MeetingCard` 컴포넌트)
```

**최종 상태**:
- 지도 중심: 사용자 현재 위치
- 토글: "러닝모임" 선택
- 마커: 모임 마커 표시
- Bottom Sheet: 부분 확장, 모임 목록 표시

**다음 가능한 액션**:
- 토글 변경 ("러닝카페" 클릭)
- 마커 클릭 (모임)
- 클러스터 클릭
- 검색바에서 검색
- 지도 클릭/드래그
- "현재위치" 버튼 클릭
- "이 지역에서 재검색" 버튼 클릭

---

#### 1-2. GPS 권한 거부 시

**플로우**:
```
1. 지도 탭 진입
   ↓
2. GPS 위치 권한 요청
   ↓
3. 권한 거부 ❌
   ↓
4. 얼러트 표시: "GPS 설정이 필요합니다"
   - 옵션: "취소" | "설정으로 이동"
   ↓
5. 지도 중심을 서울 중심으로 설정 (37.5665, 126.9780)
   ↓
6. 토글: "러닝모임" 기본 선택
   ↓
7. GeoFirestore 쿼리:
   - 모임 마커: 서울 중심 기준 반경 3km 내 모임 검색
   ↓
8. 지도에 마커 표시:
   - 모임 마커: 표시 (토글 "러닝모임" 선택)
   - 카페 마커: 숨김 (토글 "러닝카페" 미선택)
   ↓
9. 클러스터링 적용 (5개 이상 마커가 가까이 있을 때)
   ↓
10. Bottom Sheet 부분 확장 (아주 약간만 표시)
    ↓
11. Bottom Sheet 내용: 서울 중심 기준 반경 3km 내 러닝모임 목록
```

**최종 상태**:
- 지도 중심: 서울 중심 (37.5665, 126.9780)
- 토글: "러닝모임" 선택
- 마커: 모임 마커 표시
- Bottom Sheet: 부분 확장, 모임 목록 표시

**다음 가능한 액션**:
- 토글 변경 ("러닝카페" 클릭)
- 마커 클릭 (모임)
- 클러스터 클릭
- 검색바에서 검색
- 지도 클릭/드래그
- "현재위치" 버튼 클릭 (얼러트 재표시)
- "이 지역에서 재검색" 버튼 클릭

---

### 🔄 시나리오 2: 토글 변경

#### 2-1. "러닝모임" → "러닝카페" 변경

**플로우**:
```
1. 현재 상태: 토글 "러닝모임" 선택
   - 마커: 모임 마커 표시
   - Bottom Sheet: 모임 목록 또는 모임 상세 화면
   ↓
2. 사용자가 "러닝카페" 토글 클릭
   ↓
3. 토글 상태 변경: "러닝카페" 선택
   ↓
4. 지도 마커 업데이트:
   - 모임 마커: 숨김
   - 카페 마커: 표시 (현재 지도 중심 기준 반경 700m 내)
   ↓
5. 클러스터링 재적용 (표시된 마커 기준)
   ↓
6. Bottom Sheet 상태 변경:
   - 만약 모임 상세 화면이 표시 중이었다면 → 부분 확장으로 복귀
   - Bottom Sheet 내용: 반경 700m 내 러닝카페 목록
   ↓
7. Bottom Sheet 상단에 검색바 표시 (카페 모드 전용)
```

**최종 상태**:
- 토글: "러닝카페" 선택
- 마커: 카페 마커 표시
- Bottom Sheet: 부분 확장, 카페 목록 표시 (검색바 포함)

**다음 가능한 액션**:
- 토글 변경 ("러닝모임" 클릭)
- 카페 마커 클릭
- 클러스터 클릭
- 검색바에서 검색 (카페 모드 검색바)
- 지도 클릭/드래그
- "이 지역에서 재검색" 버튼 클릭

---

#### 2-2. "러닝카페" → "러닝모임" 변경

**플로우**:
```
1. 현재 상태: 토글 "러닝카페" 선택
   - 마커: 카페 마커 표시
   - Bottom Sheet: 카페 목록 또는 카페 상세 화면
   ↓
2. 사용자가 "러닝모임" 토글 클릭
   ↓
3. 토글 상태 변경: "러닝모임" 선택
   ↓
4. 지도 마커 업데이트:
   - 카페 마커: 숨김
   - 모임 마커: 표시 (현재 지도 중심 기준 반경 3km 내)
   ↓
5. 클러스터링 재적용 (표시된 마커 기준)
   ↓
6. Bottom Sheet 상태 변경:
   - 만약 카페 상세 화면이 표시 중이었다면 → 부분 확장으로 복귀
   - Bottom Sheet 내용: 반경 3km 내 러닝모임 목록
   ↓
7. Bottom Sheet 상단 검색바 표시 (모임 모드 검색바)
```

**최종 상태**:
- 토글: "러닝모임" 선택
- 마커: 모임 마커 표시
- Bottom Sheet: 부분 확장, 모임 목록 표시

**다음 가능한 액션**:
- 토글 변경 ("러닝카페" 클릭)
- 모임 마커 클릭
- 클러스터 클릭
- 검색바에서 검색 (상단 검색바 또는 Bottom Sheet 내부 검색바)
- 지도 클릭/드래그
- "이 지역에서 재검색" 버튼 클릭

---

### 📍 시나리오 3: 마커 클릭

#### 3-1. 모임 마커 클릭 (러닝모임 모드)

**플로우**:
```
1. 현재 상태: 토글 "러닝모임" 선택
   ↓
2. 사용자가 모임 마커 클릭
   ↓
3. 마커 위에 푯말(InfoWindow) 표시:
   - 모임 제목
   - 날짜
   - 시간
   ↓
4. 지도 중심을 해당 마커 위치로 이동 (자동)
   ↓
5. Bottom Sheet 전체 확장
   ↓
6. Bottom Sheet 내용: 모임 상세 화면 (`EventDetailScreen` 컴포넌트)
   ↓
7. 모임 상세 화면 표시:
   - 모임 정보 전체 표시
   - 하단 버튼: "참여하기" / "종료하기" / "나가기" (상황에 따라)
```

**최종 상태**:
- 지도 중심: 클릭한 모임 마커 위치
- Bottom Sheet: 전체 확장, 모임 상세 화면 표시
- 푯말: 모임 정보 표시

**다음 가능한 액션**:
- "참여하기" 버튼 클릭 (시나리오 9-1)
- "종료하기" 버튼 클릭 (시나리오 9-2)
- "나가기" 버튼 클릭 (시나리오 9-3)
- 참여자 목록에서 참여자 클릭 (시나리오 10-1)
- 지도 클릭/드래그 (시나리오 6)
- 다른 마커 클릭

---

#### 3-2. 카페 마커 클릭 (러닝카페 모드)

**플로우**:
```
1. 현재 상태: 토글 "러닝카페" 선택
   ↓
2. 사용자가 카페 마커 클릭
   ↓
3. 마커 위에 푯말(InfoWindow) 표시:
   - 카페 상호명
   - 대표 러닝인증 혜택 1개 (텍스트)
   ↓
4. 지도 중심을 해당 마커 위치로 이동 (자동)
   ↓
5. Bottom Sheet 전체 확장
   ↓
6. Bottom Sheet 내용: 카페 상세 정보
   - 카페 상호명
   - 카페 대표사진 3장
   - 러닝인증 할인 사진
   - 운영시간
   - 위치
   - 대표 메뉴
   - 카페 소개
```

**최종 상태**:
- 지도 중심: 클릭한 카페 마커 위치
- Bottom Sheet: 전체 확장, 카페 상세 정보 표시
- 푯말: 카페 정보 표시

**다음 가능한 액션**:
- 지도 클릭/드래그 (시나리오 6)
- 다른 마커 클릭
- 토글 변경

---

### 🔍 시나리오 4: 클러스터 클릭

#### 4-1. 클러스터 클릭 (러닝모임 모드)

**플로우**:
```
1. 현재 상태: 토글 "러닝모임" 선택
   - 클러스터 표시 중 (5개 이상 마커가 가까이 있을 때)
   - 클러스터 구성: 모임 마커 (토글로 이미 필터링됨)
   ↓
2. 사용자가 클러스터 클릭
   ↓
3. 지도 중심을 클러스터 중심으로 이동
   ↓
4. 지도 확대 레벨: level 5
   ↓
5. 클러스터가 분리되어 개별 마커로 표시되거나, 여전히 클러스터로 표시 (확대 정도에 따라)
   ↓
6. Bottom Sheet 부분 확장 (만약 전체 확장 상태였다면)
   ↓
7. Bottom Sheet 내용: 해당 클러스터 내 모임 목록 (`MeetingCard` 컴포넌트)
   - 클러스터 내 모든 모임 표시
   - 타입별 vs 통합 표시 불필요 (토글로 이미 필터링되어 모임만 표시됨)
```

**최종 상태**:
- 지도 중심: 클러스터 중심 위치
- 지도 확대 레벨: level 5
- 마커: 클러스터 분리 또는 유지 (확대 정도에 따라)
- Bottom Sheet: 부분 확장, 클러스터 내 모임 목록 표시

**다음 가능한 액션**:
- 목록에서 모임 클릭 (시나리오 3-2와 동일)
- 지도 클릭/드래그 (시나리오 6)
- 다른 마커/클러스터 클릭

---

#### 4-2. 클러스터 클릭 (러닝카페 모드)

**플로우**:
```
1. 현재 상태: 토글 "러닝카페" 선택
   - 클러스터 표시 중 (5개 이상 마커가 가까이 있을 때)
   - 클러스터 구성: 카페 마커 (토글로 이미 필터링됨)
   ↓
2. 사용자가 클러스터 클릭
   ↓
3. 지도 중심을 클러스터 중심으로 이동
   ↓
4. 지도 확대 레벨: level 5
   ↓
5. 클러스터가 분리되어 개별 마커로 표시되거나, 여전히 클러스터로 표시
   ↓
6. Bottom Sheet 부분 확장 (만약 전체 확장 상태였다면)
   ↓
7. Bottom Sheet 내용: 해당 클러스터 내 카페 목록
   - 클러스터 내 모든 카페 표시
   - 타입별 vs 통합 표시 불필요 (토글로 이미 필터링되어 카페만 표시됨)
```

**최종 상태**:
- 지도 중심: 클러스터 중심 위치
- 지도 확대 레벨: level 5
- 마커: 클러스터 분리 또는 유지
- Bottom Sheet: 부분 확장, 클러스터 내 카페 목록 표시

**다음 가능한 액션**:
- 목록에서 카페 클릭 (시나리오 3-3과 동일)
- 지도 클릭/드래그 (시나리오 6)
- 다른 마커/클러스터 클릭

---

### 🔎 시나리오 5: 검색

#### 5-1. 상단 검색바에서 장소 검색 (Kakao Places API)

**API 응답 구조 설명**:
- **"Kakao Places API는 항상 배열을 반환 (빈 배열일 수 있음)"의 의미**:
  - 검색 결과가 없어도 에러가 발생하지 않고, 정상적으로 빈 배열 `[]`을 반환
  - 예시:
    - 검색어 "부산 해운대" → 결과 있음: `[{ place_name: "해운대해수욕장", ... }, ...]`
    - 검색어 "존재하지않는장소123" → 결과 없음: `[]` (빈 배열)
  - 따라서 검색 결과가 없을 때도 API 호출은 성공하며, 빈 배열을 받게 됨
  - 에러 처리와 빈 결과 처리를 구분해야 함

**플로우**:
```
1. 현재 상태: 어떤 상태든 상관없음
   ↓
2. 사용자가 상단 검색바에 검색어 입력 (예: "부산 해운대")
   ↓
3. 검색 버튼 클릭 또는 Enter 키 입력
   ↓
4. Kakao Places API로 장소 검색
   ↓
5. 검색 결과 처리:
   - Kakao Places API는 항상 배열을 반환 (빈 배열일 수 있음)
   - 검색 결과 리스트를 드롭다운 형식으로 표시
   - 최대 5개 결과만 표시
   ↓
6-1. 검색 결과 있음 (배열에 항목이 있는 경우):
   - 드롭다운에 검색 결과 리스트 표시 (최대 5개)
   - 각 결과 항목: 장소명, 주소, 카테고리
   - 사용자가 검색 결과 선택
   ↓
6-2. 검색 결과 없음 (빈 배열인 경우):
   - "검색 결과가 없습니다" 알림 표시
   - 플로우 종료 (지도 이동 없음)
   ↓
7. 선택한 장소의 좌표로 지도 중심 이동
   ↓
8. 지도 확대 레벨: level 5
   ↓
9. GeoFirestore 쿼리:
   - 선택한 장소 기준 반경 3km 내 모임 검색
   - 선택한 장소 기준 반경 700m 내 카페 검색
   ↓
10. 지도에 마커 표시:
    - 모임/카페 마커: 검색한 위치 기준 반경 내 마커 표시
    - 토글 상태에 따라 해당 타입 마커만 표시
    ↓
11. 클러스터링 재적용
    ↓
12. Bottom Sheet 상태 변경:
    - 만약 전체 확장 상태였다면 → 부분 확장으로 복귀
    - Bottom Sheet 내용: 검색한 위치 기준 반경 내 목록 (토글 상태에 따라)
```

**최종 상태**:
- 지도 중심: 검색한 장소 위치
- 지도 확대 레벨: level 5
- 마커: 검색한 위치 기준 반경 내 마커 표시
- Bottom Sheet: 부분 확장, 검색한 위치 기준 목록 표시

**다음 가능한 액션**:
- 마커 클릭
- 클러스터 클릭
- 지도 클릭/드래그
- "이 지역에서 재검색" 버튼 클릭
- 토글 변경

---

#### 5-2. 상단 검색바에서 모임/카페 검색 (Firestore)

**플로우**:
```
1. 현재 상태: 어떤 상태든 상관없음
   ↓
2. 사용자가 상단 검색바에 검색어 입력 (예: "모닝러닝", "A카페")
   ↓
3. Firestore 검색:
   - 러닝모임 제목 (`events.title`)
   - 등록된 러닝카페 상호명 (`cafes.name`)
   - 러닝모임 태그 (`events.hashtags`)
   ↓
4-1. 검색 결과 있음:
   - 검색 결과 리스트 표시
   - 사용자가 검색 결과 선택
   ↓
4-2. 검색 결과 없음:
   - "등록되지 않았습니다" 알림 표시 (카페 검색 시)
   - 또는 검색 결과 없음 표시
   ↓
5. 선택한 모임/카페의 좌표로 지도 중심 이동
   ↓
6. 지도 확대 레벨: level 5
   ↓
7. 해당 마커가 지도 가운데에 나타나도록 표시
   ↓
8. 만약 모임을 선택했다면:
   - Bottom Sheet 전체 확장
   - 모임 상세 화면 표시 (시나리오 3-2와 동일)
   ↓
9. 만약 카페를 선택했다면:
   - Bottom Sheet 전체 확장
   - 카페 상세 정보 표시 (시나리오 3-3과 동일)
```

**최종 상태**:
- 지도 중심: 선택한 모임/카페 위치
- 지도 확대 레벨: level 5
- Bottom Sheet: 전체 확장, 모임/카페 상세 화면 표시

**다음 가능한 액션**:
- 모임 상세 화면에서의 액션 (시나리오 9)
- 지도 클릭/드래그 (시나리오 6)

---

#### 5-3. Bottom Sheet 내부 검색바에서 검색 (모임/카페 모드)

**플로우**:
```
1. 현재 상태: 토글 "러닝모임" 또는 "러닝카페" 선택
   - Bottom Sheet 부분 확장, 목록 표시 중
   ↓
2. 사용자가 Bottom Sheet 상단 검색바에 검색어 입력
   ↓
3. 현재 표시된 목록에서 필터링 (클라이언트 측)
   - 러닝모임 모드: 모임 제목, 모임 태그로 필터링
   - 러닝카페 모드: 카페 상호명으로 필터링
   ↓
4. 필터링된 목록만 Bottom Sheet에 표시
```

**최종 상태**:
- Bottom Sheet: 부분 확장, 필터링된 목록 표시

**다음 가능한 액션**:
- 목록에서 모임/카페 클릭 (시나리오 3-2 또는 3-3과 동일)
- 검색어 수정/삭제

---

### 🗺️ 시나리오 6: 지도 클릭/드래그

**플로우**:
```
1. 현재 상태: 어떤 상태든 상관없음
   ↓
2. 사용자가 지도를 클릭하거나 드래그
   ↓
3. 지도가 움직임 (정상 동작)
   ↓
4. Bottom Sheet가 부드러운 모션과 함께 최초 진입 시 높이로 자동 복귀
   - 만약 전체 확장 상태였다면 → 부분 확장으로 복귀
   - 만약 부분 확장 상태였다면 → 그대로 유지 (높이만 조정)
   ↓
5. Bottom Sheet 내용: 목록으로 복귀
   - 만약 모임 상세 화면이 표시 중이었다면 → 모임 목록으로 복귀
   - 만약 카페 상세 화면이 표시 중이었다면 → 카페 목록으로 복귀
   ↓
6. 마커는 업데이트하지 않음 (실시간 업데이트 안 함)
```

**최종 상태**:
- 지도 중심: 사용자가 이동한 위치
- Bottom Sheet: 부분 확장, 목록 표시
- 마커: 이전 위치 기준 마커 유지 (업데이트 안 됨)

**다음 가능한 액션**:
- "이 지역에서 재검색" 버튼 클릭 (시나리오 7)
- 마커 클릭
- 클러스터 클릭
- 토글 변경

---

### 🔄 시나리오 7: "이 지역에서 재검색" 버튼 클릭

**플로우**:
```
1. 현재 상태: 지도를 이동한 상태
   - 마커는 이전 위치 기준으로 표시 중
   - 지도 중심: 사용자가 이동한 위치 (앱 유저의 현재 위치 아님)
   ↓
2. 사용자가 "이 지역에서 재검색" 버튼 클릭
   ↓
3. 현재 지도 중심 좌표 가져오기
   - 의미: 지도 화면의 중심 좌표 (사용자가 지도를 이동한 후 화면 중앙에 있는 좌표)
   - 앱 유저의 현재 위치(GPS)가 아님
   - 카카오맵 API: `map.getCenter()` 또는 `map.getBounds()` 사용
   ↓
4. GeoFirestore 쿼리:
   - 현재 지도 중심 좌표 기준 반경 3km 내 모임 검색 (러닝모임 모드)
   - 현재 지도 중심 좌표 기준 반경 700m 내 카페 검색 (러닝카페 모드)
   ↓
5. 지도에 마커 업데이트:
   - 기존 마커 제거
   - 새로 검색한 마커 표시
   ↓
6. 클러스터링 재적용
   ↓
7. Bottom Sheet 내용 업데이트:
   - 현재 지도 중심 기준 반경 내 목록으로 업데이트
   - Bottom Sheet 높이: 부분 확장 유지
```

**최종 상태**:
- 지도 중심: 사용자가 이동한 위치
- 마커: 현재 지도 중심 기준 반경 내 마커 표시
- Bottom Sheet: 부분 확장, 현재 위치 기준 목록 표시

**다음 가능한 액션**:
- 마커 클릭
- 클러스터 클릭
- 지도 클릭/드래그
- 토글 변경

---

### 📍 시나리오 8: "현재위치" 버튼 클릭

#### 8-1. GPS 권한 승인 상태

**플로우**:
```
1. 현재 상태: 어떤 상태든 상관없음
   ↓
2. 사용자가 "현재위치" 버튼 클릭
   ↓
3. 현재 위치 가져오기
   ↓
4. 지도 중심을 현재 위치로 이동
   ↓
5. GeoFirestore 쿼리:
   - 현재 위치 기준 반경 3km 내 모임 검색 (러닝모임 모드)
   - 현재 위치 기준 반경 700m 내 카페 검색 (러닝카페 모드)
   ↓
6. 지도에 마커 업데이트
   ↓
7. 클러스터링 재적용
   ↓
8. Bottom Sheet 내용 업데이트:
   - 현재 위치 기준 반경 내 목록으로 업데이트
   - Bottom Sheet 높이: 부분 확장 유지 (만약 전체 확장 상태였다면)
```

**최종 상태**:
- 지도 중심: 사용자 현재 위치
- 마커: 현재 위치 기준 반경 내 마커 표시
- Bottom Sheet: 부분 확장, 현재 위치 기준 목록 표시

**다음 가능한 액션**:
- 마커 클릭
- 클러스터 클릭
- 지도 클릭/드래그
- "이 지역에서 재검색" 버튼 클릭

---

#### 8-2. GPS 권한 거부 상태

**플로우**:
```
1. 현재 상태: GPS 권한 거부 상태
   ↓
2. 사용자가 "현재위치" 버튼 클릭
   ↓
3. 얼러트 표시: "GPS 설정이 필요합니다"
   - 옵션: "취소" | "설정으로 이동"
   ↓
4. "설정으로 이동" 선택 시:
   - 시스템 설정 화면으로 이동
   ↓
5. "취소" 선택 시:
   - 플로우 종료 (현재 상태 유지)
```

**최종 상태**:
- 변경 없음 (이전 상태 유지)

**다음 가능한 액션**:
- 기존과 동일

---

### 🎯 시나리오 9: 모임 상세 화면에서의 액션

#### 9-1. "참여하기" 버튼 클릭 (참여하지 않은 모임)

**플로우**:
```
1. 현재 상태: Bottom Sheet 전체 확장, 모임 상세 화면 표시
   - 하단 버튼: "참여하기"
   ↓
2. 사용자가 "참여하기" 버튼 클릭
   ↓
3. "모임 참여" 알림 표시
   - 옵션: "취소" | "참여하기"
   ↓
4. "참여하기" 선택
   ↓
5. `EventContext.joinEvent()` 함수 호출
   ↓
6. 모임 참여 완료
   ↓
7. "채팅방으로 이동하시겠습니까?" 알림 표시
   - 옵션: "취소" | "네"
   ↓
8-1. "네" 선택:
   - `navigation.navigate('Chat', { eventId: ... })` 호출
   - 전체 화면으로 `ChatScreen` 표시
   - Bottom Sheet는 닫힘
   ↓
8-2. "취소" 선택:
   - Bottom Sheet 상태 업데이트
   - 하단 버튼이 "나가기"로 변경
   - Bottom Sheet는 그대로 유지 (전체 확장 상태)
```

**최종 상태 (8-1)**:
- 화면: `ChatScreen` (전체 화면)
- Bottom Sheet: 닫힘

**최종 상태 (8-2)**:
- Bottom Sheet: 전체 확장, 모임 상세 화면 표시
- 하단 버튼: "나가기"로 변경

**다음 가능한 액션 (8-1)**:
- `ChatScreen`에서의 액션
- 뒤로 가기로 `MapScreen`으로 돌아오기 (시나리오 11)

**다음 가능한 액션 (8-2)**:
- "나가기" 버튼 클릭 (시나리오 9-3)
- 지도 클릭/드래그 (시나리오 6)
- 참여자 목록에서 참여자 클릭 (시나리오 10-1)

---

#### 9-2. "종료하기" 버튼 클릭 (내가 생성한 모임)

**플로우**:
```
1. 현재 상태: Bottom Sheet 전체 확장, 모임 상세 화면 표시
   - 하단 버튼: "종료하기" (검은 배경, 흰 아이콘)
   ↓
2. 사용자가 "종료하기" 버튼 클릭
   ↓
3. "모임 종료" 알림 표시
   - 옵션: "취소" | "종료하기"
   ↓
4. "종료하기" 선택
   ↓
5. 모임 종료 처리
   ↓
6. Bottom Sheet 상태 변경:
   - 전체 확장 → 부분 확장으로 복귀
   - Bottom Sheet 내용: 모임 목록으로 복귀
   - **종료된 모임이 목록에서 제거됨** (Bottom Sheet의 간단한 러닝모임 카드에서도 사라짐)
   ↓
7. 지도에서 해당 모임 마커 제거
   - **러닝모임 마커가 지도에서 사라짐**
```

**최종 상태**:
- Bottom Sheet: 부분 확장, 모임 목록 표시 (종료된 모임 제외)
  - **간단한 러닝모임 카드에서도 종료된 모임이 사라짐**
- 마커: 종료된 모임 마커 제거 (지도에서 사라짐)
  - **러닝모임 마커가 지도에서 제거됨**

**다음 가능한 액션**:
- 목록에서 다른 모임 클릭
- 마커 클릭
- 지도 클릭/드래그

---

#### 9-3. "나가기" 버튼 클릭 (내가 참여한 모임)

**플로우**:
```
1. 현재 상태: Bottom Sheet 전체 확장, 모임 상세 화면 표시
   - 하단 버튼: "나가기" (빨간 배경, 흰 아이콘)
   ↓
2. 사용자가 "나가기" 버튼 클릭
   ↓
3. "모임 나가기" 알림 표시
   - 옵션: "취소" | "나가기"
   ↓
4. "나가기" 선택
   ↓
5. 모임에서 나가기 처리
   ↓
6. Bottom Sheet 상태 업데이트:
   - 하단 버튼이 "참여하기"로 변경
   - Bottom Sheet는 그대로 유지 (전체 확장 상태)
```

**최종 상태**:
- Bottom Sheet: 전체 확장, 모임 상세 화면 표시
- 하단 버튼: "참여하기"로 변경

**다음 가능한 액션**:
- "참여하기" 버튼 클릭 (시나리오 9-1)
- 지도 클릭/드래그 (시나리오 6)
- 참여자 목록에서 참여자 클릭 (시나리오 10-1)

---

### 👥 시나리오 10: Bottom Sheet 내부 네비게이션

#### 10-1. 참여자 목록에서 참여자 클릭

**플로우**:
```
1. 현재 상태: Bottom Sheet 전체 확장, 모임 상세 화면 표시
   - 참여자 목록 표시 중
   ↓
2. 사용자가 참여자 목록에서 참여자 클릭
   ↓
3. `navigation.navigate('Participant', { userId: ... })` 호출
   ↓
4. 전체 화면으로 `ParticipantScreen` 표시
   ↓
5. Bottom Sheet는 그대로 유지 (화면 뒤에 있음)
```

**최종 상태**:
- 화면: `ParticipantScreen` (전체 화면)
- Bottom Sheet: 화면 뒤에 유지 (보이지 않음)

**다음 가능한 액션**:
- `ParticipantScreen`에서의 액션
- 뒤로 가기로 `MapScreen`으로 돌아오기 (시나리오 11)

---

#### 10-2. 모임 상세 화면에서 채팅방으로 이동

**플로우**:
```
1. 현재 상태: Bottom Sheet 전체 확장, 모임 상세 화면 표시
   - 사용자가 이미 참여한 모임
   ↓
2. 사용자가 채팅방 이동 버튼 클릭 (또는 "참여하기" 후 "네" 선택)
   ↓
3. `navigation.navigate('Chat', { eventId: ... })` 호출
   ↓
4. 전체 화면으로 `ChatScreen` 표시
   ↓
5. Bottom Sheet는 닫힘
```

**최종 상태**:
- 화면: `ChatScreen` (전체 화면)
- Bottom Sheet: 닫힘

**다음 가능한 액션**:
- `ChatScreen`에서의 액션
- 뒤로 가기로 `MapScreen`으로 돌아오기 (시나리오 11)

---

### 🔙 시나리오 11: 다른 화면에서 MapScreen으로 돌아오기

**플로우**:
```
1. 현재 상태: `ChatScreen` 또는 `ParticipantScreen` 표시 중
   ↓
2. 사용자가 뒤로 가기로 `MapScreen`으로 돌아옴
   ↓
3. `MapScreen`의 `useFocusEffect` 또는 `useEffect` 실행
   ↓
4. Bottom Sheet 상태 초기화:
   - 전체 확장 → 부분 확장으로 복귀
   - Bottom Sheet 내용: 목록으로 복귀
   ↓
5. 지도 상태는 유지 (이전 위치, 마커 등)
```

**최종 상태**:
- 화면: `MapScreen`
- Bottom Sheet: 부분 확장, 목록 표시
- 지도: 이전 상태 유지

**다음 가능한 액션**:
- 목록에서 모임/카페 클릭
- 마커 클릭
- 지도 클릭/드래그
- 토글 변경

---

### 📋 시나리오 요약 테이블

| 시나리오 | 트리거 | 지도 변화 | Bottom Sheet 변화 | 마커 변화 |
|---------|--------|----------|------------------|----------|
| 최초 진입 (GPS 승인) | 지도 탭 진입 | 현재 위치로 이동 | 부분 확장, 목록 | 반경 3km 내 마커 표시 |
| 최초 진입 (GPS 거부) | 지도 탭 진입 | 서울 중심으로 이동 | 부분 확장, 목록 | 서울 중심 기준 마커 표시 |
| 토글 변경 (모임→카페) | "러닝카페" 클릭 | 변경 없음 | 목록 변경 (카페 목록) | 모임 마커 숨김, 카페 마커 표시 |
| 토글 변경 (카페→모임) | "러닝모임" 클릭 | 변경 없음 | 목록 변경 (모임 목록) | 카페 마커 숨김, 모임 마커 표시 |
| 모임 마커 클릭 | 마커 클릭 | 해당 위치로 이동 | 전체 확장, 모임 상세 | 변경 없음 |
| 카페 마커 클릭 | 마커 클릭 | 해당 위치로 이동 | 전체 확장, 카페 상세 | 변경 없음 |
| 클러스터 클릭 | 클러스터 클릭 | 클러스터 중심으로 이동 (레벨 5) | 부분 확장, 클러스터 내 목록 | 클러스터 분리 또는 유지 |
| 장소 검색 (Kakao) | 검색바 검색 | 검색 위치로 이동 | 부분 확장, 검색 위치 기준 목록 | 검색 위치 기준 마커 표시 |
| 모임/카페 검색 | 검색바 검색 | 검색 위치로 이동 | 전체 확장, 상세 화면 | 변경 없음 |
| 지도 클릭/드래그 | 지도 조작 | 사용자가 이동한 위치 | 부분 확장으로 복귀 | 변경 없음 |
| 재검색 버튼 | 버튼 클릭 | 변경 없음 | 목록 업데이트 | 현재 위치 기준 마커 업데이트 |
| 현재위치 버튼 | 버튼 클릭 | 현재 위치로 이동 | 목록 업데이트 | 현재 위치 기준 마커 업데이트 |
| 참여하기 | 버튼 클릭 | 변경 없음 | 버튼 "나가기"로 변경 또는 ChatScreen 이동 | 변경 없음 |
| 종료하기 | 버튼 클릭 | 변경 없음 | 부분 확장으로 복귀, 목록 (종료된 모임 제외) | 해당 모임 마커 제거 (지도에서 사라짐) |
| 나가기 | 버튼 클릭 | 변경 없음 | 버튼 "참여하기"로 변경 | 변경 없음 |
| MapScreen 복귀 | 뒤로 가기 | 변경 없음 | 부분 확장으로 초기화, 목록 | 변경 없음 |

---

## 🔍 남은 논의 사항

### 1. 데이터 수집 및 관리

#### 1.1 마이 대시보드 데이터 수집 로직
- **결정**: ✅ **추후 논의** (카페 스탬프 기능 구현 시 함께 논의)
- **추후 논의 사항**:
  - 카페 방문 횟수 추적 방법
  - 모임 장소 개설 횟수 카운트 방법
  - 데이터 수집 주기 및 만료 정책

#### 1.2 카페 데이터 구조 필드명
- **논의 필요**:
  - 카페 상세 정보에 필요한 모든 필드명 확정 필요
  - 러닝인증 혜택 데이터 구조 (텍스트? 이미지? 둘 다?)
  - 운영시간 데이터 형식 (문자열? 구조화된 객체?)

### 2. 검색 기능

**참고**: 검색 결과 UI/UX 및 검색어 타입 자동 감지 로직은 "핵심 결정 사항" 섹션 2.3, 2.4에 상세히 정리되어 있습니다.

### 3. 클러스터링

#### 3.1 클러스터 내 항목이 매우 많을 때
- **결정**: ✅ **추후 정하도록 함**
- 해당 상황이 발생하면 그때 결정

### 4. Bottom Sheet 구현

#### 4.1 EventDetailScreen 통합
- **결정**: ✅ **구현하면서 확인**
- `EventDetailScreen`이 Bottom Sheet 내부에서 제대로 동작하는지: 구현 시 확인
- 네비게이션 처리 (ParticipantScreen, ChatScreen으로 이동 시): 구현 시 확인

### 5. 성능 및 최적화

#### 5.1 GeoFirestore 쿼리 성능
- **결정**: ✅ **구현하면서 테스트 후 결정**
- 반경 3km 쿼리 성능 테스트 필요
- 동시에 여러 쿼리를 실행할 때 성능 영향
- 캐싱 전략 (얼마나 오래 캐싱할지?)

### 6. 테스트 및 검증

#### 6.1 테스트 시나리오
- **결정**: ✅ **개발하면서 진행할 예정**
- 각 시나리오별 테스트 케이스 작성 필요
- 특히 복잡한 플로우 (모임 생성 → 위치 선택 → 지도에서 상세 설정) 테스트

---

## 📝 구현 준비 상태

### ✅ 결정 완료 사항
- 데이터 구조 및 저장소 전략
- 검색 기능 및 결과 표시 방식
- 클러스터링 구현 방식
- 모임 생성 시 위치 선택 플로우
- 공유 이미지 place 입력 UI/UX
- Bottom Sheet 구현 방식
- 오프라인 동작 및 캐시 전략
- 에러 처리 방식

### 🔄 구현 중 결정 사항
- GeoFirestore 쿼리 성능 최적화 (구현하면서 테스트)
- EventDetailScreen Bottom Sheet 통합 (구현하면서 확인)
- 테스트 시나리오 (개발하면서 진행)

### 📋 추후 논의 사항
- 마이 대시보드 데이터 수집 로직 (카페 스탬프 기능 구현 시)
- 카페 데이터 구조 필드명 확정
- 클러스터 내 항목이 매우 많을 때 처리 방법

---

## 🏪 러닝카페 입점 기능 프로젝트

> **상태**: 기획 단계  
> **작성일**: 2026-01-14  
> **목적**: 관리자 대시보드를 통한 러닝카페 입점 및 앱 내 표시 기능 구현

---

### 📋 프로젝트 개요

#### 목표
- 관리자 대시보드(`runon-admin-dashboard`)에서 러닝카페 상세 정보를 입력하고 관리
- 러논 앱의 지도 탭에서 입점 러닝카페를 마커로 표시
- Bottom Sheet의 러닝카페 카드 및 상세 정보 화면에 카페 정보 표시

#### 범위
1. **관리자 대시보드 (runon-admin-dashboard)**
   - 러닝카페 상세 정보 입력 폼
   - 카페 정보 관리 (생성, 수정, 삭제)
   - 이미지 업로드 및 관리
   - Firestore에 카페 데이터 저장

2. **러논 앱 (RunOn-App)**
   - Firestore `cafes` 컬렉션에서 카페 데이터 로드
   - 지도 탭에 카페 마커 표시
   - Bottom Sheet에 러닝카페 카드 표시
   - 러닝카페 상세 정보 화면 구현

---

### 🎯 핵심 결정 사항

#### 1. 카페 데이터 구조
- **결정**: ✅ Firestore `cafes` 컬렉션 사용 (이미 리뉴얼 계획에 포함됨)
- **필수 필드**:
  - `id`: 카페 고유 ID
  - `name`: 카페 상호명
  - `category`: 업종 (카페, 음식점, 러닝샵 중 선택)
  - `description`: 카페 소개
  - `coordinates`: GeoPoint (GeoFirestore용)
  - `address`: 주소
  - `operatingHours`: 운영시간 (구조화된 객체 - 요일별)
  - `mainMenu`: 대표 메뉴
  - `images`: 이미지 경로 배열
  - `runningCertificationImage`: 러닝인증 이미지 경로
  - `runningCertificationBenefit`: 러닝인증 혜택 텍스트
  - `instagramLink`: 인스타그램 링크 (선택)
  - `createdAt`: 생성일시
  - `updatedAt`: 수정일시

#### 2. 카페 상세 정보 UI
- **결정**: ✅ 리뉴얼 계획에 이미 정의됨
- **레이아웃**:
  1. **[상호명] [업종]** (라벨) - 상호명 우측에 업종 표시
     - 예: "스타벅스 강남점" "카페" 또는 "맛있는 식당" "음식점"
  2. **현재 위치에서 xx km** (거리 표시)
  3. **[사진 2장 + 러닝인증 이미지 1장]** - 가로로 슬라이드 가능, 사진 클릭 시 크게 보기
  4. **[현재 날짜에 따라 영업시간 표시]** (요일별 운영시간에서 현재 요일 표시)
  5. **인스타그램 링크** (있는 경우)
- **폰트 크기 및 사진 크기**: UX 친화적으로 설정

#### 3. 이미지 관리
- **결정**: ✅ **Firebase Storage 사용**
- **이미지 저장**: Firebase Storage에 업로드, Firestore에 다운로드 URL 저장
- **리사이징**: ✅ **Bottom Sheet에 표시되는 적절한 사이즈로 리사이징**
- **이미지 개수 제한**: ✅ **최대 3장**
  - 카페 사진: 2장
  - 러닝인증 이미지: 1장 (필수)

---

### 📝 기능별 상세 사양

#### 1. 관리자 대시보드 기능

##### 1.1 러닝카페 등록 폼
**입력 필드**:
- 카페 상호명 (필수)
- 업종 (필수) - 선택 가능 (카페, 음식점, 러닝샵)
- 카페 소개 (필수)
- 주소 (필수)
- 좌표 (위도, 경도) - 지도에서 선택 또는 직접 입력
- 운영시간 (필수)
  - 요일별 운영시간 입력 (월요일 ~ 일요일)
  - 각 요일별로 시작 시간, 종료 시간 입력
- 대표 메뉴 (선택)
- 카페 사진 (2장, 필수)
  - 파일 선택 또는 드래그 앤 드롭 지원
  - Firebase Storage에 업로드
  - Bottom Sheet 표시 사이즈로 리사이징
- 러닝인증 이미지 (1장, 필수)
  - 파일 선택 또는 드래그 앤 드롭 지원
  - Firebase Storage에 업로드
  - Bottom Sheet 표시 사이즈로 리사이징
- 러닝인증 대표 혜택 텍스트 (필수) - 푯말에 표시될 텍스트
- 인스타그램 링크 (선택)

**기능**:
- 폼 유효성 검사
- 이미지 업로드 및 미리보기 (파일 선택 및 드래그 앤 드롭 지원)
- 이미지 리사이징 (Bottom Sheet 표시 사이즈)
- Firebase Storage에 이미지 업로드
- 지도에서 위치 선택 기능
- Firestore에 데이터 저장
- GeoFirestore `coordinates` 필드 자동 생성

##### 1.2 러닝카페 관리
**기능**:
- 등록된 카페 목록 조회
- 카페 정보 수정
- 카페 삭제
- 카페 상태 관리 (활성/비활성)

#### 2. 러논 앱 기능

##### 2.1 지도 탭 카페 마커 표시
- **데이터 소스**: Firestore `cafes` 컬렉션
- **표시 조건**: 
  - 반경 700m 내 카페 (러닝카페 모드)
  - 반경 3km 내 카페 ("이 지역에서 재검색" 버튼 클릭 시)
- **마커 스타일**: 파란색 `#3AF8FF`, 핀 모양
- **마커 클릭 시**: Bottom Sheet 전체 확장, 카페 상세 정보 표시

##### 2.2 Bottom Sheet 러닝카페 카드
- **최초 진입 시**: 반경 700m 내 카페 목록 표시
- **카드 정보**:
  - 카페 상호명
  - 카페 소개
  - 대표사진 2장
- **카드 클릭 시**: Bottom Sheet 전체 확장, 카페 상세 정보 표시

##### 2.3 러닝카페 상세 정보 화면
- **표시 위치**: Bottom Sheet 내부 (전체 확장 시)
- **레이아웃**: 리뉴얼 계획에 정의된 UI/UX 사용
- **기능**:
  - 사진 슬라이드 (가로 스크롤)
  - 사진 클릭 시 크게 보기
  - 현재 날짜 기준 영업시간 표시
  - 러닝인증 혜택 표시

---

### 🔧 기술적 구현 사항

#### 1. Firestore 데이터 구조

**`cafes` 컬렉션**:
```javascript
{
  id: "cafe-id-123",
  name: "카페 상호명",
  category: "카페",  // 업종: "카페", "음식점", "러닝샵" 중 하나
  description: "카페 소개",
  coordinates: GeoPoint(37.5234, 127.1267),  // GeoFirestore용
  g: "wyb1",  // Geohash (GeoFirestore가 자동 생성)
  l: GeoPoint(37.5234, 127.1267),  // GeoPoint (GeoFirestore가 자동 생성)
  address: "서울시 강동구...",
  operatingHours: {
    // 구조화된 객체 - 요일별로 구분
    monday: { open: "09:00", close: "22:00" },
    tuesday: { open: "09:00", close: "22:00" },
    wednesday: { open: "09:00", close: "22:00" },
    thursday: { open: "09:00", close: "22:00" },
    friday: { open: "09:00", close: "22:00" },
    saturday: { open: "10:00", close: "23:00" },
    sunday: { open: "10:00", close: "23:00" }
    // 또는 휴무일: null 또는 "closed"
  },
  mainMenu: "아메리카노, 라떼, 케이크",
  images: [
    "https://firebasestorage.googleapis.com/.../cafe-image1.jpg",  // Firebase Storage URL
    "https://firebasestorage.googleapis.com/.../cafe-image2.jpg"   // 카페 사진 2장
  ],
  runningCertificationImage: "https://firebasestorage.googleapis.com/.../running-cert.jpg",  // Firebase Storage URL
  runningCertificationBenefit: "러닝인증 시 10% 할인",  // 푯말에 표시될 대표 혜택 텍스트
  instagramLink: "https://instagram.com/cafe_name",  // 선택 필드
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 2. 관리자 대시보드 구현

**인증 및 권한 관리**:
- **인증**: Firebase Auth (이메일/비밀번호)
- **권한 체크**: Firestore `admins` 컬렉션에서 관리자 UID 확인
  ```javascript
  // Firestore 구조
  admins/
    {adminUID1}/  // 문서 ID가 관리자 UID
    {adminUID2}/
    ...
  
  // 권한 확인 함수
  async function checkAdminPermission(userUID) {
    const adminRef = doc(firestore, 'admins', userUID);
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists();
  }
  ```

**필요한 기능**:
- Firestore 연결 및 인증
  - **인증 방식**: ✅ **Firebase Auth 사용** (이메일/비밀번호)
  - **권한 체크**: ✅ **관리자 UID 목록 확인 방식**
    - Firestore에 `admins` 컬렉션 생성
    - 관리자 UID를 문서 ID로 저장 (예: `admins/{adminUID}`)
    - 로그인한 사용자의 UID가 `admins` 컬렉션에 있는지 확인
    - 있으면 관리자 권한, 없으면 일반 사용자로 처리
- 이미지 업로드 기능
  - Firebase Storage에 업로드
  - 파일 선택 및 드래그 앤 드롭 지원
  - 이미지 리사이징 (Bottom Sheet 표시 사이즈)
- 지도 API 연동 (위치 선택)
- 폼 유효성 검사
- GeoFirestore `coordinates` 필드 생성

#### 3. 러논 앱 구현

**필요한 기능**:
- `services/firestoreService.js`에 `getCafesNearby` 함수 (이미 리뉴얼 계획에 포함)
- 카페 마커 렌더링
- Bottom Sheet 카페 카드 컴포넌트
- 카페 상세 정보 화면 컴포넌트

---

### 📋 구현 순서 및 체크리스트

#### Phase 1: 데이터 구조 설계
- [x] 카페 데이터 구조 필드명 최종 확정
- [x] 운영시간 데이터 형식 결정 (구조화된 객체 - 요일별)
- [x] 러닝인증 혜택 데이터 구조 결정 (대표 혜택 텍스트 + 러닝인증 이미지)
- [x] 카페 상세 정보 추가 필드 결정 (인스타그램 링크)
- [ ] Firestore `cafes` 컬렉션 스키마 정의 (위 결정 사항 반영)

#### Phase 2: 관리자 대시보드 구현
- [ ] Firebase Auth 인증 구현 (이메일/비밀번호)
  - 로그인 화면 UI/UX 구현 (기존 사용자 관리 화면과 통합)
  - 로그인 상태 유지 기능 구현 (세션 관리)
- [ ] Firestore `admins` 컬렉션 생성 및 관리자 UID 등록
  - 기존 관리자 대시보드에 관리자 UID 등록 기능 추가
- [ ] 관리자 권한 체크 기능 구현
  - 로그인 시 한 번만 권한 체크 (Firestore `admins` 컬렉션 확인)
  - 권한이 없는 사용자 접근 시 에러 메시지 표시
- [ ] 러닝카페 등록 폼 UI 구현
  - 업종 선택 필드 (카페, 음식점, 러닝샵)
  - 요일별 운영시간 입력 필드
  - 인스타그램 링크 입력 필드
- [ ] 이미지 업로드 기능 구현
  - Firebase Storage 연동
  - 파일 선택 및 드래그 앤 드롭 지원
  - 이미지 리사이징 (Bottom Sheet 표시 사이즈)
  - 카페 사진 2장, 러닝인증 이미지 1장 업로드
- [ ] 지도에서 위치 선택 기능 구현
- [ ] 폼 유효성 검사 구현
- [ ] Firestore에 카페 데이터 저장 기능 구현
- [ ] GeoFirestore `coordinates` 필드 자동 생성
- [ ] 카페 목록 조회 기능 구현
  - 페이지네이션 구현
  - 검색 기능 (상호명, 주소)
  - 정렬 기능 (등록일순서)
- [ ] 카페 정보 수정 기능 구현
  - 모든 필드 수정 가능
  - 이미지 교체 시 기존 이미지 삭제
  - 수정 이력 기록
- [ ] 카페 삭제 기능 구현
  - 완전 삭제 (하드 삭제)
  - 연관된 이미지도 함께 삭제

#### Phase 3: 러논 앱 카페 표시 기능
- [ ] `services/firestoreService.js`에 `getCafesNearby` 함수 구현 (리뉴얼 계획에 포함)
- [ ] Firebase Storage에서 이미지 다운로드 기능 구현
- [ ] 지도 탭에 카페 마커 표시 기능 구현
- [ ] Bottom Sheet 러닝카페 카드 컴포넌트 구현
- [ ] 카페 상세 정보 화면 컴포넌트 구현
  - 상호명 우측에 업종 라벨 표시
  - 카페 사진 2장 + 러닝인증 이미지 1장 슬라이드
  - 현재 날짜 기준 영업시간 표시 (요일별 운영시간에서 현재 요일 표시)
  - 인스타그램 링크 표시 (있는 경우)
- [ ] 이미지 슬라이드 기능 구현
- [ ] 현재 날짜 기준 영업시간 표시 로직 구현

#### Phase 4: 테스트 및 검증
- [ ] 관리자 대시보드에서 카페 등록 테스트
- [ ] 앱에서 카페 마커 표시 테스트
- [ ] Bottom Sheet 카페 카드 표시 테스트
- [ ] 카페 상세 정보 화면 테스트
- [ ] 이미지 로딩 및 표시 테스트
- [ ] 영업시간 표시 로직 테스트

---

### 🔍 논의 필요 사항 및 구현 시 확인 사항

#### 1. 데이터 구조
- **결정**: ✅ **구조화된 객체 - 요일별로 구분**
  - 요일별로 운영시간 입력 (월요일 ~ 일요일)
  - 각 요일별로 시작 시간, 종료 시간 저장
  - 휴무일은 `null` 또는 `"closed"`로 표시
- **결정**: ✅ **러닝인증 혜택 데이터 구조**
  - 대표 혜택 텍스트: 푯말에 표시될 텍스트 (필수)
  - 러닝인증 이미지: 카페 상세 정보에 표시될 이미지 1장 (필수)
- **결정**: ✅ **카페 상세 정보 추가 필드**
  - 인스타그램 링크 (선택)

#### 2. 이미지 관리
- **결정**: ✅ **Firebase Storage 사용**
- **결정**: ✅ **리사이징 필요** (Bottom Sheet에 표시되는 적절한 사이즈)
- **결정**: ✅ **이미지 개수 제한**
  - 카페 사진: 2장
  - 러닝인증 이미지: 1장 (필수)
  - 총 최대 3장

#### 3. 관리자 대시보드
- **결정**: ✅ **인증 방식**: Firebase Auth 사용 (이메일/비밀번호)
  - 기존 러논 앱과 동일한 인증 시스템 사용
- **결정**: ✅ **권한 체크 방식**: 관리자 UID 목록 확인
  - **구현 방법**:
    1. Firestore에 `admins` 컬렉션 생성
    2. 관리자 UID를 문서 ID로 저장 (예: `admins/{adminUID}`)
    3. 로그인한 사용자의 UID가 `admins` 컬렉션에 있는지 확인
    4. 있으면 관리자 권한 부여, 없으면 접근 거부
  - **예시 코드**:
    ```javascript
    // 관리자 권한 확인 함수
    async function isAdmin(userUID) {
      const adminRef = doc(firestore, 'admins', userUID);
      const adminSnap = await getDoc(adminRef);
      return adminSnap.exists();
    }
    ```
- **결정**: ✅ **이미지 업로드 방식**: 파일 선택 및 드래그 앤 드롭 둘 다 지원

#### 4. 앱 기능
- **결정**: ✅ **대시보드에 입력한 카페 정보가 러논 앱 지도 탭에 표시**
  - 카페 마커 표시
  - Bottom Sheet 카페 카드 표시
  - 카페 상세 정보 화면 표시
- **추후 구현 가능 기능**:
  - 카페 검색 기능 (Bottom Sheet 내부 검색바)
  - 카페 즐겨찾기 기능 (마이 대시보드)
  - 카페 리뷰 기능

---

### ⚠️ 구현 시 확인 필요 사항

#### 1. 이미지 관리 세부 사항
- **✅ 결정**: **Bottom Sheet 표시 사이즈는 Bottom Sheet 구현 후 진행**
  - Bottom Sheet가 구현되면 실제 표시 크기를 측정하여 리사이징 크기 결정
  - 현재는 리사이징 필요성만 확인하고, 구체적 크기는 추후 결정

- **✅ 결정**: **이미지 리사이징 라이브러리는 구현 시 적절하게 선택**
  - 브라우저 환경: `browser-image-compression` (권장) 또는 `react-image-crop`
  - 서버 사이드: `sharp` (Node.js, 권장) 또는 `jimp`
  - 구현 시 성능 및 호환성을 고려하여 선택

- **✅ 결정**: **이미지 파일 형식 제한: JPG, PNG만 허용**
  - 허용 형식: `.jpg`, `.jpeg`, `.png`
  - WebP, GIF 등은 제외
  - 업로드 전 파일 확장자 검증 필요

- **✅ 결정**: **이미지 최대 파일 크기: 10MB**
  - 업로드 전 원본 파일 크기 제한: 10MB
  - 리사이징 후 목표 파일 크기: 구현 시 결정 (일반적으로 500KB ~ 1MB 권장)
  - 파일 크기 초과 시 에러 메시지 표시

- **✅ 결정**: **Firebase Storage 경로 구조**
  ```
  cafes/
    {cafeId}/
      cafe-images/
        {timestamp}-{originalFileName}.jpg  // 카페 사진 2장
      running-cert/
        {timestamp}-running-cert.jpg  // 러닝인증 이미지 1장
  ```
  - 카페별로 폴더 구분 (`cafes/{cafeId}/`)
  - 카페 사진과 러닝인증 이미지를 별도 폴더로 구분 (`cafe-images/`, `running-cert/`)
  - 파일명에 타임스탬프 포함하여 중복 방지
  - **예시**: `cafes/cafe-123/cafe-images/1705123456789-cafe-photo-1.jpg`

#### 2. 지도 API 및 위치 선택
- **✅ 결정**: **Kakao Maps API (웹 SDK) 사용**
  - 기존 앱에서 Kakao Maps API 사용 중이므로 일관성 유지
  - Kakao Maps JavaScript SDK 사용

- **✅ 결정**: **위치 선택 방식: 지도에서 클릭으로 선택**
  - 지도에서 클릭한 위치의 좌표를 자동으로 입력 필드에 설정
  - 클릭한 위치에 마커 표시
  - 좌표 직접 입력 기능은 제공하지 않음 (카카오맵 사용으로 불필요)

- **✅ 결정**: **주소 검색 기능 구현**
  - Kakao Places API를 사용하여 주소 검색 기능 제공
  - 검색 결과 선택 시 해당 위치로 지도 자동 이동
  - 지도 이동 후 클릭으로 정확한 위치 선택 가능
  - 리뉴얼 계획의 Kakao Places API 통합과 일관성 유지

#### 3. 운영시간 입력 UI/UX
- **✅ 결정**: **운영시간 입력 방식: TimePicker 사용**
  - Material-UI의 `TimePicker` 컴포넌트 또는 `@mui/x-date-pickers`의 `TimePicker` 사용
  - 각 요일별로 시작 시간, 종료 시간을 TimePicker로 선택
  - 사용자 편의성 및 입력 오류 방지

- **✅ 결정**: **휴무일 처리 방식: 체크박스로 휴무일 선택**
  - 각 요일 옆에 체크박스 제공
  - 체크박스 선택 시 해당 요일은 휴무일로 처리
  - 휴무일 데이터 저장 형식: `null` 또는 `{ open: null, close: null }` (구현 시 결정)
  - 체크박스 선택 시 시간 입력 필드 비활성화

- **✅ 결정**: **운영시간 유효성 검사 불필요**
  - 시작 시간 < 종료 시간 검증 제외
  - 24시간 운영, 자정 넘어가는 운영시간 등 특수 케이스 검증 제외
  - 사용자가 자유롭게 입력 가능

#### 4. 폼 유효성 검사 규칙
- **✅ 결정**: **필수 필드 검증 규칙**
  - **카페 상호명**: 최대 30자 제한 (필수)
  - **카페 소개**: 최대 30자 제한 (필수)
  - **주소**: 한국 주소 형식 검증 (필수)
    - 기본적인 주소 형식 검증 (시/도, 시/군/구, 상세주소 포함 여부)
    - 정확한 형식 검증보다는 필수 입력 여부 확인
  - **좌표**: 검증 불필요
    - 카카오맵에서 클릭으로 선택하므로 자동으로 유효한 좌표 설정됨
    - 별도 검증 로직 불필요

- **✅ 결정**: **인스타그램 링크 검증: URL 형식 검증**
  - 기본 URL 형식 검증 (http:// 또는 https://로 시작)
  - Instagram 앱에서 프로필 URL을 복사하여 입력할 예정이므로 도메인 검증은 선택적
  - 예시 형식: `https://instagram.com/username` 또는 `https://www.instagram.com/username/`
  - 선택 필드이므로 입력하지 않아도 됨

- **✅ 결정**: **이미지 업로드 검증**
  - **파일 개수 검증**: 카페 사진 2장, 러닝인증 이미지 1장 (필수)
  - **파일 크기 검증**: 최대 10MB (초과 시 에러 메시지)
  - **파일 형식 검증**: JPG, PNG만 허용 (그 외 형식 시 에러 메시지)
  - **업로드 실패 시**: 명확한 에러 메시지 표시
    - 예: "이미지 업로드에 실패했습니다. 네트워크 연결을 확인해주세요."
    - 예: "파일 크기가 10MB를 초과합니다."
    - 예: "JPG 또는 PNG 형식만 업로드 가능합니다."

#### 5. 카페 상태 관리
- **✅ 결정**: **카페 상태 관리 불필요**
  - 활성/비활성 상태 관리 기능 제외
  - 등록된 카페는 모두 앱에 표시됨

#### 6. GeoFirestore 설정
- **✅ 결정**: **구현하면서 확인**
  - GeoFirestore 라이브러리 설치 및 사용 방법은 구현 단계에서 확인
  - 백엔드 서버에서 GeoFirestore 사용 방법 구현 시 결정

#### 7. 에러 처리 및 사용자 피드백
- **✅ 결정**: **고려하지 않아도 됨**
  - 에러 처리 및 사용자 피드백 관련 세부 사항은 구현 시 기본적인 처리만 적용

#### 8. 카페 관리 기능 세부 사항
- **✅ 결정**: **카페 목록 조회**
  - **페이지네이션**: 구현 (한 페이지당 표시 개수는 구현 시 결정)
  - **검색 기능**: 상호명 및 주소로 검색
  - **정렬 기능**: 등록일순서 (최신순 또는 오래된순, 구현 시 결정)

- **✅ 결정**: **카페 정보 수정**
  - **수정 범위**: 모든 부분 수정 가능 (모든 필드 수정 가능)
  - **이미지 교체**: 기존 이미지 삭제 후 새 이미지 업로드
  - **수정 이력**: 기록 (수정일시, 수정자 등 기록)

- **✅ 결정**: **카페 삭제**
  - **삭제 방식**: 완전 삭제 (하드 삭제)
  - 삭제 확인 다이얼로그 표시
  - 연관된 이미지도 함께 삭제 (Firebase Storage에서 삭제)
  - 데이터 복구 불가능 (완전 삭제)

#### 9. 인증 및 권한 관리 세부 사항
- **✅ 결정**: **로그인 화면 UI/UX: 기존 사용자 관리 화면과 통합**
  - 별도 로그인 화면 없이 기존 관리자 대시보드 화면에 통합
  - 로그인 폼을 기존 화면 상단 또는 별도 섹션으로 추가
  - 사용자 경험 일관성 유지

- **✅ 결정**: **로그인 상태 유지**
  - 로그인 성공 시 세션 유지 (브라우저 세션 또는 로컬 스토리지)
  - 페이지 새로고침 시에도 로그인 상태 유지
  - 로그아웃 시에만 세션 종료

- **✅ 결정**: **권한 체크 시점: 로그인 시 한 번만 체크**
  - 로그인 성공 시 관리자 권한 체크 (Firestore `admins` 컬렉션 확인)
  - 권한이 있으면 대시보드 접근 허용, 권한이 없으면 접근 거부
  - 각 API 호출 시마다 권한 체크하지 않음 (성능 최적화)
  - 권한이 없는 사용자 접근 시 에러 메시지 표시
    - 예: "관리자 권한이 없습니다. 관리자에게 문의하세요."

- **✅ 결정**: **관리자 UID 등록 방법: 기존 관리자 대시보드에서 등록 기능 추가**
  - 기존 관리자 대시보드에 관리자 UID 등록 기능 추가
  - Firebase Console에서 수동 등록도 가능하지만, 대시보드에서 등록하는 것이 운영 편의성 향상
  - 등록 기능은 최고 관리자만 접근 가능하도록 권한 분리 고려

#### 10. 기술 스택 및 라이브러리
- **✅ 확인 완료**: React + Material-UI 사용 중
- **✅ 확인 완료**: Express 백엔드 서버 사용 중 (Firebase Admin SDK)
- **✅ 결정**: **구현하면서 확인**
  - 추가 필요한 라이브러리는 구현 단계에서 성능, 호환성, 라이선스를 고려하여 선택
  - 이미지 리사이징: `browser-image-compression` 또는 `sharp` (서버)
  - 드래그 앤 드롭: `react-dropzone`
  - 지도: Kakao Maps API 웹 SDK
  - 폼 관리: `react-hook-form` 또는 Material-UI 내장 폼

---

### 📝 구현 준비 상태

#### ✅ 결정 완료 사항
- 카페 데이터 구조 기본 필드 (리뉴얼 계획에 포함)
- 카페 상세 정보 UI/UX (리뉴얼 계획에 포함)
- 운영시간 데이터 형식 (구조화된 객체 - 요일별)
- 러닝인증 혜택 데이터 구조 (대표 혜택 텍스트 + 러닝인증 이미지)
- 카페 상세 정보 추가 필드 (인스타그램 링크)
- 이미지 관리 방식 (Firebase Storage, 리사이징, 최대 3장)
- 관리자 대시보드 인증 및 권한 관리 (Firebase Auth, Firestore Security Rules)
- 이미지 업로드 방식 (파일 선택 및 드래그 앤 드롭)
- 앱 기능 (대시보드 입력 정보가 지도 탭에 표시)
- **이미지 관리 세부 사항** (파일 형식: JPG/PNG, 최대 크기: 10MB, Storage 경로 구조)
- **지도 API 및 위치 선택** (Kakao Maps API, 지도 클릭 선택, 주소 검색 기능)
- **운영시간 입력 UI/UX** (TimePicker 사용, 체크박스로 휴무일 선택, 유효성 검사 불필요)
- **폼 유효성 검사 규칙** (상호명/소개 30자 제한, 주소 한국 형식, 인스타그램 URL 검증, 이미지 업로드 검증)
- **카페 상태 관리** (불필요)
- **GeoFirestore 설정** (구현하면서 확인)
- **에러 처리 및 사용자 피드백** (고려하지 않아도 됨)
- **카페 관리 기능 세부 사항** (페이지네이션, 검색, 정렬, 수정 이력, 완전 삭제)
- **업종 필드 추가** (카페, 음식점, 러닝샵 선택, 상세 정보 카드에 표시)
- **인증 및 권한 관리 세부 사항** (기존 화면 통합, 로그인 상태 유지, 로그인 시 한 번만 권한 체크, 관리자 UID 등록 기능)
- **기술 스택 및 라이브러리** (구현하면서 확인)

#### 📋 추후 구현 가능 기능
- 카페 검색 기능 (Bottom Sheet 내부 검색바)
- 카페 즐겨찾기 기능 (마이 대시보드)
- 카페 리뷰 기능

---

**다음 단계**: 논의 필요 사항 결정 후 구현 순서에 따라 단계별 구현 시작

---

**다음 단계**: 구현 순서 및 체크리스트에 따라 단계별 구현 시작
