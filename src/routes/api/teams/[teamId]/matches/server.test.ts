import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const teamsFindFirstMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const insertReturningMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { teams: { findFirst: teamsFindFirstMock } },
		insert: () => ({ values: insertValuesMock })
	}
}));
vi.mock('$lib/server/design-template.js', () => ({
	getDefaultTemplate: vi.fn().mockResolvedValue(undefined),
	templateToMatchColors: vi.fn()
}));
vi.mock('$lib/server/auto-finish.js', () => ({ autoFinishStale: vi.fn() }));
vi.mock('$lib/server/match-list.js', () => ({ toMatchListItems: vi.fn() }));

const { POST } = await import('./+server.js');

function event(teamId: string, body: unknown) {
	return {
		params: { teamId },
		locals: { orgId: 'org-1' },
		request: new Request(`http://localhost/api/teams/${teamId}/matches`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/teams/[teamId]/matches', () => {
	beforeEach(() => {
		teamsFindFirstMock.mockReset();
		insertValuesMock.mockReset();
		insertReturningMock.mockReset();
		insertValuesMock.mockReturnValue({ returning: insertReturningMock });
	});

	it('returns 404 and creates nothing for a team of another org', async () => {
		teamsFindFirstMock.mockResolvedValue(undefined);
		const response = await POST(event('3', { homeTeamName: 'A' }));
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Team not found' });
		expect(insertValuesMock).not.toHaveBeenCalled();
		const { params } = new PgDialect().sqlToQuery(teamsFindFirstMock.mock.calls[0][0].where);
		expect(params).toEqual(['org-1', 3]);
	});

	it('creates the match for a team of the org', async () => {
		teamsFindFirstMock.mockResolvedValue({ id: 3, orgId: 'org-1' });
		insertReturningMock.mockResolvedValue([{ id: 11, teamId: 3 }]);
		const response = await POST(event('3', { homeTeamName: 'A', guestTeamName: 'B' }));
		expect(response.status).toBe(201);
		expect(insertValuesMock).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: 'org-1', teamId: 3, homeTeamName: 'A', guestTeamName: 'B' })
		);
	});
});
