<script lang="ts">
	import { page } from '$app/state';
	import { getStoredTheme, setStoredTheme } from '$lib/theme.js';
	import type { ThemeMode } from '$lib/theme.js';

	let themeMode = $state<ThemeMode>('system');

	$effect(() => {
		themeMode = getStoredTheme();
	});
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold text-text-primary mb-6">Profil</h1>

	<div class="bg-bg-panel-alt rounded-xl p-6 space-y-4 mb-4">
		{#if page.data.session?.user?.name}
			<div>
				<p class="text-xs text-text-tertiary mb-1">Name</p>
				<p class="text-text-primary">{page.data.session.user.name}</p>
			</div>
		{/if}
		{#if page.data.session?.user?.email}
			<div>
				<p class="text-xs text-text-tertiary mb-1">E-Mail</p>
				<p class="text-text-primary">{page.data.session.user.email}</p>
			</div>
		{/if}
	</div>

	<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
		<p class="text-sm font-medium text-text-primary mb-3">Design</p>
		<div class="flex gap-1 bg-bg-base rounded-lg p-1">
			{#each [
				{ value: 'system', label: 'System' },
				{ value: 'light', label: 'Hell' },
				{ value: 'dark', label: 'Dunkel' }
			] as opt}
				<button
					type="button"
					onclick={() => { themeMode = opt.value as ThemeMode; setStoredTheme(opt.value as ThemeMode); }}
					class="flex-1 py-2 rounded-md text-sm font-medium transition-colors {themeMode === opt.value ? 'bg-accent-mid text-white' : 'text-text-secondary hover:text-text-primary'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	<form method="POST" action="/signout">
		<button type="submit" class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
			Abmelden
		</button>
	</form>
</div>
