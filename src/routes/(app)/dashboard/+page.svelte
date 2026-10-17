<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types.js';
	import type { MatchListItem } from '$lib/types.js';
	import { KSection, KButton, KEmpty, KCard } from '$lib/components/k';

	let { data }: { data: PageData } = $props();

	type TeamEntry = {
		teamId: number;
		teamName: string;
		isPinned: boolean;
		matches: MatchListItem[];
		loading: boolean;
	};

	let entries = $state<TeamEntry[]>([]);
	let loaded = $state(false);
	let activating = $state<number | null>(null);
	let cancelling = $state<number | null>(null);

	const pinnedEntries = $derived(entries.filter((e) => e.isPinned));
	const favEntries = $derived(entries.filter((e) => !e.isPinned));

	function formatDate(iso: string | null): string {
		if (!iso) return '...';
		const d = new Date(iso);
		return d.toLocaleDateString('de-CH', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function statusInfo(status: string): { text: string; cls: string } {
		switch (status) {
			case 'live':
				return { text: 'Live', cls: 'live' };
			case 'finished':
				return { text: 'Beendet', cls: 'done' };
			default:
				return { text: 'Geplant', cls: 'plan' };
		}
	}

	function isDatePast(scheduledAt: string | null): boolean {
		if (!scheduledAt) return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return new Date(scheduledAt) < today;
	}

	async function activateMatch(matchId: number) {
		activating = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/activate`, { method: 'POST' });
			if (res.ok) await goto(`/matches/${matchId}/control`);
		} finally {
			activating = null;
		}
	}

	async function cancelMatch(matchId: number) {
		if (!confirm('Scoring wirklich abbrechen?')) return;
		cancelling = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/cancel`, { method: 'POST' });
			if (res.ok) await invalidateAll();
		} finally {
			cancelling = null;
		}
	}

	function copyOverlayLink(matchId: number) {
		navigator.clipboard.writeText(`${window.location.origin}/matches/${matchId}/overlay`);
	}

	onMount(async () => {
		const favJson = localStorage.getItem('favoriteTeams');
		const favIds: number[] = favJson ? JSON.parse(favJson) : [];
		const pinnedIds = data.pinnedTeamIds;
		const allIds = [...new Set([...pinnedIds, ...favIds])];

		if (allIds.length === 0) {
			loaded = true;
			return;
		}

		const teamsRes = await fetch('/api/teams');
		const allTeams: { id: number; name: string }[] = teamsRes.ok ? await teamsRes.json() : [];
		const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

		entries = allIds.map((id) => ({
			teamId: id,
			teamName: teamMap.get(id) ?? `Team #${id}`,
			isPinned: pinnedIds.includes(id),
			matches: [],
			loading: true
		}));

		await Promise.all(
			allIds.map(async (id, i) => {
				try {
					const res = await fetch(`/api/teams/${id}/matches`);
					if (res.ok) {
						const all: MatchListItem[] = await res.json();
						const relevant = all
							.filter((m) => m.status === 'live' || (m.status === 'upcoming' && !isDatePast(m.scheduledAt)))
							.sort((a, b) => {
								if (!a.scheduledAt) return 1;
								if (!b.scheduledAt) return -1;
								return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
							});
						entries[i] = { ...entries[i], matches: relevant, loading: false };
					} else {
						entries[i] = { ...entries[i], loading: false };
					}
				} catch {
					entries[i] = { ...entries[i], loading: false };
				}
			})
		);
		loaded = true;
	});
</script>

<div class="page">
	<KSection kicker="Übersicht / Overview" title="Dashboard" subtitle="Kommende Spiele deiner Favoriten">
		{#if !loaded}
			<p class="muted k-mono">Laden...</p>
		{:else if entries.length === 0}
			<KEmpty
				numeral="00"
				title="Noch keine Favoriten"
				body="Markiere Teams unter „Teams” als Favorit, um sie hier zu sehen."
			>
				{#snippet action()}
					<KButton href="/teams" variant="primary">Zu den Teams</KButton>
				{/snippet}
			</KEmpty>
		{:else}
			{#snippet teamSection(sectionEntries: TeamEntry[])}
				<div class="team-stack">
					{#each sectionEntries as entry}
						<div class="team-block">
							<a href="/teams/{entry.teamId}" class="team-name">{entry.teamName}</a>
							{#if entry.loading}
								<p class="muted k-mono">Laden...</p>
							{:else if entry.matches.length === 0}
								<p class="muted k-mono">Keine kommenden Spiele</p>
							{:else}
								<div class="match-list">
									{#each entry.matches as match}
										<KCard padding="md">
											<div class="match-head">
												<div class="match-title">
													<span class="vs">
														{match.homeTeamName}
														<em>vs</em>
														{match.guestTeamName}
													</span>
													<span class="meta k-mono">
														{formatDate(match.scheduledAt)}
														{#if match.venue}<span class="dot">·</span>{match.venue}{/if}
														{#if match.league}<span class="dot">·</span>{match.league}{/if}
													</span>
												</div>
												<span class="status status-{statusInfo(match.status).cls}">
													{statusInfo(match.status).text}
												</span>
											</div>
											<div class="match-actions">
												<div class="actions-left">
													{#if match.status === 'upcoming'}
														<KButton
															variant="primary"
															size="sm"
															onclick={() => activateMatch(match.id)}
															disabled={activating === match.id}
														>
															{activating === match.id ? '...' : 'Scoring starten'}
														</KButton>
													{:else if match.status === 'live'}
														<KButton href="/matches/{match.id}/control" variant="primary" size="sm">
															Control
														</KButton>
													{/if}
													<KButton variant="secondary" size="sm" onclick={() => copyOverlayLink(match.id)}>
														Overlay-Link
													</KButton>
												</div>
												{#if match.status === 'live'}
													<KButton
														variant="danger"
														size="sm"
														onclick={() => cancelMatch(match.id)}
														disabled={cancelling === match.id}
													>
														{cancelling === match.id ? '...' : 'Abbrechen'}
													</KButton>
												{/if}
											</div>
										</KCard>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/snippet}

			{#if pinnedEntries.length > 0}
				<div class="group">
					<h2 class="group-label k-mono">Vom Admin angepinnt</h2>
					{@render teamSection(pinnedEntries)}
				</div>
			{/if}

			{#if favEntries.length > 0}
				<div class="group">
					<h2 class="group-label k-mono">Deine Favoriten</h2>
					{@render teamSection(favEntries)}
				</div>
			{/if}
		{/if}
	</KSection>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}

	.muted {
		font-size: 12px;
		letter-spacing: 0.08em;
		color: var(--k-text-dim);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 32px;
	}

	.group-label {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.team-stack {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.team-block {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.team-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 18px;
		color: var(--k-text);
		text-decoration: none;
		letter-spacing: -0.01em;
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.team-name:hover {
		color: var(--pulse);
	}

	.match-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.match-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 16px;
	}

	.match-title {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.vs {
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: 16px;
		color: var(--k-text);
	}
	.vs em {
		font-style: normal;
		color: var(--k-text-dim);
		margin: 0 6px;
		font-size: 13px;
	}

	.meta {
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim);
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	.meta .dot {
		color: var(--k-line);
	}

	.status {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 4px 8px;
		border: 1px solid currentColor;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.status-live {
		color: var(--pulse);
	}
	.status-done {
		color: var(--k-text-dim);
	}
	.status-plan {
		color: var(--cool-soft);
	}

	.match-actions {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.actions-left {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
</style>
