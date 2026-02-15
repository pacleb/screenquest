/**
 * Format seconds into a human-readable short string.
 * Examples: "1h 30m", "5m 30s", "45s", "1h 0m 15s"
 */
export function formatTimeShort(seconds: number): string {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    return s > 0
      ? `${sign}${h}h ${m}m ${s}s`
      : m > 0
        ? `${sign}${h}h ${m}m`
        : `${sign}${h}h`;
  }
  if (abs >= 60) {
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return s > 0 ? `${sign}${m}m ${s}s` : `${sign}${m} min`;
  }
  return `${sign}${abs}s`;
}

/**
 * Format seconds into a friendly label like "15 min", "1 min 30 secs", "45 secs".
 * Used for quest rewards, play time presets, etc.
 */
export function formatTimeLabel(seconds: number): string {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    if (m === 0) return `${sign}${h} hr`;
    return `${sign}${h} hr ${m} min`;
  }
  if (abs >= 60) {
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    if (s === 0) return `${sign}${m} min`;
    return `${sign}${m} min ${s} sec`;
  }
  return `${sign}${abs} sec`;
}

/**
 * Format seconds for a compact chip/badge like "15m", "1.5h", "30s"
 */
export function formatTimeCompact(seconds: number): string {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  if (abs >= 3600) {
    const h = abs / 3600;
    return h % 1 === 0 ? `${sign}${h}h` : `${sign}${h.toFixed(1)}h`;
  }
  if (abs >= 60) {
    const m = Math.floor(abs / 60);
    return `${sign}${m}m`;
  }
  return `${sign}${abs}s`;
}
