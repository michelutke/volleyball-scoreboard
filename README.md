# Volleyball Scoreboard

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Real-time volleyball scoring app with OBS overlay, built for VBC Thun.

## Features

- Live match scoring with set/point tracking and undo
- OBS overlay (browser source) with real-time SSE updates
- Service indicator, jersey colors, timeout display
- Swiss Volley API integration (team/match sync)
- Keycloak OIDC authentication + multi-tenancy
- User management (invite scorers by email)
- Mobile-friendly control panel

## Tech Stack

- **Frontend**: SvelteKit 2 + Svelte 5 (runes), Tailwind CSS 4
- **Backend**: SvelteKit server routes, Node adapter
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Auth**: Auth.js v5 + Keycloak OIDC
- **Real-time**: Server-Sent Events (SSE)

## Getting Started

### Prerequisites

- Node.js 22+
- Docker + Docker Compose

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/michelutke/volleyball-scoreboard.git
cd volleyball-scoreboard
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set AUTH_SECRET, ENCRYPTION_KEY, and KEYCLOAK_CLIENT_SECRET

# 3. Start PostgreSQL and Keycloak
docker compose up -d

# 4. Create first admin user in Keycloak (realm auto-imports on startup)
# See docs/keycloak-setup.md — ~2 min

# 5. Start dev server (runs DB migrations automatically)
npm run dev
```

> **macOS:** If you have Homebrew postgres running, it may conflict with Docker on port 5432.
> Check with `lsof -i :5432`. Stop it with `brew services stop postgresql@16` if needed.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random 32-byte string — `openssl rand -base64 32` |
| `KEYCLOAK_CLIENT_ID` | Yes | OIDC client ID. Default: `scoring-app` |
| `KEYCLOAK_CLIENT_SECRET` | Yes | Client secret from KC `scoring-app` Credentials tab |
| `KEYCLOAK_ISSUER` | Yes | KC realm URL. Default: `http://localhost:8080/realms/scoring` |
| `ENCRYPTION_KEY` | Yes | 64-char hex for AES-256-GCM — `openssl rand -hex 32` |
| `KEYCLOAK_ADMIN_URL` | User mgmt only | KC base URL. Default: `http://localhost:8080` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | User mgmt only | Service account client ID. Default: `scoring-app` |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | User mgmt only | Service account client secret |
| `KEYCLOAK_REALM` | No | KC realm name. Default: `scoring` |

See `.env.example` for all defaults.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (auto-runs DB migrations) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | Svelte type checking |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Vitest watch mode |

## Deployment

See [docs/self-hosting.md](docs/self-hosting.md) for full production setup.

DB migrations run automatically on app startup — no manual migration step needed.

## Keycloak Setup

See [docs/keycloak-setup.md](docs/keycloak-setup.md) for realm creation, client config, roles, and organization setup.

For SMTP (email invitations): [docs/smtp-setup.md](docs/smtp-setup.md).

## License

[CC BY-NC-SA 4.0](LICENSE) — Attribution required. No commercial use. Share-alike.
