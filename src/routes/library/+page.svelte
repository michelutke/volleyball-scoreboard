<script lang="ts">
	import type { PageData } from './$types.js';
	import type { LibraryOverlay } from '$lib/types.js';

	let { data }: { data: PageData } = $props();

	function bgStyle(o: LibraryOverlay): string {
		return o.overlayBgGradient
			? `linear-gradient(to right, ${o.overlayBg}, ${o.overlayBg2})`
			: o.overlayBg;
	}

	async function install(id: number) {
		if (!data.isLoggedIn) {
			window.location.href = `/signin?callbackUrl=${encodeURIComponent('/library')}`;
			return;
		}
		const res = await fetch(`/api/library/install/${id}`, { method: 'POST' });
		if (res.status === 401) {
			window.location.href = `/signin?callbackUrl=${encodeURIComponent('/library')}`;
			return;
		}
		if (res.ok) {
			window.location.href = '/admin/designs';
		} else {
			const err = await res.json().catch(() => ({}));
			alert(err.error ?? 'Fehler beim Installieren');
		}
	}
</script>

<svelte:head>
	<title>Overlay-Bibliothek</title>
</svelte:head>

<div class="min-h-screen bg-[#0a0a0a] text-white">
	<div class="max-w-5xl mx-auto px-4 py-12">
		<div class="mb-10">
			<h1 class="text-3xl font-bold mb-2">Overlay-Bibliothek</h1>
			<p class="text-gray-400">Community-erstellte Scoreboards — installieren und anpassen.</p>
		</div>

		{#if data.overlays.length === 0}
			<div class="text-center py-24 text-gray-500">
				<p class="text-lg">Noch keine öffentlichen Overlays vorhanden.</p>
				<p class="text-sm mt-2">Erstelle ein Custom-Overlay und teile es mit der Community!</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.overlays as overlay (overlay.id)}
					<div class="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col">
						<div
							class="h-16 w-full"
							style:background={bgStyle(overlay)}
						>
							<div class="h-full flex items-center justify-center">
								<span class="text-sm font-bold opacity-60" style:color={overlay.overlayText}>Aa 14 — 10 Aa</span>
							</div>
						</div>
						<div class="p-4 flex flex-col gap-2 flex-1">
							<div>
								<p class="font-semibold text-white">{overlay.name}</p>
								<p class="text-xs text-gray-400">von {overlay.clubName}</p>
							</div>
							{#if overlay.description}
								<p class="text-sm text-gray-300 flex-1">{overlay.description}</p>
							{/if}
							<div class="flex gap-2 mt-2">
								<a
									href="/api/overlay-sandbox/{overlay.id}?preview=1"
									target="_blank"
									rel="noopener"
									class="flex-1 text-center text-sm border border-white/20 hover:border-white/40 rounded-lg py-1.5 transition-colors"
								>
									Vorschau
								</a>
								<button
									onclick={() => install(overlay.id)}
									class="flex-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg py-1.5 transition-colors font-medium"
								>
									Installieren
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
