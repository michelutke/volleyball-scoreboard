<script lang="ts">
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import KThemeToggle from './k/KThemeToggle.svelte';
	import KMotionToggle from './k/KMotionToggle.svelte';

	let { clubName, isAdmin }: { clubName: string; isAdmin: boolean } = $props();

	type NavLink = { href: string; label: string; adminOnly?: boolean };

	const links: NavLink[] = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/teams', label: 'Teams' },
		{ href: '/admin/users', label: 'Nutzer', adminOnly: true },
		{ href: '/admin/designs', label: 'Designs', adminOnly: true },
		{ href: '/settings', label: 'Einstellungen' }
	];

	let menuOpen = $state(false);
	let linksWrap = $state<HTMLDivElement | null>(null);
	let indicatorStyle = $state('opacity:0');

	function isActive(href: string): boolean {
		if (href === '/dashboard') return page.url.pathname === '/dashboard';
		return page.url.pathname.startsWith(href);
	}

	const visibleLinks = $derived(links.filter((l) => !l.adminOnly || isAdmin));
	const activeHref = $derived(visibleLinks.find((l) => isActive(l.href))?.href ?? null);

	async function positionIndicator() {
		if (!linksWrap) return;
		await tick();
		const active = linksWrap.querySelector<HTMLAnchorElement>('a.active');
		if (!active) {
			indicatorStyle = 'opacity:0';
			return;
		}
		const wrapRect = linksWrap.getBoundingClientRect();
		const r = active.getBoundingClientRect();
		const left = r.left - wrapRect.left;
		const width = r.width;
		indicatorStyle = `transform:translateX(${left}px);width:${width}px;opacity:1`;
	}

	$effect(() => {
		// rerun on route change
		void activeHref;
		positionIndicator();
	});

	onMount(() => {
		positionIndicator();
		const onResize = () => positionIndicator();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	function closeAll() {
		menuOpen = false;
	}
</script>

<nav class="app-nav">
	<a href="/dashboard" class="brand">
		<span class="word">Scorely</span>
		<span class="dot" aria-hidden="true"></span>
		{#if clubName}
			<span class="club k-mono">/ {clubName}</span>
		{/if}
	</a>

	<div class="links" bind:this={linksWrap}>
		<span class="indicator" style={indicatorStyle} aria-hidden="true"></span>
		{#each visibleLinks as link}
			<a href={link.href} class:active={isActive(link.href)}>{link.label}</a>
		{/each}
	</div>

	<div class="actions">
		<a href="/profile" class="user-trigger" aria-label="Profil" title="Profil">
			<span class="avatar">
				<span class="avatar-glyph k-mono">{(clubName?.[0] ?? 'S').toUpperCase()}</span>
			</span>
		</a>

		<button class="burger" onclick={() => (menuOpen = !menuOpen)} aria-label="Menü" aria-expanded={menuOpen}>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				{#if menuOpen}
					<path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" />
				{:else}
					<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
				{/if}
			</svg>
		</button>
	</div>

	{#if menuOpen}
		<div class="drawer">
			{#each visibleLinks as link}
				<a href={link.href} class:active={isActive(link.href)} onclick={closeAll}>{link.label}</a>
			{/each}
			<a href="/profile" class:active={isActive('/profile')} onclick={closeAll}>Profil</a>
			<div class="drawer-divider"></div>
			<div class="drawer-section">
				<p class="menu-label k-mono">Theme</p>
				<KThemeToggle />
			</div>
			<div class="drawer-section">
				<p class="menu-label k-mono">Motion</p>
				<KMotionToggle />
			</div>
			<form method="POST" action="/signout" class="signout-form">
				<button type="submit" class="menu-link signout">Abmelden</button>
			</form>
		</div>
	{/if}
</nav>

<style>
	.app-nav {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 14px var(--grid-margin);
		background: var(--k-surface);
		border-bottom: 1px solid var(--k-line);
	}

	.brand {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		text-decoration: none;
		color: var(--k-text);
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 17px;
		letter-spacing: -0.02em;
	}
	.brand .dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--pulse);
		display: inline-block;
		align-self: center;
	}
	.brand .club {
		font-size: 11px;
		color: var(--k-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 400;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.links {
		display: none;
		position: relative;
		gap: 4px;
		flex: 1;
		justify-content: center;
	}

	.links a {
		position: relative;
		font-size: 14px;
		font-weight: 500;
		color: var(--k-text-mute);
		text-decoration: none;
		padding: 8px 14px;
		transition: color var(--dur-fast) var(--ease-snap);
		z-index: 1;
	}
	.links a:hover {
		color: var(--k-text);
	}
	.links a.active {
		color: var(--k-text);
	}

	.indicator {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 2px;
		background: var(--pulse);
		transition:
			transform var(--dur-mid) var(--ease-snap),
			width var(--dur-mid) var(--ease-snap),
			opacity var(--dur-fast) var(--ease-snap);
		pointer-events: none;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.user-trigger {
		display: none;
		background: transparent;
		border: 1px solid var(--k-line);
		padding: 4px;
		cursor: pointer;
		text-decoration: none;
		transition: border-color var(--dur-fast) var(--ease-snap);
	}
	.user-trigger:hover {
		border-color: var(--k-text-mute);
	}
	.user-trigger:hover .avatar {
		transform: rotate(3deg);
	}

	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: var(--k-surface-alt);
		color: var(--k-text);
		transition: transform var(--dur-mid) var(--ease-mass);
	}
	.avatar-glyph {
		font-size: 12px;
		font-weight: 600;
	}

	.burger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--k-line);
		color: var(--k-text);
		padding: 6px;
		cursor: pointer;
	}

	.menu-label {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.menu-link {
		display: block;
		padding: 8px 4px;
		text-decoration: none;
		background: transparent;
		border: none;
		font: inherit;
		font-size: 14px;
		color: var(--k-text-mute);
		cursor: pointer;
		text-align: left;
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.menu-link:hover {
		color: var(--k-text);
	}

	.signout {
		color: var(--color-error);
	}
	.signout:hover {
		color: var(--color-error-light);
	}

	.signout-form {
		margin: 0;
	}

	.drawer {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		padding: 16px var(--grid-margin) 24px;
		background: var(--k-surface);
		border-bottom: 1px solid var(--k-line);
		gap: 4px;
		box-shadow: 0 12px 32px color-mix(in srgb, var(--ink) 22%, transparent);
		z-index: 30;
	}
	.drawer a {
		padding: 14px 0;
		text-decoration: none;
		color: var(--k-text-mute);
		font-size: 16px;
		font-weight: 500;
		border-bottom: 1px solid color-mix(in srgb, var(--k-line) 50%, transparent);
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.drawer a.active {
		color: var(--pulse);
	}
	.drawer a:hover {
		color: var(--k-text);
	}

	.drawer-divider {
		height: 1px;
		background: var(--k-line);
		margin: 12px 0;
	}

	.drawer-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px 0;
	}

	@media (min-width: 768px) {
		.links { display: flex; }
		.user-trigger { display: inline-flex; }
		.burger { display: none; }
		.drawer { display: none; }
	}
</style>
