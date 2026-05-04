# Scorely — Kinetic Redesign

Branch: `feature/redesign` (18 commits ahead of `main`)
Status: complete, ready to merge

A full visual + interaction overhaul of the Scorely app under a single design language ("Kinetic"). Every user-facing surface is restyled, a new scoreboard variant is shipped alongside the existing Classic, and a per-match layout override system is wired end-to-end with backend persistence.

---

## Design language

**Kinetic.** Editorial broadcast aesthetic: dark/paper neutrals, two opposing accents (pulse red `#ff3d2e`, cool blue `#1d4ed8` — only used on Library "select" indicators now), Inter Variable for everything (with weight-axis "breathing"), tabular mono numerals, mass-eased motion, scroll-linked parallax for editorial pages.

**Tokens** (in `src/app.css`):
- Palette: `--ink`, `--paper`, `--pulse`/`-soft`/`-deep`, `--cool`/`-soft`/`-deep`, grey scale 100/300/500/700/900
- Semantic surfaces: `--k-surface`, `--k-surface-alt`, `--k-text`, `--k-text-mute`, `--k-text-dim`, `--k-line` (flip per `[data-theme]`)
- Type: `--font-sans` (Inter Variable), `--font-display`, `--font-mono`, weight axis tokens
- Motion: `--ease-snap`, `--ease-mass`, `--ease-glide`, `--ease-out-soft`; `--motion-scale` driving `--dur-fast/mid/slow/breathe`
- Grid: `--grid-margin`, `--container-max`, `--baseline`

---

## What shipped, by phase

### P1 — Foundation (`fef7564`)

- Self-host **Inter Variable** (`@fontsource-variable/inter`, Latin subset, DE umlauts covered). Replaces Montserrat from Google Fonts.
- Install **Motion One** (`motion`, ~5kb).
- Extend `src/app.css` with the full token set above.
- **Theme** persistence: cookie `scoring-theme` (light/dark/system) alongside localStorage; server reads in `+layout.server.ts`; FOUC-safe inline bootstrap script in `app.html`.
- **Motion preference** infra: cookie `scoring-motion`, `data-motion` attribute (`full` / `damped` / `static`), `prefers-reduced-motion` damps to `0.3` scale by default.

### P2 — Kinetic Landing (`962ea65`)

- `src/lib/motion.ts` — reusable Svelte actions wrapping Motion One: `reveal`, `staggerChildren`, `magnetic`, `countUp`, `digitRoll`. All respect `--motion-scale` (no-op when static).
- **LandingNav** — translucent backdrop blur, scroll-driven wordmark weight compression, magnetic CTA, pulse-dot heartbeat
- **Hero** (arrival) — split-letter staggered entry, gradient + grid mask, scrolling live-score ticker, scroll cue line
- **Features** (revelation) — clean 2×2 grid (later iteration), magnetic indent + pulse bar on hover
- **HowItWorks** (acceleration) — oversized mono numerals 01/02/03, pinned step cards
- **Pricing** (peak) — pulse-bordered SaaS card with `countUp` price, opposing-accent hover
- **FAQ** (deceleration) — grid-row height accordion, mass-eased chevron
- **Footer** (arrival again) — oversized closing wordmark, repeat magnetic CTA

### P3 — App Shell (`2d2c511`)

- **K* primitives** in `src/lib/components/k/`:
  - `KButton` (primary/secondary/ghost/danger × sm/md/lg, optional magnetic, polymorphic anchor/button)
  - `KInput`, `KField` (label + hint + error wrapper)
  - `KCard`, `KListRow`, `KSection`, `KEmpty`
  - `KSegmented` (generic radio group)
  - `KThemeToggle` (L/D/A), `KMotionToggle` (●●●/●●○/○○○/A)
- **App `Nav.svelte`** rewrite:
  - Brand wordmark + pulse-dot + clubName mono kicker
  - Active route indicator: pulse underline that slides between items with `--ease-snap`
  - Avatar in 1px frame, rotates 3° on hover with mass easing
  - User dropdown: Theme + Motion toggles + Profil + Abmelden
  - Mobile drawer with toggle sections inside

