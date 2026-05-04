<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types.js';
	import type { MatchState, LibraryOverlay } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';
	import {
		SCOREBOARD_LAYOUTS,
		type ScoreboardOptions
	} from '$lib/components/scoreboards/index.js';
	import { KButton, KField, KInput, KEmpty } from '$lib/components/k';
	import { reveal } from '$lib/motion.js';

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
		customCode?: string | null;
		isPublic?: boolean;
		description?: string | null;
	};

	let templates = $state<Template[]>(untrack(() => data.templates ?? []));
	let libraryTemplates = $state<LibraryOverlay[]>(untrack(() => data.library ?? []));
	let loading = $state(false);
	let feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	// === Scorely layouts (org default) ===
	let selectedLayoutId = $state<string>(untrack(() => data.orgLayoutId ?? 'classic'));
	let layoutOptions = $state<Record<string, ScoreboardOptions>>({});

	$effect(() => {
		const initial: Record<string, ScoreboardOptions> = {};
		for (const layout of SCOREBOARD_LAYOUTS) {
			const defaults: ScoreboardOptions = {};
			for (const opt of layout.customizableOptions) {
				defaults[opt.key] = opt.default as string | boolean;
			}
			initial[layout.id] = defaults;
		}
		if (data.orgLayoutId && data.orgLayoutOptions) {
			initial[data.orgLayoutId] = {
				...initial[data.orgLayoutId],
				...(data.orgLayoutOptions as ScoreboardOptions)
			};
		}
		layoutOptions = initial;
	});

	const SAMPLE: MatchState = {
		matchId: 0,
		homeTeamName: 'VBC Thun',
		guestTeamName: 'VBC Spiez',
		homeTeamLogo: null,
		guestTeamLogo: null,
		homePoints: 24,
		guestPoints: 22,
		homeSets: 1,
		guestSets: 1,
		currentSet: 3,
		setScores: [
			{ home: 25, guest: 23 },
			{ home: 22, guest: 25 }
		],
		serviceTeam: 'home',
		showSetScores: true,
		showJerseyColors: true,
		status: 'live',
		homeJerseyColor: '#cc0000',
		guestJerseyColor: '#1e6ab5',
		overlayBg: '#0f172a',
		overlayBg2: '#1e293b',
		overlayBgGradient: true,
		overlayText: '#ffffff',
		overlayRounded: true,
		overlayDivider: '#334155',
		overlaySatsBg: '#1e293b',
		overlaySetScoreBg: '#1e293b',
		scoreColor: '#0ea5e9',
		scoreColor2: '#0284c7',
		scoreColorGradient: true,
		designTemplateId: null
	};

	async function persistLayout() {
		await fetch('/api/library/default-layout', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				layoutId: selectedLayoutId,
				options: layoutOptions[selectedLayoutId] ?? {}
			})
		});
	}

	function selectLayout(id: string) {
		selectedLayoutId = id;
		void persistLayout();
		feedback = { type: 'success', message: 'Org-Layout gespeichert' };
	}

	function updateLayoutOption(layoutId: string, key: string, value: string | boolean) {
		layoutOptions[layoutId] = { ...layoutOptions[layoutId], [key]: value };
		if (layoutId === selectedLayoutId) void persistLayout();
	}

	const currentLayout = $derived(
		SCOREBOARD_LAYOUTS.find((l) => l.id === selectedLayoutId) ?? SCOREBOARD_LAYOUTS[0]
	);

	// === Form / dialog ===
	let formOpen = $state(false);
	let formDialogEl = $state<HTMLDialogElement | null>(null);
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
	let editCustomCode = $state<string | null>(null);
	let editCustomCodeEnabled = $state(false);
	let editIsPublic = $state(false);
	let editDescription = $state('');

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
		homeTeamLogo: null,
		guestTeamLogo: null,
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
		editCustomCode = null;
		editCustomCodeEnabled = false;
		editIsPublic = false;
		editDescription = '';
	}

	function startCreate() {
		editing = null;
		creating = true;
		resetForm();
		editIsDefault = templates.length === 0;
		formOpen = true;
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
		editCustomCode = t.customCode ?? null;
		editCustomCodeEnabled = !!t.customCode;
		editIsPublic = t.isPublic ?? false;
		editDescription = t.description ?? '';
		formOpen = true;
	}

	function closeForm() {
		formOpen = false;
		editing = null;
		creating = false;
	}

	$effect(() => {
		if (formDialogEl) {
			if (formOpen) formDialogEl.showModal();
			else formDialogEl.close();
		}
	});

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
			scoreColorGradient: editScoreColorGradient,
			customCode: editCustomCodeEnabled ? editCustomCode || null : null,
			isPublic: editIsPublic,
			description: editDescription.trim() || null
		};
	}

	const STARTER_CODE = `<!-- CSS-Variablen: --overlay-bg, --overlay-text, --score-color, etc. -->
<!-- Match-Daten via postMessage (type: 'matchState') -->
<style>
  body { margin: 0; background: transparent; }
  #score { color: var(--score-color, #fff); font-size: 2rem; font-family: sans-serif; }
</style>
<div id="score"></div>
<script>
  window.addEventListener('message', e => {
    if (e.data?.type !== 'matchState') return;
    const d = e.data.data;
    document.getElementById('score').textContent =
      d.homeTeam + ' ' + d.homePoints + ' - ' + d.guestPoints + ' ' + d.guestTeam;
  });
<\/script>`;

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
					templates = templates.map((t) =>
						t.id === saved.id ? saved : { ...t, isDefault: false }
					);
				} else {
					templates = templates.map((t) => (t.id === saved.id ? saved : t));
				}
			}
			feedback = { type: 'success', message: creating ? 'Template erstellt' : 'Template gespeichert' };
			closeForm();
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
			if (editing?.id === id) closeForm();
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

	async function installFromLibrary(id: number) {
		loading = true;
		feedback = null;
		try {
			const res = await fetch(`/api/library/install/${id}`, { method: 'POST' });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				feedback = { type: 'error', message: err.error ?? 'Fehler beim Installieren' };
				return;
			}
			const installed: Template = await res.json();
			templates = [...templates, installed];
			feedback = { type: 'success', message: `"${installed.name}" installiert` };
		} catch {
			feedback = { type: 'error', message: 'Netzwerkfehler' };
		} finally {
			loading = false;
		}
	}

	function bgStyle(t: Pick<Template, 'overlayBg' | 'overlayBg2' | 'overlayBgGradient'>): string {
		return t.overlayBgGradient
			? `linear-gradient(to right, ${t.overlayBg}, ${t.overlayBg2})`
			: t.overlayBg;
	}

	function libraryBgStyle(o: LibraryOverlay): string {
		return o.overlayBgGradient
			? `linear-gradient(to right, ${o.overlayBg}, ${o.overlayBg2})`
			: o.overlayBg;
	}

	const MOCK_MATCH = {
		homeTeam: 'VBC Thun',
		guestTeam: 'Volley Lugano',
		homePoints: 14,
		guestPoints: 10,
		homeSets: 1,
		guestSets: 0,
		currentSet: 2,
		setScores: [
			{ home: 25, guest: 20 },
			{ home: 14, guest: 10 }
		],
		serviceTeam: 'home',
		status: 'live',
		homeJerseyColor: '#c0392b',
		guestJerseyColor: '#1e6ab5',
		homeTeamLogo: null,
		guestTeamLogo: null,
		timeout: { active: false, team: null },
		isSetPoint: false,
		isMatchPoint: false
	};

	function buildPreviewHtml(code: string): string {
		return `<!DOCTYPE html><html><head><style>
:root{--overlay-bg:${editOverlayBg};--overlay-bg2:${editOverlayBg2};--overlay-text:${editOverlayText};--overlay-divider:${editOverlayDivider};--overlay-sats-bg:${editOverlaySatsBg};--overlay-set-score-bg:${editOverlaySetScoreBg};--score-color:${editScoreColor};--score-color2:${editScoreColor2};}
body{margin:0;background:transparent;}
</style></head><body>${code}
<script>setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{type:'matchState',data:${JSON.stringify(MOCK_MATCH)}}})),200);<\/script>
</body></html>`;
	}

	let previewSrcdoc = $state('');
	let _previewDebounce: ReturnType<typeof setTimeout>;
	$effect(() => {
		const html =
			editCustomCodeEnabled && editCustomCode ? buildPreviewHtml(editCustomCode) : '';
		clearTimeout(_previewDebounce);
		_previewDebounce = setTimeout(() => {
			previewSrcdoc = html;
		}, 400);
	});
