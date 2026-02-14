import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { colors, spacing, borderRadius, fonts } from "../theme";

const CHART_WIDTH =
  Dimensions.get("window").width - spacing.lg * 2 - spacing.lg;

interface DailyData {
  date: string;
  minutesUsed: number;
}

interface ScreenTimeTrendProps {
  data: DailyData[];
  label?: string;
  accentColor?: string;
}

/**
 * Simple line-style bar chart showing daily screen time over past 14 days.
 * Uses pure RN views (no chart library dependency for this component).
 */
export function ScreenTimeTrend({
  data,
  label = "Screen Time (past 2 weeks)",
  accentColor = colors.primary,
}: ScreenTimeTrendProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.minutesUsed), 1);
  const barWidth = Math.max(
    6,
    Math.floor((CHART_WIDTH - data.length * 2) / data.length),
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`${label}. Maximum ${max} minutes.`}
    >
      <Text style={styles.title}>{label}</Text>
      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{max}m</Text>
          <Text style={styles.yLabel}>{Math.round(max / 2)}m</Text>
          <Text style={styles.yLabel}>0</Text>
        </View>
        <View style={styles.barsContainer}>
          {data.map((item, idx) => {
            const height = Math.max(2, (item.minutesUsed / max) * 80);
            const isToday = idx === data.length - 1;
            return (
              <View key={item.date} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      width: barWidth,
                      backgroundColor: isToday
                        ? accentColor
                        : accentColor + "60",
                      borderRadius: barWidth / 2,
                    },
                  ]}
                />
                {(idx === 0 ||
                  idx === data.length - 1 ||
                  idx === Math.floor(data.length / 2)) && (
                  <Text style={styles.xLabel}>
                    {new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface StreakDay {
  date: string;
  completed: boolean;
}

interface StreakCalendarProps {
  days: StreakDay[];
  childName?: string;
  streakColor?: string;
}

/**
 * GitHub-style heatmap calendar showing quest completion days.
 */
export function StreakCalendar({
  days,
  childName = "Child",
  streakColor = colors.secondary,
}: StreakCalendarProps) {
  if (!days || days.length === 0) return null;

  // Show most recent 28 days in a 7-col grid
  const recent = days.slice(-28);
  const rows: StreakDay[][] = [];
  for (let i = 0; i < recent.length; i += 7) {
    rows.push(recent.slice(i, i + 7));
  }

  const completedCount = recent.filter((d) => d.completed).length;

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`${childName} streak calendar. ${completedCount} of ${recent.length} days completed.`}
    >
      <View style={styles.calendarHeader}>
        <Text style={styles.title}>{childName}'s Quest Calendar</Text>
        <Text style={styles.calendarSummary}>
          {completedCount}/{recent.length} days
        </Text>
      </View>
      <View style={styles.dayLabels}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <Text key={i} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.calendarRow}>
          {row.map((day) => (
            <View
              key={day.date}
              style={[
                styles.calendarCell,
                {
                  backgroundColor: day.completed
                    ? streakColor
                    : colors.border + "60",
                },
              ]}
              accessibilityLabel={`${day.date}: ${day.completed ? "completed" : "not completed"}`}
            />
          ))}
          {/* Fill empty cells */}
          {row.length < 7 &&
            Array.from({ length: 7 - row.length }).map((_, i) => (
              <View
                key={`empty-${i}`}
                style={[
                  styles.calendarCell,
                  { backgroundColor: "transparent" },
                ]}
              />
            ))}
        </View>
      ))}
    </View>
  );
}

interface ChildQuestStat {
  childName: string;
  questsCompleted: number;
  color: string;
}

interface WeeklyCompletionChartProps {
  children: ChildQuestStat[];
}

const CHILD_COLORS = [
  colors.primary,
  colors.secondary,
  colors.accent,
  colors.purple,
  "#E74C3C",
  "#1ABC9C",
];

/**
 * Horizontal bar chart showing weekly quest completions per child.
 */
export function WeeklyCompletionChart({
  children,
}: WeeklyCompletionChartProps) {
  if (!children || children.length === 0) return null;

  const max = Math.max(...children.map((c) => c.questsCompleted), 1);

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Weekly quest completions. ${children.map((c) => `${c.childName}: ${c.questsCompleted}`).join(", ")}`}
    >
      <Text style={styles.title}>Weekly Quests Completed</Text>
      {children.map((child, idx) => {
        const barColor = child.color || CHILD_COLORS[idx % CHILD_COLORS.length];
        const width = Math.max(20, (child.questsCompleted / max) * 100);
        return (
          <View key={child.childName} style={styles.hBarRow}>
            <Text style={styles.hBarLabel} numberOfLines={1}>
              {child.childName}
            </Text>
            <View style={styles.hBarTrack}>
              <View
                style={[
                  styles.hBarFill,
                  { width: `${width}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={[styles.hBarValue, { color: barColor }]}>
              {child.questsCompleted}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  // Screen time trend
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
  },
  yAxis: {
    justifyContent: "space-between",
    height: 80,
    paddingRight: spacing.xs,
    width: 36,
  },
  yLabel: {
    fontFamily: fonts.parent.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "right",
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
  },
  barCol: {
    alignItems: "center",
  },
  bar: {
    minHeight: 2,
  },
  xLabel: {
    fontFamily: fonts.parent.regular,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Streak calendar
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  calendarSummary: {
    fontFamily: fonts.parent.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  dayLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xs,
  },
  dayLabel: {
    fontFamily: fonts.parent.medium,
    fontSize: 10,
    color: colors.textSecondary,
    width: 28,
    textAlign: "center",
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  calendarCell: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  // Weekly completion chart
  hBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  hBarLabel: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.textPrimary,
    width: 70,
  },
  hBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: colors.border + "40",
    borderRadius: 8,
    overflow: "hidden",
  },
  hBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  hBarValue: {
    fontFamily: fonts.parent.bold,
    fontSize: 14,
    width: 30,
    textAlign: "center",
  },
});
