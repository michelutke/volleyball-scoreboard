<script lang="ts">
	import { page } from '$app/state';

	let { clubName, isAdmin }: { clubName: string; isAdmin: boolean } = $props();

	type NavLink = { href: string; label: string; adminOnly?: boolean };

	const links: NavLink[] = [
		{ href: '/teams', label: 'Teams' },
		{ href: '/admin/users', label: 'Nutzerverwaltung', adminOnly: true },
		{ href: '/settings', label: 'Einstellungen' },
		{ href: '/profile', label: 'Profil' }
	];

	let menuOpen = $state(false);
	function closeMenu() { menuOpen = false; }

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav>
	<a href="/" class="club-name">{clubName}</a>
	<div class="links">
		{#each links as link}
			{#if !link.adminOnly || isAdmin}
				<a href={link.href} class:active={isActive(link.href)}>{link.label}</a>
			{/if}
		{/each}
	</div>
	<button class="burger" onclick={() => menuOpen = !menuOpen} aria-label="Menü">
		{menuOpen ? '✕' : '☰'}
	</button>
</nav>
{#if menuOpen}
	<div class="mobile-menu">
		{#each links as link}
			{#if !link.adminOnly || isAdmin}
				<a href={link.href} class:active={isActive(link.href)} onclick={closeMenu}>{link.label}</a>
			{/if}
		{/each}
	</div>
{/if}

<style>
	nav {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--color-border-subtle);
		background: var(--color-bg-base);
		position: relative;
	}

	.club-name {
		color: var(--color-text-primary);
		text-decoration: none;
		font-weight: 700;
	}

	.links {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.links a {
		color: var(--color-text-primary);
		text-decoration: underline;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		outline: 2px solid transparent;
	}

	.links a:hover {
		outline-color: var(--color-text-primary);
		text-decoration: none;
	}

	.links a.active {
		outline-color: var(--color-accent);
		text-decoration: none;
	}

	.burger {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-primary);
		font-size: 1.5rem;
		padding: 0.25rem;
		line-height: 1;
	}

	.mobile-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--color-bg-base);
		border-bottom: 1px solid var(--color-border-subtle);
		display: flex;
		flex-direction: column;
		padding: 0.5rem 1.5rem 1rem;
		gap: 0.25rem;
		z-index: 50;
	}

	.mobile-menu a {
		color: var(--color-text-primary);
		text-decoration: none;
		padding: 0.75rem 0.5rem;
		border-bottom: 1px solid var(--color-border-subtle);
		font-weight: 500;
	}

	.mobile-menu a.active {
		color: var(--color-accent);
	}

	@media (max-width: 640px) {
		.links { display: none; }
		.burger { display: block; }
	}
</style>
