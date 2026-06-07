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

  // 배경
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',

  // 텍스트
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#9A9AA0',

  // 구분선·테두리
  BORDER: '#2D2D34',

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
  PRIMARY: '#3AF8FF',

  // 배경
  BACKGROUND: '#F2F2F7',   // iOS 표준 라이트 배경
  SURFACE: '#FFFFFF',       // 카드·시트
  CARD: '#F8F8FA',          // 카드 내부

  // 텍스트
  TEXT: '#1C1C1E',          // iOS 표준 다크 텍스트
  TEXT_SECONDARY: '#6C6C70', // iOS 표준 보조 텍스트

  // 구분선·테두리
  BORDER: '#E5E5EA',        // iOS 표준 구분선

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
