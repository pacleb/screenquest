export interface CreateChildRequest {
  name: string;
  age: number;
  avatarUrl?: string;
  email?: string;
  pin: string;
}

export interface UpdateChildRequest {
  name?: string;
  age?: number;
  avatarUrl?: string;
  pin?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatarUrl: string | null;
  familyId: string;
}
