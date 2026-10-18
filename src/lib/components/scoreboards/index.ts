import type { Component } from 'svelte';
import type { MatchState, Team } from '$lib/types.js';
import Classic from './Classic.svelte';
import Kinetic from './Kinetic.svelte';
import Drawer from './Drawer.svelte';
import Colon from './Colon.svelte';

export interface ScoreboardProps {
	match: MatchState;
	homeTimeoutsUsed: number;
	guestTimeoutsUsed: number;
	timeoutTeam: Team | null;
	options?: ScoreboardOptions;
}

export type ScoreboardOptions = Record<string, string | number | boolean>;

export interface ScoreboardLayout {
	id: string;
	name: string;
	description: string;
	component: Component<ScoreboardProps>;
	supportsThemes: ('light' | 'dark')[];
	customizableOptions: ScoreboardOptionDef[];
}

export interface ScoreboardOptionDef {
	key: string;
	label: string;
	type: 'color' | 'boolean' | 'select';
	default: string | boolean;
	options?: { value: string; label: string }[];
}

export const SCOREBOARD_LAYOUTS: ScoreboardLayout[] = [
	{
		id: 'classic',
		name: 'Classic',
		description: 'Traditional broadcast scoreboard · bold, high-contrast, jersey colors.',
		component: Classic as unknown as Component<ScoreboardProps>,
		supportsThemes: ['dark'],
		customizableOptions: []
	},
	{
		id: 'kinetic',
		name: 'Kinetic',
		description: 'Scorely score bug · mark cell, mono numerals, set point and timeout banners.',
		component: Kinetic as unknown as Component<ScoreboardProps>,
		supportsThemes: ['light', 'dark'],
		customizableOptions: [
			{ key: 'theme', label: 'Theme', type: 'select', default: 'dark', options: [
				{ value: 'dark', label: 'Dark' },
				{ value: 'light', label: 'Light' }
			]},
			{ key: 'accentWarm', label: 'Warm accent', type: 'color', default: '#ff3d2e' },
			{ key: 'accentCool', label: 'Cool accent', type: 'color', default: '#1d4ed8' },
			{ key: 'showLogos', label: 'Team-Logos', type: 'boolean', default: false }
		]
	},
	{
		id: 'drawer',
		name: 'Drawer',
		description: 'Set point and timeout inline with the team · Scorely drawer slides out below only when the game pauses.',
		component: Drawer as unknown as Component<ScoreboardProps>,
		supportsThemes: ['dark'],
		customizableOptions: []
	},
	{
		id: 'colon',
		name: 'Colon',
		description: 'Mirrored strip around the score colon · in a pause the colon turns into the Scorely mark.',
		component: Colon as unknown as Component<ScoreboardProps>,
		supportsThemes: ['dark'],
		customizableOptions: []
	}
];

export const DEFAULT_LAYOUT_ID = 'kinetic';

export function getLayout(id: string | null | undefined): ScoreboardLayout {
	return (
		SCOREBOARD_LAYOUTS.find((l) => l.id === id) ??
		SCOREBOARD_LAYOUTS.find((l) => l.id === DEFAULT_LAYOUT_ID) ??
		SCOREBOARD_LAYOUTS[0]
	);
}

export { Classic, Kinetic, Drawer, Colon };
