import { describe, it, expect } from 'vitest';
import { matchIdSettingsSchema, scoreboardOptionsSchema } from './validation';

describe('scoreboardOptionsSchema', () => {
	it('accepts valid hex colours and other option types', () => {
		const result = scoreboardOptionsSchema.safeParse({
			theme: 'dark',
			showLogos: true,
			accentWarm: '#ff3d2e',
			accentCool: '#1d4ed8'
		});
		expect(result.success).toBe(true);
	});

	it('rejects style injection in colour options', () => {
		expect(scoreboardOptionsSchema.safeParse({ accentWarm: 'red; background:url(//evil)' }).success).toBe(false);
		expect(scoreboardOptionsSchema.safeParse({ accentCool: 'url(x)' }).success).toBe(false);
	});

	it('rejects non-string colour values', () => {
		expect(scoreboardOptionsSchema.safeParse({ accentWarm: 5 }).success).toBe(false);
		expect(scoreboardOptionsSchema.safeParse({ accentWarm: true }).success).toBe(false);
	});

	it('is applied to match settings', () => {
		expect(matchIdSettingsSchema.safeParse({ scoreboardOptions: { accentWarm: 'javascript:1' } }).success).toBe(false);
		expect(matchIdSettingsSchema.safeParse({ scoreboardOptions: { accentWarm: '#abc' } }).success).toBe(true);
		expect(matchIdSettingsSchema.safeParse({ scoreboardOptions: null }).success).toBe(true);
	});
});
