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

const { ensureOverlaySlug, slugify, isValidSlug, pickFreeSlug } = await import('./overlay-slug');

describe('slugify', () => {
	it('lowercases and dashes non-alphanumerics', () => {
		expect(slugify("Miggi's Club")).toBe('miggi-s-club');
	});

	it('returns empty string for nothing usable', () => {
		expect(slugify('!!!')).toBe('');
	});
});

describe('isValidSlug', () => {
	it('accepts 3 to 64 lowercase alphanumeric and inner dash characters', () => {
		expect(isValidSlug('abc')).toBe(true);
		expect(isValidSlug('vbc-thun-1')).toBe(true);
		expect(isValidSlug('x'.repeat(64))).toBe(true);
	});

	it('rejects everything else', () => {
		for (const slug of ['', 'ab', 'x'.repeat(65), '-abc', 'abc-', 'ABC', 'a_b', 'a b', 'a/b']) {
			expect(isValidSlug(slug)).toBe(false);
		}
	});
});

describe('pickFreeSlug', () => {
	beforeEach(() => {
		findFirstMock.mockReset();
	});

	it('returns the slugified input when free', async () => {
		findFirstMock.mockResolvedValueOnce(undefined);
		expect(await pickFreeSlug('user-ABC123', 'org-1')).toBe('user-abc123');
	});

	it('uses the org-derived suffix when the slug is too short', async () => {
		findFirstMock.mockResolvedValue(undefined);
		expect(await pickFreeSlug('VB', '0123abcd-ffff')).toBe('vb-0123abcd');
	});

	it('appends a random suffix when slug and org-suffixed slug are both taken', async () => {
		findFirstMock
			.mockResolvedValueOnce({ orgId: 'other', value: 'vbc' })
			.mockResolvedValueOnce({ orgId: 'other', value: 'vbc-0123abcd' })
			.mockResolvedValue(undefined);
		const slug = await pickFreeSlug('vbc', '0123abcd-ffff');
		expect(slug).toMatch(/^vbc-[0-9a-f]{6}$/);
		expect(isValidSlug(slug)).toBe(true);
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
