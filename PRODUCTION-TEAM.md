# Central production-team verification

Scheduler's signup `department` and `role` are self-selected profile data. They do not prove membership. There was no pre-existing authoritative crew-membership or team-administrator model in this repository.

The existing server-managed `Config` table now stores a separate `production-team:v1:<account-id>` record. This table already holds protected server configuration and has no public write endpoint. No schema migration or new environment variable is required for the existing PostgreSQL production schema.

An operator with trusted Scheduler database credentials must check the person's actual Whiteout team membership and assignment against an independent production record (for example, the confirmed crew roster or contract), then attest once through the CLI. The operator must also confirm that the actual crew member controls the selected Scheduler account through a trusted channel; a matching email string alone is not proof of account ownership. The operator supplies an evidence reference covering both checks and their identity. An email-verification link or a signup-selected role is not sufficient evidence. Do not bulk-verify all registered accounts or infer team membership from an email domain.

The CLI resolves an **existing account by email** in Scheduler's own database, requires its exact department/role assignment, and binds verification to that immutable account ID plus email and assignment. It does not accept numeric ID lists. It atomically writes the current record and a separate audit record retaining the previous value. Revocation is also audited. Deleted/recreated accounts do not inherit verification, even with the same email. Email/assignment mismatches fail closed. Only database administrators can modify these records; the audit is an operational trail, not tamper-proof against database administrators.

## Operator commands

Use the already configured Scheduler server environment and its database credentials. From a normal built server checkout:

```sh
NODE_ENV=production npm run team:membership --prefix server -- verify \
  --email 'confirmed-person@example.com' \
  --department 'Creative' --role 'Director' \
  --actor 'Named production operator' \
  --evidence 'Reference to independently confirmed crew record'
```

These values are illustrative; do not run the example against production. If the account assignment is incorrect, correct the production identity before verifying it. Verification does not alter profile data.

The Scheduler Docker runtime does not copy `package.json`; from `/app` in that runtime use the compiled command directly with the same arguments:

```sh
node dist/src/users/production-membership-cli.js verify --email 'confirmed-person@example.com' --department 'Creative' --role 'Director' --actor 'Named production operator' --evidence 'Confirmed crew record reference'
node dist/src/users/production-membership-cli.js revoke --email 'confirmed-person@example.com' --actor 'Named production operator' --evidence 'Crew departure reference'
```

The command starts no HTTP service, runs no migrations or schema synchronization, sends no email and requires no new secret or Railway configuration. Treat database access as the administrative security boundary. Do not expose this command behind an unauthenticated route.

## Consumer contract

Authenticated `GET /api/me` adds `productionMembership: null` by default. A current, independently verified member receives:

```json
{
  "productionMembership": {
    "verified": true,
    "userID": 123,
    "email": "confirmed-person@example.com",
    "department": "Creative",
    "role": "Director",
    "verifiedAt": "2026-10-31T00:00:00.000Z"
  }
}
```

Operator identity, evidence notes and audit history are not returned. Signup and profile DTOs cannot set membership. Missing, malformed, revoked or mismatched records produce `null`. Database errors fail the request instead of granting access. The claim is read fresh from server storage for every `/api/me` request; it is not a long-lived JWT role claim.

Production Desk consumes this response server-to-server after validating the Scheduler session. Its eight eligible roles have identical Shot Lists editing rights. Other registered users and verified people in other roles remain denied. No invitation, document ACL, numeric ID environment list, edit-approval workflow or per-new-member deployment is involved.

## Before release

Release the Scheduler `/api/me` change and Production Desk policy together (Scheduler first is safe), then verify the confirmed crew centrally using real evidence. An empty registry intentionally grants nobody access to Shot Lists. Existing M03 membership rows cannot safely establish team verification and are not promoted automatically. Existing shot-list documents require no ACL backfill or data migration.

For local verification, Production Desk's `qa/m03/scheduler-prepare.cjs --install` builds this actual Scheduler source outside the checkout. `qa/m03/team-access.cjs` tests the real membership helper, administrative operation, user response and signup/profile DTO protection against a disposable PostgreSQL schema, plus all eight roles over the real local Production Desk HTTP/WebSocket stack.
