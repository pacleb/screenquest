import api from './api';

export interface Family {
  id: string;
  name: string;
  familyCode: string;
  plan: string;
  ownerId: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  age: number | null;
}

export interface CreateChildData {
  name: string;
  consentText: string;
  age?: number;
  avatarUrl?: string;
  email?: string;
}

export const familyService = {
  create: (name: string) =>
    api.post<Family>('/families', { name }).then((r) => r.data),

  join: (familyCode: string) =>
    api.post<Family>('/families/join', { familyCode }).then((r) => r.data),

  get: (familyId: string) =>
    api.get<Family>(`/families/${familyId}`).then((r) => r.data),

  getMembers: (familyId: string) =>
    api.get<FamilyMember[]>(`/families/${familyId}/members`).then((r) => r.data),

  invite: (familyId: string, email: string) =>
    api.post(`/families/${familyId}/invite`, { email }).then((r) => r.data),

  createChild: (familyId: string, data: CreateChildData) =>
    api.post(`/families/${familyId}/children`, data).then((r) => r.data),

  updateChild: (familyId: string, childId: string, data: Partial<CreateChildData>) =>
    api.put(`/families/${familyId}/children/${childId}`, data).then((r) => r.data),

  removeChild: (familyId: string, childId: string) =>
    api.delete(`/families/${familyId}/children/${childId}`).then((r) => r.data),
};
