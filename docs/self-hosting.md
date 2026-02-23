# Self-Hosting Guide

Complete setup guide for running Scoring on your own infrastructure.

## Prerequisites

- Docker 24+ and Docker Compose
- Node.js 22+
- Git

> **macOS only:** If you have Homebrew postgres installed, it will conflict with Docker on port 5432.
> Check with `lsof -i :5432`. Stop it with `brew services stop postgresql@16` before continuing.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/scoring.git
cd scoring

# 2. Configure environment
cp .env.example .env
```

Edit `.env` and fill in the required values:

```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

Paste the outputs into `.env`. You'll add `KEYCLOAK_CLIENT_SECRET` after the next step.

```bash
# 3. Start PostgreSQL and Keycloak
docker compose up -d
# Keycloak auto-imports the realm from keycloak/realm.json on first start (~30s)

# 4. Create your first admin user in Keycloak
# See docs/keycloak-setup.md — takes ~2 minutes

# 5. Install dependencies and build
npm install
npm run build

# 6. Start the app (DB migrations run automatically)
node build
# App runs at http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ORIGIN` | **Yes (production)** | Public URL of the app, e.g. `https://scoreboard.example.com`. Required by SvelteKit for CSRF protection — omitting it causes 502/bad gateway errors behind a reverse proxy. Not needed for local dev. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Default: `postgres://scoring:scoring@localhost:5432/scoring` |
| `AUTH_SECRET` | Yes | Random string for session encryption. Generate: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Yes | 64-char hex for AES-256-GCM. Generate: `openssl rand -hex 32` |
| `KEYCLOAK_CLIENT_ID` | Yes | OIDC client ID. Default: `scoring-app` |
| `KEYCLOAK_CLIENT_SECRET` | Yes | Client secret from KC `scoring-app` Credentials tab |
| `KEYCLOAK_ISSUER` | Yes | KC realm URL. Default: `http://localhost:8080/realms/scoring` |
| `KEYCLOAK_REALM` | No | KC realm name. Default: `scoring` |
| `KEYCLOAK_ADMIN_URL` | User mgmt only | KC base URL. Default: `http://localhost:8080` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | User mgmt only | Service account client ID. Default: `scoring-app` |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | User mgmt only | Secret from KC `scoring-app` Credentials tab |
| `POSTGRES_USER` | No | Docker postgres user. Default: `scoring` |
| `POSTGRES_PASSWORD` | No | Docker postgres password. Default: `scoring` |
| `KC_ADMIN_PASSWORD` | No | Keycloak admin console password. Default: `admin` |

The `KEYCLOAK_ADMIN_*` variables are only needed for the `/admin/users` user management page. Basic scoring works without them.

## Keycloak Realm Setup

The realm is auto-imported from `keycloak/realm.json` on first Keycloak startup — no manual realm configuration needed.

The only required step is creating your first admin user. See [docs/keycloak-setup.md](keycloak-setup.md).

## First Admin User

1. KC Admin Console: http://localhost:8080/admin → realm `scoring`
2. Users > Add user — fill in username, email, Email verified: ON → Save
3. Credentials tab > Set password (Temporary: ON)
4. Role mapping tab > Assign roles > select `admin`

The user can now log in and will be prompted to set a permanent password.

## Inviting Users (User Management)

The `/admin/users` page lets admins invite scorers by email. Requires:
1. `KEYCLOAK_ADMIN_*` env vars set (see table above)
2. KC Organization linked to the app (see [keycloak-setup.md](keycloak-setup.md#8-create-organization-required-for-user-management))

**Without SMTP:** User is created in KC but no email is sent. Set the password manually via KC Admin Console > Users > Credentials.

## Production (Docker Compose)

For fully containerized production (e.g. via [Coolify](https://coolify.io)):

```bash
# Set all required env vars in .env (see table above)
# Plus these production-specific vars:
KC_HOSTNAME=your-keycloak-domain.com
POSTGRES_USER=scoring
POSTGRES_PASSWORD=<strong-password>

docker compose -f docker-compose.prod.yml up -d
```

The app is available on port `3000`. Put it behind a reverse proxy (nginx, Caddy) for HTTPS.

> **Reverse proxy + SSE:** Disable response buffering for the scoring domain, otherwise the OBS overlay will not receive live updates. For nginx: `proxy_buffering off;`. For Caddy it works automatically.

DB migrations run automatically when the app container starts — no separate step needed.

## Upgrading

```bash
git pull
npm install
npm run build
node build    # DB migrations run automatically
```

For Docker Compose production, rebuild the app container:
```bash
docker compose -f docker-compose.prod.yml up -d --build app
```

## Troubleshooting

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

- Verify Docker is running: `docker compose ps`
- Check postgres logs: `docker compose logs postgres`
- **macOS:** Homebrew postgres may have claimed port 5432 before Docker. Run `lsof -i :5432` to check. Stop it with `brew services stop postgresql@16`.

### Keycloak login loop

After clicking "Sign in" you're redirected back to the login page.

- Verify `KEYCLOAK_ISSUER` matches exactly (protocol, host, port, realm name)
- Verify `KEYCLOAK_CLIENT_SECRET` is correct (re-copy from KC Admin Console > Clients > scoring-app > Credentials)
- Check that `scoring-app` has the correct Valid Redirect URIs (`http://localhost:3000/*` for prod)
- Clear browser cookies for localhost

### Overlay not updating

The overlay at `/matches/{id}/overlay` shows stale data.

- Verify the match status is `live` (activate from the control panel)
- Check browser console for SSE connection errors
- Check reverse proxy buffering (see note above)

### Keycloak "organization" feature not available

- Ensure `KC_FEATURES: organization` (singular — not `organizations`) in docker-compose.yml
- Restart: `docker compose restart keycloak`
- Also enable per-realm: KC Admin Console > realm `scoring` > Realm settings > Organizations: ON

### Schema errors (`relation "xyz" does not exist`)

- Verify `DATABASE_URL` points to the Docker postgres, not a local Homebrew postgres
- Check which process owns port 5432: `lsof -i :5432`
