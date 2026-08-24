# Security Adversarial Test Matrix (Phase 3 & 4)

This matrix defines the critical security boundaries implemented in Firestore Rules (Phase 3) and must be rigorously verified in Phase 4 (Adversarial Security Tests).

## 1. Dealer Isolation
| Actor | Target Action | Expected Result | Reason (Rule) |
| :--- | :--- | :--- | :--- |
| **Dealer A** | Read `/dealers/DealerB/serviceSites/xyz` | **DENIED ❌** | `isOwner(dealerId)` fails. Dealer A != Dealer B. |
| **Dealer A** | Write `/dealers/DealerB/customers/abc` | **DENIED ❌** | `isOwner(dealerId)` fails. |
| **Dealer A** | Create `/dealers/DealerA/serviceSites/123` with `dealerId = DealerB` | **DENIED ❌** | `request.resource.data.dealerId == dealerId` fails. Ownership is immutable. |

## 2. Installer Pre-Award Privacy
| Actor | Target Action | Expected Result | Reason (Rule) |
| :--- | :--- | :--- | :--- |
| **Installer (Not Awarded)** | Read `/jobs/job123/private/details` (exact address/margin) | **DENIED ❌** | Fails `isJobParticipant`. Not awarded yet. |
| **Installer (Awarded)** | Read `/jobs/job123/private/details` | **ALLOWED ✅** | Passes `isJobParticipant(awardedProfessionalId)`. |
| **Installer (Any)** | Query `dealerMargin` via `listOpenJobs` | **SANITIZED 🛡️** | Filtered by Server DTO masking + natively blocked in `/private` subcollection. |

## 3. Customer Isolation
| Actor | Target Action | Expected Result | Reason (Rule) |
| :--- | :--- | :--- | :--- |
| **Customer A** | Read `/jobs/job_for_CustB` | **DENIED ❌** | Fails `isJobParticipant(clientId)`. |
| **Customer A** | Read `/dealers/DealerA/operationalMemory/InstallerX` | **DENIED ❌** | Customers are not Dealers; `isOwner(dealerId)` fails. |

## 4. State Machine & Payment Manipulation
| Actor | Target Action | Expected Result | Reason (Rule) |
| :--- | :--- | :--- | :--- |
| **Client / Dealer** | Update `/jobs/job123` setting `status: 'Awarded'` | **DENIED ❌** | `status` is in the `affectedKeys().hasAny(...)` blocklist. |
| **Client / Dealer** | Update `/jobs/job123` setting `paymentStatus: 'released'` | **DENIED ❌** | `paymentStatus` is in the blocklist. |
| **Installer** | Update `/jobs/job123` setting `paymentStatus: 'released'` | **DENIED ❌** | Installers cannot update `/jobs` directly at all. |

## 5. Reputation & Financial Field Spoofing
| Actor | Target Action | Expected Result | Reason (Rule) |
| :--- | :--- | :--- | :--- |
| **Client / Dealer** | Update `/jobs/job123` setting `dealerMargin: 5000` | **DENIED ❌** | `dealerMargin`, `b2bPrice`, `b2bCost` are in the blocklist. |
| **Installer** | Update `/users/InstallerX` setting `points: 1000` | **DENIED ❌** | `points` is not in the allowed update keys for `users`. |
| **Installer** | Update `/users/InstallerX` setting `professionalProfile.rating: 5` | **DENIED ❌** | `professionalProfile` updates are restricted to `skills` and `about` only. |

## 6. Audit & Timeline Integrity
| Actor | Target Action | Expected Result | Reason (Rule) |
| :--- | :--- | :--- | :--- |
| **Client / Installer** | Delete `/job_events/event123` | **DENIED ❌** | `allow delete: if false` |
| **Client / Installer** | Update `/job_events/event123` | **DENIED ❌** | `allow update: if false` |
| **Client / Installer** | Create `/job_events/event123` directly | **DENIED ❌** | `allow create: if false` (must use Admin API). |
