<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let users = $state(untrack(() => data.users));
	const kcOrgIdMissing = data.kcOrgIdMissing ?? false;
	let showInvite = $state(false);
	let email = $state('');
	let loading = $state(false);
	let feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	async function inviteUser() {
		if (!email.trim()) return;
		loading = true;
		feedback = null;
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim() })
			});
			if (!res.ok) {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Fehler beim Einladen' };
				return;
			}
			const user: { id: string; email: string; emailSent: boolean } = await res.json();
			users = [...users, { id: user.id, email: user.email, enabled: true }];
			email = '';
			showInvite = false;
			feedback = {
				type: 'success',
				message: user.emailSent
					? 'Einladung gesendet'
					: 'Nutzer erstellt — kein SMTP konfiguriert, E-Mail nicht gesendet'
			};
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	async function removeUser(userId: string) {
		if (!confirm('Nutzer wirklich entfernen?')) return;
		loading = true;
		feedback = null;
		try {
			const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Fehler beim Entfernen' };
				return;
			}
			users = users.filter((u) => u.id !== userId);
			feedback = { type: 'success', message: 'Nutzer entfernt' };
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-text-primary">Nutzerverwaltung</h1>
				<p class="text-text-secondary text-sm">Scorer einladen und verwalten</p>
			</div>
			<a href="/teams" class="text-sm text-text-tertiary hover:text-text-primary">&larr; Teams</a>
		</div>

		{#if feedback}
			<div class="mb-4 rounded-lg px-4 py-2 text-sm {feedback.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}">
				{feedback.message}
			</div>
		{/if}

		{#if kcOrgIdMissing}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary">Organisation nicht konfiguriert</p>
				<p class="text-text-tertiary text-sm mt-2">kcOrgId fehlt in den Einstellungen.</p>
			</div>
		{:else if users.length === 0}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary">Keine Nutzer vorhanden</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each users as user}
					<div class="flex items-center justify-between bg-bg-panel-alt rounded-xl p-4">
						<div>
							<span class="text-text-primary">{user.email}</span>
							{#if !user.enabled}
								<span class="ml-2 text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded">Deaktiviert</span>
							{/if}
						</div>
						<button
							onclick={() => removeUser(user.id)}
							disabled={loading}
							class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
						>
							Entfernen
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<div class="mt-4">
			{#if showInvite}
				<form onsubmit={(e) => { e.preventDefault(); inviteUser(); }} class="bg-bg-panel-alt rounded-xl p-4 flex gap-2">
					<input
						type="email"
						bind:value={email}
						placeholder="E-Mail-Adresse"
						class="flex-1 bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
					<button type="submit" disabled={loading} class="bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2">
						{loading ? '...' : 'Einladen'}
					</button>
					<button type="button" onclick={() => { showInvite = false; }} class="text-text-secondary hover:text-text-primary px-2">
						&times;
					</button>
				</form>
			{:else}
				<button onclick={() => { showInvite = true; }} class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
					+ Scorer einladen
				</button>
			{/if}
		</div>
	</div>
</div>
