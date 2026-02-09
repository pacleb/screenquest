import api from './api';

export interface PlaySession {
  id: string;
  childId: string;
  requestedMinutes: number;
  status: 'requested' | 'approved' | 'denied' | 'active' | 'paused' | 'completed' | 'stopped' | 'cancelled';
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
  endedAt: string | null;
  remainingSeconds: number;
  remainingMinutes: number;
  createdAt: string;
}

export interface PlaySettings {
  playApprovalMode: 'require_approval' | 'notify_only';
  dailyScreenTimeCap: number | null;
  allowedPlayHoursStart: string;
  allowedPlayHoursEnd: string;
  weekendDailyScreenTimeCap: number | null;
  weekendPlayHoursStart: string;
  weekendPlayHoursEnd: string;
}

export const playSessionService = {
  // Child endpoints
  requestPlay: (childId: string, requestedMinutes: number) =>
    api.post<PlaySession>(`/children/${childId}/play`, { requestedMinutes }).then((r) => r.data),

  getActiveSession: (childId: string) =>
    api.get<PlaySession | null>(`/children/${childId}/play/active`).then((r) => r.data),

  getSettings: (childId: string) =>
    api.get<PlaySettings>(`/children/${childId}/play/settings`).then((r) => r.data),

  updateSettings: (childId: string, settings: Partial<PlaySettings>) =>
    api.put<PlaySettings>(`/children/${childId}/play/settings`, settings).then((r) => r.data),

  // Session actions
  getSession: (sessionId: string) =>
    api.get<PlaySession>(`/play-sessions/${sessionId}`).then((r) => r.data),

  pause: (sessionId: string) =>
    api.post<PlaySession>(`/play-sessions/${sessionId}/pause`).then((r) => r.data),

  resume: (sessionId: string) =>
    api.post<PlaySession>(`/play-sessions/${sessionId}/resume`).then((r) => r.data),

  stop: (sessionId: string) =>
    api.post<PlaySession>(`/play-sessions/${sessionId}/stop`).then((r) => r.data),

  // Parent actions
  approve: (sessionId: string) =>
    api.put<PlaySession>(`/play-sessions/${sessionId}/approve`).then((r) => r.data),

  deny: (sessionId: string) =>
    api.put<PlaySession>(`/play-sessions/${sessionId}/deny`).then((r) => r.data),

  extend: (sessionId: string, additionalMinutes: number) =>
    api.post<PlaySession>(`/play-sessions/${sessionId}/extend`, { additionalMinutes }).then((r) => r.data),

  end: (sessionId: string) =>
    api.post<PlaySession>(`/play-sessions/${sessionId}/end`).then((r) => r.data),
};
