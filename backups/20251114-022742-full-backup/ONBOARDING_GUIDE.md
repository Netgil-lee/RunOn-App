# 🎯 NetGill 온보딩 플로우 가이드

## 📋 개요

NetGill 앱의 7단계 온보딩 플로우 구현이 완료되었습니다. 사용자는 회원가입 후 개인화된 프로필을 설정하여 맞춤형 러닝 파트너 매칭을 받을 수 있습니다.

## 🚀 현재 구현 상태

### ✅ 완료된 기능
- **7단계 온보딩 프로세스** 완전 구현
- **네비게이션 통합** (로그인/비로그인 모두 접근 가능)
- **실제 회원가입 플로우 연결**
- **Firebase 프로필 저장 기능**
- **테스트 환경** 구축

### 🧪 테스트 방법

#### 방법 1: 온보딩 테스트 화면 (개발용)
1. 앱 실행
2. 로그인 화면 또는 홈 화면에서 "🧪 온보딩 테스트" 버튼 클릭
3. 7단계 온보딩 진행
4. 완료 후 데이터 확인

#### 방법 2: 실제 회원가입 플로우
1. 앱 실행
2. "회원가입" 클릭
3. 계정 정보 입력 후 가입
4. 자동으로 온보딩 화면으로 이동
5. 프로필 설정 완료 후 홈 화면으로 이동

## 🏗️ 온보딩 단계별 상세

### 1단계: 기본 정보
- **프로필 사진**: 갤러리/카메라 선택 (선택사항)
- **닉네임**: 필수 입력 (20자 제한)
- **자기소개**: 선택사항 (100자 제한)

### 2단계: 러닝 레벨
- **초보**: 7분 이상 페이스
- **중급**: 5-7분 페이스  
- **고급**: 5분 이하 페이스

### 3단계: 선호 코스 (복수 선택)
- **한강공원**: 10개 공원 (인기 표시)
- **강변**: 6개 주요 강변 코스

### 4단계: 선호 시간 (복수 선택)
- 🌅 새벽 (5-7시)
- ☀️ 아침 (7-9시)
- 🌆 저녁 (6-8시)
- 🌙 야간 (8-10시)

### 5단계: 러닝 스타일 (복수 선택)
- 💬 대화하며 천천히
- 🎯 집중해서 빠르게
- ⚖️ 꾸준한 페이스
- 📈 인터벌 트레이닝

### 6단계: 선호 계절 (복수 선택)
- 🌸 봄 - 따뜻한 햇살
- ☀️ 여름 - 뜨거운 열정
- 🍂 가을 - 선선한 바람
- ❄️ 겨울 - 차가운 공기

### 7단계: 현재 목표
- **기본 목표**: 8개 옵션
- **커스텀 목표**: 직접 입력 (50자 제한)

## 💾 저장되는 데이터 구조

```javascript
{
  // 기본 정보
  displayName: "사용자닉네임",
  bio: "자기소개",
  profileImage: "이미지URI",
  
  // 러닝 프로필
  runningProfile: {
    level: "beginner|intermediate|advanced",
    pace: "해당 레벨의 페이스",
    preferredCourses: ["course_id1", "course_id2", ...],
    preferredTimes: ["dawn", "morning", "evening", "night"],
    runningStyles: ["social", "focused", "steady", "interval"],
    favoriteSeasons: ["spring", "summer", "autumn", "winter"],
    currentGoal: "선택된 목표 또는 커스텀 목표"
  },
  
  // 메타데이터
  onboardingCompleted: true,
  onboardingCompletedAt: "2024-01-15T10:30:00.000Z",
  uid: "firebase_user_id",
  email: "user@example.com",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

## 🔧 기술적 구현

### 주요 컴포넌트
- `OnboardingScreen.js` - 실제 온보딩 화면
- `OnboardingTestScreen.js` - 테스트용 래퍼
- `AuthContext.js` - 프로필 저장 로직

### 네비게이션 구조
```
StackNavigator
├── (로그인된 사용자)
│   ├── Home
│   ├── Chat
│   ├── OnboardingTest (개발용)
│   └── Onboarding (실제 온보딩)
└── (비로그인 사용자)
    ├── Login
    ├── Signup
    ├── OnboardingTest (개발용)
    └── Onboarding (실제 온보딩)
```

### Firebase 저장
- **Firestore**: `/users/{uid}` 문서에 프로필 데이터 저장
- **Authentication**: `displayName` 업데이트
- **Storage**: 프로필 이미지 (향후 구현 예정)

## 🔄 실제 사용 플로우

### 신규 사용자
```
SignupScreen → (회원가입 완료) → Onboarding → Home
```

### 기존 사용자 (온보딩 미완료)
```
Login → (로그인 완료) → Onboarding → Home
```

### 기존 사용자 (온보딩 완료)
```
Login → (로그인 완료) → Home
```

## 🛠️ 향후 개선 사항

### 1. 온보딩 상태 체크
```javascript
// AuthContext에서 사용자 온보딩 완료 여부 확인
if (user && !user.onboardingCompleted) {
  navigation.navigate('Onboarding', { isFromLogin: true });
}
```

### 2. 프로필 이미지 업로드
```javascript
// Firebase Storage에 이미지 업로드
import { uploadBytes, getDownloadURL } from 'firebase/storage';
```

### 3. 매칭 알고리즘
- 온보딩 데이터 기반 파트너 추천
- 선호도 점수 계산
- 지역/시간대 매칭

### 4. 프로필 편집
- 설정에서 온보딩 데이터 수정
- 단계별 편집 모드
- 변경 이력 추적

## 🐛 알려진 이슈

1. **프로필 이미지**: 현재 로컬 URI만 저장 (Firebase Storage 연동 필요)
2. **오프라인 지원**: 온라인 상태에서만 동작
3. **유효성 검사**: 추가 입력 검증 로직 필요

## 📞 문의

온보딩 플로우 관련 문의사항이나 개선 제안이 있으시면 개발팀에 연락해주세요.

---

**마지막 업데이트**: 2024년 1월 15일  
**버전**: 1.0.0  
**작성자**: NetGill 개발팀 