# Scoring - Volleyball Scoreboard

Volleyball live-scoring app with OBS overlay for VBC Thun. Built with SvelteKit 5 (Svelte 5 runes), PostgreSQL/Drizzle ORM, Tailwind CSS 4, real-time SSE.

## Tech Stack

- **Frontend**: SvelteKit 2.50 + Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- **Backend**: SvelteKit server routes, adapter-node
- **Database**: PostgreSQL via `postgres` driver + Drizzle ORM
- **Styling**: Tailwind CSS 4 + scoped `<style>` blocks
- **Font**: Montserrat (Google Fonts, loaded in `app.html`)
- **Real-time**: Server-Sent Events (SSE) for overlay updates
- **Testing**: Vitest

## Project Structure

```
src/
  lib/
    types.ts              # Core types: Team, MatchState, SetScore, SSEEvent, TeamSummary, MatchListItem
    volleyball.ts         # Scoring business logic (addPoint, removePoint, resetMatch, isMatchOver)
    volleyball.test.ts
    server/
      db/
        index.ts          # DB connection (postgres + drizzle)
        schema.ts         # Drizzle schema: settings, teams, matches, scores, timeouts
      match-state.ts      # toMatchState() - converts DB rows to MatchState
      sse.ts              # SSE emitters: global (legacy) + per-match
      swiss-volley.ts     # Swiss Volley API integration (getTeams, getMatches)
  routes/
    +page.svelte          # Setup page (club config) or redirect to /teams
    teams/                # Team list (home after setup)
    teams/[teamId]/       # Match schedule per team (upcoming/past tabs)
    matches/[matchId]/
      control/            # Per-match scoring UI
      overlay/            # Per-match OBS overlay
    control/              # Legacy control panel (backup, standalone)
    overlay/              # Legacy overlay (backup, standalone)
    api/
      settings/           # GET/PUT club settings (clubName, swissVolleyClubId)
      teams/              # GET/POST teams
      teams/sync/         # POST sync teams from Swiss Volley API
      teams/[teamId]/matches/       # GET/POST matches for team
      teams/[teamId]/matches/sync/  # POST sync matches from Swiss Volley API
      matches/[matchId]/            # GET/PUT per-match scoring + settings
      matches/[matchId]/activate/   # POST activate match (status→live)
      matches/[matchId]/timeout/    # POST/DELETE timeouts
      matches/[matchId]/stream/     # GET per-match SSE stream
      match/              # Legacy scoring API (backup)
      match/timeout/      # Legacy timeout API (backup)
      scores/stream/      # Legacy SSE stream (backup)
      swiss-volley/       # Swiss Volley API proxy
static/
  vbcthun-ball.svg        # VBC Thun ball icon (service indicator)
drizzle/                  # Migration files
```

## Key Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run check        # svelte-check (type checking)
npm run test         # Vitest
npm run test:watch   # Vitest watch mode
npx drizzle-kit generate  # Generate migration
npx drizzle-kit push      # Push schema to DB
```

## Environment

```
DATABASE_URL=postgres://scoring:scoring@localhost:5432/scoring
KEYCLOAK_CLIENT_ID=scoring-app
KEYCLOAK_CLIENT_SECRET=...
KEYCLOAK_ISSUER=http://localhost:8080/realms/scoring
AUTH_SECRET=...          # random 32-byte string (openssl rand -base64 32)
ENCRYPTION_KEY=...       # 32-byte hex (openssl rand -hex 32)
# SWISS_VOLLEY_API_KEY no longer used — API key stored encrypted in DB per org
```

## Architecture

### Navigation Flow
```
/ (Setup)          → First visit: club config form → saves to settings table
                   → After setup: redirect to /teams
