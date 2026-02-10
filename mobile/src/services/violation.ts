import api from './api';

export interface Violation {
  id: string;
  childId: string;
  recordedByUserId: string;
  violationNumber: number;
  penaltyMinutes: number;
  penaltyHours?: number;
  description: string | null;
  forgiven: boolean;
  createdAt: string;
  recordedBy?: { id: string; name: string };
}

export interface ViolationStatus {
  currentCount: number;
  nextPenaltyHours: number;
  nextPenaltyMinutes: number;
  lastResetAt: string | null;
}

export const violationService = {
  async recordViolation(childId: string, description?: string): Promise<Violation> {
    const { data } = await api.post(`/children/${childId}/violations`, { description });
    return data;
  },

  async listViolations(childId: string): Promise<Violation[]> {
    const { data } = await api.get(`/children/${childId}/violations`);
    return data;
  },

  async resetCounter(childId: string): Promise<{ success: boolean }> {
    const { data } = await api.post(`/children/${childId}/violations/reset`);
    return data;
  },

  async forgiveViolation(violationId: string): Promise<Violation> {
    const { data } = await api.put(`/violations/${violationId}/forgive`);
    return data;
  },

  async getViolationStatus(childId: string): Promise<ViolationStatus> {
    const { data } = await api.get(`/children/${childId}/violation-status`);
    return data;
  },
};
