<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
		onLangToggle: () => void;
		basePath?: string;
	}

	let { lang, onLangToggle, basePath = '' }: Props = $props();

	let menuOpen = $state(false);

	function closeMenu() {
		menuOpen = false;
	}
</script>

<nav class="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
		<!-- Logo -->
		<a href="/" class="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
			Scorely
		</a>

		<!-- Desktop right actions -->
		<div class="hidden items-center gap-6 md:flex">
			<a
				href="{basePath}#features"
				class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
			>
				{t[lang].nav.features}
			</a>
			<a
				href="{basePath}#pricing"
				class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
			>
				{t[lang].nav.pricing}
			</a>
			<a
				href="/library"
				class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
			>
				Bibliothek
			</a>
			<a
				href="/about"
				class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
			>
				{t[lang].nav.about}
			</a>
			<a
				href="/signin"
				class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
			>
				{t[lang].nav.signin}
			</a>
			<button
				onclick={onLangToggle}
				class="rounded px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]"
			>
				{lang.toUpperCase()}
			</button>
		</div>

		<!-- Mobile: lang toggle + hamburger -->
		<div class="flex items-center gap-2 md:hidden">
			<button
				onclick={onLangToggle}
				class="rounded px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
			>
				{lang.toUpperCase()}
			</button>
			<button
				onclick={() => (menuOpen = !menuOpen)}
				class="rounded p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				aria-label="Menu"
			>
				{#if menuOpen}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if menuOpen}
		<div class="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 pb-4 pt-3 md:hidden">
			<div class="flex flex-col gap-3">
				<a
					href="{basePath}#features"
					onclick={closeMenu}
					class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				>
					{t[lang].nav.features}
				</a>
				<a
					href="{basePath}#pricing"
					onclick={closeMenu}
					class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				>
					{t[lang].nav.pricing}
				</a>
				<a
					href="/library"
					onclick={closeMenu}
					class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				>
					Bibliothek
				</a>
				<a
					href="/about"
					onclick={closeMenu}
					class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				>
					{t[lang].nav.about}
				</a>
				<hr class="border-[var(--color-border-subtle)]" />
				<a
					href="/signin"
					onclick={closeMenu}
					class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				>
					{t[lang].nav.signin}
				</a>
			</div>
		</div>
	{/if}
</nav>