/teams             → Team list, auto-syncs from Swiss Volley on load
/teams/[id]        → Match schedule (tabs: upcoming/past), auto-syncs matches
/matches/[id]/control → Per-match scoring UI
/matches/[id]/overlay → Per-match OBS overlay
/control           → Legacy standalone control (backup)
/overlay           → Legacy standalone overlay (backup)
```

### Scoring Flow
1. Control panel calls `PUT /api/matches/[matchId]` with action (addPoint, removePoint, etc.)
2. Server applies volleyball rules via `volleyball.ts`, inserts new score snapshot
3. Server emits SSE via `emitAll()` — both per-match and legacy global listeners
4. Overlay receives SSE on `/api/matches/[matchId]/stream`, updates reactively

### SSE Architecture
- `sseEmitter` (global) — legacy `/api/scores/stream`, used by `/overlay`
- `matchSSEEmitter` (per-match) — `/api/matches/[matchId]/stream`, used by `/matches/[id]/overlay`
- `emitAll(matchId, event)` — emits to both, ensuring legacy and per-match overlays both work

### Swiss Volley Sync
- **Team sync**: on `/teams` page load, fetches teams from SV API, upserts by `swissVolleyTeamId`
- **Match sync**: on `/teams/[id]` page load, fetches matches from SV API, upserts by `swissVolleyMatchId`
- Sync is non-fatal (catch errors, show local data)
- Live/finished matches are never overwritten by sync
- Manual teams/matches (no SV ID) are unaffected

### Score History
Each action inserts a new `scores` row (append-only). Undo deletes the latest row and restores previous state.

### Theme System
- Light/dark/system theme via `[data-theme="light"]` CSS var overrides in `app.css`
- `:root` = dark (default), `[data-theme="light"]` overrides surface/text/border/error vars
- Overlay vars (`--color-overlay-*`) intentionally NOT overridden — overlays always dark
- No-flash: inline `<script>` in `app.html` reads localStorage before paint
- Theme state managed in `+layout.svelte`, listens for `themechange` CustomEvent + `prefers-color-scheme`
- Accent palette (`theme.ts`) accepts `mode` param — light mode uses darker accent (L=40) for WCAG AA
- Theme selector (System/Hell/Dunkel) on settings page only, stored in `localStorage('theme')`
- `setStoredTheme()` dispatches `themechange` event so layout re-derives immediately
- Preview scoreboards in control pages stay dark (they mirror the overlay appearance)

### Overlay Features
- Team names, jersey colors (configurable), set/point scores
- Inline set scores (toggle `showSetScores`): each team row shows per-set scores + current set highlighted
- Service indicator (VBC Thun ball icon)
- Timeout: yellow box in the team's row, auto-dismisses after 30s
- Transparent background for OBS chroma key / browser source

### Database Tables
- `settings`: key/value store per org — composite PK `(org_id, key)` — stores clubName, swissVolleyClubId, accentColor, swissVolleyApiKey (encrypted)
- `teams`: team name, optional swissVolleyTeamId, orgId
- `matches`: team names, jersey colors, settings, status, teamId FK, scheduledAt, venue, league, orgId
- `scores`: point-in-time snapshots (homePoints, guestPoints, homeSets, guestSets, setScores JSON, serviceTeam)
- `timeouts`: timeout records per match/set/team

## Auth & Multi-tenancy

### Authentication
- Auth.js v5 (`@auth/sveltekit`) with Keycloak OIDC provider
- Session guard in `src/hooks.server.ts` — public paths: `/auth`, `/api/auth`, `/matches/*/overlay`, `/overlay`
- `src/auth.ts` decodes Keycloak access token manually (base64url split) to extract `org_id` and `realm_access.roles` — the ID token doesn't contain realm roles by default
- Session exposes `session.user.orgId` and `session.user.roles`

### Multi-tenancy
- Every DB table (`settings`, `teams`, `matches`) has `org_id text NOT NULL DEFAULT 'default'`
- `settings` composite PK: `(org_id, key)`
- `locals.orgId` injected by hook from `session.user.orgId ?? 'default'`
- All API routes filter by `eq(table.orgId, locals.orgId)` — never query without orgId

### Encrypted settings
- `src/lib/server/crypto.ts` — AES-256-GCM using `ENCRYPTION_KEY` env var (32-byte hex)
- Swiss Volley API key stored encrypted in `settings` table under key `swissVolleyApiKey`
- GET `/api/settings` never returns the API key value; PUT encrypts before writing

### Keycloak (Docker)
- Feature flag is `KC_FEATURES: organization` (singular, not `organizations`)
- Requires a separate `keycloak` database in postgres: `CREATE DATABASE keycloak;`
- Realm roles mapper must be added to the client to include `realm_access.roles` in access token

## User Management

### Roles
- `admin` KC realm role: full access, user management
- No special role (org member): scorer access only

### KC Admin API client
`src/lib/server/keycloak-admin.ts` — typed client using client_credentials grant with 50-min token cache.
Env vars: `KEYCLOAK_ADMIN_URL`, `KEYCLOAK_ADMIN_CLIENT_ID`, `KEYCLOAK_ADMIN_CLIENT_SECRET`, `KEYCLOAK_REALM`.

### User management routes
- `GET /api/users` — list org members (admin only)
- `POST /api/users` — invite scorer by email (admin only)
- `DELETE /api/users/[id]` — remove + disable user (admin only, cannot self-remove)
- `/admin/users` — user management UI (admin only)

### kcOrgId
KC's internal org UUID stored in `settings` table under key `kcOrgId` per org.

### DB Migration Gotcha — dual postgres
**Critical:** On macOS with Homebrew postgres + Docker postgres both running on `:5432`, the native process wins for `localhost:5432` connections. `DATABASE_URL` in `.env` and drizzle-kit both use the native postgres. Migrations applied to the Docker container don't affect the app. Always verify with `lsof -i :5432` if you see unexpected schema errors.

## Conventions

- Svelte 5 runes only (no `let:`, no `$:`, no stores)
- Type annotations required
- German UI labels (Heim/Gast, Auszeit, Satzresultate)
- Scoped styles in components, no global CSS beyond Tailwind
- Legacy routes (`/control`, `/overlay`, `/api/match/*`) remain as backup — do not remove
- Use `untrack(() => data.X)` from `svelte` when initializing `$state` from props to avoid reactive dependency warnings
