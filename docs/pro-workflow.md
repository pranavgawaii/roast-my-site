# RoastMySite Pro Approval Workflow

## Metadata Contract

RoastMySite reads Pro and waitlist state from Clerk `public_metadata`.

Required keys:

- `proApproved`: `true | false`
- `proWaitlistStatus`: `"pending" | "approved" | "denied"`
- `proRequestedAt`: ISO timestamp (when request is created)
- `proSince`: ISO timestamp (when Pro is approved)

## State Mapping

- `proApproved=true` OR `proWaitlistStatus=approved` -> `userStatus=pro` (unlimited)
- `proWaitlistStatus=pending` -> `userStatus=waitlist` (0/day, blocked)
- otherwise signed-in user -> `userStatus=free` (2/day)
- no valid auth token -> `userStatus=anonymous` (0/day, login required)

## Approval Action

Set in Clerk user `public_metadata`:

```json
{
  "proApproved": true,
  "proWaitlistStatus": "approved",
  "proSince": "2026-02-11T10:30:00.000Z"
}
```

## Deny Action

```json
{
  "proApproved": false,
  "proWaitlistStatus": "denied"
}
```

## Pending Request Action

Set when user submits `/api/pro-waitlist`:

```json
{
  "proWaitlistStatus": "pending",
  "proRequestedAt": "2026-02-11T10:30:00.000Z"
}
```

## Operational Notes

- Rotate Clerk secret keys immediately if leaked publicly.
- Keep `PRO_TIER_ENABLED=0` to disable Pro gate logic during rollout testing.
- `/api/account` should be used by UI to display authoritative usage and plan status.
- Admin dashboard access is restricted to emails in `ADMIN_EMAILS` (defaults include `pranvgg@gmail`).
