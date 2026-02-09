import api from './api';

export interface TimeBankBalance {
  stackableMinutes: number;
  nonStackableMinutes: number;
  totalMinutes: number;
}

export const timeBankService = {
  getBalance: (childId: string) =>
    api.get<TimeBankBalance>(`/children/${childId}/time-bank`).then((r) => r.data),
};
