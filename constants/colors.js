/**
 * RunOn 앱 공통 색상 상수
 *
 * 사용법:
 *   import { useTheme } from '../contexts/ThemeContext';
 *   const { colors } = useTheme();
 */

export const DARK_THEME = {
  // 브랜드
  PRIMARY: '#3AF8FF',

  // 배경 — 순수 검정 대신 짙은 청회색 베이스 + 또렷한 elevation 계조 (시안 PRIMARY와 톤 조화)
  BACKGROUND: '#0F1115',  // 베이스 (구 #000000)
  SURFACE: '#20242B',     // 최상위 레이어 (구 #1F1F24)
  CARD: '#181B20',        // 중간 레이어 (구 #171719)

  // 텍스트
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#9A9AA0',
  TEXT_SECONDARY_STRONG: '#D8D8DD', // 보조 텍스트 강조 — 더 밝은 흰색 (제목보단 약함)

  // 구분선·테두리
  BORDER: '#2C313A',  // 청회색 톤 맞춤 (구 #2D2D34)
  DIVIDER: '#000000', // 섹션 구분선 — 다크는 순수검정으로 섹션 경계 강조

  // 상태
  SUCCESS: '#28C76F',
  ERROR: '#FF4D4F',
  WARNING: '#FFD700',

  // 보조 강조
  PINK: '#FF0073',

  // 태그·뱃지
  TAG_GREEN: '#B6F5C9',
  TAG_YELLOW: '#FFF6B2',
  TAG_PURPLE: '#E2D6FF',
  TAG_PINK: '#FFD6E7',
  TAG_BLUE: '#B6E6F5',

  // 알약 탭바 — 배경 불투명도 20% (뒤 콘텐츠가 비침, 블러 위에 얹는 색)
  TAB_BAR_BG: 'rgba(32, 36, 43, 0.20)',
  TAB_BAR_BG_SOLID: 'rgba(32, 36, 43, 0.94)', // Android: 블러가 없어 거의 불투명하게
  TAB_BAR_BORDER: 'rgba(255, 255, 255, 0.14)',
  TAB_BAR_SHADOW: 'rgba(0, 0, 0, 0.28)', // 탭바 아래 그림자
  TAB_BAR_ACTIVE_BG: 'rgba(120, 130, 148, 0.38)', // 선택된 탭 뒤 캡슐
  TAB_BAR_ACTIVE_ICON: '#3AF8FF',
  TAB_BAR_ACTIVE_LABEL: '#ffffff',
  TAB_BAR_INACTIVE: '#D8D8DD',

  // 시안(PRIMARY) 바탕 위에 올리는 글자·아이콘 — 흰색은 대비가 부족해 쓰지 않는다
  ON_PRIMARY: '#04342C',

  // 홈 바로가기 아이콘 (시안 한 가지 색)

  // 홈 카드 타일 색 (내 주변 모임·러닝카페 카드의 아이콘과 옅은 바탕)
  SHORTCUT_BLUE: '#85B7EB',
  SHORTCUT_PURPLE: '#AFA9EC',
  SHORTCUT_AMBER: '#FAC775',
  SHORTCUT_GREEN: '#5DE2A0',

  // 홈: 모임 관련 강조색(참여 목표 진행바·매너 점수), 배너 이미지가 뜨기 전 바탕
  MEETING_ACCENT: '#FFB800',
  BANNER_PLACEHOLDER: '#13343A',
};

export const LIGHT_THEME = {
  // 브랜드
  PRIMARY: '#30DEE4',       // 라이트모드 전용 — 흰 배경에서 가독성 높은 진한 시안

  // 배경
  BACKGROUND: '#F2F2F7',   // iOS 표준 라이트 배경
  SURFACE: '#FFFFFF',       // 카드·시트
  CARD: '#F8F8FA',          // 카드 내부

  // 텍스트
  TEXT: '#1C1C1E',          // iOS 표준 다크 텍스트
  TEXT_SECONDARY: '#6C6C70', // iOS 표준 보조 텍스트
  TEXT_SECONDARY_STRONG: '#3A3A3C', // 보조 텍스트 강조 — 더 진하게(가독성↑)

  // 구분선·테두리
  BORDER: '#D9D9DE',        // 카드/타일 테두리
  DIVIDER: '#C7C7CC',       // 섹션 구분선 — 카드 테두리보다 진하게 (섹션>카드 위계)

  // 상태
  SUCCESS: '#28C76F',
  ERROR: '#FF4D4F',
  WARNING: '#F5A623',       // 흰 배경에서 노랑 대신 주황

  // 보조 강조
  PINK: '#FF0073',

  // 태그·뱃지
  TAG_GREEN: '#B6F5C9',
  TAG_YELLOW: '#FFF6B2',
  TAG_PURPLE: '#E2D6FF',
  TAG_PINK: '#FFD6E7',
  TAG_BLUE: '#B6E6F5',

  // 알약 탭바 — 라이트에서는 선택 아이콘에 시안을 쓰지 않는다 (밝은 배경 대비 부족)
  TAB_BAR_BG: 'rgba(255, 255, 255, 0.20)',
  TAB_BAR_BG_SOLID: 'rgba(255, 255, 255, 0.94)', // Android: 블러가 없어 거의 불투명하게
  TAB_BAR_BORDER: 'rgba(0, 0, 0, 0.10)',
  TAB_BAR_SHADOW: 'rgba(0, 0, 0, 0.10)', // 탭바 아래 그림자 (흰 배경에서 윤곽을 살린다)
  TAB_BAR_ACTIVE_BG: 'rgba(60, 60, 67, 0.14)',
  TAB_BAR_ACTIVE_ICON: '#1C1C1E',
  TAB_BAR_ACTIVE_LABEL: '#1C1C1E',
  TAB_BAR_INACTIVE: '#1C1C1E',

  // 시안(PRIMARY) 바탕 위에 올리는 글자·아이콘
  ON_PRIMARY: '#04342C',

  // 홈 바로가기 아이콘 — 흰 바탕에서는 밝은 시안이 잘 안 보여 진한 청록을 쓴다

  // 홈 카드 타일 색 — 밝은 배경에서 보이도록 다크보다 진하게
  SHORTCUT_BLUE: '#2F7BD0',
  SHORTCUT_PURPLE: '#6A5FD6',
  SHORTCUT_AMBER: '#C9861A',
  SHORTCUT_GREEN: '#1F9D62',

  // 홈: 모임 관련 강조색(참여 목표 진행바·매너 점수), 배너 이미지가 뜨기 전 바탕
  MEETING_ACCENT: '#F5A623',
  BANNER_PLACEHOLDER: '#D6F3F5',
};

// 하위 호환 — 기존 import { COLORS } 코드 유지용
export const COLORS = DARK_THEME;
