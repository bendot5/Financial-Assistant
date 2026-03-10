import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'themeMode';

export const DARK: Colors = {
  bg: '#1a1a2e',
  cardBg: '#16213e',
  inputBg: '#0f3460',
  border: '#0f3460',
  accent: '#6c63ff',
  text: '#ffffff',
  textSecondary: '#aaaaaa',
  textMuted: '#666666',
  expense: '#ef4444',
  income: '#22c55e',
  tabBar: '#16213e',
  tabBorder: '#0f3460',
  statusBar: 'light' as const,
};

export const LIGHT: Colors = {
  bg: '#f0f4f8',
  cardBg: '#ffffff',
  inputBg: '#e8edf2',
  border: '#d0d8e4',
  accent: '#6c63ff',
  text: '#111111',
  textSecondary: '#555555',
  textMuted: '#999999',
  expense: '#dc2626',
  income: '#16a34a',
  tabBar: '#ffffff',
  tabBorder: '#d0d8e4',
  statusBar: 'dark' as const,
};

export interface Colors {
  bg: string;
  cardBg: string;
  inputBg: string;
  border: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  expense: string;
  income: string;
  tabBar: string;
  tabBorder: string;
  statusBar: 'light' | 'dark';
}

interface ThemeContextValue {
  isDark: boolean;
  colors: Colors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: DARK,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light') setIsDark(false);
    });
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK : LIGHT, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
