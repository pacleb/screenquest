import api from './api';

export interface TimeBankBalance {
  stackableSeconds: number;
  nonStackableSeconds: number;
  totalSeconds: number;
}

export const timeBankService = {
  getBalance: (childId: string) =>
    api.get<TimeBankBalance>(`/children/${childId}/time-bank`).then((r) => r.data),
};
