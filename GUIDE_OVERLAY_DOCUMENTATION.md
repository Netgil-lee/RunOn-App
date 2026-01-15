# 오버레이 가이드 기능 정리 문서

## 개요

앱 내 주요 기능을 사용자에게 안내하는 오버레이 가이드 시스템입니다. 사용자가 처음 앱을 사용할 때 각 화면의 주요 기능을 단계별로 안내합니다.

## 주요 구성 요소

### 1. GuideOverlay 컴포넌트 (`components/GuideOverlay.js`)

오버레이 가이드의 UI 컴포넌트입니다.

#### 주요 기능
- **반투명 배경**: 화면 전체를 어둡게 처리하여 가이드 대상에 집중
- **하이라이트 영역**: 가이드 대상 요소를 강조 표시
  - `circle`: 원형 하이라이트
  - `rectangle`: 사각형 하이라이트
  - `none`: 하이라이트 없음 (전체 화면 가이드)
- **설명 텍스트**: 제목과 설명을 표시
- **다음/완료 버튼**: 가이드 진행 제어

#### Props
```javascript
{
  visible: boolean,              // 가이드 표시 여부
  title: string,                 // 가이드 제목
  description: string,           // 가이드 설명
  targetPosition: {x, y},       // 하이라이트 대상의 중심 좌표
  targetSize: {width, height},  // 하이라이트 대상의 크기
  highlightShape: 'circle' | 'rectangle' | 'none',  // 하이라이트 모양
  showArrow: boolean,            // 화살표 표시 여부
  arrowDirection: 'up' | 'down' | 'left' | 'right', // 화살표 방향
  onNext: function,             // 다음 단계 콜백
  isLastStep: boolean,          // 마지막 단계 여부
  targetId: string,             // 가이드 타겟 ID (텍스트 위치 조정용)
}
```

#### 특수 기능
- **타겟별 텍스트 위치 조정**: `targetId`에 따라 설명 텍스트 위치를 자동 조정
  - `hanRiverMap`: 한강 지도 내부에 텍스트 배치
  - `myCreatedMeetingsSection`: 사각형 아래에 텍스트 배치
  - `meetingdashboard`: 사각형 아래 40px에 텍스트 배치
  - `hanriverLocationList`: 사각형 아래 40px에 텍스트 배치
  - `meetingcardlist`: 사각형 위 170px에 텍스트 배치
  - `meetingCard`: 사각형 아래 180px에 텍스트 배치
  - `meetingCardMenu`: 사각형 아래 20px에 텍스트 배치
  - `endMeetingButton`: 버튼 위 220px에 텍스트 배치

### 2. GuideContext (`contexts/GuideContext.js`)

가이드 상태를 전역으로 관리하는 Context입니다.

#### 관리하는 가이드 타입
- `homeGuideCompleted`: 홈탭 가이드 완료 여부
- `meetingGuideCompleted`: 모임탭 가이드 완료 여부
- `communityGuideCompleted`: 커뮤니티탭 가이드 완료 여부
- `settingsGuideCompleted`: 설정탭 가이드 완료 여부

#### 주요 함수
- `startGuide(guideType)`: 가이드 시작
- `nextStep()`: 다음 단계로 진행
- `completeGuide(guideType)`: 가이드 완료 처리 (Firestore에 저장)
- `exitGuide()`: 가이드 종료 (완료 처리 없음)
- `resetGuide(guideType?)`: 가이드 리셋 (개발/테스트용)

#### 상태 저장
- 가이드 완료 상태는 Firestore의 `users/{uid}/guideStates` 필드에 저장됩니다.
- 사용자별로 가이드 완료 여부가 영구 저장됩니다.

## 구현된 가이드

### 1. 홈탭 가이드 (`screens/HomeScreen.js`)

**시작 조건**: 온보딩 완료 + 홈탭 가이드 미완료

#### 단계별 내용

1. **현재 위치 확인** (`locationButton`)
   - 타겟: 위치 버튼 (원형 하이라이트)
   - 설명: 현재 위치 확인 기능 안내

2. **한강 지도** (`hanRiverMap`)
   - 타겟: 한강 지도 영역 (사각형 하이라이트)
   - 설명: 한강공원과 강변 코스 확인 기능 안내

3. **한강공원 선택** (`hanriverLocationList`)
   - 타겟: 한강공원 목록 (사각형 하이라이트)
   - 설명: "광나루한강공원" 클릭 안내
   - **특징**: 이 단계 완료 후 가이드가 일시정지되고, 사용자가 실제로 한강공원을 클릭하면 다음 단계로 진행

4. **대시보드** (`meetingdashboard`)
   - 타겟: 통계 영역 (사각형 하이라이트)
   - 설명: 위치별 모임 확인 기능 안내
   - **특징**: 3단계에서 한강공원 클릭 시 자동으로 화면을 아래로 스크롤하여 표시

5. **모임 상세** (`meetingcardlist`)
   - 타겟: 첫 번째 모임 카드 (사각형 하이라이트)
   - 설명: 모임 카드 클릭으로 상세 정보 확인 안내

