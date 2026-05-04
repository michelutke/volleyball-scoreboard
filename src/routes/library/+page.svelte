<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types.js';
	import type { LibraryOverlay, MatchState } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';
	import { SCOREBOARD_LAYOUTS, type ScoreboardOptions } from '$lib/components/scoreboards/index.js';
	import { reveal } from '$lib/motion.js';
	import LandingNav from '$lib/components/landing/LandingNav.svelte';

	let { data }: { data: PageData } = $props();

	let lang = $state<'de' | 'en'>('de');

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

	let selectedLayoutId = $state<string>('classic');
	let layoutOptions = $state<Record<string, ScoreboardOptions>>({});

	$effect(() => {
		const stored = localStorage.getItem('scoring-default-layout');
		if (stored) selectedLayoutId = stored;
		const optsRaw = localStorage.getItem('scoring-default-layout-options');
		if (optsRaw) {
			try {
				layoutOptions = JSON.parse(optsRaw);
			} catch {
				/* ignore */
			}
		}
		// initialize per-layout option defaults
		for (const layout of SCOREBOARD_LAYOUTS) {
			if (!layoutOptions[layout.id]) {
				const defaults: ScoreboardOptions = {};
				for (const opt of layout.customizableOptions) {
					defaults[opt.key] = opt.default as string | boolean;
				}
				layoutOptions[layout.id] = defaults;
			}
		}
	});

	function selectLayout(id: string) {
		selectedLayoutId = id;
		localStorage.setItem('scoring-default-layout', id);
	}

	function updateOption(layoutId: string, key: string, value: string | boolean) {
		layoutOptions[layoutId] = { ...layoutOptions[layoutId], [key]: value };
		localStorage.setItem('scoring-default-layout-options', JSON.stringify(layoutOptions));
	}

	const currentLayout = $derived(
		SCOREBOARD_LAYOUTS.find((l) => l.id === selectedLayoutId) ?? SCOREBOARD_LAYOUTS[0]
	);
	const currentOptions = $derived(layoutOptions[currentLayout.id] ?? {});

	function bgStyle(o: LibraryOverlay): string {
		return o.overlayBgGradient
			? `linear-gradient(to right, ${o.overlayBg}, ${o.overlayBg2})`
			: o.overlayBg;
	}

	async function install(id: number) {
		if (!data.isLoggedIn) {
			await goto(`/signin?callbackUrl=${encodeURIComponent('/library')}`);
			return;
		}
		const res = await fetch(`/api/library/install/${id}`, { method: 'POST' });
		if (res.status === 401) {
			await goto(`/signin?callbackUrl=${encodeURIComponent('/library')}`);
			return;
		}
		if (res.ok) {
			await goto('/admin/designs');
		} else {
			const err = await res.json().catch(() => ({}));
			alert(err.error ?? 'Fehler beim Installieren');
		}
	}
</script>

<svelte:head>
	<title>Bibliothek — Scorely</title>
</svelte:head>

<LandingNav {lang} onLangToggle={() => (lang = lang === 'de' ? 'en' : 'de')} basePath="/" />

