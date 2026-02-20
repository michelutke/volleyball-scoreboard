# SaaS Plan: scoring-saas

Private repo handling Stripe subscription events and Keycloak organization provisioning.

## Architecture

```
scoring-saas/
  src/
    index.ts              # Express server entry
    webhooks/
      stripe.ts           # Stripe webhook handler
    keycloak/
      client.ts           # KC Admin API client (token management)
      org.ts              # Create/disable org, users, role mappings
    db/
      schema.ts           # Drizzle schema (stripe_customers table)
      index.ts            # DB connection
  drizzle/                # Migrations
  .env.example
  docker-compose.yml      # Postgres only (KC is shared with scoring)
```

**Stack**: Node.js, Express, Stripe SDK, Drizzle ORM, PostgreSQL.

## Keycloak Service Account Setup

1. In KC Admin Console, go to realm `scoring` > Clients > Create client
2. Client ID: `scoring-admin`
3. Client authentication: **ON** (confidential)
4. Service accounts roles: **ON**
5. Standard flow: **OFF**, Direct access grants: **OFF**
6. Save, go to Credentials tab, copy client secret
7. Go to Service Account Roles tab:
   - Click "Assign role" > Filter by clients > select `realm-management`
   - Assign: `manage-users`, `view-users`, `manage-realm`

These permissions allow creating orgs, users, and assigning roles via the Admin API.

## Stripe Webhook Handler

Listen for events on `POST /webhooks/stripe`.

### Events

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create KC org + admin user, store mapping |
| `customer.subscription.deleted` | Disable KC org + users |

### Webhook verification

```ts
const event = stripe.webhooks.constructEvent(
  req.body,           // raw body
  req.headers['stripe-signature'],
  STRIPE_WEBHOOK_SECRET
);
```

### Subscription Created Flow

Extract from event:
- `customer` (Stripe customer ID)
- `customer.email` (for admin user)
- `customer.name` (for org name)

### Subscription Deleted Flow

Look up KC org ID from `stripe_customers` table, disable org and all member users.

## Keycloak Admin API Calls

### Token Acquisition

```
POST {KC_URL}/realms/scoring/protocol/openid-connect/token
  grant_type=client_credentials
  client_id=scoring-admin
  client_secret={SECRET}
```

Cache token until expiry (access_token.expires_in).

### On Subscription Created

1. **Create organization**
   ```
   POST /admin/realms/scoring/organizations
   { "name": "{orgName}", "enabled": true }
   → 201, Location header contains org ID
   ```

2. **Create admin user**
   ```
   POST /admin/realms/scoring/users
   { "username": "{email}", "email": "{email}", "enabled": true, "emailVerified": false }
   → 201, Location header contains user ID
   ```

3. **Add user to organization**
   ```
   POST /admin/realms/scoring/organizations/{orgId}/members
   { "id": "{userId}" }
   ```

4. **Assign admin realm role**
   ```
   GET /admin/realms/scoring/roles/admin → get role representation
   POST /admin/realms/scoring/users/{userId}/role-mappings/realm
   [ { role representation } ]
   ```

5. **Send setup email** (set password + verify email)
   ```
   PUT /admin/realms/scoring/users/{userId}/execute-actions-email
   ["UPDATE_PASSWORD", "VERIFY_EMAIL"]
   ```

6. **Store mapping** in DB

### On Subscription Deleted

1. Look up `orgId` from `stripe_customers` where `stripeCustomerId = event.customer`
2. **Disable organization**
   ```
   PUT /admin/realms/scoring/organizations/{orgId}
   { "enabled": false }
   ```
3. **List org members**
   ```
   GET /admin/realms/scoring/organizations/{orgId}/members
   ```
4. **Disable each user**
   ```
   PUT /admin/realms/scoring/users/{userId}
   { "enabled": false }
   ```

## Data Model

Single table mapping Stripe customers to KC orgs:

```sql
CREATE TABLE stripe_customers (
  id            SERIAL PRIMARY KEY,
  stripe_customer_id  TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  kc_org_id     TEXT NOT NULL,
  kc_admin_user_id TEXT NOT NULL,
  email         TEXT NOT NULL,
  org_name      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',  -- active | disabled
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now()
);
```

## Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Keycloak Admin
KEYCLOAK_ADMIN_URL=http://localhost:8080
KEYCLOAK_REALM=scoring
KEYCLOAK_ADMIN_CLIENT_ID=scoring-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=...

# Database
DATABASE_URL=postgres://saas:saas@localhost:5432/scoring_saas

# Server
PORT=4000
```

## Sequence Diagram

### Subscription Created

```
Customer        Stripe          scoring-saas        Keycloak        PostgreSQL
   |               |                  |                 |                |
   |--subscribe--->|                  |                 |                |
   |               |--webhook-------->|                 |                |
   |               |  (sub.created)   |                 |                |
   |               |                  |--POST /orgs---->|                |
   |               |                  |<---201 orgId----|                |
   |               |                  |--POST /users--->|                |
   |               |                  |<---201 userId---|                |
   |               |                  |--POST members-->|                |
   |               |                  |<---204----------|                |
   |               |                  |--POST roles---->|                |
   |               |                  |<---204----------|                |
   |               |                  |--PUT actions--->|                |
   |               |                  |<---200----------|                |
   |               |                  |--INSERT---------|--------------->|
   |               |                  |<----------------|------ok--------|
   |               |<-----200---------|                 |                |
   |<--setup email-|------------------|-----------------|                |
```

### Subscription Deleted

```
Customer        Stripe          scoring-saas        Keycloak        PostgreSQL
   |               |                  |                 |                |
   |--cancel------>|                  |                 |                |
   |               |--webhook-------->|                 |                |
   |               |  (sub.deleted)   |                 |                |
   |               |                  |--SELECT---------|--------------->|
   |               |                  |<----------------|----orgId-------|
   |               |                  |--PUT org------->|                |
   |               |                  |  (disabled)     |                |
   |               |                  |--GET members--->|                |
   |               |                  |<---members------|                |
   |               |                  |--PUT user(s)--->|                |
   |               |                  |  (disabled)     |                |
   |               |                  |--UPDATE---------|--------------->|
   |               |                  |<----------------|------ok--------|
   |               |<-----200---------|                 |                |
```