### P4 — App Pages (`de92b30`)

- Dashboard, Teams, Settings, Signin restyled with K* primitives, KSection headers, KEmpty fallbacks, mono meta lines, status pills (live=pulse, plan=cool)
- Signin keeps the scoreboard metaphor but swaps Montserrat→Inter Variable and the submit button to a pulse pill

### P5+P6 — Scoreboard Registry + Kinetic Variant (`89206ee`)

- `src/lib/components/scoreboards/index.ts` — `SCOREBOARD_LAYOUTS` registry, types (`ScoreboardOptions`, `ScoreboardLayout`, `ScoreboardOptionDef`), `getLayout()` resolver.
- Move existing `ScoreboardDisplay` → `scoreboards/Classic.svelte` (look unchanged, accepts forward-compat `options` prop).
- Top-level `ScoreboardDisplay.svelte` becomes a thin dispatcher accepting `layoutId` + `options`.
- New `scoreboards/Kinetic.svelte`:
  - Inter Variable + tabular mono numerals
  - Animated digit roll on point change (`{#key}`-driven keyframe)
  - Service team indicator (●) with pulse animation + serve bar in points cell
  - Inline per-row banners (set point=cool, match point=pulse, timeout=yellow) — see iterations below
  - Customizable options: theme (dark/light), warm/cool accent, showLogos
  - Reduced-motion paths damp animations
- `Demo.svelte` rewired through `layoutId="kinetic"` and styled with Kinetic surfaces.

### P7 — Library Page (`d440226`)

Two-section layout:
- **01 / Scoreboard Layouts** — registry-driven cards with **live previews** of Classic + Kinetic on a sample match state, selection persists via API (`PUT /api/library/default-layout`) for logged-in users, localStorage fallback otherwise. Per-layout customization panel with color pickers / toggles / select.
- **02 / Community Overlays** — existing custom overlays in a 1px-divider grid.

### P8 — Migration + Persistence (`c591775`)

- `drizzle/0007_kinetic_scoreboard.sql` (idempotent, `IF NOT EXISTS`):
  ```sql
  ALTER TABLE matches ADD COLUMN scoreboard_layout text;
  ALTER TABLE matches ADD COLUMN scoreboard_options jsonb;
  ```
  Both nullable. `NULL` = use org default.
- Org defaults stored in existing `settings` KV table (no schema change needed):
  - `defaultScoreboardLayout` (text)
  - `defaultScoreboardOptions` (text — stringified JSON)
- API endpoints:
  - `GET /api/library/default-layout` → returns org default
  - `PUT /api/library/default-layout` → upserts org default
- `matches/[id]/overlay/+page.server.ts` resolves layout via chain: `match.scoreboardLayout` → `settings.defaultScoreboardLayout` → `'classic'`. Same chain for options.
- Theme + motion preferences remain **cookie-only** (no DB table needed since Keycloak owns identity).

### P9 — Match-Control Surfaces (`77456d3`)

Surgical restyle of the 1300-line match-control page:
- Replace Montserrat → Inter Variable (later restored selectively for Classic scoreboard, see iterations)
- Wrap surfaces switch to `--k-surface` / `--k-surface-alt` / `--k-line`
- Card header: pulse icon, Inter display weight, tighter letter-spacing
- Buttons: pulse pill (`btn-primary`), outlined neutral (`btn-action`), pulse fill mono numerals (`btn-point`)

### P10 — Admin Pages (`a9d38a9`)

- `/admin/users` — full Kinetic rewrite: KSection header with user-count badge (max=red), KEmpty for empty/missing-org states, custom mono-numbered user rows with tag pills (Admin=pulse, Pending=yellow, Disabled=error), KField+KInput invite form
- `/admin/designs` — surgical header restyle (kicker + k-display title); the rest preserved as Tailwind since theme tokens already flip per `data-theme`

### P11 — Per-Match Scoreboard Override (`1b6dbe4`)

