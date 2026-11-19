/**
 * 화면 배치 공통 값
 *
 * 하단 탭바는 화면 위에 떠 있는 알약 모양(components/PillTabBar.js)이라
 * 레이아웃 공간을 차지하지 않는다. 탭 화면은 콘텐츠가 탭바 뒤로 지나가므로,
 * 마지막 콘텐츠와 하단 고정 버튼은 useTabBarSpace()만큼 띄워야 가려지지 않는다.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 알약 탭바 자체 높이
export const PILL_TAB_BAR_HEIGHT = 62;
// 탭바 좌우 여백
export const PILL_TAB_BAR_SIDE_MARGIN = 12;
// 탭바 위로 콘텐츠와 띄우는 간격
const PILL_TAB_BAR_TOP_GAP = 8;

// 화면 아래쪽에서 탭바까지의 거리.
// 홈 인디케이터가 있는 기기(insets.bottom 34)는 인디케이터 바로 위에,
// 없는 기기(iPhone SE 등)는 화면 끝에서 12 띄운다.
export const getPillTabBarBottom = (insets) =>
  insets.bottom > 0 ? insets.bottom - 8 : 12;

// 탭바가 가리는 전체 높이 (화면 아래쪽 ~ 탭바 위 간격까지)
export const getTabBarSpace = (insets) =>
  getPillTabBarBottom(insets) + PILL_TAB_BAR_HEIGHT + PILL_TAB_BAR_TOP_GAP;

// 탭 화면에서 쓰는 훅 버전
export const useTabBarSpace = () => getTabBarSpace(useSafeAreaInsets());
