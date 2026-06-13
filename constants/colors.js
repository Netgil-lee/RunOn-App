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
};

// 하위 호환 — 기존 import { COLORS } 코드 유지용
export const COLORS = DARK_THEME;
