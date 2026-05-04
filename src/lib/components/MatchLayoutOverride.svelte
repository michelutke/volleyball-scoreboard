<script lang="ts">
	import { untrack } from 'svelte';
	import { SCOREBOARD_LAYOUTS, type ScoreboardOptions } from './scoreboards/index.js';

	interface Props {
		matchId: number;
		current: string | null;
		currentOptions: ScoreboardOptions | null;
		orgDefault: string | null;
		onSaved?: (layout: string | null, options: ScoreboardOptions | null) => void;
	}

	let { matchId, current, currentOptions, orgDefault, onSaved }: Props = $props();

	let selected = $state<string | null>(untrack(() => current));
	let optionsByLayout = $state<Record<string, ScoreboardOptions>>({});
	let saving = $state(false);
	let dirty = $state(false);

	$effect(() => {
		const initial: Record<string, ScoreboardOptions> = {};
		for (const layout of SCOREBOARD_LAYOUTS) {
			const defaults: ScoreboardOptions = {};
			for (const opt of layout.customizableOptions) {
				defaults[opt.key] = opt.default as string | boolean;
			}
			initial[layout.id] = defaults;
		}
		if (current && currentOptions) {
			initial[current] = { ...initial[current], ...currentOptions };
		}
		optionsByLayout = initial;
	});

	const effectiveLayoutId = $derived(selected ?? orgDefault ?? 'classic');
	const activeLayout = $derived(
		SCOREBOARD_LAYOUTS.find((l) => l.id === effectiveLayoutId) ?? SCOREBOARD_LAYOUTS[0]
	);

	function pickLayout(id: string | null) {
		selected = id;
		dirty = true;
	}

	function updateOption(key: string, value: string | boolean) {
		const layoutId = effectiveLayoutId;
		optionsByLayout[layoutId] = { ...optionsByLayout[layoutId], [key]: value };
		dirty = true;
	}

	async function save() {
		saving = true;
		try {
			const body = {
				scoreboardLayout: selected,
				scoreboardOptions: selected ? optionsByLayout[selected] : null
			};
			const res = await fetch(`/api/matches/${matchId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				dirty = false;
				onSaved?.(selected, selected ? optionsByLayout[selected] : null);
			}
		} finally {
			saving = false;
		}
	}
</script>

<div class="layout-override">
	<header class="head">
		<p class="kicker k-mono">Scoreboard Layout</p>
		<h3 class="title k-display">Layout für dieses Match</h3>
		<p class="hint k-mono">
			{#if selected === null && orgDefault}
				Verwendet Org-Default → <strong>{orgDefault}</strong>
			{:else if selected === null}
				Verwendet Fallback → <strong>classic</strong>
			{:else}
				Override aktiv → <strong>{selected}</strong>
			{/if}
		</p>
	</header>

	<div class="picker">
		<button
			class="pick"
			class:active={selected === null}
			onclick={() => pickLayout(null)}
		>
			<span class="pick-num k-mono">--</span>
			<span class="pick-label">Org-Default</span>
		</button>
		{#each SCOREBOARD_LAYOUTS as layout, i}
			<button
				class="pick"
				class:active={selected === layout.id}
				onclick={() => pickLayout(layout.id)}
			>
				<span class="pick-num k-mono">0{i + 1}</span>
				<span class="pick-label">{layout.name}</span>
			</button>
		{/each}
	</div>

	{#if selected && activeLayout.customizableOptions.length > 0}
		<div class="opts">
			<p class="opts-label k-mono">Anpassen ({activeLayout.name})</p>
			{#each activeLayout.customizableOptions as opt}
				<div class="opt-row">
					<label class="opt-label k-mono" for="lov-{opt.key}">{opt.label}</label>
					{#if opt.type === 'color'}
						<input
							id="lov-{opt.key}"
							type="color"
							value={(optionsByLayout[activeLayout.id]?.[opt.key] as string) ?? opt.default}
							oninput={(e) => updateOption(opt.key, (e.target as HTMLInputElement).value)}
							class="opt-color"
						/>
					{:else if opt.type === 'boolean'}
						<input
							id="lov-{opt.key}"
							type="checkbox"
							checked={Boolean(optionsByLayout[activeLayout.id]?.[opt.key] ?? opt.default)}
							onchange={(e) => updateOption(opt.key, (e.target as HTMLInputElement).checked)}
						/>
					{:else if opt.type === 'select' && opt.options}
						<select
							id="lov-{opt.key}"
							value={(optionsByLayout[activeLayout.id]?.[opt.key] as string) ?? opt.default}
							onchange={(e) => updateOption(opt.key, (e.target as HTMLSelectElement).value)}
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

	<div class="actions">
		<button class="save-btn" disabled={!dirty || saving} onclick={save}>
			{saving ? '...' : 'Speichern'}
		</button>
		<a class="library-link k-mono" href="/library">→ Bibliothek</a>
	</div>
</div>

<style>
	.layout-override {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		color: var(--k-text);
		font-family: var(--font-sans);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 20px;
		letter-spacing: -0.01em;
		margin: 0;
	}

	.hint {
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim);
		margin: 0;
	}
	.hint strong {
		color: var(--pulse);
		font-weight: 600;
	}

	.picker {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.pick {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: transparent;
		border: 1px solid var(--k-line);
		color: var(--k-text-mute);
		cursor: pointer;
		transition:
			color var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap),
			background var(--dur-fast) var(--ease-snap);
	}
	.pick:hover {
		color: var(--k-text);
		border-color: var(--k-text-mute);
	}
	.pick.active {
		color: var(--paper);
		background: var(--pulse);
		border-color: var(--pulse);
	}

	.pick-num {
		font-size: 10px;
		letter-spacing: 0.12em;
	}

	.pick-label {
		font-size: 13px;
		font-weight: 500;
	}

	.opts {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		background: var(--k-surface);
		border: 1px solid var(--k-line);
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

	.actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}

	.save-btn {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 600;
		padding: 10px 22px;
		border-radius: 999px;
		background: var(--pulse);
		color: var(--paper);
		border: none;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.save-btn:hover:not(:disabled) {
		background: var(--pulse-deep);
	}
	.save-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.library-link {
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--k-text-dim);
		text-decoration: none;
	}
	.library-link:hover {
		color: var(--k-text);
	}
</style>
