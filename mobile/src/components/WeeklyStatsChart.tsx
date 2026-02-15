import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { fonts, spacing, borderRadius } from "../theme";

interface DayStats {
  date: string;
  quests: number;
  minutes: number;
  xp: number;
  playMinutes: number;
}

interface WeeklyStatsChartProps {
  dailyStats: DayStats[];
  accentColor?: string;
  textColor?: string;
  cardColor?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BAR_WIDTH = 28;

export function WeeklyStatsChart({
  dailyStats,
  accentColor = "#6B2FA0",
  textColor = "#2A1B3D",
  cardColor = "#FFFFFF",
}: WeeklyStatsChartProps) {
  if (!dailyStats || dailyStats.length === 0) return null;

  const maxXp = Math.max(...dailyStats.map((d) => d.xp), 1);
  const totalXp = dailyStats.reduce((sum, d) => sum + d.xp, 0);
  const totalQuests = dailyStats.reduce((sum, d) => sum + d.quests, 0);

  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayIndex = today === 0 ? 6 : today - 1; // Convert to 0=Mon

  return (
    <View style={[styles.container, { backgroundColor: cardColor }]}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: accentColor }]}>
            {totalXp}
          </Text>
          <Text style={[styles.summaryLabel, { color: textColor + "80" }]}>
            XP
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: accentColor }]}>
            {totalQuests}
          </Text>
          <Text style={[styles.summaryLabel, { color: textColor + "80" }]}>
            Quests
          </Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chartRow}>
        {dailyStats.map((day, i) => {
          const height = Math.max((day.xp / maxXp) * 80, 4);
          const isToday = i === todayIndex;

          return (
            <View key={i} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                {day.xp > 0 && (
                  <Text style={[styles.barValue, { color: accentColor }]}>
                    {day.xp}
                  </Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isToday
                        ? accentColor
                        : accentColor + "40",
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: isToday ? accentColor : textColor + "60",
                    fontFamily: isToday
                      ? fonts.child.bold
                      : fonts.child.regular,
                  },
                ]}
              >
                {DAYS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: fonts.child.extraBold,
    fontSize: 24,
  },
  summaryLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    paddingHorizontal: spacing.xs,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barWrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  barValue: {
    fontFamily: fonts.child.bold,
    fontSize: 9,
    marginBottom: 2,
  },
  bar: {
    width: BAR_WIDTH,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});
