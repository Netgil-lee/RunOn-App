import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME } from '../constants/colors';

const STORAGE_KEY = '@runon:theme';
const DEFAULT_THEME = 'dark';

const ThemeContext = createContext({
  colors: DARK_THEME,
  isDark: true,
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [isLoaded, setIsLoaded] = useState(false);

  // 앱 시작 시 저장된 테마 불러오기
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(STORAGE_KEY, newTheme).catch(() => {});
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(() => ({
    colors: theme === 'dark' ? DARK_THEME : LIGHT_THEME,
    isDark: theme === 'dark',
    theme,
    toggleTheme,
    setTheme,
  }), [theme]);

  // 저장된 테마 로드 전까지 다크 기본값으로 렌더링
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
