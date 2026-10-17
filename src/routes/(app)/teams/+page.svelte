<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types.js';
	import { KSection, KButton, KEmpty, KInput, KField } from '$lib/components/k';
	import Star from 'lucide-svelte/icons/star';
	import Pin from 'lucide-svelte/icons/pin';

	let { data }: { data: PageData } = $props();

	let showCreate = $state(false);
	let newTeamName = $state('');
	let creating = $state(false);

	let favoriteIds = $state<number[]>([]);
	let pinnedIds = $state<number[]>([]);

	$effect(() => {
		pinnedIds = data.pinnedTeamIds;
	});

	$effect(() => {
		const raw = localStorage.getItem('favoriteTeams');
		favoriteIds = raw ? JSON.parse(raw) : [];
	});

	function isFav(id: number): boolean {
		return favoriteIds.includes(id);
	}

	function isPinned(id: number): boolean {
		return pinnedIds.includes(id);
	}

	function toggleFav(id: number) {
		const next = isFav(id) ? favoriteIds.filter((x) => x !== id) : [...favoriteIds, id];
		favoriteIds = next;
		localStorage.setItem('favoriteTeams', JSON.stringify(next));
	}

	async function togglePin(id: number) {
		const next = isPinned(id) ? pinnedIds.filter((x) => x !== id) : [...pinnedIds, id];
		pinnedIds = next;
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pinnedTeams: JSON.stringify(next) })
		});
	}

	async function createTeam() {
		if (!newTeamName.trim()) return;
		creating = true;
		try {
			const res = await fetch('/api/teams', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newTeamName.trim() })
			});
			if (res.ok) {
				await invalidateAll();
				showCreate = false;
				newTeamName = '';
			}
		} finally {
			creating = false;
		}
	}
</script>

<div class="page">
	<KSection
		kicker="Verein / Club"
		title={data.clubName ?? 'Teams'}
		subtitle="Teams verwalten, Favoriten setzen, anpinnen für die ganze Org."
	>
		{#snippet actions()}
			<KButton variant="primary" size="md" onclick={() => (showCreate = !showCreate)}>
				+ Team
			</KButton>
		{/snippet}

		{#if showCreate}
			<form
				class="create-form"
				onsubmit={(e) => {
					e.preventDefault();
					createTeam();
				}}
			>
				<KField label="Teamname" for="newTeamName">
					<KInput id="newTeamName" type="text" bind:value={newTeamName} placeholder="z.B. VBC Thun U17" autofocus />
				</KField>
				<div class="form-actions">
					<KButton variant="primary" disabled={creating}>
						{creating ? '...' : 'Erstellen'}
					</KButton>
					<KButton variant="ghost" onclick={() => (showCreate = false)}>
						Abbrechen
					</KButton>
				</div>
			</form>
		{/if}

		{#if data.teams.length === 0}
			<KEmpty
				numeral="00"
				title="Noch keine Teams"
				body="Teams werden automatisch von Swiss Volley synchronisiert oder können manuell erstellt werden."
			/>
		{:else}
			<ul class="team-list">
				{#each data.teams as team, i}
					<li class="team-row">
						<a href="/teams/{team.id}" class="row-link">
							<span class="row-bar" aria-hidden="true"></span>
							<span class="row-num k-mono">{String(i + 1).padStart(2, '0')}</span>
							<span class="row-body">
								<span class="row-name">{team.name}</span>
								<span class="row-tags">
									{#if team.swissVolleyTeamId}
										<span class="tag">SV</span>
									{/if}
									{#if isPinned(team.id)}
										<span class="tag tag-pinned">Pinned</span>
									{/if}
								</span>
							</span>
							<span class="row-arrow" aria-hidden="true">→</span>
						</a>
						<button
							class="row-act"
							class:on={isFav(team.id)}
							onclick={() => toggleFav(team.id)}
							title={isFav(team.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
							aria-label="Favorit"
						>
							<Star size="18" strokeWidth="1.5" fill={isFav(team.id) ? 'currentColor' : 'none'} />
						</button>
						{#if page.data.isAdmin}
							<button
								class="row-act"
								class:on={isPinned(team.id)}
								onclick={() => togglePin(team.id)}
								title={isPinned(team.id) ? 'Pinning entfernen' : 'Für alle pinnen'}
								aria-label="Pin"
							>
								<Pin size="18" strokeWidth="1.5" fill={isPinned(team.id) ? 'currentColor' : 'none'} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<div class="footnote">
			<a href="/control" class="legacy-link k-mono">Legacy Control Panel →</a>
		</div>
	</KSection>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
	}

	.form-actions {
		display: flex;
		gap: 8px;
	}

	.team-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--k-line);
	}

	.team-row {
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid var(--k-line);
	}

	.row-link {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 18px 16px;
		text-decoration: none;
		color: var(--k-text);
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.row-link:hover {
		background: color-mix(in srgb, var(--k-text) 3%, transparent);
	}
	.row-link:hover .row-bar {
		transform: scaleX(1);
	}
	.row-link:hover .row-body {
		transform: translateX(4px);
	}
	.row-link:hover .row-arrow {
		transform: translateX(4px);
		color: var(--pulse);
	}

	.row-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--pulse);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform var(--dur-mid) var(--ease-snap);
	}

	.row-num {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		min-width: 32px;
	}

	.row-body {
		flex: 1;
		display: flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
		transition: transform var(--dur-mid) var(--ease-snap);
	}

	.row-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: 16px;
		letter-spacing: -0.01em;
	}

	.row-tags {
		display: inline-flex;
		gap: 6px;
	}

	.tag {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 6px;
		border: 1px solid var(--k-line);
		color: var(--k-text-dim);
	}
	.tag-pinned {
		color: var(--cool);
		border-color: var(--cool);
	}

	.row-arrow {
		color: var(--k-text-dim);
		font-family: var(--font-mono);
		transition: transform var(--dur-mid) var(--ease-snap),
			color var(--dur-fast) var(--ease-snap);
	}

	.row-act {
		background: transparent;
		border: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--k-text-dim);
		padding: 0 14px;
		cursor: pointer;
		transition: color var(--dur-fast) var(--ease-snap);
		border-left: 1px solid var(--k-line);
	}
	.row-act:hover {
		color: var(--k-text);
	}
	.row-act.on {
		color: var(--pulse);
	}

	.footnote {
		margin-top: 32px;
		padding-top: 20px;
		border-top: 1px solid var(--k-line);
	}

	.legacy-link {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		text-decoration: none;
	}
	.legacy-link:hover {
		color: var(--k-text);
	}
</style>
