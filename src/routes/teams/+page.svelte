<script lang="ts">
	import type { PageData } from './$types.js';
	import { setStoredTheme, getStoredTheme } from '$lib/theme.js';
	import type { ThemeMode } from '$lib/theme.js';

	let { data }: { data: PageData } = $props();

	let showCreate = $state(false);
	let newTeamName = $state('');
	let creating = $state(false);

	let themeMode = $state<ThemeMode>('system');
	$effect(() => {
		themeMode = getStoredTheme();
	});

	function cycleTheme() {
		const next: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
		setStoredTheme(next[themeMode]);
		themeMode = next[themeMode];
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
				window.location.reload();
			}
		} finally {
			creating = false;
		}
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-text-primary">{data.clubName ?? 'Teams'}</h1>
				<p class="text-text-secondary text-sm">Teams verwalten</p>
			</div>
			<div class="flex items-center gap-2">
				{#if data.session?.user?.email}
					<span class="text-xs text-text-tertiary">{data.session.user.email}</span>
				{/if}
				{#if data.isAdmin}
					<a href="/admin/users" class="text-xs text-text-tertiary hover:text-text-primary bg-bg-panel-alt rounded-lg px-3 py-1.5">Nutzer</a>
					<a href="/?edit=true" class="text-xs text-text-tertiary hover:text-text-primary bg-bg-panel-alt rounded-lg px-3 py-1.5">Einstellungen</a>
				{:else}
					<button onclick={cycleTheme} class="text-xs text-text-tertiary hover:text-text-primary bg-bg-panel-alt rounded-lg px-3 py-1.5" title="Theme: {themeMode}">
						{#if themeMode === 'light'}
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
						{:else if themeMode === 'dark'}
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
						{/if}
					</button>
				{/if}
				<form method="POST" action="/signout">
					<button type="submit" class="text-xs text-text-tertiary hover:text-text-primary bg-bg-panel-alt rounded-lg px-3 py-1.5">Abmelden</button>
				</form>
			</div>
		</div>

		{#if data.teams.length === 0}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary mb-4">Noch keine Teams vorhanden</p>
				<p class="text-text-tertiary text-sm mb-4">Teams werden automatisch von Swiss Volley synchronisiert.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each data.teams as team}
					<a
						href="/teams/{team.id}"
						class="flex items-center justify-between bg-bg-panel-alt hover:bg-bg-panel-hover rounded-xl p-4 transition-colors"
					>
						<div>
							<span class="text-text-primary font-medium">{team.name}</span>
							{#if team.swissVolleyTeamId}
								<span class="ml-2 text-xs bg-accent-deepest/30 text-accent px-2 py-0.5 rounded">SV</span>
							{/if}
						</div>
						<span class="text-text-tertiary">&rarr;</span>
					</a>
				{/each}
			</div>
		{/if}

		<div class="mt-4">
			{#if showCreate}
				<form onsubmit={(e) => { e.preventDefault(); createTeam(); }} class="bg-bg-panel-alt rounded-xl p-4 flex gap-2">
					<input
						type="text"
						bind:value={newTeamName}
						placeholder="Teamname"
						class="flex-1 bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
					<button type="submit" disabled={creating} class="bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2">
						{creating ? '...' : 'Erstellen'}
					</button>
					<button type="button" onclick={() => { showCreate = false; }} class="text-text-secondary hover:text-text-primary px-2">
						&times;
					</button>
				</form>
			{:else}
				<button onclick={() => { showCreate = true; }} class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
					+ Team manuell erstellen
				</button>
			{/if}
		</div>

		<div class="mt-6 pt-4 border-t border-border-default">
			<a href="/control" class="text-sm text-text-tertiary hover:text-text-primary">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
