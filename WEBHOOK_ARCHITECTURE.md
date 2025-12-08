# 🔄 Webhook Event Processing - Transactional Architecture

## The Problem (Before Fix)

### Original Flow:
```
Stripe Webhook → Process Event → Update DB
                                    ↓
                          ❌ If fails, no record
                          ❌ Can't retry
                          ❌ No idempotency
```

### Issues:
1. **Duplicate Processing:** If Stripe retries webhook, same event processed multiple times
2. **Lost Events:** If processing fails, event is gone forever
3. **Partial Updates:** DB could be half-updated if error occurs mid-processing
4. **No Audit Trail:** Can't see what events were received or why they failed

---

## The Solution (After Fix)

### New Transactional Flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRIPE WEBHOOK RECEIVED                     │
│                    (e.g., payment_intent.succeeded)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Step 1: Check Idempotency            │
        │  Query: WebhookEvent.stripeEventId    │
        │                                        │
        │  If found & processed → STOP           │
        │  If found & failed → RETRY             │
        │  If not found → CONTINUE               │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Step 2: Store Webhook Event          │
        │                                        │
        │  CREATE WebhookEvent {                 │
        │    stripeEventId: event.id             │
        │    eventType: "payment_intent.succeeded"│
        │    payload: {...} (full event data)    │
        │    processed: false                    │
        │  }                                     │
        │                                        │
        │  Purpose: Audit trail + replay ability │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Step 3: Begin Transaction            │
        │                                        │
        │  await prisma.$transaction(async tx => │
        │    ... all DB operations here ...      │
        │  })                                    │
        │                                        │
        │  If ANY operation fails, ALL rollback  │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Step 4: Process Event (in transaction)│
        │                                        │
        │  switch(eventType) {                   │
        │    case 'payment_intent.succeeded':    │
        │      tx.payment.update({               │
        │        status: 'succeeded',            │
        │        completedAt: now               │
        │      })                                │
        │      break;                            │
        │                                        │
        │    case 'payment_intent.payment_failed':│
        │      tx.payment.update({               │
        │        status: 'failed',               │
        │        failureReason: ...              │
        │      })                                │
        │      break;                            │
        │                                        │
        │    case 'charge.refunded':             │
        │      tx.payment.update({               │
        │        status: 'refunded',             │
        │        refundedAmount: ...             │
        │      })                                │
        │      break;                            │
        │  }                                     │
        │                                        │
        │  ✅ All DB changes commit together     │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Step 5: Mark as Processed            │
        │                                        │
        │  UPDATE WebhookEvent SET               │
        │    processed = true                    │
        │    processedAt = NOW()                 │
        │  WHERE stripeEventId = event.id        │
        │                                        │
        │  Event permanently marked as done      │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  SUCCESS: Return 200 to Stripe        │
        │                                        │
        │  Stripe won't retry this event        │
        └───────────────────────────────────────┘
```

### Error Handling Flow:

```
┌─────────────────────────────────────────┐
│  Transaction Fails                      │
│  (Network, DB error, validation, etc)   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  All DB Changes Rolled Back               │
│  (Payment status NOT updated)             │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  Update WebhookEvent                      │
│                                           │
│  UPDATE WebhookEvent SET                  │
│    processed = false                      │
│    processingError = error.message        │
│  WHERE stripeEventId = event.id           │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  Return Error to Stripe                   │
│                                           │
│  Stripe will retry the webhook            │
│  (exponential backoff)                    │
└───────────────────────────────────────────┘
```

---

## Real-World Example

### Scenario: Payment Intent Succeeds

**Stripe Event Received:**
```json
{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 1000,
      "customer": "cus_xyz789",
      "status": "succeeded"
    }
  }
}
```

**Database Changes (All or Nothing):**

```sql
-- Step 1: Store webhook event
INSERT INTO "WebhookEvent" (
  stripeEventId, eventType, payload, processed
) VALUES (
  'evt_1234567890',
  'payment_intent.succeeded',
  '{"id":"evt_1234567890",...}',
  false
);

-- Step 2: BEGIN TRANSACTION

-- Step 2a: Update payment
UPDATE "Payment"
SET 
  status = 'succeeded',
  completedAt = NOW()
WHERE stripePaymentIntentId = 'pi_abc123';

-- Step 2b: (Other business logic)
-- Maybe update inventory, create order, etc.

-- Step 3: COMMIT TRANSACTION

-- Step 4: Mark webhook as processed
UPDATE "WebhookEvent"
SET 
  processed = true,
  processedAt = NOW()
