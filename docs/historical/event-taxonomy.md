# Team4Job — Event Taxonomy & Schema Registry

This document lists the 8 core administrative and transactional events emitted by the platform. All events are logged to the `platform_events` Firestore collection for downstream stream processing, SLA verification, and high-fidelity auditable compliance logs.

---

## 1. Event Envelop Schema

Every event extends the base event envelope:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlatformEventEnvelope",
  "type": "object",
  "required": ["id", "type", "timestamp", "correlationId", "schemaVersion", "tenantId", "actorId", "payload"],
  "properties": {
    "id": { "type": "string", "description": "Unique identifier (UUID or Firestore Doc ID)" },
    "type": { "type": "string", "description": "The specific domain event name" },
    "timestamp": { "type": "object", "description": "Firestore server Timestamp" },
    "correlationId": { "type": "string", "description": "Correlation ID spanning the lifecycle of a business request" },
    "schemaVersion": { "type": "integer", "default": 1 },
    "tenantId": { "type": "string", "default": "team4job" },
    "actorId": { "type": "string", "description": "User ID of the initiator of the event" },
    "payload": { "type": "object" }
  }
}
```

---

## 2. Event Registry

### 2.1 `job.created`
Emitted immediately when a new job is successfully posted.

- **Actor**: Client
- **Payload Schema**:
```json
{
  "jobId": "JOB-YYYY-XXXXXX",
  "clientId": "usr_client_123",
  "title": "Fix AC Unit",
  "jobCategory": "air_conditioning",
  "budget": 2500
}
```

---

### 2.2 `bid.placed`
Emitted when a qualified professional places a bid on an open job.

- **Actor**: Professional
- **Payload Schema**:
```json
{
  "bidId": "bid_98724",
  "jobId": "JOB-YYYY-XXXXXX",
  "professionalId": "usr_prof_456",
  "amount": 2300
}
```

---

### 2.3 `job.awarded`
Emitted when the Client accepts a professional's bid and awards the contract.

- **Actor**: Client
- **Payload Schema**:
```json
{
  "jobId": "JOB-YYYY-XXXXXX",
  "clientId": "usr_client_123",
  "professionalId": "usr_prof_456",
  "bidAmount": 2300
}
```

---

### 2.4 `escrow.funded`
Emitted when the payment is authorized and funds are allocated to the escrow ledger.

- **Actor**: Client / Payment Gateway
- **Payload Schema**:
```json
{
  "transactionId": "txn_894723",
  "jobId": "JOB-YYYY-XXXXXX",
  "clientId": "usr_client_123",
  "professionalId": "usr_prof_456",
  "amount": 2300
}
```

---

### 2.5 `dispute.opened`
Emitted when either client or professional initiates a dispute on an active job.

- **Actor**: Client or Professional
- **Payload Schema**:
```json
{
  "disputeId": "dis_32489",
  "jobId": "JOB-YYYY-XXXXXX",
  "requesterId": "usr_client_123",
  "reason": "Professional did not complete the kitchen plumbing correctly."
}
```

---

### 2.6 `dispute.resolved`
Emitted when an administrative user (support_agent / finance_ops / super_admin) resolves an open dispute.

- **Actor**: Admin User
- **Payload Schema**:
```json
{
  "disputeId": "dis_32489",
  "jobId": "JOB-YYYY-XXXXXX",
  "resolvedBy": "usr_admin_001",
  "resolution": "Refund 50% to Client, release remaining 50% to Professional.",
  "refundAmount": 1150
}
```

---

### 2.7 `review.submitted`
Emitted when rating and review are posted by a client or professional.

- **Actor**: Client or Professional
- **Payload Schema**:
```json
{
  "reviewId": "rev_23984",
  "jobId": "JOB-YYYY-XXXXXX",
  "reviewerId": "usr_client_123",
  "revieweeId": "usr_prof_456",
  "rating": 5
}
```

---

### 2.8 `user.flagged`
Emitted when a user account triggers fraud, KYC failure, behavior anomaly, or gets flagged manually.

- **Actor**: System (Risk scoring) or Compliance Manager
- **Payload Schema**:
```json
{
  "userId": "usr_prof_456",
  "flaggedBy": "system_risk_engine",
  "reason": "IP spoofing detected; risk score exceeded limit.",
  "riskScore": 87
}
```