- `src/lib/components/MatchLayoutOverride.svelte` — layout picker (Org-Default | Classic | Kinetic) with live customization panel, dirty-state tracking, save via `PUT /api/matches/[id]`
- Mounted in match-control settings dialog
- `validation.ts` `matchIdSettingsSchema` extended with `scoreboardLayout` + `scoreboardOptions`
- API allow-list updated

### P12 — Cleanup (`6459177`)

- Wrap `data` initializers in `untrack()` across all pages with the "captures only initial value" warning
- Drop unused options destructure in Classic, dead CSS selectors in `c/[token]`, `control`, `match-control`
- `npm run check` reaches **0 errors, 0 warnings, 0 problems**

---

## Post-merge iterations (after the original P1-P12 cycle)

### Iteration 1 (`95869da`)

1. Theme everywhere: imprint / profile / `c`-page / legacy-control / about → all use Kinetic surfaces, Inter Variable
2. Icons: `lucide-svelte` everywhere — Features radio/bell-ring/timer/database, Teams star/pin, match-control trophy/timer, ArrowRight in CTAs, Zap/Users/Globe/Sparkles/Target on About values
3. About page: full Kinetic redesign with values grid + Open Source CTA
4. Hero: removed "Von VBC Thun eingesetzt …" social-proof line that was overlapping the ticker
5. Kinetic scoreboard rework: dropped H/G ranks, team names always visible, banners moved off the top of rows
6. HowItWorks: blue → pulse red

### Iteration 2 (`8ca47f6`)

1. About: 4 sections each with a darkened Unsplash stock image, scroll-linked parallax via Motion One `scroll()` helper, values reflowed from 5-card grid to numbered timeline list (no empty cells)
2. Empty boxes fixed: Features 2×2, About uses timeline list
3. Em-dashes (—) and en-dashes (–) eliminated everywhere user-facing — replaced with middot (·), period, or restructured prose
4. Pricing SaaS card: pulse red border + CTA + ticks (was cool blue)
5. Signup + billing: full Kinetic rewrite with KField/KInput/KButton, status panels, mono badges

### Iteration 3 (`2ea9437`)

- Vision image swapped to volleyball-specific
- Mission image swapped to team-huddle (community/volunteers)
- Kernwerte rewritten with the 5 final brand statements (DE + EN):
  1. Wir gewinnen zusammen oder gar nicht
  2. Wir bauen mit euch. Nicht für euch
  3. Lokal verwurzelt. Offiziell verbunden
  4. Mit Herz und Verstand
  5. Eines richtig. Dann das Nächste
- Parallax bumped from ±8% to ±30% with `scale(1.15)`, bg inset `-40%` so the larger displacement does not reveal edges

### Iteration 4 (`e78601a`)

- Kinetic banners now sit **inline** to the right of each team row (matching Classic), not stacked below the rows. Per-team derivation: `bannerFor('home')`, `bannerFor('guest')`. Solid color blocks (pulse for match point, cool for set point, yellow for timeout)
- Row layout switched from grid → flex so the trailing banner cell auto-sizes
- Restored `@fontsource/montserrat` (400/700/800) — Classic scoreboard uses Montserrat by design and was falling back to system fonts after P1 removed the Google Fonts link

### Iteration 5 (`88d2f1c`)

- Each Kinetic row sized independently — a banner on one row no longer stretches the other (`align-items: flex-start` on the container, `width: max-content` on each row)

### Iteration 6 (`b3c9678`)

- More breathing room: name min 180→200, sets 56→64, set-score 40→56, points 88→100, timeouts 32→40
- Set-score font 16→18, padding 4→8
- Viewport <720px: set-scores hide entirely so the row stays compact on phones

### Iteration 7 (`0a947e5`)

- Drop `overflow: hidden` on `.set-scores` (leftover from old collapse animation, was clipping the last set-score cell)
- Drop `.board-shrink min-width: 720px` in Demo so the scoreboard sizes naturally and the stage scrolls horizontally on narrow viewports

---

## New dependencies

| Package | Purpose |
|---|---|
| `@fontsource-variable/inter` | Self-hosted Inter Variable (replaces Google Fonts Montserrat for app body type) |
| `@fontsource/montserrat` (400/700/800) | Self-hosted Montserrat for the Classic scoreboard only |
| `motion` | Motion One — scroll-linked parallax, magnetic cursor, digit roll, count-up |
| `lucide-svelte` | Icon set (replaces all emoji glyphs) |

