import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeStore, ThemeColors } from "../store/theme";

// ─── Default Colors (Classic / Light Theme) ─────────────────
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

// ─── Dark Colors ────────────────────────────────────────────
export const darkColors: ThemeColors = {
  primary: "#5DA3E8",
  secondary: "#8EE233",
  accent: "#FFB84D",
  background: "#121218",
  card: "#1E1E2A",
  textPrimary: "#E8ECF0",
  textSecondary: "#9CA3AF",
  error: "#F87171",
  warning: "#FBBF24",
  border: "#2D2D3D",
  xp: "#FFD700",
  streak: "#FF8C5A",
};

export const defaultGradients = {
  primary: ["#4A90D9", "#357ABD"],
  accent: ["#F5A623", "#E8961C"],
  streak: ["#FF6B35", "#E8521C"],
  success: ["#7ED321", "#5FB318"],
  card: ["#FFFFFF", "#F7F9FC"],
  header: ["#4A90D9", "#357ABD"],
};

export const darkGradients = {
  primary: ["#5DA3E8", "#4A90D9"],
  accent: ["#FFB84D", "#F5A623"],
  streak: ["#FF8C5A", "#FF6B35"],
  success: ["#8EE233", "#7ED321"],
  card: ["#1E1E2A", "#252536"],
  header: ["#1E1E2A", "#121218"],
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
  const darkModePref = useThemeStore((s) => s.darkModePref);
  const loadDarkModePref = useThemeStore((s) => s.loadDarkModePref);
  const systemScheme = useColorScheme();

  // Load dark mode preference on mount
  useEffect(() => {
    loadDarkModePref();
  }, []);

  // Persist active theme to AsyncStorage for instant load
  useEffect(() => {
    if (activeTheme) {
      AsyncStorage.setItem(THEME_CACHE_KEY, JSON.stringify(activeTheme)).catch(
        () => {},
      );
    }
  }, [activeTheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark =
      darkModePref === "dark" ||
      (darkModePref === "system" && systemScheme === "dark");

    const baseColors = isDark ? darkColors : defaultColors;
    const baseGradients = isDark ? darkGradients : defaultGradients;

    if (!activeTheme) {
      return {
        colors: baseColors,
        gradients: baseGradients,
        isAnimated: false,
        themeName: isDark ? "Dark" : "Classic",
        isDark,
      };
    }

    return {
      colors: {
        ...baseColors,
        ...(activeTheme.colors as Partial<ThemeColors>),
      },
      gradients: {
        ...baseGradients,
        ...(activeTheme.gradients as Partial<typeof defaultGradients>),
      },
      isAnimated: activeTheme.isAnimated ?? false,
      themeName: activeTheme.name,
      isDark,
    };
  }, [activeTheme, darkModePref, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
