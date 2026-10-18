import { and, asc, eq, gte } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { matches, settings } from '$lib/server/db/schema.js';
import { getOrgImage } from '$lib/server/org-images';
import { renderThumbnail, type ThumbnailInput } from './render';

const SAMPLE_HOME = 'VBC Thun';
const SAMPLE_GUEST = 'Volley Spiez';
const SAMPLE_VENUE = 'Spiez Arena';
const ZURICH_OFFSET = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', timeZoneName: 'longOffset' });

function zurichOffsetMs(at: Date): number {
	const name = ZURICH_OFFSET.formatToParts(at).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
	const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
	if (!match) return 0;
	return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

/** The next Saturday 17:30 Swiss time after `now`. */
export function nextSaturdayEvening(now: Date = new Date()): Date {
	const local = new Date(now.getTime() + zurichOffsetMs(now));
	const daysAhead = (6 - local.getUTCDay() + 7) % 7 || 7;
	const wallClock = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + daysAhead, 17, 30);
	const guess = new Date(wallClock - zurichOffsetMs(new Date(wallClock)));
	return new Date(wallClock - zurichOffsetMs(guess));
}

async function loadClubSlots(orgId: string): Promise<Pick<ThumbnailInput, 'clubColor' | 'photo' | 'logo'>> {
	const [accent, photo, logo] = await Promise.all([
		db.query.settings.findFirst({ where: and(eq(settings.orgId, orgId), eq(settings.key, 'accentColor')) }),
		getOrgImage(orgId, 'thumbnail_photo'),
		getOrgImage(orgId, 'club_logo')
	]);
	return { clubColor: accent?.value ?? null, photo: photo?.data ?? null, logo: logo?.data ?? null };
}

export interface ThumbnailMatch {
	homeTeamName: string;
	guestTeamName: string;
	scheduledAt: Date | null;
	venue: string | null;
}

/** Renders the club thumbnail for a match; `overridePhoto` replaces the club photo for this render only. */
export async function renderMatchThumbnail(
	orgId: string,
	match: ThumbnailMatch,
	overridePhoto?: Uint8Array
): Promise<Uint8Array<ArrayBuffer>> {
	const slots = await loadClubSlots(orgId);
	return renderThumbnail({
		homeTeam: match.homeTeamName,
		guestTeam: match.guestTeamName,
		scheduledAt: match.scheduledAt,
		venue: match.venue,
		...slots,
		photo: overridePhoto ?? slots.photo
	});
}

/** Preview of the club slots: the next upcoming match of the org, or a sample match. */
export async function renderPreviewThumbnail(orgId: string, now: Date = new Date()): Promise<Uint8Array<ArrayBuffer>> {
	const next = await db.query.matches.findFirst({
		where: and(eq(matches.orgId, orgId), eq(matches.status, 'upcoming'), gte(matches.scheduledAt, now)),
		orderBy: asc(matches.scheduledAt)
	});
	return renderMatchThumbnail(
		orgId,
		next ?? {
			homeTeamName: SAMPLE_HOME,
			guestTeamName: SAMPLE_GUEST,
			scheduledAt: nextSaturdayEvening(now),
			venue: SAMPLE_VENUE
		}
	);
}
