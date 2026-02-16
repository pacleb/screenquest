import React, { createContext, useContext, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeStore, ThemeColors } from "../store/theme";

// ─── Default Colors (Classic / Light Theme) ─────────────────
export const defaultColors: ThemeColors = {
  primary: "#6B2FA0",
  secondary: "#4CD964",
  accent: "#F5A623",
  background: "#F5F0FA",
  card: "#FFFFFF",
  textPrimary: "#2A1B3D",
  textSecondary: "#6B5B7B",
  error: "#E74C3C",
  warning: "#F5A623",
  border: "#E0D6EC",
  xp: "#FFD700",
  streak: "#FF6B35",
};

export const defaultGradients = {
  primary: ["#6B2FA0", "#4A1D73"],
  brand: ["#6B2FA0", "#8B5FBF"],
  accent: ["#F5A623", "#D4891A"],
  magical: ["#4A1D73", "#1A0A33"],
  success: ["#4CD964", "#2DA844"],
  card: ["#FFFFFF", "#F5F0FA"],
  header: ["#6B2FA0", "#5A2690"],
  streak: ["#FF6B35", "#E8521C"],
};

// ─── Theme Context ──────────────────────────────────────────
interface ThemeContextValue {
  colors: ThemeColors;
  gradients: typeof defaultGradients;
  isAnimated: boolean;
  themeName: string;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultColors,
  gradients: defaultGradients,
  isAnimated: false,
  themeName: "Classic",
  isDark: false,
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
        isDark: false,
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
      isDark: false,
    };
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
