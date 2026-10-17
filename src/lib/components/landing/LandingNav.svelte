<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { press } from '$lib/motion.js';
	import NavLogo from '$lib/components/brand/NavLogo.svelte';

	interface Props {
		lang: Lang;
		onLangToggle: () => void;
		basePath?: string;
	}

	let { lang, onLangToggle, basePath = '' }: Props = $props();

	let menuOpen = $state(false);
	let scrolled = $state(false);

	$effect(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 24;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function closeMenu() {
		menuOpen = false;
	}
</script>

<nav class="landing-nav" class:scrolled>
	<div class="inner">
		<a href="/" class="wordmark" aria-label="Scorely">
			<NavLogo />
		</a>

		<div class="links">
			<a href="{basePath}#features">{t[lang].nav.features}</a>
			<a href="{basePath}#pricing">{t[lang].nav.pricing}</a>
			<a href="/library">Bibliothek</a>
			<a href="/about">{t[lang].nav.about}</a>
		</div>

		<div class="actions">
			<button class="lang" onclick={onLangToggle} aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}>
					<span class:active={lang === 'de'}>DE</span> / <span class:active={lang === 'en'}>EN</span>
				</button>
			<a href="/signin" class="signin">{t[lang].nav.signin}</a>
			<a href="/signup" class="cta" use:press>
				<span>{t[lang].nav.cta}</span>
			</a>
			<button
				class="hamburger"
				onclick={() => (menuOpen = !menuOpen)}
				aria-label="Menu"
				aria-expanded={menuOpen}
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					{#if menuOpen}
						<path d="M6 18L18 6M6 6l12 12" stroke-linecap="butt" />
					{:else}
						<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="butt" />
					{/if}
				</svg>
			</button>
		</div>
	</div>

	{#if menuOpen}
		<div class="drawer">
			<a href="{basePath}#features" onclick={closeMenu}>{t[lang].nav.features}</a>
			<a href="{basePath}#pricing" onclick={closeMenu}>{t[lang].nav.pricing}</a>
			<a href="/library" onclick={closeMenu}>Bibliothek</a>
			<a href="/about" onclick={closeMenu}>{t[lang].nav.about}</a>
			<a href="/signin" onclick={closeMenu}>{t[lang].nav.signin}</a>
		</div>
	{/if}
</nav>

<style>
	.landing-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		background: color-mix(in srgb, var(--k-surface) 60%, transparent);
		backdrop-filter: blur(20px) saturate(140%);
		-webkit-backdrop-filter: blur(20px) saturate(140%);
		border-bottom: 1px solid transparent;
		transition: border-color var(--dur-mid) var(--ease-snap),
			background-color var(--dur-mid) var(--ease-snap);
	}
	.landing-nav.scrolled {
		background: color-mix(in srgb, var(--k-surface) 88%, transparent);
		border-bottom-color: var(--k-line);
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
		padding: 14px var(--grid-margin);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}

	.wordmark {
		display: inline-flex;
		align-items: center;
		text-decoration: none;
		color: var(--k-text);
	}

	.links {
		display: none;
		gap: 28px;
		flex: 1;
		justify-content: center;
	}
	.links a {
		font-size: 14px;
		font-weight: 500;
		color: var(--k-text-mute);
		text-decoration: none;
		position: relative;
		padding: 4px 0;
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.links a::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -2px;
		width: 0;
		height: 1px;
		background: var(--pulse);
		transition: width var(--dur-mid) var(--ease-snap);
	}
	.links a:hover {
		color: var(--k-text);
	}
	.links a:hover::after {
		width: 100%;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lang {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--k-text-dim);
		background: transparent;
		border: 1px solid var(--k-line);
		border-radius: 0;
		padding: 5px 8px;
		cursor: pointer;
		transition: color var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap);
	}
	.lang:hover {
		border-color: var(--k-text-mute);
	}
	.lang .active {
		color: var(--k-text);
		font-weight: 700;
	}

	.signin {
		display: none;
		font-size: 14px;
		color: var(--k-text-mute);
		text-decoration: none;
		padding: 6px 10px;
	}
	.signin:hover {
		color: var(--k-text);
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--pulse);
		color: var(--paper);
		text-decoration: none;
		font-weight: 600;
		font-size: 13px;
		padding: 9px 16px;
		border-radius: 999px;
		will-change: transform;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.cta:hover {
		background: var(--pulse-soft);
	}

	.hamburger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--k-text);
		cursor: pointer;
		padding: 6px;
	}

	.drawer {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px var(--grid-margin) 20px;
		border-top: 1px solid var(--k-line);
		background: var(--k-surface);
	}
	.drawer a {
		padding: 12px 0;
		color: var(--k-text-mute);
		text-decoration: none;
		font-size: 15px;
		border-bottom: 1px solid color-mix(in srgb, var(--k-line) 50%, transparent);
	}
	.drawer a:last-child {
		border-bottom: none;
	}

	@media (min-width: 768px) {
		.links {
			display: flex;
		}
		.signin {
			display: inline-block;
		}
		.hamburger {
			display: none;
		}
		.drawer {
			display: none;
		}
	}
</style>
