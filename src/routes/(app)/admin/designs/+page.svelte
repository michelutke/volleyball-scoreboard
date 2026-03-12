<script lang="ts">
	import type { PageData } from './$types.js';
	import type { MatchState } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';

	let { data }: { data: PageData } = $props();

	type Template = {
		id: number;
		name: string;
		isDefault: boolean;
		overlayBg: string;
		overlayBg2: string;
		overlayBgGradient: boolean;
		overlayText: string;
		overlayRounded: boolean;
		overlayDivider: string;
		overlaySatsBg: string;
		overlaySetScoreBg: string;
		scoreColor: string;
		scoreColor2: string;
		scoreColorGradient: boolean;
	};

	let templates = $state<Template[]>(data.templates ?? []);
	let loading = $state(false);
	let feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	// Edit/create state
	let editing = $state<Template | null>(null);
	let creating = $state(false);
	let editName = $state('');
	let editIsDefault = $state(false);
	let editOverlayBg = $state('#1a1a1a');
	let editOverlayBg2 = $state('#1a1a1a');
	let editOverlayBgGradient = $state(false);
	let editOverlayText = $state('#ffffff');
	let editOverlayRounded = $state(false);
	let editOverlayDivider = $state('#2a2a2a');
	let editOverlaySatsBg = $state('#1a1a1a');
	let editOverlaySetScoreBg = $state('#1a1a1a');
	let editScoreColor = $state('#1a1a1a');
	let editScoreColor2 = $state('#1a1a1a');
	let editScoreColorGradient = $state(false);

	const previewMatch: MatchState = $derived({
		matchId: 0,
		homeTeamName: 'HEIM',
		guestTeamName: 'GAST',
		homeJerseyColor: '#c0392b',
		guestJerseyColor: '#1e6ab5',
		showJerseyColors: true,
		homePoints: 14,
		guestPoints: 10,
		homeSets: 1,
		guestSets: 0,
		currentSet: 2,
		setScores: [{ home: 25, guest: 21 }],
		serviceTeam: 'home',
		showSetScores: true,
		overlayBg: editOverlayBg,
		overlayBg2: editOverlayBg2,
		overlayBgGradient: editOverlayBgGradient,
		overlayText: editOverlayText,
		overlayRounded: editOverlayRounded,
		overlayDivider: editOverlayDivider,
		overlaySatsBg: editOverlaySatsBg,
		overlaySetScoreBg: editOverlaySetScoreBg,
		scoreColor: editScoreColor,
		scoreColor2: editScoreColor2,
		scoreColorGradient: editScoreColorGradient,
		designTemplateId: null,
		status: 'live'
	});

	function resetForm() {
		editName = '';
		editIsDefault = false;
		editOverlayBg = '#1a1a1a';
		editOverlayBg2 = '#1a1a1a';
		editOverlayBgGradient = false;
		editOverlayText = '#ffffff';
		editOverlayRounded = false;
		editOverlayDivider = '#2a2a2a';
		editOverlaySatsBg = '#1a1a1a';
		editOverlaySetScoreBg = '#1a1a1a';
		editScoreColor = '#1a1a1a';
		editScoreColor2 = '#1a1a1a';
		editScoreColorGradient = false;
	}

	function startCreate() {
		editing = null;
		creating = true;
		resetForm();
		editIsDefault = templates.length === 0;
	}

	function startEdit(t: Template) {
		creating = false;
		editing = t;
		editName = t.name;
		editIsDefault = t.isDefault;
		editOverlayBg = t.overlayBg;
		editOverlayBg2 = t.overlayBg2;
		editOverlayBgGradient = t.overlayBgGradient;
		editOverlayText = t.overlayText;
		editOverlayRounded = t.overlayRounded;
		editOverlayDivider = t.overlayDivider;
		editOverlaySatsBg = t.overlaySatsBg;
		editOverlaySetScoreBg = t.overlaySetScoreBg;
		editScoreColor = t.scoreColor;
		editScoreColor2 = t.scoreColor2;
		editScoreColorGradient = t.scoreColorGradient;
	}

	function cancelEdit() {
		editing = null;
		creating = false;
	}

	function getPayload() {
		return {
			name: editName.trim(),
			isDefault: editIsDefault,
			overlayBg: editOverlayBg,
			overlayBg2: editOverlayBg2,
			overlayBgGradient: editOverlayBgGradient,
			overlayText: editOverlayText,
			overlayRounded: editOverlayRounded,
			overlayDivider: editOverlayDivider,
			overlaySatsBg: editOverlaySatsBg,
			overlaySetScoreBg: editOverlaySetScoreBg,
			scoreColor: editScoreColor,
			scoreColor2: editScoreColor2,
			scoreColorGradient: editScoreColorGradient
		};
	}

	async function saveTemplate() {
		if (!editName.trim()) {
			feedback = { type: 'error', message: 'Name ist erforderlich' };
			return;
		}
		loading = true;
		feedback = null;
		try {
			const payload = getPayload();
			let res: Response;
			if (creating) {
				res = await fetch('/api/design-templates', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else if (editing) {
				res = await fetch(`/api/design-templates/${editing.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else return;

			if (!res.ok) {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Fehler beim Speichern' };
				return;
			}

			const saved: Template = await res.json();
			if (creating) {
				if (saved.isDefault) {
					templates = templates.map((t) => ({ ...t, isDefault: false }));
				}
				templates = [...templates, saved];
			} else {
				if (saved.isDefault) {
					templates = templates.map((t) => t.id === saved.id ? saved : { ...t, isDefault: false });
				} else {
					templates = templates.map((t) => t.id === saved.id ? saved : t);
				}
			}
			feedback = { type: 'success', message: creating ? 'Template erstellt' : 'Template gespeichert' };
			creating = false;
			editing = null;
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	async function deleteTemplate(id: number) {
		if (!confirm('Template wirklich löschen?')) return;
		loading = true;
		feedback = null;
		try {
			const res = await fetch(`/api/design-templates/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = await res.json();
				feedback = { type: 'error', message: err.error ?? 'Fehler beim Löschen' };
				return;
			}
			templates = templates.filter((t) => t.id !== id);
			if (editing?.id === id) { editing = null; }
			feedback = { type: 'success', message: 'Template gelöscht' };
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	async function setDefault(id: number) {
		loading = true;
		feedback = null;
		try {
			const res = await fetch(`/api/design-templates/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isDefault: true })
			});
			if (!res.ok) {
				feedback = { type: 'error', message: 'Fehler beim Setzen als Standard' };
				return;
			}
			templates = templates.map((t) => ({ ...t, isDefault: t.id === id }));
			feedback = { type: 'success', message: 'Standard-Template gesetzt' };
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	function bgStyle(t: Template): string {
		return t.overlayBgGradient
			? `linear-gradient(to right, ${t.overlayBg}, ${t.overlayBg2})`
			: t.overlayBg;
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-text-primary">Overlay-Designs</h1>
				<p class="text-text-secondary text-sm">Scoreboard-Designs verwalten</p>
			</div>
		</div>

		{#if feedback}
			<div class="mb-4 rounded-lg px-4 py-2 text-sm {feedback.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}">
				{feedback.message}
			</div>
		{/if}

		{#if templates.length === 0 && !creating}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary">Keine Design-Templates vorhanden</p>
				<p class="text-text-tertiary text-sm mt-2">Erstelle ein Template, das Scorer beim Scoring auswählen können.</p>
			</div>
		{:else if !creating && !editing}
			<div class="space-y-2">
				{#each templates as template (template.id)}
					<div class="flex items-center justify-between bg-bg-panel-alt rounded-xl p-4 gap-4">
						<div class="flex items-center gap-3 min-w-0">
							<div
								class="w-10 h-10 rounded-lg flex-shrink-0 border border-border-subtle"
								style:background={bgStyle(template)}
								style:border-radius={template.overlayRounded ? '12px' : '4px'}
							>
								<span class="flex items-center justify-center w-full h-full text-xs font-bold" style:color={template.overlayText}>Aa</span>
							</div>
							<div class="flex flex-col gap-1 min-w-0">
								<span class="text-text-primary truncate">{template.name}</span>
								<div class="flex items-center gap-2">
									{#if template.isDefault}
										<span class="text-xs bg-accent-deepest/30 text-accent px-2 py-0.5 rounded font-medium">Standard</span>
									{/if}
								</div>
							</div>
						</div>
						<div class="flex items-center gap-3 flex-shrink-0">
							{#if !template.isDefault}
								<button
									onclick={() => setDefault(template.id)}
									disabled={loading}
									class="text-sm text-text-secondary hover:text-text-primary disabled:opacity-30"
								>
									→ Standard
								</button>
							{/if}
							<button
								onclick={() => startEdit(template)}
								disabled={loading}
								class="text-sm text-text-secondary hover:text-text-primary disabled:opacity-30"
							>
								Bearbeiten
							</button>
							{#if !template.isDefault}
								<button
									onclick={() => deleteTemplate(template.id)}
									disabled={loading}
									class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
								>
									Löschen
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if creating || editing}
			<div class="bg-bg-panel-alt rounded-xl p-6 mt-4 space-y-4">
				<h2 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide">
					{creating ? 'Neues Template' : 'Template bearbeiten'}
				</h2>

				<div class="preview-wrap">
					<ScoreboardDisplay match={previewMatch} homeTimeoutsUsed={1} guestTimeoutsUsed={0} timeoutTeam={null} />
				</div>

				<label class="block">
					<span class="text-sm text-text-primary">Name</span>
					<input type="text" bind:value={editName} placeholder="z.B. Dunkel" class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent mt-1" />
				</label>

				<label class="flex items-center gap-2 text-sm text-text-primary">
					<input type="checkbox" bind:checked={editIsDefault} class="accent-accent-mid" />
					Als Standard verwenden
				</label>

				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Overlay-Farben</h3>
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-28">Hintergrund</span>
						<input type="color" bind:value={editOverlayBg} class="color-picker" />
						<span class="text-xs text-text-tertiary font-mono">{editOverlayBg}</span>
					</div>
					<label class="flex items-center gap-2 text-sm text-text-secondary">
						<input type="checkbox" bind:checked={editOverlayBgGradient} class="accent-accent-mid" />
						Verlauf
					</label>
					{#if editOverlayBgGradient}
						<div class="flex items-center gap-3">
							<span class="text-sm text-text-secondary w-28">Hintergrund 2</span>
							<input type="color" bind:value={editOverlayBg2} class="color-picker" />
							<span class="text-xs text-text-tertiary font-mono">{editOverlayBg2}</span>
						</div>
					{/if}
					<label class="flex items-center gap-2 text-sm text-text-secondary">
						<input type="checkbox" bind:checked={editOverlayRounded} class="accent-accent-mid" />
						Abgerundet
					</label>
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-28">Text</span>
						<input type="color" bind:value={editOverlayText} class="color-picker" />
						<span class="text-xs text-text-tertiary font-mono">{editOverlayText}</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-28">Trennlinie</span>
						<input type="color" bind:value={editOverlayDivider} class="color-picker" />
						<span class="text-xs text-text-tertiary font-mono">{editOverlayDivider}</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-28">Satz</span>
						<input type="color" bind:value={editOverlaySatsBg} class="color-picker" />
						<span class="text-xs text-text-tertiary font-mono">{editOverlaySatsBg}</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-28">Satzresultate</span>
						<input type="color" bind:value={editOverlaySetScoreBg} class="color-picker" />
						<span class="text-xs text-text-tertiary font-mono">{editOverlaySetScoreBg}</span>
					</div>
				</div>

				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Punktzahl</h3>
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-28">Farbe</span>
						<input type="color" bind:value={editScoreColor} class="color-picker" />
						<span class="text-xs text-text-tertiary font-mono">{editScoreColor}</span>
					</div>
					<label class="flex items-center gap-2 text-sm text-text-secondary">
						<input type="checkbox" bind:checked={editScoreColorGradient} class="accent-accent-mid" />
						Verlauf
					</label>
					{#if editScoreColorGradient}
						<div class="flex items-center gap-3">
							<span class="text-sm text-text-secondary w-28">Farbe 2</span>
							<input type="color" bind:value={editScoreColor2} class="color-picker" />
							<span class="text-xs text-text-tertiary font-mono">{editScoreColor2}</span>
						</div>
					{/if}
				</div>

				<div class="flex gap-2 pt-2">
					<button onclick={cancelEdit} class="flex-1 bg-bg-base border border-border-subtle text-text-secondary rounded-lg py-2 hover:text-text-primary transition-colors">
						Abbrechen
					</button>
					<button onclick={saveTemplate} disabled={loading} class="flex-1 bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors">
						{loading ? 'Speichern...' : 'Speichern'}
					</button>
				</div>
			</div>
		{/if}

		{#if !creating && !editing}
			<div class="mt-4">
				<button onclick={startCreate} class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
					+ Neues Template erstellen
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.color-picker {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--color-border-subtle);
		cursor: pointer;
		padding: 0;
		-webkit-appearance: none;
	}
	.color-picker::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.color-picker::-webkit-color-swatch {
		border: none;
		border-radius: 6px;
	}

	.preview-wrap {
		overflow-x: auto;
		padding: 12px 0;
	}
</style>