</script>

<div class="page">
	<div class="wrap">
		<header class="head">
			<p class="kicker k-mono">Admin · Designs</p>
			<h1 class="title k-display">Overlay-Designs</h1>
			<p class="sub">
				Scoreboard-Layout, eigene Templates und Community-Bibliothek — alles für deine Org an einem Ort.
			</p>
		</header>

		{#if feedback}
			<div class="feedback feedback-{feedback.type}">
				<span>{feedback.message}</span>
				<button class="feedback-close" onclick={() => (feedback = null)} aria-label="Schliessen">×</button>
			</div>
		{/if}

		<!-- Section 01: Scorely layouts -->
		<section class="section">
			<div class="section-head">
				<p class="section-kicker k-mono">01 · Scorely Layouts</p>
				<h2 class="section-title">Scoreboard-Stil</h2>
				<p class="section-sub">Wähle das Layout, das im Overlay deiner Org genutzt wird.</p>
			</div>

			<div class="layout-grid">
				{#each SCOREBOARD_LAYOUTS as layout, idx}
					{@const isSelected = layout.id === selectedLayoutId}
					<article class="layout-card" class:selected={isSelected} use:reveal={{ y: 24, delay: idx * 0.06 }}>
						<header class="layout-head">
							<span class="layout-num k-mono">0{idx + 1}</span>
							<div class="layout-titles">
								<h3 class="layout-name k-display">{layout.name}</h3>
								<p class="layout-desc">{layout.description}</p>
							</div>
							{#if isSelected}
								<span class="badge-active k-mono">Aktiv</span>
							{/if}
						</header>

						<div class="layout-preview">
							<div class="layout-preview-shrink">
								<ScoreboardDisplay
									match={SAMPLE}
									homeTimeoutsUsed={1}
									guestTimeoutsUsed={0}
									timeoutTeam={null}
									layoutId={layout.id}
									options={layoutOptions[layout.id] ?? {}}
								/>
							</div>
						</div>

						<div class="layout-actions">
							<KButton
								variant={isSelected ? 'primary' : 'secondary'}
								size="sm"
								onclick={() => selectLayout(layout.id)}
							>
								{isSelected ? '✓ Ausgewählt' : 'Auswählen'}
							</KButton>
						</div>

						{#if layout.customizableOptions.length > 0 && isSelected}
							<div class="opts">
								<p class="opts-label k-mono">Anpassen</p>
								{#each layout.customizableOptions as opt}
									<div class="opt-row">
										<label class="opt-label k-mono" for="opt-{layout.id}-{opt.key}">{opt.label}</label>
										{#if opt.type === 'color'}
											<input
												id="opt-{layout.id}-{opt.key}"
												type="color"
												value={(layoutOptions[layout.id]?.[opt.key] as string) ?? opt.default}
												oninput={(e) => updateLayoutOption(layout.id, opt.key, (e.target as HTMLInputElement).value)}
												class="opt-color"
											/>
										{:else if opt.type === 'boolean'}
											<input
												id="opt-{layout.id}-{opt.key}"
												type="checkbox"
												checked={Boolean(layoutOptions[layout.id]?.[opt.key] ?? opt.default)}
												onchange={(e) => updateLayoutOption(layout.id, opt.key, (e.target as HTMLInputElement).checked)}
											/>
										{:else if opt.type === 'select' && opt.options}
											<select
												id="opt-{layout.id}-{opt.key}"
												value={(layoutOptions[layout.id]?.[opt.key] as string) ?? opt.default}
												onchange={(e) => updateLayoutOption(layout.id, opt.key, (e.target as HTMLSelectElement).value)}
												class="opt-select"
											>
												{#each opt.options as o}
													<option value={o.value}>{o.label}</option>
												{/each}
											</select>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</article>
				{/each}
			</div>
			<p class="hint k-mono">Pro Match überschreibbar im Scoring-Control. Nutze {currentLayout.name} als Org-Default.</p>
		</section>

		<!-- Section 02: Eigene Designs -->
		<section class="section">
			<div class="section-head">
				<p class="section-kicker k-mono">02 · Eigene Designs</p>
				<h2 class="section-title">Custom-Templates</h2>
				<p class="section-sub">Eigene Overlay-Templates für deine Org — auch mit Custom-Code.</p>
			</div>

			{#if templates.length === 0}
				<KEmpty
					numeral="00"
					title="Noch keine Custom-Templates"
					body="Erstelle ein Template, das beim Scoring auswählbar ist."
				/>
			{:else}
				<ul class="tpl-list">
					{#each templates as template (template.id)}
						<li class="tpl-row">
							<div class="tpl-swatch" style:background={bgStyle(template)} class:rounded={template.overlayRounded}>
								<span style:color={template.overlayText}>Aa</span>
							</div>
							<div class="tpl-body">
								<div class="tpl-head">
									<span class="tpl-name">{template.name}</span>
									{#if template.isDefault}<span class="badge k-mono badge-default">Standard</span>{/if}
									{#if template.isPublic}<span class="badge k-mono badge-public">Public</span>{/if}
								</div>
							</div>
							<div class="tpl-actions">
								{#if !template.isDefault}
									<KButton variant="ghost" size="sm" onclick={() => setDefault(template.id)} disabled={loading}>
										→ Standard
									</KButton>
								{/if}
								<KButton variant="secondary" size="sm" onclick={() => startEdit(template)} disabled={loading}>
									Bearbeiten
								</KButton>
								{#if !template.isDefault}
									<KButton variant="danger" size="sm" onclick={() => deleteTemplate(template.id)} disabled={loading}>
										Löschen
									</KButton>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="create-block">
				<KButton variant="secondary" full onclick={startCreate}>+ Neues Template erstellen</KButton>
			</div>
		</section>

		<!-- Section 03: Community library -->
		<section class="section">
			<div class="section-head">
				<p class="section-kicker k-mono">03 · Community-Bibliothek</p>
				<h2 class="section-title">Geteilte Designs</h2>
				<p class="section-sub">Von anderen Vereinen veröffentlichte Custom-Overlays — installierbar mit einem Klick.</p>
			</div>

			{#if libraryTemplates.length === 0}
				<KEmpty
					numeral="00"
					title="Keine öffentlichen Overlays"
					body="Veröffentliche dein eigenes Custom-Template, um es hier zu teilen."
				/>
			{:else}
				<div class="lib-grid">
					{#each libraryTemplates as overlay (overlay.id)}
						<article class="lib-card">
							<div class="lib-preview" style:background={libraryBgStyle(overlay)}>
								<span class="lib-sample" style:color={overlay.overlayText}>Aa 14 : 10 Aa</span>
							</div>
							<div class="lib-body">
								<p class="lib-name">{overlay.name}</p>
								<p class="lib-by k-mono">von {overlay.clubName}</p>
								{#if overlay.description}
									<p class="lib-desc">{overlay.description}</p>
								{/if}
								<div class="lib-actions">
									<KButton variant="secondary" size="sm" href="/api/overlay-sandbox/{overlay.id}?preview=1" target="_blank" rel="noopener">
										Vorschau →
									</KButton>
									<KButton variant="primary" size="sm" onclick={() => installFromLibrary(overlay.id)} disabled={loading}>
										Installieren
									</KButton>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Form dialog (centered modal on desktop, bottom-sheet on mobile) -->
	<dialog
		bind:this={formDialogEl}
		class="form-dialog"
		onclose={closeForm}
		onclick={(e) => {
			if (e.target === e.currentTarget) closeForm();
		}}
	>
		<div class="form-head">
			<h3>{creating ? 'Neues Template' : 'Template bearbeiten'}</h3>
			<button class="form-close" onclick={closeForm} aria-label="Schliessen">×</button>
		</div>
		<div class="form-body">
			<div class="preview-wrap">
				{#if editCustomCodeEnabled && editCustomCode}
					<iframe
						srcdoc={previewSrcdoc}
						sandbox="allow-scripts"
						class="preview-frame"
						title="Vorschau"
					></iframe>
				{:else}
					<ScoreboardDisplay
						match={previewMatch}
						homeTimeoutsUsed={1}
						guestTimeoutsUsed={0}
						timeoutTeam={null}
					/>
				{/if}
			</div>

			<KField label="Name" for="tplName">
				<KInput id="tplName" type="text" bind:value={editName} placeholder="z.B. Dunkel" />
			</KField>

			<label class="check-row">
				<input type="checkbox" bind:checked={editIsDefault} />
				<span>Als Standard verwenden</span>
			</label>

			<div class="form-section">
				<p class="form-section-label k-mono">Overlay-Farben</p>
				<div class="color-row">
					<span class="color-key k-mono">Hintergrund</span>
					<input type="color" bind:value={editOverlayBg} class="color-pick" />
					<span class="color-hex k-mono">{editOverlayBg}</span>
				</div>
				<label class="check-row">
					<input type="checkbox" bind:checked={editOverlayBgGradient} />
					<span>Verlauf</span>
				</label>
				{#if editOverlayBgGradient}
					<div class="color-row">
						<span class="color-key k-mono">Hintergrund 2</span>
						<input type="color" bind:value={editOverlayBg2} class="color-pick" />
						<span class="color-hex k-mono">{editOverlayBg2}</span>
					</div>
				{/if}
				<label class="check-row">
					<input type="checkbox" bind:checked={editOverlayRounded} />
					<span>Abgerundet</span>
				</label>
				<div class="color-row">
					<span class="color-key k-mono">Text</span>
					<input type="color" bind:value={editOverlayText} class="color-pick" />
					<span class="color-hex k-mono">{editOverlayText}</span>
				</div>
				<div class="color-row">
					<span class="color-key k-mono">Trennlinie</span>
					<input type="color" bind:value={editOverlayDivider} class="color-pick" />
					<span class="color-hex k-mono">{editOverlayDivider}</span>
				</div>
				<div class="color-row">
					<span class="color-key k-mono">Satz</span>
					<input type="color" bind:value={editOverlaySatsBg} class="color-pick" />
					<span class="color-hex k-mono">{editOverlaySatsBg}</span>
				</div>
				<div class="color-row">
					<span class="color-key k-mono">Satzresultate</span>
					<input type="color" bind:value={editOverlaySetScoreBg} class="color-pick" />
					<span class="color-hex k-mono">{editOverlaySetScoreBg}</span>
				</div>
			</div>

			<div class="form-section">
				<p class="form-section-label k-mono">Punktzahl</p>
				<div class="color-row">
					<span class="color-key k-mono">Farbe</span>
					<input type="color" bind:value={editScoreColor} class="color-pick" />
					<span class="color-hex k-mono">{editScoreColor}</span>
				</div>
				<label class="check-row">
					<input type="checkbox" bind:checked={editScoreColorGradient} />
					<span>Verlauf</span>
				</label>
				{#if editScoreColorGradient}
					<div class="color-row">
						<span class="color-key k-mono">Farbe 2</span>
						<input type="color" bind:value={editScoreColor2} class="color-pick" />
						<span class="color-hex k-mono">{editScoreColor2}</span>
					</div>
				{/if}
			</div>

			<div class="form-section">
				<div class="form-section-row">
					<p class="form-section-label k-mono">Custom Code</p>
					<label class="check-row">
						<input
							type="checkbox"
							bind:checked={editCustomCodeEnabled}
							onchange={() => {
								if (editCustomCodeEnabled && !editCustomCode) editCustomCode = STARTER_CODE;
							}}
						/>
						<span>Aktivieren</span>
					</label>
				</div>

				{#if editCustomCodeEnabled}
					<div class="warn k-mono">
						Nur vertrauenswürdigen Code verwenden. Code wird isoliert ausgeführt (kein Zugriff auf App-Daten oder Cookies).
					</div>
					<textarea
						bind:value={editCustomCode}
						rows={14}
						spellcheck={false}
						class="code-area"
						placeholder="<!-- HTML/CSS/JS hier eingeben -->"
					></textarea>
				{/if}
			</div>

			{#if editCustomCodeEnabled && editCustomCode}
				<div class="form-section">
					<label class="check-row">
						<input type="checkbox" bind:checked={editIsPublic} />
						<span>In der Community-Bibliothek veröffentlichen</span>
					</label>
					{#if editIsPublic}
						<KField label="Kurzbeschreibung (optional)" for="tplDesc">
							<textarea
								id="tplDesc"
								bind:value={editDescription}
								maxlength={200}
								rows={2}
								class="k-input desc-area"
								placeholder="z.B. Minimalistisches Design mit großen Zahlen"
							></textarea>
						</KField>
					{/if}
				</div>
			{/if}
		</div>
		<div class="form-foot">
			<KButton variant="ghost" onclick={closeForm}>Abbrechen</KButton>
			<KButton variant="primary" onclick={saveTemplate} disabled={loading}>
				{loading ? '...' : 'Speichern'}
			</KButton>
		</div>
	</dialog>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		padding: 32px var(--grid-margin) 80px;
	}

	.wrap {
		max-width: 1080px;
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-bottom: 24px;
		margin-bottom: 32px;
		border-bottom: 1px solid var(--k-line);
	}
	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}
	.title {
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0;
	}
	.sub {
		font-size: 14px;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	.feedback {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		font-size: 13px;
		margin-bottom: 16px;
		border: 1px solid;
	}
	.feedback-success {
		border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
		color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 8%, transparent);
	}
	.feedback-error {
		border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
		color: var(--color-error);
		background: color-mix(in srgb, var(--color-error) 8%, transparent);
	}
	.feedback-close {
		background: none;
		border: none;
		color: inherit;
		font-size: 18px;
		cursor: pointer;
		opacity: 0.7;
	}
	.feedback-close:hover {
		opacity: 1;
	}

	.section {
		margin-bottom: 56px;
	}

	.section-head {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 24px;
	}
	.section-kicker {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}
	.section-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 24px;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.section-sub {
		font-size: 13px;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	/* === Layout cards === */
	.layout-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 24px;
	}
	.layout-card {
		display: flex;
		flex-direction: column;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		transition:
			border-color var(--dur-mid) var(--ease-snap),
			background var(--dur-mid) var(--ease-snap);
	}
	.layout-card.selected {
		border-color: var(--pulse);
	}

	.layout-head {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 16px;
		align-items: start;
		padding: 20px 24px;
		border-bottom: 1px solid var(--k-line);
	}
	.layout-num {
		font-size: 12px;
		letter-spacing: 0.12em;
		color: var(--k-text-dim);
	}
	.layout-titles {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.layout-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 20px;
		margin: 0;
		letter-spacing: -0.02em;
	}
	.layout-desc {
		font-size: 13px;
		color: var(--k-text-mute);
		margin: 0;
	}
	.badge-active {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--paper);
		background: var(--pulse);
		padding: 4px 10px;
		align-self: flex-start;
	}

	.layout-preview {
		background: #0a0a0a;
		padding: 20px 16px;
		overflow-x: auto;
		display: flex;
		justify-content: center;
	}
	.layout-preview-shrink {
		min-width: 720px;
		max-width: 980px;
		width: 100%;
	}

	.layout-actions {
		display: flex;
		justify-content: flex-end;
		padding: 14px 24px;
		border-top: 1px solid var(--k-line);
	}

	.opts {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px 24px 22px;
		border-top: 1px solid var(--k-line);
		background: var(--k-surface);
	}
	.opts-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}
	.opt-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 6px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--k-line) 50%, transparent);
	}
	.opt-row:last-child {
		border-bottom: none;
	}
	.opt-label {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-mute);
	}
	.opt-color {
		width: 36px;
		height: 28px;
		border: 1px solid var(--k-line);
		background: transparent;
		cursor: pointer;
		padding: 2px;
	}
	.opt-select {
		font-family: var(--font-sans);
		font-size: 13px;
		padding: 6px 10px;
		background: var(--k-surface);
		color: var(--k-text);
		border: 1px solid var(--k-line);
	}

	.hint {
		margin: 16px 0 0;
		font-size: 11px;
		color: var(--k-text-dim);
	}

	/* === Templates list === */
	.tpl-list {
		list-style: none;
		margin: 0 0 16px;
		padding: 0;
		border-top: 1px solid var(--k-line);
	}
	.tpl-row {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 14px 0;
		border-bottom: 1px solid var(--k-line);
	}
	.tpl-swatch {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 700;
		border: 1px solid var(--k-line);
	}
	.tpl-swatch.rounded {
		border-radius: 8px;
	}
	.tpl-body {
		flex: 1;
		min-width: 0;
	}
	.tpl-head {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.tpl-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: 15px;
		color: var(--k-text);
	}
	.badge {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 3px 8px;
		border: 1px solid var(--k-line);
		color: var(--k-text-dim);
	}
	.badge-default {
		color: var(--paper);
		background: var(--pulse);
		border-color: var(--pulse);
	}
	.badge-public {
		color: var(--cool);
		border-color: var(--cool);
	}
	.tpl-actions {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.create-block {
		margin-top: 16px;
	}

	/* === Community library === */
	.lib-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1px;
		background: var(--k-line);
		border: 1px solid var(--k-line);
	}
	.lib-card {
		background: var(--k-surface);
		display: flex;
		flex-direction: column;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.lib-card:hover {
		background: color-mix(in srgb, var(--k-text) 3%, var(--k-surface));
	}
	.lib-preview {
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.lib-sample {
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 600;
		opacity: 0.75;
		letter-spacing: 0.06em;
	}
	.lib-body {
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}
	.lib-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 15px;
		color: var(--k-text);
		margin: 0;
	}
	.lib-by {
		font-size: 11px;
		color: var(--k-text-dim);
		margin: 0;
	}
	.lib-desc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--k-text-mute);
		flex: 1;
		margin: 4px 0 0;
	}
	.lib-actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	@media (min-width: 768px) {
		.lib-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1024px) {
		.lib-grid {
			grid-template-columns: 1fr 1fr 1fr;
		}
	}

	/* === Form dialog === */
	.form-dialog {
		background: var(--k-surface-alt);
		color: var(--k-text);
		border: 1px solid var(--k-line);
		border-radius: 0;
		padding: 0;
		max-width: 560px;
		width: 90vw;
		max-height: 90vh;
		margin: auto;
	}
	.form-dialog::backdrop {
		background: color-mix(in srgb, var(--ink) 70%, transparent);
	}

	.form-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--k-line);
	}
	.form-head h3 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 16px;
		letter-spacing: -0.01em;
	}
	.form-close {
		background: none;
		border: none;
		color: var(--k-text-dim);
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.form-close:hover {
		color: var(--k-text);
	}

	.form-body {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 18px;
		overflow-y: auto;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.form-section-label {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}
	.form-section-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.preview-wrap {
		display: block;
		overflow-x: auto;
		padding: 16px;
		background-image:
			linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
			linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
			linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
		background-size: 16px 16px;
		background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
		background-color: #1a1a1a;
		border: 1px solid var(--k-line);
		font-size: 16px;
		line-height: normal;
	}
	.preview-frame {
		width: 100%;
		height: 320px;
		border: none;
		background: transparent;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.color-key {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-mute);
		min-width: 100px;
	}
	.color-pick {
		width: 36px;
		height: 28px;
		border: 1px solid var(--k-line);
		background: transparent;
		cursor: pointer;
		padding: 2px;
	}
	.color-hex {
		font-size: 11px;
		color: var(--k-text-dim);
	}

	.check-row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--k-text);
		cursor: pointer;
	}
	.check-row input[type='checkbox'] {
		accent-color: var(--pulse);
	}

	.warn {
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
		padding: 8px 10px;
	}

	.code-area {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--k-text);
		background: var(--k-surface);
		border: 1px solid var(--k-line);
		border-radius: 0;
		padding: 10px 12px;
		width: 100%;
		resize: vertical;
		outline: none;
		transition: border-color var(--dur-fast) var(--ease-snap);
	}
	.code-area:focus {
		border-color: var(--pulse);
	}

	.desc-area {
		font-family: var(--font-sans);
		font-size: 14px;
		resize: none;
	}

	.form-foot {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 20px;
		border-top: 1px solid var(--k-line);
	}

	/* Mobile: bottom sheet */
	@media (max-width: 600px) {
		.form-dialog {
			width: 100vw;
			max-width: 100vw;
			max-height: 92vh;
			margin: auto 0 0;
			border-left: none;
			border-right: none;
			border-bottom: none;
			animation: sheet-up var(--dur-mid) var(--ease-snap);
		}
		.form-dialog[open] {
			top: auto;
			bottom: 0;
		}
		.form-dialog::backdrop {
			animation: backdrop-fade var(--dur-mid) var(--ease-snap);
		}
	}

	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes backdrop-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 600px) {
		.tpl-row {
			flex-wrap: wrap;
		}
		.tpl-actions {
			width: 100%;
			justify-content: flex-start;
		}
	}
</style>
