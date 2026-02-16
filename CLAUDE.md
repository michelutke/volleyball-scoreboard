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
    types.ts          # Core types: Team, MatchState, SetScore, SSEEvent
    volleyball.ts     # Scoring business logic (addPoint, removePoint, resetMatch, isMatchOver)
    volleyball.test.ts
    server/
      db/
        index.ts      # DB connection (postgres + drizzle)
        schema.ts     # Drizzle schema: matches, scores, timeouts tables
      match-state.ts  # toMatchState() - converts DB rows to MatchState
      sse.ts          # SSE emitter singleton
      swiss-volley.ts # Swiss Volley API integration
  routes/
    control/          # Control panel (tablet UI for scoring)
    overlay/          # OBS overlay (transparent background, positioned top-left)
    api/
      match/          # PUT: score actions (addPoint, removePoint, addSet, removeSet, undo, reset, switchService + settings)
      match/timeout/  # POST: call timeout
      scores/stream/  # GET: SSE stream
      swiss-volley/   # Swiss Volley API proxy
static/
  vbcthun-ball.svg    # VBC Thun ball icon (service indicator)
drizzle/              # Migration files
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
SWISS_VOLLEY_API_KEY=  # Optional
```

## Architecture

### Scoring Flow
1. Control panel calls `PUT /api/match` with action (addPoint, removePoint, etc.)
2. Server applies volleyball rules via `volleyball.ts`, inserts new score snapshot
3. Server emits SSE event with updated `MatchState`
4. Overlay receives SSE, updates display reactively

### Score History
Each action inserts a new `scores` row (append-only). Undo deletes the latest row and restores previous state.

### Overlay Features
- Team names, jersey colors (configurable), set/point scores
- Inline set scores (toggle `showSetScores`): each team row shows per-set scores + current set highlighted
- Service indicator (VBC Thun ball icon)
- Timeout: yellow box in the team's row, auto-dismisses after 30s
- Transparent background for OBS chroma key / browser source

### Database Tables
- `matches`: team names, jersey colors, settings, status
- `scores`: point-in-time snapshots (homePoints, guestPoints, homeSets, guestSets, setScores JSON, serviceTeam)
- `timeouts`: timeout records per match/set/team

## Conventions

- Svelte 5 runes only (no `let:`, no `$:`, no stores)
- Type annotations required
- German UI labels (Heim/Gast, Auszeit, Satzresultate)
- Scoped styles in components, no global CSS beyond Tailwind
