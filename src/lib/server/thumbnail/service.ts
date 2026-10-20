import { and, asc, eq, gte } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { matches, settings } from '$lib/server/db/schema.js';
import { getOrgImage } from '$lib/server/org-images';
import { renderThumbnail, type ThumbnailInput } from './render';

const SAMPLE_HOME = 'VBC Thun';
const SAMPLE_GUEST = 'Volley Spiez';

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
		...slots,
		photo: overridePhoto ?? slots.photo
	});
}

/** Renders the club thumbnail for a stream without a match: the title is the headline. */
export async function renderTitledThumbnail(
	orgId: string,
	stream: { title: string },
	overridePhoto?: Uint8Array
): Promise<Uint8Array<ArrayBuffer>> {
	const slots = await loadClubSlots(orgId);
	return renderThumbnail({
		headline: stream.title,
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
		next ?? { homeTeamName: SAMPLE_HOME, guestTeamName: SAMPLE_GUEST }
	);
}