---

## Database migration (run manually on Coolify)

Migrations do **not** auto-apply on redeploy. After merging, run on the production DB:

```sh
psql "$DATABASE_URL" -f drizzle/0007_kinetic_scoreboard.sql
```

The SQL is idempotent (`IF NOT EXISTS`) so it is safe to re-run. See `drizzle/0007_README.md`.

---

## Resolution chain

When rendering an overlay or selecting a scoreboard:

```
match.scoreboardLayout          (per-match column, jsonb options)
  ↓ if NULL
settings.defaultScoreboardLayout (org-level KV, set via /library)
  ↓ if NULL
'classic'                        (registry fallback in getLayout())
```

Same chain for `scoreboardOptions`.

---

## File map

### New
- `src/app.css` — heavily extended with Kinetic tokens
- `src/app.html` — theme + motion bootstrap script
- `src/lib/motion.ts` — reusable Svelte actions over Motion One
- `src/lib/components/k/` — 10 K* primitives + `index.ts`
- `src/lib/components/scoreboards/index.ts` — registry
- `src/lib/components/scoreboards/Classic.svelte` — extracted from old `ScoreboardDisplay`
- `src/lib/components/scoreboards/Kinetic.svelte` — new editorial scoreboard
- `src/lib/components/MatchLayoutOverride.svelte` — per-match override UI
- `drizzle/0007_kinetic_scoreboard.sql` + `0007_README.md`
- `src/routes/api/library/default-layout/+server.ts`

### Substantially rewritten
- `src/routes/+page.svelte` (landing root)
- `src/lib/components/landing/*.svelte` (LandingNav, Hero, Features, HowItWorks, Pricing, Faq, Footer, Demo)
- `src/lib/components/Nav.svelte` (app shell)
- `src/routes/(app)/dashboard/+page.svelte`
- `src/routes/(app)/teams/+page.svelte`
- `src/routes/(app)/settings/+page.svelte`
- `src/routes/(app)/profile/+page.svelte`
- `src/routes/(app)/billing/+page.svelte`
- `src/routes/(app)/admin/users/+page.svelte`
- `src/routes/about/+page.svelte`
- `src/routes/library/+page.svelte`
- `src/routes/signup/+page.svelte`
- `src/lib/components/ScoreboardDisplay.svelte` (now a thin dispatcher)
- `src/lib/i18n/landing.ts` (icon keys, dash removal, copy refresh)

### Surgically updated
- `src/routes/signin/+page.svelte` (kept scoreboard metaphor; font + CTA + gradient swap)
- `src/routes/matches/[matchId]/control/+page.svelte` (header tokens, Inter Variable, button styles, layout override mounted in settings dialog)
- `src/routes/matches/[matchId]/overlay/+page.svelte` (layout dispatch wired)
- `src/routes/matches/[matchId]/control/+page.server.ts` (loads override + org default)
- `src/routes/matches/[matchId]/overlay/+page.server.ts` (resolves layout chain)
- `src/routes/(app)/admin/designs/+page.svelte` (header only)
- `src/routes/imprint/+page.svelte`, `src/routes/c/[controlToken]/+page.svelte`, `src/routes/control/+page.svelte` (Kinetic surfaces + font)
- `src/lib/server/db/schema.ts` (matches columns)
- `src/lib/server/validation.ts` (matchIdSettingsSchema)
- `src/routes/api/matches/[matchId]/+server.ts` (settings allow-list)

---

## What is intentionally NOT included

- **No theme/motion DB tables** — preferences live in cookies only; Keycloak owns identity, no `users` table to extend
- **Inter has no width axis** — "breathing" uses the weight axis instead (decided P1, accepted tradeoff)
- **Classic scoreboard kept as default** for new orgs — Kinetic is opt-in via `/library` so existing matches don't change unless explicitly switched
- **`/admin/designs` form panels** — not deeply Kinetic-styled (Tailwind tokens already flip per theme; full rewrite was out of scope)
