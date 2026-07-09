import { StatusBar } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// ThemeProvider 내부에서 렌더링 — 테마에 따라 시스템 상태바(시간/와이파이/배터리) 색 분기
// 라이트모드: dark-content(검은 글자) / 다크모드: light-content(흰 글자)
const ThemedStatusBar = () => {
  const { isDark, colors } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.BACKGROUND}
      translucent={false}
    />
  );
};

export default ThemedStatusBar;
