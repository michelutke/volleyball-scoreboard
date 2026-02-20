# Self-Hosting Guide

Complete setup guide for running Scoring on your own infrastructure.

## Prerequisites

- Docker 24+ and Docker Compose
- Node.js 20+
- Git

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/scoring.git
cd scoring

# 2. Configure environment
cp .env.example .env
# Edit .env — see "Environment Variables" below

# 3. Start PostgreSQL and Keycloak
docker-compose up -d

# 4. Wait for Keycloak to be ready (~30s)
# Check: http://localhost:8080 should show KC login page

# 5. Set up Keycloak realm
# Option A: Import realm export
#   KC Admin Console > Create realm > Import > select keycloak/realm-export.json
#   IMPORTANT: After import, regenerate client secrets:
#     Clients > scoring-app > Credentials > Regenerate → copy to KEYCLOAK_CLIENT_SECRET
#     Clients > scoring-admin > Credentials > Regenerate → copy to KEYCLOAK_ADMIN_CLIENT_SECRET
#   (The exported file contains placeholder secrets, not real ones)
#
# Option B: Manual setup
#   Follow docs/keycloak-setup.md step by step

# 6. Copy the scoring-app client secret from KC into .env
#    KEYCLOAK_CLIENT_SECRET=<paste here>

# 7. Generate secrets
# AUTH_SECRET:
openssl rand -base64 32
# ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 8. Install dependencies and build
npm install
npm run build

# 9. Push database schema
npx drizzle-kit push

# 10. Start the app
node build
# App runs on http://localhost:3000
```

**Note:** The `docker-compose.yml` runs PostgreSQL and Keycloak only. The app itself is built and run separately with Node.js.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Default: `postgres://scoring:scoring@localhost:5432/scoring` |
| `KEYCLOAK_CLIENT_ID` | Yes | OIDC client ID in Keycloak. Default: `scoring-app` |
| `KEYCLOAK_CLIENT_SECRET` | Yes | Client secret from KC `scoring-app` client Credentials tab |
| `KEYCLOAK_ISSUER` | Yes | KC realm issuer URL. Default: `http://localhost:8080/realms/scoring` |
| `AUTH_SECRET` | Yes | Random 32-byte string for Auth.js session encryption. Generate: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Yes | 64-char hex string (32 bytes) for AES-256-GCM encryption of API keys in DB. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `POSTGRES_USER` | No | Docker Compose postgres user. Default: `scoring` |
| `POSTGRES_PASSWORD` | No | Docker Compose postgres password. Default: `scoring` |
| `POSTGRES_DB` | No | Docker Compose postgres database name. Default: `scoring` |
| `KC_ADMIN_PASSWORD` | No | Keycloak admin console password. Default: `admin` |
| `KEYCLOAK_REALM` | No | KC realm name. Default: `scoring` |
| `KEYCLOAK_ADMIN_URL` | Only for user mgmt | Base URL of KC server for admin API. Default: `http://localhost:8080` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Only for user mgmt | Service account client ID. Default: `scoring-admin` |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Only for user mgmt | Secret from KC `scoring-admin` client Credentials tab |

The `KEYCLOAK_ADMIN_*` variables are only required if you use the `/admin/users` user management page. Basic scoring works without them.

## Keycloak Realm Setup

See [docs/keycloak-setup.md](keycloak-setup.md) for detailed instructions on:
- Creating the `scoring` realm
- Configuring the `scoring-app` OIDC client
- Setting up the realm roles mapper
- Creating the first admin user

Alternatively, import the realm export from `keycloak/realm-export.json` and update secrets.

## First Admin User

After Keycloak is configured:

1. Open KC Admin Console: http://localhost:8080/admin
2. Select realm `scoring`
3. Go to Users > Add user
4. Fill in username and email, save
5. Go to Credentials tab > Set password (temporary: on)
6. Go to Role mapping tab > Assign roles > select `admin`
7. User can now log in to the app and will be prompted to set a permanent password

## Inviting Users (User Management)

The `/admin/users` page lets admins invite scorers by email. This requires:
1. `KEYCLOAK_ADMIN_*` env vars configured (see table above)
2. A KC Organization linked to the app (see [docs/keycloak-setup.md](keycloak-setup.md#8-create-organization-required-for-user-management))

**Without SMTP configured:** Invitation creates the user in Keycloak but does not send an email. The admin must then set the user's password manually via KC Admin Console > Users > Credentials.

## Upgrading

```bash
git pull
npm install
npm run build
npx drizzle-kit push    # Apply any new DB migrations
node build
```

If using a process manager (PM2, systemd), restart the service after building.

## Troubleshooting

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

- Verify Docker is running: `docker-compose ps`
- Check postgres container logs: `docker-compose logs postgres`
- On macOS: if you have Homebrew postgres installed, it may bind to port 5432 before Docker. Check with `lsof -i :5432`. Stop local postgres (`brew services stop postgresql`) or change the Docker port mapping.

### Keycloak login loop

After clicking "Sign in", you're redirected back to the login page repeatedly.

- Verify `KEYCLOAK_ISSUER` matches exactly (protocol, host, port, realm name)
- Verify `KEYCLOAK_CLIENT_SECRET` is correct (re-copy from KC Admin Console > Clients > scoring-app > Credentials)
- Check that the `scoring-app` client has `http://localhost:5173/*` (dev) or `http://localhost:3000/*` (prod) in Valid Redirect URIs
- Clear browser cookies for localhost

### Overlay not updating

The overlay at `/matches/{id}/overlay` shows stale data.

- Verify the match status is `live` (activate it from the control panel)
- Check browser console for SSE connection errors
- Ensure no reverse proxy is buffering SSE responses (disable response buffering / set `X-Accel-Buffering: no`)

### Keycloak "organization" feature not available

- Ensure `KC_FEATURES: organization` (singular, not `organizations`) in docker-compose.yml
- Restart Keycloak after changing: `docker-compose restart keycloak`

### Schema push fails

```
error: relation "xyz" does not exist
```

- Make sure `DATABASE_URL` points to the correct postgres instance (Docker, not a local Homebrew postgres)
- Verify with: `lsof -i :5432` to check which process owns the port
