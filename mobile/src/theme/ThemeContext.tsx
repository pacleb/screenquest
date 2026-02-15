import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
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

// ─── Dark Colors ("Magical Night Sky") ──────────────────────
export const darkColors: ThemeColors = {
  primary: "#8B5FBF",
  secondary: "#7EE89A",
  accent: "#FFD166",
  background: "#15101E",
  card: "#1E1830",
  textPrimary: "#EDE8F5",
  textSecondary: "#9B8FB0",
  error: "#F87171",
  warning: "#FBBF24",
  border: "#2E2540",
  xp: "#FFD700",
  streak: "#FF8C5A",
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

export const darkGradients = {
  primary: ["#4A1D73", "#2A1050"],
  brand: ["#8B5FBF", "#6B2FA0"],
  accent: ["#FFD166", "#F5A623"],
  magical: ["#15101E", "#0A0510"],
  success: ["#7EE89A", "#4CD964"],
  card: ["#1E1830", "#15101E"],
  header: ["#2A1050", "#1E0A3D"],
  streak: ["#FF8C5A", "#FF6B35"],
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
