import { describe, it, expect, vi, beforeEach } from 'vitest';

const findFirstMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const onConflictDoNothingMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { settings: { findFirst: findFirstMock } },
		insert: () => ({ values: insertValuesMock })
	}
}));

const { ensureOverlaySlug, slugify } = await import('./overlay-slug');

describe('slugify', () => {
	it('lowercases and dashes non-alphanumerics', () => {
		expect(slugify("Miggi's Club")).toBe('miggi-s-club');
	});

	it('returns empty string for nothing usable', () => {
		expect(slugify('!!!')).toBe('');
	});
});

describe('ensureOverlaySlug', () => {
	beforeEach(() => {
		findFirstMock.mockReset();
		insertValuesMock.mockReset();
		onConflictDoNothingMock.mockReset();
		insertValuesMock.mockReturnValue({ onConflictDoNothing: onConflictDoNothingMock });
		onConflictDoNothingMock.mockResolvedValue(undefined);
	});

	it('returns the existing slug without inserting', async () => {
		findFirstMock.mockResolvedValueOnce({ value: 'existing' });
		expect(await ensureOverlaySlug('org-1')).toBe('existing');
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('derives a slug from the club name and stores it', async () => {
		findFirstMock
			.mockResolvedValueOnce(undefined) // no overlaySlug
			.mockResolvedValueOnce({ value: 'VBC Zürich' }) // clubName
			.mockResolvedValueOnce(undefined); // slug not taken
		expect(await ensureOverlaySlug('org-1')).toBe('vbc-z-rich');
		expect(insertValuesMock).toHaveBeenCalledWith({ orgId: 'org-1', key: 'overlaySlug', value: 'vbc-z-rich' });
	});

	it('appends an org-derived suffix when the slug is taken by another org', async () => {
		findFirstMock
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({ value: 'VBC' })
			.mockResolvedValueOnce({ orgId: 'other-org', value: 'vbc' })
			.mockResolvedValueOnce(undefined);
		expect(await ensureOverlaySlug('0123abcd-ffff')).toBe('vbc-0123abcd');
	});

	it('falls back to an org-derived slug without a club name', async () => {
		findFirstMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
		expect(await ensureOverlaySlug('0123abcd-ffff')).toBe('org-0123abcd');
	});
});
