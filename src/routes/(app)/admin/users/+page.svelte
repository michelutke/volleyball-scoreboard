<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { PageData } from './$types.js';
	import { KSection, KButton, KEmpty, KInput, KField } from '$lib/components/k';

	let { data }: { data: PageData } = $props();

	let activeUsers = $state(untrack(() => data.activeUsers ?? []));
	let pendingInvites = $state(untrack(() => data.pendingInvites ?? []));
	const kcOrgIdMissing = untrack(() => data.kcOrgIdMissing ?? false);
	let showInvite = $state(false);
	let email = $state('');
	let loading = $state(false);
	let resending = $state<string | null>(null);
	let revoking = $state<string | null>(null);
	let feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	const totalCount = $derived(activeUsers.length + pendingInvites.length);
	const atLimit = $derived(totalCount >= 5);

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
			activeUsers = activeUsers.map((u) => (u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u));
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

<div class="page">
	<KSection
		kicker="— Admin / Users"
		title="Nutzerverwaltung"
		subtitle="Scorer einladen und verwalten."
	>
		{#snippet actions()}
			<span class="count k-mono" class:max={atLimit}>{totalCount} / 5</span>
			{#if !atLimit}
				<KButton variant="primary" size="md" onclick={() => (showInvite = !showInvite)}>
					+ Einladen
				</KButton>
			{/if}
		{/snippet}

		{#if feedback}
			<div class="banner banner-{feedback.type}" role="alert">{feedback.message}</div>
		{/if}

		{#if showInvite}
			<form
				class="invite-form"
				onsubmit={(e) => {
					e.preventDefault();
					inviteUser();
				}}
			>
				<KField label="E-Mail-Adresse" for="invite-email">
					<KInput id="invite-email" type="email" bind:value={email} placeholder="scorer@example.com" />
				</KField>
				<div class="form-actions">
					<KButton variant="primary" disabled={loading}>
						{loading ? '...' : 'Einladung senden'}
					</KButton>
					<KButton variant="ghost" onclick={() => (showInvite = false)}>Abbrechen</KButton>
				</div>
			</form>
		{/if}

		{#if kcOrgIdMissing}
			<KEmpty
				numeral="!!"
				title="Organisation nicht konfiguriert"
				body="kcOrgId fehlt in den Einstellungen. Bitte einen Admin oder Support kontaktieren."
			/>
		{:else if activeUsers.length === 0 && pendingInvites.length === 0}
			<KEmpty numeral="00" title="Keine Nutzer vorhanden" body="Lade Scorer per E-Mail-Einladung ein." />
		{:else}
			<ul class="user-list">
				{#each activeUsers as user, i}
					<li class="user-row">
						<span class="row-num k-mono">{String(i + 1).padStart(2, '0')}</span>
						<div class="row-body">
							<span class="row-email">{user.email}</span>
							<div class="row-tags">
								{#if user.isAdmin}
									<span class="tag tag-admin">Admin</span>
								{:else}
									<span class="tag">Scorer</span>
								{/if}
								{#if !user.enabled}
									<span class="tag tag-error">Deaktiviert</span>
								{/if}
							</div>
						</div>
						<div class="row-actions">
							<button
								class="row-act"
								onclick={() => toggleRole(user.id, user.isAdmin)}
								disabled={loading || user.email === page.data.session?.user?.email}
								title={user.isAdmin ? 'Zu Scorer' : 'Zum Admin'}
							>
								{user.isAdmin ? '→ Scorer' : '→ Admin'}
							</button>
							<button class="row-act danger" onclick={() => removeUser(user.id)} disabled={loading}>
								Entfernen
							</button>
						</div>
					</li>
				{/each}
			</ul>

			{#if pendingInvites.length > 0}
				<h2 class="group-label k-mono">— Ausstehende Einladungen ({pendingInvites.length})</h2>
				<ul class="user-list">
					{#each pendingInvites as invite (invite.id)}
						<li class="user-row">
							<span class="row-num k-mono">··</span>
							<div class="row-body">
								<span class="row-email">{invite.email}</span>
								<div class="row-tags">
									<span class="tag tag-pending">Ausstehend</span>
								</div>
							</div>
							<div class="row-actions">
								<button
									class="row-act"
									onclick={() => resendInvitation(invite.id, invite.email)}
									disabled={resending === invite.id}
								>
									{resending === invite.id ? '...' : 'Erneut senden'}
								</button>
								<button
									class="row-act danger"
									onclick={() => revokeInvitation(invite.id, invite.email)}
									disabled={revoking === invite.id}
								>
									{revoking === invite.id ? '...' : 'Widerrufen'}
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}

		{#if atLimit}
			<p class="limit-hint k-mono">— Maximale Anzahl Nutzer erreicht (5 / 5)</p>
		{/if}
	</KSection>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}

	.count {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: var(--k-text-mute);
	}
	.count.max {
		color: var(--color-error);
	}

	.banner {
		font-size: 13px;
		padding: 12px 14px;
		border: 1px solid currentColor;
	}
	.banner-success {
		color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 8%, transparent);
	}
	.banner-error {
		color: var(--color-error);
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}

	.invite-form {
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

	.group-label {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 16px 0 0;
	}

	.user-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--k-line);
	}

	.user-row {
		display: grid;
		grid-template-columns: 36px 1fr auto;
		align-items: center;
		gap: 16px;
		padding: 16px;
		border-bottom: 1px solid var(--k-line);
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.user-row:hover {
		background: color-mix(in srgb, var(--k-text) 3%, transparent);
	}

	.row-num {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
	}

	.row-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.row-email {
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: 15px;
		color: var(--k-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
	.tag-admin {
		color: var(--pulse);
		border-color: var(--pulse);
	}
	.tag-pending {
		color: #eab308;
		border-color: #eab308;
	}
	.tag-error {
		color: var(--color-error);
		border-color: var(--color-error);
	}

	.row-actions {
		display: flex;
		gap: 4px;
	}

	.row-act {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 500;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--k-line);
		color: var(--k-text-mute);
		cursor: pointer;
		transition:
			color var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap);
	}
	.row-act:hover:not(:disabled) {
		color: var(--k-text);
		border-color: var(--k-text-mute);
	}
	.row-act:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.row-act.danger {
		color: var(--color-error);
		border-color: color-mix(in srgb, var(--color-error) 50%, transparent);
	}
	.row-act.danger:hover:not(:disabled) {
		border-color: var(--color-error);
	}

	.limit-hint {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		margin: 16px 0 0;
		text-align: center;
	}
</style>
