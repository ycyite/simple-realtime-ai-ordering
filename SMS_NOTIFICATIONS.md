# SMS Notification Implementation Plan

## Overview
- **Goal:** Notify customers via SMS as their order progresses through key milestones: order created, restaurant confirmed, ready for pickup/delivery, and customer confirmation.
- **Drivers:** Reduce missed communications, improve customer confidence, and provide a fallback channel when push/email is unavailable.
- **Scope:** Add backend support to emit SMS events, ensure restaurant operators can optionally trigger manual reminders, and record delivery outcomes for auditing.

## Assumptions
- Orders already emit state changes via an internal event bus (`order.status.updated`).
- Phone numbers are collected during checkout and validated against E.164 format.
- A third-party SMS provider (e.g., Twilio, MessageBird) will be used; provider credentials are stored in secrets management (`ENV`, Vercel, or Vault).
- Regulatory compliance (TCPA/GDPR) requires opt-in and opt-out workflows; existing consent flags can be reused.

## High-Level Architecture
1. **Event Publisher:** Order service publishes state transitions to a queue/topic (existing or new).
2. **Notification Orchestrator:** Listens for relevant order events, enriches with customer and restaurant data, and routes to SMS worker.
3. **SMS Worker:** Formats localized templates, calls provider API, and records response status.
4. **Notification Store:** Persists SMS attempts with metadata (`message_id`, status, error codes) for support visibility.
5. **Admin UI Hooks:** Surfaced in the operations dashboard so support can re-send or view history.

```
Order Service → Event Bus → Notification Orchestrator → SMS Worker → Provider API
                                             ↘→ Notification Store → Support UI
```

## Required Order Status Triggers
| Event | Description | SMS Copy Theme |
| --- | --- | --- |
| `order.created` | Customer submits new order | Confirmation with order summary and ETA placeholder |
| `order.confirmed` | Restaurant accepts order | Updated ETA or pickup window |
| `order.ready` | Restaurant marks ready | Ready for pickup/delivery, includes instructions |
| `order.completed` | Customer confirms receipt | Thank-you message plus feedback CTA |

> `order.cancelled` and `order.delayed` should be considered stretch goals for future iterations.

## Implementation Steps
1. **Domain Updates**
   - Extend order status enum if needed to align with event naming conventions.
   - Ensure phone/contact data is accessible from notification context.
2. **Event Wiring**
   - Publish canonical events on status transitions (idempotent).
   - Backfill historical orders only if explicitly required.
3. **Notification Service**
   - Create `smsNotifications` module under `lib/notifications/`.
   - Inject provider client via dependency inversion to allow mocking/testing.
   - Implement template resolver (e.g., `smsTemplates/{locale}/{event}.ts`) returning text + placeholders.
4. **Provider Integration**
   - Start with Twilio SDK (preferred) or simple REST fetch.
   - Define env variables: `SMS_PROVIDER`, `SMS_TWILIO_ACCOUNT_SID`, `SMS_TWILIO_AUTH_TOKEN`, `SMS_TWILIO_FROM_NUMBER`.
   - Standardize error handling with exponential backoff + DLQ (dead-letter queue) for 5xx or rate limits.
5. **Persistence**
   - Add `Notification` table (Prisma) with fields: `id`, `orderId`, `type`, `channel`, `status`, `providerMessageId`, `errorCode`, `sentAt`.
   - Expose query in admin dashboard for support lookups.
6. **Consent Handling**
   - Only send SMS when `customer.smsOptIn === true`.
   - Provide opt-out keyword handling (STOP) via provider webhook endpoint.
7. **Observability**
   - Add structured logs around send attempts.
   - Emit metrics (`sms.sent.count`, `sms.error.count`) to monitoring stack.

## Testing Strategy
- **Unit Tests:** Template rendering, provider client wrapper, consent gating.
- **Integration Tests:** Simulate order lifecycle, assert outgoing SMS payloads via provider mock.
- **End-to-End:** Staging environment with provider test credentials; run scripted order flow.
- **Chaos Tests:** Validate retry/backoff logic by forcing provider errors.

## Rollout Plan
1. Deploy behind feature flag `notifications.sms`.
2. Enable for internal test accounts; verify templates and timing.
3. Gradually roll out per region/timezone once metrics stable.
4. Monitor delivery and opt-out rates; adjust copy for clarity.

## Operational Playbook
- **Failures:** Automatic retry up to 3 attempts; escalate to support after repeated failures.
- **Manual Resend:** Admin dashboard button triggers new event with `forceSend` guard.
- **Provider Outage:** Feature flag can disable SMS while keeping events queued for later replay.
- **Compliance Audits:** Export `Notification` records filtered by campaign and timeframe.

## Open Questions
- Do we need multilingual SMS copy at launch?
- Should cancellations trigger proactive apologies/ETA adjustments?
- Are there regional sender ID requirements (e.g., UK alpha sender IDs)?
- How do we synchronize opt-out state with existing email/push preferences?

