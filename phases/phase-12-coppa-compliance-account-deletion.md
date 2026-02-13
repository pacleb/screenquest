# ScreenQuest — Phase 12: COPPA Compliance, Account Deletion & Privacy

> **Prerequisites:** Phases 1–11 complete.
> **Source:** Extracted from Phase 10 sections 4 (COPPA Compliance) and portions of section 11 (Pre-Launch Checklist).
> **Goal:** Implement all legal and compliance requirements for targeting children under 13, including parental consent, data minimization, account deletion, and privacy policy integration.

---

## What to Build in This Phase

### 1. Parental Consent Flow (Section 4.1)

Before a parent creates a child account (under 13), display a **verifiable parental consent** screen:

- Explain what data is collected about the child (name, age, quest activity, screen time usage)
- Explain how data is used (only for app functionality, never for advertising)
- Explain data sharing (none — no third-party sharing)
- Require explicit consent: "I am this child's parent/guardian and I consent to creating this account" with checkbox + signature/confirmation

**Database:**

```sql
CREATE TABLE parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) NOT NULL,
  consenting_parent_id UUID REFERENCES users(id) NOT NULL,
  consent_text TEXT NOT NULL,        -- snapshot of what they consented to
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  revoked_at TIMESTAMPTZ             -- NULL unless consent is revoked
);
```

- If consent is revoked → child account must be deactivated and data scheduled for deletion

### 2. Data Minimization for Children (Section 4.2)

- Children's accounts collect ONLY: name, age, avatar selection, quest/play activity
- No email required for children under 13 (parent-managed account)
- No behavioral analytics collected on child sessions
- No third-party SDKs in child UI that collect data (careful with Firebase Analytics — use only FCM for push, not Analytics)
- No social features exposing children to strangers (family-only leaderboard is fine)

### 3. Account Deletion (Section 4.3)

Required by **Apple App Store**, **Google Play**, and **GDPR**:

- `DELETE /api/users/:userId/account` — request account deletion
  - For parent/owner: deletes their personal data, transfers or deletes family
  - For child: deletes all child data (completions, Time Bank, achievements, violations, photos)
  - For owner deleting family: cascade-delete all family data
- Store deletion request with 30-day grace period (allow undo)
- After 30 days: permanently purge all personal data
- Delete associated proof photos from S3
- Revoke all tokens
- Log deletion for compliance audit trail (anonymized: "User [hash] deleted on [date]")

**In-app UI:**

- Settings → Account → "Delete My Account" (red, with clear warnings)
- Confirmation dialog explaining what will be deleted
- Email confirmation of deletion request

### 4. Privacy Policy & Terms (Section 4.4)

- Privacy policy accessible from: login screen, settings, app store listing
- Must clearly state:
  - What data is collected (per user role)
  - How data is used
  - Data retention periods
  - Third-party services used (Firebase for push notifications, RevenueCat for subscriptions)
  - Parent rights (access, delete, revoke consent)
  - Contact information for privacy inquiries
- Terms of Service covering subscription billing, refund policy, acceptable use
- Both documents versioned; users re-accept on material changes

---

## Done When

- [ ] Parental consent screen displays before child account creation
- [ ] Consent records stored in database with timestamp and IP
- [ ] Account deletion flow works end-to-end with 30-day grace period
- [ ] Privacy policy and terms of service are published and accessible in-app
- [ ] No analytics SDKs running in child-mode screens
- [ ] Data purge job runs after 30-day grace period
