# Scoreboard layouts

The overlay score bug is chosen per organisation from the layouts in the Bibliothek (`/library`). Every layout gets the same props (`match`, `homeTimeoutsUsed`, `guestTimeoutsUsed`, `timeoutTeam`, `options`) through `ScoreboardDisplay.svelte`, and the registry in `src/lib/components/scoreboards/index.ts` maps a layout id to its component. An unknown or missing id falls back to Kinetic.

| Id | Component | Summary |
|---|---|---|
| `classic` | `Classic.svelte` | Traditional broadcast scoreboard with jersey colours and timeout boxes. Alerts inline at the end of the team row. |
| `kinetic` (default) | `Kinetic.svelte` | Brand score bug (manual p26): paper mark cell, set history, banners slide out under the bug. Light and dark theme, accent colours, team logos. |
| `drawer` | `Drawer.svelte` | No logo while the ball is in play. Alerts inline with the team, Scorely drawer below in pauses. |
| `colon` | `Colon.svelte` | Mirrored strip around the score colon. Alerts under the team's half, the colon turns into the mark in pauses. |

## Shared helpers

All in `src/lib/components/scoreboards/`:

- `state.ts`: `teamAlert(match, timeoutTeam)` returns which team the overlay calls out and why (`timeout` beats `match` point beats `set` point; set and match point only while `status` is `live`). `isPause` is true during a timeout, a set break or after the final. `isSetBreak` is derived, because the backend has no break state: `live`, 0:0 and at least one finished set. `ALERT_LABEL` holds the English labels. Tests in `state.test.ts`.
- `transitions.ts`: `slideOut` slides an element out from behind its neighbour (`axis: 'x'` from the left, `'y'` from above) with the brand snap easing and the global `--motion-scale`.
- `timeout-clock.svelte.ts`: `timeoutClock(() => timeoutTeam)` counts the 30 s timeout down from the moment a timeout starts. Call it during component init.

## Drawer

- Two rows: serve dot, full team name, sets won, points.
- Set point (blue), match point (red) and timeout (yellow, with clock) appear as a cell at the end of the owning team's row and slide out from behind the points in 330 ms, back in 132 ms.
- In a pause the paper drawer (horizontal lockup plus "LIVE AUF SCORELY.CH") slides down below the rows. During a timeout it waits 330 ms so the timeout cell lands first.
- In a set break and after the final, each row also shows that team's set results (lost sets grey).

## Colon

- Grid `minmax(max-content, 1fr) 64px minmax(max-content, 1fr)`: both halves are as wide as the longer team name, so the colon stays centred and the ink background always covers the whole name.
- The serve dot sits on the outer side of each name.
- Alerts hang under the half of the owning team: home on the left (aligned to the centre), guest on the right.
- In a pause the colon dots disappear and a paper cell with the mark slides down under the centre. Inside it the brand "colon to logo" motion plays: the balls start stacked at x 100 and slide to the edge (420 ms snap), then the block is revealed by two clip circles growing from the contact points (900 ms glide).

## Rules every layout follows

- The stream capture runs at about 5 to 15 fps and software mode forces `animation: none`, so every state must read without motion. Transitions and keyframes only move toward the static end state (for the Colon mark the SVG attributes hold the end state, the CSS `cx` and `r` keyframes only animate from the start).
- Team names are never abbreviated or truncated. Columns size to the longest name.
- Brand colours only: blue `--cool` means set point, red `--pulse` match point and the serve dot, yellow `--color-warning` timeout with ink type.

## Adding a layout

1. Add `<Name>.svelte` in `src/lib/components/scoreboards/` taking `ScoreboardProps`.
2. Register it in `SCOREBOARD_LAYOUTS` in `index.ts` with id, name, description, `supportsThemes` and `customizableOptions`.
3. Extend `index.test.ts`. The Bibliothek and the org layout picker pick it up from the registry.

## Design reference

The variants explored for these layouts (19 boards: state indicators, pause logo, set break) are on the design canvas "Scorely Scoreboard Variants" (claude.ai artifact, private to the owner). Drawer and Colon are variants 15 and 16.
