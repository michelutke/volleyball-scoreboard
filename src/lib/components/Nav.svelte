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
</nav>

<style>
	nav {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--color-border-subtle);
		background: var(--color-bg-base);
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
	}

	.links a:hover {
		outline: 1px solid var(--color-text-primary);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
	}

	.links a.active {
		outline: 2px solid var(--color-accent);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
	}
</style>
