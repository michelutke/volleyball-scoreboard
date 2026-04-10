import { z } from 'zod';

const teamEnum = z.enum(['home', 'guest']);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);

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
	designTemplateId: z.number().int().nullish()
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
