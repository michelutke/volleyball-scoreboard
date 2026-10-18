# Mobile Match API

Endpoints used by the Scorely Live app to list a club's matches, start one, hand out the guest scorer link and fetch the stream thumbnail. Added in PR #149 (thumbnails: see below).

## Authentication

Every request needs `Authorization: Bearer <access token>` from Keycloak. The token is verified by `verifyMobileToken` (`src/lib/server/mobile-auth.ts`), which returns `{ orgId, sub, roles }`.

- The token's `azp` must equal `MOBILE_CLIENT_ID` (default `scorely-mobile`). Tokens of the web client are rejected.
- Missing header, non-Bearer header or failed verification: 401 `{ "error": "Unauthorized" }`.
- No role check: every member of the org may list, start, share and renew (same as the web). `roles` is carried for later use.
- `/api/mobile/*` bypasses the web session check in `src/hooks.server.ts`, but the `/api/*` rate limit applies (100 requests per 60 s per IP, then 429).
- Every response carries `Cache-Control: no-store`.

## Endpoints

POST bodies are empty, except the thumbnail override (see Thumbnail). Do not send `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`, because SvelteKit's CSRF protection blocks form content types.

| Endpoint | Success (always 200) | Errors |
|---|---|---|
| `GET /api/mobile/matches` | `{ orgName, matches: MatchItem[] }` | 401 |
| `POST /api/mobile/matches/{id}/start` | `MatchItem` | 401, 404, 409 |
| `POST /api/mobile/matches/{id}/share` | `{ controlUrl, overlayUrl }` | 401, 404, 409 |
| `POST /api/mobile/matches/{id}/share/renew` | `{ controlUrl, overlayUrl }` | 401, 404, 409 |
| `GET /api/mobile/matches/{id}/thumbnail` | `image/jpeg`, 1280 x 720 | 401, 402, 404 |
| `POST /api/mobile/matches/{id}/thumbnail` | `image/jpeg`, 1280 x 720 | 400, 401, 402, 404, 413 |

- 404 `{ "error": "Match not found" }`: missing match, malformed id, or a match of another org.
- 409 `{ "error": "Match is finished" }`: start, share or renew on a finished match.

`MatchItem`:

```json
{
  "id": 42,
  "homeTeamName": "VBC Thun",
  "guestTeamName": "Volley Bern",
  "scheduledAt": "2026-10-18T17:00:00.000Z",
  "venue": "Lachen",
  "league": "2L",
  "status": "upcoming"
}
```

`scheduledAt`, `venue` and `league` may be null. `status` is `upcoming`, `live` or `finished`.

### List

- Runs `autoFinishStale(orgId)` first.
- Returns the org's `live` matches plus `upcoming` ones with `scheduledAt` null or no more than 12 hours in the past.
- Order: live first, then `scheduledAt` ascending, undated last. At most 50.
- `orgName` is the org setting `clubName` (empty string when unset).

### Start

`upcoming` becomes `live` (same `startMatch` as the web activate route). Starting a `live` match returns it unchanged.

### Share and renew

- Share returns the existing guest link or creates one. Concurrent calls get the same link.
- Renew always replaces the token, so the old link stops working.
- `controlUrl` is `{origin}/c/{token}`, `overlayUrl` is `{origin}/matches/{id}/overlay`.

### Thumbnail

Branded 1280 x 720 JPEG (quality 85, well under YouTube's 2 MB limit) for the YouTube broadcast of a match. Layout is the fixed Scorely template. The club fills three slots in the web settings (`/settings`, section "Stream-Thumbnail"): background photo, club logo and the club colour (`accentColor`). Team names, date, time and venue come from the match (Swiss time).

- `GET` renders the match with the club's slots. No photo and no logo gives the plain ink template with the Scorely mark.
- `POST` takes the raw bytes of one override photo as body (`Content-Type: image/jpeg` or `image/png`, up to 5 MB) and returns the JPEG rendered with that photo instead of the club photo. The photo is not stored. The type is detected from the magic bytes, the header is not trusted.
- 400 `{ "error": ... }`: empty body or not a JPEG or PNG (SVG and WebP are rejected). 413: larger than 5 MB.
- 404 `{ "error": "Match not found" }`: unknown or malformed id, or a match of another org. 402: subscription inactive (same as every mobile route).
- Responses carry `Cache-Control: no-store`. Renders are cached in memory by input hash (32 entries).

Web side (session auth, org scoped): `PUT`, `GET` and `DELETE /api/settings/images/{thumbnail_photo|club_logo}` (writes are admin only, stored in `org_images`) and `GET /api/settings/thumbnail-preview` (JPEG with the club's slots and the next upcoming match, or a sample match). Behind adapter-node the request body limit is `BODY_SIZE_LIMIT` (set to 6M in the Dockerfile so 5 MB images fit).

## Guest link lifecycle

- The guest scorer page `/c/{token}` and its API `/api/c/{token}` (score and timeout) work while the match is not finished.
- When a match becomes `finished`, `matches.finished_at` is set and the link keeps working for a 10 minute grace period (`GUEST_LINK_GRACE_MS` in `src/lib/server/auto-finish.ts`), so the guest can undo a wrong final point. Undo back to `live` clears `finished_at`.
- After the grace period the next guest access clears `control_token` and answers 410 ("Link nicht mehr gültig"). `autoFinishStale` also clears tokens of matches finished more than 10 minutes ago. A `finished` match with `finished_at` null (finished before this feature) counts as expired.
- A match without a score row (shared before start, or cancelled) answers 409 "Spiel hat noch nicht begonnen" instead of a dead link.

## Code map

| File | Responsibility |
|---|---|
| `src/lib/server/match-service.ts` | Org-scoped lookup, list, start, ensure and renew control token, `statusChange`, `getGuestMatch` |
| `src/lib/server/mobile-api.ts` | Bearer auth helper, `mobileJson`, error responses, `parseMatchId`, share URLs |
| `src/lib/server/mobile-auth.ts` | Keycloak token verification, `azp` check, org id and roles |
| `src/routes/api/mobile/matches/**` | The mobile endpoints |
| `src/lib/server/thumbnail/render.ts` | Satori and resvg renderer for the thumbnail template, fonts and brand SVGs under `fonts/` and `assets/` |
| `src/lib/server/thumbnail/service.ts` | Loads the club slots and match data, calls the renderer |
| `src/lib/server/org-images.ts` | Image kinds, upload validation (size, magic bytes) and `org_images` storage |
| `src/routes/c/[controlToken]/+error.svelte` | Expired and not started pages for guests |

## Related security fixes (same PR)

- The web control page `/matches/{id}/control` only loads matches of the caller's org.
- `POST /api/teams/{teamId}/matches` checks that the team belongs to the caller's org (404 otherwise).

## Known limitations

- The web control page ignores the 409 from "Freigabe-Link erstellen" on a finished match, so the button does nothing there.
- The manual curl checklist from the implementation plan (`docs/superpowers/plans/2026-10-14-mobile-match-api.md`, Task 8) has not been run yet.
