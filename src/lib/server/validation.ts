import { z } from 'zod';
import { SCOREBOARD_LAYOUTS } from '$lib/components/scoreboards/index.js';

const teamEnum = z.enum(['home', 'guest']);
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;
const hexColor = z.string().regex(HEX_COLOR_PATTERN);

const COLOR_OPTION_KEYS = new Set(
	SCOREBOARD_LAYOUTS.flatMap((layout) =>
		layout.customizableOptions.filter((option) => option.type === 'color').map((option) => option.key)
	)
);

export const scoreboardOptionsSchema = z
	.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
	.superRefine((options, ctx) => {
		for (const key of COLOR_OPTION_KEYS) {
			const value = options[key];
			if (value !== undefined && !(typeof value === 'string' && HEX_COLOR_PATTERN.test(value))) {
				ctx.addIssue({ code: 'custom', path: [key], message: 'Invalid colour' });
			}
		}
	});

export const matchCreateSchema = z.object({
	homeTeamName: z.string().max(100).optional(),
	guestTeamName: z.string().max(100).optional(),
	homeJerseyColor: hexColor.optional(),
	guestJerseyColor: hexColor.optional(),
	showJerseyColors: z.boolean().optional(),
	teamId: z.number().int().optional()
});

export const matchActionSchema = z.object({
	matchId: z.number().int(),
	action: z.enum(['addPoint', 'removePoint', 'reset', 'switchService', 'addSet', 'removeSet', 'undo']),
	team: teamEnum.optional()
});

export const matchSettingsSchema = z.object({
	matchId: z.number().int(),
	homeTeamName: z.string().max(100).optional(),
	guestTeamName: z.string().max(100).optional(),
	homeJerseyColor: hexColor.optional(),
	guestJerseyColor: hexColor.optional(),
	showJerseyColors: z.boolean().optional(),
	showSetScores: z.boolean().optional(),
	homeTeamLogo: z.string().url().nullish(),
	guestTeamLogo: z.string().url().nullish(),
	designTemplateId: z.number().int().nullish()
});

export const timeoutSchema = z.object({
	matchId: z.number().int(),
	team: teamEnum
});

export const controlActionSchema = z.object({
	action: z.enum(['addPoint', 'removePoint', 'reset', 'switchService', 'addSet', 'removeSet', 'undo']),
	team: teamEnum.optional()
});

export const controlTimeoutSchema = z.object({
	team: teamEnum
});

export const matchIdActionSchema = z.object({
	action: z.enum(['addPoint', 'removePoint', 'reset', 'switchService', 'addSet', 'removeSet', 'undo', 'generateControlToken']),
	team: teamEnum.optional()
});

export const matchIdSettingsSchema = z.object({
	homeTeamName: z.string().max(100).optional(),
	guestTeamName: z.string().max(100).optional(),
	homeJerseyColor: hexColor.optional(),
	guestJerseyColor: hexColor.optional(),
	showJerseyColors: z.boolean().optional(),
	showSetScores: z.boolean().optional(),
	homeTeamLogo: z.string().url().nullish(),
	guestTeamLogo: z.string().url().nullish(),
	designTemplateId: z.number().int().nullish(),
	scoreboardLayout: z.string().min(1).max(64).nullish(),
	scoreboardOptions: scoreboardOptionsSchema.nullish()
});

export const teamCreateSchema = z.object({
	name: z.string().min(1).max(100),
	swissVolleyTeamId: z.string().max(50).nullish()
});

export const designTemplateCreateSchema = z.object({
	name: z.string().min(1).max(100),
	isDefault: z.boolean().optional(),
	overlayBg: hexColor.optional(),
	overlayBg2: hexColor.optional(),
	overlayBgGradient: z.boolean().optional(),
	overlayText: hexColor.optional(),
	overlayRounded: z.boolean().optional(),
	overlayDivider: hexColor.optional(),
	overlaySatsBg: hexColor.optional(),
	overlaySetScoreBg: hexColor.optional(),
	scoreColor: hexColor.optional(),
	scoreColor2: hexColor.optional(),
	scoreColorGradient: z.boolean().optional(),
	customCode: z.string().max(50000).nullish(),
	isPublic: z.boolean().optional(),
	description: z.string().max(500).nullish()
});

export const userInviteSchema = z.object({
	email: z.string().email().max(255)
});

export const userPatchSchema = z.object({
	isAdmin: z.boolean()
});