<div class="page">
	<header class="hero">
		<div class="hero-inner">
			<p class="overline k-mono">— Bibliothek / Library</p>
			<h1 class="title k-display" use:reveal={{ y: 32 }}>Scoreboards & Overlays.</h1>
			<p class="subtitle">
				Wähle einen Scoreboard-Stil oder installiere ein Community-Overlay. Anpassbar pro Verein und pro Match.
			</p>
		</div>
	</header>

	<section class="layouts">
		<div class="section-head">
			<p class="kicker k-mono">— 01 / Scoreboard Layouts</p>
			<h2 class="sec-title">Stil wählen</h2>
		</div>

		<div class="layout-grid">
			{#each SCOREBOARD_LAYOUTS as layout, idx}
				{@const isSelected = layout.id === selectedLayoutId}
				<article class="layout-card" class:selected={isSelected} use:reveal={{ y: 32, delay: idx * 0.08 }}>
					<header class="card-head">
						<span class="card-num k-mono">0{idx + 1}</span>
						<div class="card-titles">
							<h3 class="card-name k-display">{layout.name}</h3>
							<p class="card-desc">{layout.description}</p>
						</div>
						{#if isSelected}
							<span class="card-badge k-mono">Aktiv</span>
						{/if}
					</header>

					<div class="preview-frame">
						<div class="preview-shrink">
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

					<div class="card-actions">
						<button
							class="select-btn"
							class:active={isSelected}
							onclick={() => selectLayout(layout.id)}
						>
							{isSelected ? '✓ Ausgewählt' : 'Auswählen'}
						</button>
					</div>

					{#if layout.customizableOptions.length > 0 && isSelected}
						<div class="custom-panel">
							<p class="custom-label k-mono">— Anpassen</p>
							{#each layout.customizableOptions as opt}
								<div class="opt-row">
									<label class="opt-label k-mono" for="opt-{layout.id}-{opt.key}">{opt.label}</label>
									{#if opt.type === 'color'}
										<input
											id="opt-{layout.id}-{opt.key}"
											type="color"
											value={(layoutOptions[layout.id]?.[opt.key] as string) ?? opt.default}
											oninput={(e) => updateOption(layout.id, opt.key, (e.target as HTMLInputElement).value)}
											class="opt-color"
										/>
									{:else if opt.type === 'boolean'}
										<input
											id="opt-{layout.id}-{opt.key}"
											type="checkbox"
											checked={Boolean(layoutOptions[layout.id]?.[opt.key] ?? opt.default)}
											onchange={(e) => updateOption(layout.id, opt.key, (e.target as HTMLInputElement).checked)}
										/>
									{:else if opt.type === 'select' && opt.options}
										<select
											id="opt-{layout.id}-{opt.key}"
											value={(layoutOptions[layout.id]?.[opt.key] as string) ?? opt.default}
											onchange={(e) => updateOption(layout.id, opt.key, (e.target as HTMLSelectElement).value)}
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

		{#if data.isLoggedIn}
			<p class="layout-hint k-mono">
				— Auswahl wird lokal gespeichert. Mit Backend-Persistierung ab P8 wird die Auswahl als Org-Default übernommen und kann pro Match überschrieben werden.
			</p>
		{:else}
			<p class="layout-hint k-mono">
				— <a href="/signin?callbackUrl=%2Flibrary">Anmelden</a>, um Scoreboards als Org-Default zu speichern.
			</p>
		{/if}
	</section>

	<section class="overlays">
		<div class="section-head">
			<p class="kicker k-mono">— 02 / Community Overlays</p>
			<h2 class="sec-title">Custom-Overlays</h2>
			<p class="sec-sub">Community-erstellte Designs — installieren und anpassen.</p>
		</div>

		{#if data.overlays.length === 0}
			<div class="empty">
				<p class="empty-numeral k-mono">00</p>
				<p class="empty-title">Noch keine öffentlichen Overlays</p>
				<p class="empty-body">Erstelle ein Custom-Overlay und teile es mit der Community.</p>
			</div>
		{:else}
			<div class="overlay-grid">
				{#each data.overlays as overlay, i (overlay.id)}
					<article class="overlay-card" use:reveal={{ y: 24, delay: i * 0.05 }}>
						<div class="overlay-preview" style:background={bgStyle(overlay)}>
							<span class="overlay-sample" style:color={overlay.overlayText}>Aa 14 — 10 Aa</span>
						</div>
						<div class="overlay-body">
							<p class="overlay-name">{overlay.name}</p>
							<p class="overlay-by k-mono">— {overlay.clubName}</p>
							{#if overlay.description}
								<p class="overlay-desc">{overlay.description}</p>
							{/if}
							<div class="overlay-actions">
								<a
									class="overlay-btn ghost"
									href="/api/overlay-sandbox/{overlay.id}?preview=1"
									target="_blank"
									rel="noopener"
								>
									Vorschau →
								</a>
								<button class="overlay-btn primary" onclick={() => install(overlay.id)}>
									Installieren
								</button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}

	.hero {
		padding: 140px var(--grid-margin) 60px;
		border-bottom: 1px solid var(--k-line);
	}

	.hero-inner {
		max-width: var(--container-max);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.overline,
	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(48px, 9vw, 120px);
		line-height: 0.95;
		letter-spacing: -0.035em;
		margin: 0;
	}

	.subtitle {
		font-size: 16px;
		line-height: 1.55;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	.layouts,
	.overlays {
		max-width: var(--container-max);
		margin: 0 auto;
		padding: 80px var(--grid-margin);
	}

	.section-head {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 40px;
	}

	.sec-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-display);
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0;
	}

	.sec-sub {
		font-size: 14px;
		color: var(--k-text-mute);
		margin: 0;
	}

	.layout-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 32px;
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

	.card-head {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 16px;
		align-items: start;
		padding: 24px 28px;
		border-bottom: 1px solid var(--k-line);
	}

	.card-num {
		font-size: 12px;
		letter-spacing: 0.12em;
		color: var(--k-text-dim);
	}

	.card-titles {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.card-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
		letter-spacing: -0.02em;
		color: var(--k-text);
	}

	.card-desc {
		font-size: 14px;
		color: var(--k-text-mute);
		margin: 0;
	}

	.card-badge {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--paper);
		background: var(--pulse);
		padding: 4px 10px;
		align-self: flex-start;
	}

	.preview-frame {
		background: #0a0a0a;
		padding: 24px 16px;
		overflow-x: auto;
		display: flex;
		justify-content: center;
	}

	.preview-shrink {
		min-width: 720px;
		max-width: 980px;
		width: 100%;
	}

	.card-actions {
		display: flex;
		justify-content: flex-end;
		padding: 16px 28px;
		border-top: 1px solid var(--k-line);
	}

	.select-btn {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 600;
		padding: 10px 22px;
		border-radius: 999px;
		background: transparent;
		color: var(--k-text);
		border: 1px solid var(--k-line);
		cursor: pointer;
		transition:
			background var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap),
			color var(--dur-fast) var(--ease-snap);
	}
	.select-btn:hover {
		border-color: var(--k-text-mute);
	}
	.select-btn.active {
		background: var(--pulse);
		border-color: var(--pulse);
		color: var(--paper);
	}

	.custom-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px 28px 28px;
		border-top: 1px solid var(--k-line);
		background: var(--k-surface);
	}

	.custom-label {
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
		padding: 8px 0;
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

	.layout-hint {
		margin: 32px 0 0;
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim);
	}
	.layout-hint a {
		color: var(--pulse);
		text-decoration: none;
	}

	.overlay-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1px;
		background: var(--k-line);
		border: 1px solid var(--k-line);
	}

	.overlay-card {
		background: var(--k-surface);
		display: flex;
		flex-direction: column;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.overlay-card:hover {
		background: color-mix(in srgb, var(--k-text) 3%, var(--k-surface));
	}

	.overlay-preview {
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.overlay-sample {
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 600;
		opacity: 0.75;
		letter-spacing: 0.06em;
	}

	.overlay-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.overlay-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 16px;
		color: var(--k-text);
		margin: 0;
	}

	.overlay-by {
		font-size: 11px;
		color: var(--k-text-dim);
		margin: 0;
	}

	.overlay-desc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--k-text-mute);
		flex: 1;
		margin: 4px 0 0;
	}

	.overlay-actions {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}

	.overlay-btn {
		flex: 1;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		padding: 9px 12px;
		text-align: center;
		text-decoration: none;
		border: 1px solid var(--k-line);
		background: transparent;
		color: var(--k-text);
		cursor: pointer;
		transition: all var(--dur-fast) var(--ease-snap);
	}
	.overlay-btn.ghost:hover {
		border-color: var(--k-text-mute);
		background: color-mix(in srgb, var(--k-text) 4%, transparent);
	}
	.overlay-btn.primary {
		background: var(--pulse);
		color: var(--paper);
		border-color: var(--pulse);
	}
	.overlay-btn.primary:hover {
		background: var(--pulse-deep);
		border-color: var(--pulse-deep);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 80px 24px;
		border: 1px dashed var(--k-line);
		text-align: center;
	}

	.empty-numeral {
		font-size: clamp(72px, 12vw, 140px);
		font-weight: 600;
		line-height: 0.9;
		color: var(--k-line);
		margin: 0;
	}

	.empty-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
	}

	.empty-body {
		font-size: 14px;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 420px;
	}

	@media (min-width: 768px) {
		.overlay-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1024px) {
		.overlay-grid {
			grid-template-columns: 1fr 1fr 1fr;
		}
	}
</style>
