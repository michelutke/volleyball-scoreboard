import { describe, it, expect, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());
const returning = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { designTemplates: { findFirst } },
		update: () => ({ set: () => ({ where: () => ({ returning }) }) })
	}
}));

const { applyTemplateToMatch } = await import('./design-template.js');

describe('applyTemplateToMatch', () => {
	it('refuses a template the org does not own and leaves the match untouched', async () => {
		findFirst.mockResolvedValue(undefined);
		returning.mockClear();

		expect(await applyTemplateToMatch(5, 1, 'org-b')).toBeNull();
		expect(returning).not.toHaveBeenCalled();
	});
});
