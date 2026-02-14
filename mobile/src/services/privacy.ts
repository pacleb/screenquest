import api from './api';

export interface DeletionRequest {
  id: string;
  gracePeriodEndsAt: string;
  message: string;
}

export interface DeletionStatus {
  id: string;
  requestedAt: string;
  gracePeriodEndsAt: string;
  cancelledAt: string | null;
  purgedAt: string | null;
}

export interface PolicyAcceptance {
  id: string;
  documentType: string;
  documentVersion: string;
  acceptedAt: string;
}

export const privacyService = {
  // Consent
  createConsent: (childId: string, consentText: string) =>
    api.post(`/privacy/consent/${childId}`, { consentText }).then((r) => r.data),

  getConsent: (childId: string) =>
    api.get(`/privacy/consent/${childId}`).then((r) => r.data),

  revokeConsent: (childId: string) =>
    api.post(`/privacy/consent/${childId}/revoke`).then((r) => r.data),

  // Account deletion
  requestDeletion: (reason?: string) =>
    api.delete<DeletionRequest>('/privacy/account', { data: { reason } }).then((r) => r.data),

  cancelDeletion: () =>
    api.post('/privacy/account/cancel-deletion').then((r) => r.data),

  getDeletionStatus: () =>
    api.get<DeletionStatus | null>('/privacy/account/deletion-status').then((r) => r.data),

  // Policy
  acceptPolicy: (documentType: string, documentVersion: string) =>
    api.post('/privacy/policy/accept', { documentType, documentVersion }).then((r) => r.data),

  getAcceptances: () =>
    api.get<PolicyAcceptance[]>('/privacy/policy/acceptances').then((r) => r.data),
};