WHERE stripeEventId = 'evt_1234567890';
```

**If Step 2a Fails:**
- ❌ Payment status NOT updated (rolled back)
- ❌ No inventory changes (rolled back)
- ✅ WebhookEvent still exists with `processed = false`
- ✅ Error stored in `processingError` field
- ✅ Stripe retries webhook later
- ✅ Next retry will succeed (event not marked as processed)

---

## Benefits Explained

### 1. **Idempotency** (No Duplicate Processing)

**Without Idempotency:**
```
Request 1: Payment succeeds → User charged $10 ✅
Request 2: (retry) Payment succeeds → User charged $10 ✅
Request 3: (retry) Payment succeeds → User charged $10 ✅
Result: User charged $30 instead of $10 ❌
```

**With Idempotency:**
```
Request 1: 
  - Check: evt_123 not found
  - Process: Update payment
  - Mark: processed = true ✅

Request 2: (retry)
  - Check: evt_123 found, processed = true
  - Skip: Already handled
  - Return: 200 OK ✅

Request 3: (retry)
  - Check: evt_123 found, processed = true
  - Skip: Already handled
  - Return: 200 OK ✅

Result: User charged $10 (correct) ✅
```

---

### 2. **Atomicity** (All or Nothing)

**Without Transaction:**
```
1. Update payment status → ✅ SUCCESS
2. Update inventory → ✅ SUCCESS
3. Create order → ❌ FAILS
4. Send email → ⏭️ SKIPPED

Result: Payment marked as succeeded but no order created ❌
Database is inconsistent ❌
```

**With Transaction:**
```
BEGIN TRANSACTION
1. Update payment status → ✅ SUCCESS
2. Update inventory → ✅ SUCCESS
3. Create order → ❌ FAILS
ROLLBACK TRANSACTION

Result: Nothing changed ✅
Can retry safely ✅
No inconsistent state ✅
```

---

### 3. **Replay Capability** (Never Lose Events)

**Stored Webhook Event:**
```json
{
  "id": "wh_001",
  "stripeEventId": "evt_123",
  "eventType": "payment_intent.succeeded",
  "payload": {...}, // Full event data
  "processed": false,
  "processingError": "Database connection timeout",
  "createdAt": "2024-12-07T10:00:00Z"
}
```

**Manual Replay Query:**
```typescript
// Find failed webhooks
const failedEvents = await prisma.webhookEvent.findMany({
  where: { 
    processed: false,
    createdAt: { gte: new Date('2024-12-07') }
  }
});

// Retry processing
for (const event of failedEvents) {
  await handleWebhookEvent(event.payload);
}
```

---

### 4. **Audit Trail** (Debugging & Compliance)

**Query Examples:**

```typescript
// All webhooks received today
SELECT * FROM "WebhookEvent" 
WHERE createdAt >= CURRENT_DATE;

// Failed webhooks
SELECT * FROM "WebhookEvent" 
WHERE processed = false;

// Processing time analysis
SELECT 
  eventType,
  AVG(EXTRACT(EPOCH FROM (processedAt - createdAt))) as avg_seconds
FROM "WebhookEvent"
WHERE processed = true
GROUP BY eventType;

// Webhook timeline for a payment
SELECT * FROM "WebhookEvent"
WHERE payload->'data'->'object'->>'id' = 'pi_abc123'
ORDER BY createdAt;
```

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Duplicate Processing | ❌ Yes | ✅ Prevented |
| Lost Events | ❌ Yes | ✅ All stored |
| Partial Updates | ❌ Possible | ✅ Prevented |
| Audit Trail | ❌ None | ✅ Full history |
| Retry Capability | ❌ No | ✅ Automatic |
| Debugging | ❌ Hard | ✅ Easy |
| Data Consistency | ❌ Not guaranteed | ✅ Guaranteed |
| Production Ready | ❌ No | ✅ Yes |

---

## Monitoring Queries

### Check Webhook Health
```sql
-- Unprocessed events (potential issues)
SELECT COUNT(*) as pending_webhooks
FROM "WebhookEvent"
WHERE processed = false
  AND createdAt < NOW() - INTERVAL '10 minutes';

-- Recent errors
SELECT eventType, processingError, COUNT(*)
FROM "WebhookEvent"
WHERE processed = false
  AND processingError IS NOT NULL
GROUP BY eventType, processingError;

-- Success rate by event type
SELECT 
  eventType,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as succeeded,
  ROUND(100.0 * SUM(CASE WHEN processed THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM "WebhookEvent"
GROUP BY eventType;
```

---

## Summary

**Transactional webhook processing ensures:**
1. ✅ **Exactly-once processing** (idempotency)
2. ✅ **Data consistency** (transactions)
3. ✅ **Event persistence** (audit trail)
4. ✅ **Automatic retries** (Stripe + manual)
5. ✅ **Production reliability** (no lost events)

This architecture is **industry standard** for payment processing systems and ensures your application can handle:
- Network failures
- Database outages
- Duplicate webhooks
- Manual event replay
- Compliance audits
