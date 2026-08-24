# Admin RBAC Matrix & Policy Table

This document defines the Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) rules for administrative operations within the Team4Job platform.

## 1. Role Definitions

The platform supports 6 granular administrative sub-roles:

| Role | Code Name | Description |
|---|---|---|
| **Support Agent** | `support_agent` | First-line customer support. Can view logs, flag items, and perform basic operations on jobs or user flags. |
| **Risk Analyst** | `risk_analyst` | Trust and safety team members. Responsible for fraud analysis, risk queue management, and checking user verification data. |
| **Finance Operations** | `finance_ops` | Financial administrators responsible for verifying transactions, reviewing payouts, resolving minor pricing disputes, and processing refunds (under limit). |
| **Compliance Manager** | `compliance_manager` | Oversees compliance, privacy (GDPR/PII), audit logs, and handles legal/regulatory inquiries. |
| **Platform Administrator** | `platform_admin` | Manages operational configurations, feature flags, system settings, and escalations. |
| **Super Administrator** | `super_admin` | Unrestricted access across the platform. Can execute all operations, override any rules, manage admin user roles, and trigger high-risk dual-control actions. |

---

## 2. Policy Matrix (Action × Role)

Actions map directly to the defined `AdminActionType` keys in our auditing engine.

Legend:
- `✓`: Authorized (Full Access)
- `L`: Gated by Limit / Conditions (ABAC rules apply)
- `D`: Requires Dual-Control / Step-Up Auth
- `✗`: Unauthorized

| Action Category | Action (`AdminActionType`) | `support_agent` | `risk_analyst` | `finance_ops` | `compliance_manager` | `platform_admin` | `super_admin` |
|---|---|---|---|---|---|---|---|
| **User Operations** | `USER_SUSPENDED` | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| | `USER_ACTIVATED` | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| | `USER_DELETED` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| | `USER_VERIFIED` | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| | `ROLE_CHANGED` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| | `IMPERSONATE_USER` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Job Operations** | `JOB_DELETED` | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| | `JOB_FLAGGED` | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **Trust & Safety** | `BLACKLIST_UPDATED` | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| | `RISK_SCORE_OVERRIDE` | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ |
| **Financial Ops** | `REFUND_PROCESSED` | ✗ | ✗ | L | ✗ | D | ✓ |
| | `PAYOUT_OVERRIDDEN` | ✗ | ✗ | L | ✗ | D | ✓ |
| **Case & Disputes**| `CASE_CREATED` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| | `CASE_CLOSED` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| | `DISPUTE_RESOLVED` | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| **System & Setup** | `SETTINGS_CHANGED` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| | `COUPON_CREATED` | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ |
| | `TEAM_MEMBER_ADDED` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| | `TEAM_MEMBER_REMOVED`| ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 3. ABAC & Conditional Limits

### 3.1 Payout & Refund Thresholds (`finance_ops`)
- **Refunds**: Can process absolute refunds up to ₹10,000 per case. Refunds above ₹10,000 require `platform_admin` role with a second approval (`super_admin` or secondary `platform_admin`).
- **Payout Overrides**: Manual payout overrides are capped at ₹25,000 for `finance_ops`. Larger manual releases require `platform_admin` or `super_admin` role.

### 3.2 Sensitive Data Masking (PII)
- `support_agent` and `risk_analyst` see masked Aadhar front/back, email, and mobile numbers by default.
- Masking can only be unmasked temporarily with logged justification under audit trails for `compliance_manager`, `platform_admin`, and `super_admin`.

### 3.3 Dual-Control Gating
- High-risk operations (e.g. banning an active Professional with >Gold reputation status, issuing manual refunds >₹50,000) are flagged as **Dual-Control**.
- Initiator submits a Case request. A second administrative user with sufficient permissions must sign off to complete the action.
