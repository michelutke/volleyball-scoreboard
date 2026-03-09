<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let activeUsers = $state(data.activeUsers ?? []);
	let pendingInvites = $state(data.pendingInvites ?? []);
	const kcOrgIdMissing = data.kcOrgIdMissing ?? false;
	let showInvite = $state(false);
	let email = $state('');
	let loading = $state(false);
	let resending = $state<string | null>(null);
	let revoking = $state<string | null>(null);
	let feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	const totalCount = $derived(activeUsers.length + pendingInvites.length);

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
			pendingInvites = [...pendingInvites, { id: user.id, email: user.email }];
			email = '';
			showInvite = false;
			feedback = { type: 'success', message: 'Einladung gesendet' };
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	async function toggleRole(userId: string, currentIsAdmin: boolean) {
		if (!confirm(currentIsAdmin ? 'Admin-Rechte entziehen?' : 'Zum Admin ernennen?')) return;
		loading = true;
		feedback = null;
		try {
			const res = await fetch(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isAdmin: !currentIsAdmin })
			});
			if (!res.ok) {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Rollenänderung fehlgeschlagen' };
				return;
			}
			activeUsers = activeUsers.map((u) => u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u);
			feedback = { type: 'success', message: currentIsAdmin ? 'Zu Scorer geändert' : 'Zu Admin ernannt' };
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
			activeUsers = activeUsers.filter((u) => u.id !== userId);
			feedback = { type: 'success', message: 'Nutzer entfernt' };
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	async function resendInvitation(id: string, userEmail: string) {
		resending = id;
		feedback = null;
		try {
			const res = await fetch(`/api/users/${id}/resend`, { method: 'POST' });
			if (res.ok) {
				feedback = { type: 'success', message: `Einladung an ${userEmail} erneut gesendet` };
			} else {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Fehler beim erneuten Senden' };
			}
		} finally {
			resending = null;
		}
	}

	async function revokeInvitation(id: string, userEmail: string) {
		if (!confirm(`Einladung für ${userEmail} wirklich widerrufen?`)) return;
		revoking = id;
		feedback = null;
		try {
			const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
			if (res.ok) {
				pendingInvites = pendingInvites.filter((i) => i.id !== id);
				feedback = { type: 'success', message: `Einladung für ${userEmail} widerrufen` };
			} else {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Fehler beim Widerrufen' };
			}
		} finally {
			revoking = null;
		}
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-text-primary">Nutzerverwaltung</h1>
				<p class="text-text-secondary text-sm">Scorer einladen und verwalten · <span class="{totalCount >= 5 ? 'text-red-400' : 'text-text-tertiary'}">{totalCount} / 5 Nutzer</span></p>
			</div>
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
		{:else if activeUsers.length === 0 && pendingInvites.length === 0}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary">Keine Nutzer vorhanden</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each activeUsers as user}
					<div class="flex items-center justify-between bg-bg-panel-alt rounded-xl p-4 gap-4">
						<div class="flex flex-col gap-1 min-w-0">
							<span class="text-text-primary truncate">{user.email}</span>
							<div class="flex items-center gap-2">
								{#if user.isAdmin}
									<span class="text-xs bg-accent-deepest/30 text-accent px-2 py-0.5 rounded font-medium">Admin</span>
								{:else}
									<span class="text-xs bg-bg-base text-text-tertiary px-2 py-0.5 rounded font-medium border border-border-subtle">Scorer</span>
								{/if}
								{#if !user.enabled}
									<span class="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded">Deaktiviert</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-3 flex-shrink-0">
							<button
								onclick={() => toggleRole(user.id, user.isAdmin)}
								disabled={loading || user.email === page.data.session?.user?.email}
								class="text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
								title={user.isAdmin ? 'Zu Scorer machen' : 'Zum Admin machen'}
							>
								{user.isAdmin ? '→ Scorer' : '→ Admin'}
							</button>
							<button
								onclick={() => removeUser(user.id)}
								disabled={loading}
								class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
							>
								Entfernen
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if pendingInvites.length > 0}
				<div class="flex items-center gap-2 mt-6 mb-2">
					<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wide">Ausstehende Einladungen</h2>
					<span class="text-xs bg-bg-panel-alt text-text-tertiary px-2 py-0.5 rounded-full border border-border-subtle">{pendingInvites.length}</span>
				</div>
				<div class="space-y-2">
					{#each pendingInvites as invite (invite.id)}
						<div class="flex items-center justify-between bg-bg-panel-alt rounded-xl p-4 gap-4">
							<div class="flex flex-col gap-1 min-w-0">
								<span class="text-text-primary truncate">{invite.email}</span>
								<div class="flex items-center gap-2">
									<span class="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded font-medium">Ausstehend</span>
								</div>
							</div>
							<div class="flex items-center gap-3 flex-shrink-0">
								<button
									onclick={() => resendInvitation(invite.id, invite.email)}
									disabled={resending === invite.id}
									class="text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
								>
									{resending === invite.id ? 'Wird gesendet…' : 'Erneut senden'}
								</button>
								<button
									onclick={() => revokeInvitation(invite.id, invite.email)}
									disabled={revoking === invite.id}
									class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
								>
									{revoking === invite.id ? 'Wird widerrufen…' : 'Widerrufen'}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
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
			{:else if totalCount >= 5}
				<div class="w-full bg-bg-panel-alt rounded-xl p-4 text-center text-text-tertiary text-sm">
					Maximale Anzahl Nutzer erreicht (5 / 5)
				</div>
			{:else}
				<button onclick={() => { showInvite = true; }} class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
					+ Scorer einladen
				</button>
			{/if}
		</div>
	</div>
</div>
