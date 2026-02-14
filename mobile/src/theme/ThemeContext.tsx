import React, { createContext, useContext, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeStore, ThemeColors } from "../store/theme";

// ─── Default Colors (Classic Theme) ─────────────────────────
export const defaultColors: ThemeColors = {
  primary: "#4A90D9",
  secondary: "#7ED321",
  accent: "#F5A623",
  background: "#F7F9FC",
  card: "#FFFFFF",
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  error: "#E74C3C",
  warning: "#F39C12",
  border: "#E8ECF0",
  xp: "#FFD700",
  streak: "#FF6B35",
};

export const defaultGradients = {
  primary: ["#4A90D9", "#357ABD"],
  accent: ["#F5A623", "#E8961C"],
  streak: ["#FF6B35", "#E8521C"],
  success: ["#7ED321", "#5FB318"],
  card: ["#FFFFFF", "#F7F9FC"],
  header: ["#4A90D9", "#357ABD"],
};

// ─── Theme Context ──────────────────────────────────────────
interface ThemeContextValue {
  colors: ThemeColors;
  gradients: typeof defaultGradients;
  isAnimated: boolean;
  themeName: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultColors,
  gradients: defaultGradients,
  isAnimated: false,
  themeName: "Classic",
});

export function useTheme() {
  return useContext(ThemeContext);
}

const THEME_CACHE_KEY = "@screenquest_active_theme";

// ─── Provider ───────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const activeTheme = useThemeStore((s) => s.activeTheme);

  // Persist active theme to AsyncStorage for instant load
  useEffect(() => {
    if (activeTheme) {
      AsyncStorage.setItem(THEME_CACHE_KEY, JSON.stringify(activeTheme)).catch(
        () => {},
      );
    }
  }, [activeTheme]);

  const value = useMemo<ThemeContextValue>(() => {
    if (!activeTheme) {
      return {
        colors: defaultColors,
        gradients: defaultGradients,
        isAnimated: false,
        themeName: "Classic",
      };
    }

    return {
      colors: {
        ...defaultColors,
        ...(activeTheme.colors as Partial<ThemeColors>),
      },
      gradients: {
        ...defaultGradients,
        ...(activeTheme.gradients as Partial<typeof defaultGradients>),
      },
      isAnimated: activeTheme.isAnimated ?? false,
      themeName: activeTheme.name,
    };
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
