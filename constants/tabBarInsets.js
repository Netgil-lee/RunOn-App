/**
 * 하단 탭 바 — Android 시스템 내비게이션바와 겹치지 않도록
 * useSafeAreaInsets().bottom 을 반영한 높이/패딩.
 * (고정 paddingBottom: 36 은 iOS 홈 인디케이터 가정이라 Android에서 부족함)
 */
const TAB_BAR_CONTENT_HEIGHT = 49; // 아이콘 + 라벨 영역(기존 85 - 36 에 맞춤)

export function getTabBarInsetsStyle(insets, { withTopBorder = false } = {}) {
  const { Platform } = require('react-native');
  const minInset = Platform.OS === 'android' ? 28 : 12;
  const safeBottom = Math.max(insets.bottom || 0, minInset);
  const paddingBottom = safeBottom + 10;
  return {
    backgroundColor: '#1F1F24',
    borderTopWidth: withTopBorder ? 1 : 0,
    borderTopColor: '#333333',
    height: TAB_BAR_CONTENT_HEIGHT + paddingBottom,
    paddingBottom,
    paddingTop: 0,
  };
}
