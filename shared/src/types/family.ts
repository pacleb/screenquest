export interface Family {
  id: string;
  name: string;
  familyCode: string;
  plan: FamilyPlan;
  subscriptionExpiresAt: string | null;
  subscriptionPeriod: SubscriptionPeriod | null;
  ownerId: string;
  createdAt: string;
}

export interface CreateFamilyRequest {
  name: string;
}

export interface JoinFamilyRequest {
  familyCode: string;
}

export interface InviteFamilyMemberRequest {
  email: string;
  role?: 'guardian';
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: 'parent' | 'guardian' | 'child';
  age: number | null;
}

export type FamilyPlan = 'free' | 'premium';

export type SubscriptionPeriod = 'monthly' | 'yearly';