#### 위치 측정 방식
- **1-3단계**: `measureInWindow` + Safe Area 보정
- **4-5단계**: 스크롤 후 `measureInWindow`로 재측정
- Fallback 위치: 측정 실패 시 기본 위치 사용

### 2. 모임탭 가이드 (`screens/ScheduleScreen.js`)

**시작 조건**: 온보딩 완료 + 모임탭 가이드 미완료

#### 단계별 내용

1. **모임탭 개요** (`meetingTabOverview`)
   - 타겟: 없음 (전체 화면 가이드)
   - 설명: 모임탭 소개

2. **새 모임 만들기** (`createMeetingCard`)
   - 타겟: 새 모임 만들기 카드 (사각형 하이라이트)
   - 설명: 새 모임 생성 기능 안내
   - **특징**: 이 단계 완료 후 가이드가 일시정지되고, 사용자가 실제로 모임을 생성하면 다음 단계로 진행

3. **내가 만든 모임** (`myCreatedMeetingsSection`)
   - 타겟: 내가 만든 모임 섹션 (사각형 하이라이트)
   - 설명: 모임 관리 기능 안내
   - **특징**: 2단계에서 모임 생성 시 자동으로 시작
   - 완료 후 "내가 만든 모임" 화면으로 자동 이동

4. **모임카드 메뉴** (`meetingCard`)
   - 타겟: 모임카드의 메뉴 버튼 (원형 하이라이트)
   - 설명: 모임 수정/삭제 기능 안내
   - **특징**: "내가 만든 모임" 화면 진입 시 자동으로 시작

5. **모임카드** (`meetingCardMenu`)
   - 타겟: 모임카드 전체 (사각형 하이라이트)
   - 설명: 모임 상세 정보 확인 안내

#### 위치 측정 방식
- `measureInWindow` + Safe Area 보정
- Fallback 위치: 측정 실패 시 기본 위치 사용

### 3. 모임 상세 가이드 (`screens/EventDetailScreen.js`)

**시작 조건**: 모임탭 가이드 5단계 완료 후

#### 단계별 내용

1. **모임 종료하기** (`endMeetingButton`)
   - 타겟: 종료하기 버튼 (사각형 하이라이트)
   - 설명: 모임 종료 및 러닝매너 작성 안내
   - **특징**: 모임탭 가이드 5단계 완료 후 EventDetailScreen 진입 시 자동으로 표시

## 기술적 특징

### 1. 위치 측정 및 보정

#### Safe Area 보정
- Status Bar 높이를 고려한 Y 좌표 보정
- 개발환경과 프로덕트 환경의 차이를 보정

#### 하이브리드 측정 방식
- `measureInWindow`로 실제 위치 측정 시도
- 측정 실패 시 Fallback 위치 사용
- 측정값 유효성 검사 (NaN, 0 이하 값 체크)

### 2. 동적 스크롤 처리

#### 홈탭 가이드 4-5단계
- 3단계 완료 후 사용자가 한강공원 클릭 시 자동 스크롤
- 스크롤 완료 후 ref 연결 대기 시간 확보
- 위치 재측정으로 정확한 하이라이트 표시

### 3. 조건부 가이드 진행

#### 일시정지 기능
- 특정 단계에서 사용자 액션을 기다리는 기능
- 홈탭 3단계: 한강공원 클릭 대기
- 모임탭 2단계: 모임 생성 대기

#### 자동 진행
- 사용자 액션 감지 시 다음 단계 자동 시작
- 모임탭: 모임 생성 감지 → 3단계 자동 시작
- 모임탭: "내가 만든 모임" 화면 진입 → 4단계 자동 시작

### 4. 상태 관리

#### Firestore 연동
- 가이드 완료 상태를 Firestore에 저장
- 사용자별로 가이드 완료 여부 영구 저장
- 오프라인 지원: 로컬 상태 업데이트 후 Firestore 동기화

#### 로컬 상태 관리
- 가이드 진행 중인 단계 추적
- 각 화면별 추가 상태 관리 (예: `hasShownFirstMeetingGuide`)

## 사용 예시

### 가이드 시작
```javascript
const { startGuide } = useGuide();

// 홈탭 가이드 시작
startGuide('home');

// 모임탭 가이드 시작
startGuide('meeting');
```

### 가이드 완료 처리
```javascript
const { completeGuide } = useGuide();

// 가이드 완료 (Firestore에 저장)
completeGuide('home');
```

### 가이드 리셋 (개발용)
```javascript
const { resetGuide } = useGuide();

// 특정 가이드 리셋
resetGuide('home');

// 모든 가이드 리셋
resetGuide();
```

## 주의사항

1. **타이밍 이슈**: ref 연결 및 위치 측정을 위한 충분한 대기 시간 필요
2. **스크롤 처리**: 스크롤 후 위치 재측정이 필요한 경우 적절한 지연 시간 설정
3. **상태 동기화**: Firestore 저장 실패 시에도 로컬 상태는 업데이트하여 UX 유지
4. **중복 실행 방지**: `setTimeout` 사용 시 ref를 통해 중복 실행 방지

## 향후 개선 사항

- 커뮤니티탭 가이드 구현
- 설정탭 가이드 구현
- 가이드 스킵 기능
- 가이드 재시작 기능 (사용자 요청 시)
