import { Colors } from './colors';

export const lightTheme = {
  dark: false,
  colors: {
    primary: Colors.primary,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    textSecondary: Colors.light.textSecondary,
    border: Colors.light.border,
    surface: Colors.light.surface,
    tabBar: Colors.light.tabBar,
    tabBarBorder: Colors.light.tabBarBorder,
    accent: Colors.accent,
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    textSecondary: Colors.dark.textSecondary,
    border: Colors.dark.border,
    surface: Colors.dark.surface,
    tabBar: Colors.dark.tabBar,
    tabBarBorder: Colors.dark.tabBarBorder,
    accent: Colors.accent,
  },
};

export type Theme = typeof lightTheme;
