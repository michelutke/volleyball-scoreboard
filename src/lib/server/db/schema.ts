import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const matches = pgTable('matches', {
	id: serial('id').primaryKey(),
	homeTeamName: text('home_team_name').notNull().default('Heim'),
	guestTeamName: text('guest_team_name').notNull().default('Gast'),
	homeJerseyColor: text('home_jersey_color').notNull().default('#1e40af'),
	guestJerseyColor: text('guest_jersey_color').notNull().default('#dc2626'),
	showJerseyColors: boolean('show_jersey_colors').notNull().default(true),
	showSetScores: boolean('show_set_scores').notNull().default(false),
	status: text('status', { enum: ['upcoming', 'live', 'finished'] }).notNull().default('upcoming'),
	swissVolleyMatchId: text('swiss_volley_match_id'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const scores = pgTable('scores', {
	id: serial('id').primaryKey(),
	matchId: integer('match_id')
		.notNull()
		.references(() => matches.id, { onDelete: 'cascade' }),
	homePoints: integer('home_points').notNull().default(0),
	guestPoints: integer('guest_points').notNull().default(0),
	homeSets: integer('home_sets').notNull().default(0),
	guestSets: integer('guest_sets').notNull().default(0),
	currentSet: integer('current_set').notNull().default(1),
	setScores: jsonb('set_scores').notNull().default('[]'),
	serviceTeam: text('service_team', { enum: ['home', 'guest'] }).notNull().default('home'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const timeouts = pgTable('timeouts', {
	id: serial('id').primaryKey(),
	matchId: integer('match_id')
		.notNull()
		.references(() => matches.id, { onDelete: 'cascade' }),
	team: text('team', { enum: ['home', 'guest'] }).notNull(),
	set: integer('set').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
