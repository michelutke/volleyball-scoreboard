/**
 * Word to logo reveal (brand README 9.3), ported from
 * docs/brand/source/r13-work/reveal/lib.py (hero_forward, split_state, letters_state).
 * All geometry is in lockup units: the horizontal lockup viewBox `24 10 762.39 240`.
 */

type Pt = readonly [number, number];
type Seg = readonly [Pt, Pt, Pt, Pt];
type EaseName = 'snap' | 'mass' | 'glide' | 'outSoft';

const EASE_PTS: Record<EaseName, readonly [number, number, number, number]> = {
	snap: [0.2, 0.9, 0.1, 1],
	mass: [0.6, 0.05, 0.1, 1],
	glide: [0.25, 1, 0.3, 1],
	outSoft: [0.16, 1, 0.3, 1]
};

export function ease(name: EaseName, t: number): number {
	const x = Math.min(1, Math.max(0, t));
	const [x1, y1, x2, y2] = EASE_PTS[name];
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		const bx = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3;
		if (bx < x) lo = m;
		else hi = m;
	}
	const m = (lo + hi) / 2;
	return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3;
}

/** Eased progress 0..1 of a segment starting at t0 lasting dur. */
export function seg(t: number, t0: number, dur: number, name: EaseName): number {
	if (t <= t0) return 0;
	if (t >= t0 + dur) return 1;
	return ease(name, (t - t0) / dur);
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Squash scale at time t for a contact at tc: 80 snap in, 160 glide out. */
export function squash(t: number, tc: number): [number, number] {
	if (t < tc || t > tc + 240) return [1, 1];
	const k = t < tc + 80 ? seg(t, tc, 80, 'snap') : 1 - seg(t, tc + 80, 160, 'glide');
	return [lerp(1, 0.88, k), lerp(1, 1.12, k)];
}

/** Cubic chain sampled by arc length, so `at(k)` moves at constant speed along the curve. */
class ArcPath {
	readonly pts: Pt[] = [];
	private readonly acc: number[] = [0];

	constructor(segs: readonly Seg[]) {
		for (const [p0, c1, c2, p1] of segs) {
			for (let i = 0; i < 400; i++) this.pts.push(cubic(p0, c1, c2, p1, i / 400));
		}
		this.pts.push(segs[segs.length - 1][3]);
		for (let i = 1; i < this.pts.length; i++) {
			const [ax, ay] = this.pts[i - 1];
			const [bx, by] = this.pts[i];
			this.acc.push(this.acc[i - 1] + Math.hypot(bx - ax, by - ay));
		}
	}

	get end(): Pt {
		return this.pts[this.pts.length - 1];
	}

	at(k: number): Pt {
		if (k <= 0) return this.pts[0];
		if (k >= 1) return this.end;
		const s = k * this.acc[this.acc.length - 1];
		let lo = 0;
		let hi = this.acc.length - 1;
		while (hi - lo > 1) {
			const m = (lo + hi) >> 1;
			if (this.acc[m] < s) lo = m;
			else hi = m;
		}
		const w = (s - this.acc[lo]) / Math.max(1e-9, this.acc[hi] - this.acc[lo]);
		return [lerp(this.pts[lo][0], this.pts[hi][0], w), lerp(this.pts[lo][1], this.pts[hi][1], w)];
	}
}

function cubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, u: number): Pt {
	const v = 1 - u;
	return [
		v ** 3 * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * p1[0],
		v ** 3 * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * p1[1]
	];
}

// ------------------------------------------------------------------ geometry
export const BALL_R = 24.6;
export const BALL_UP: Pt = [152, 69];
export const BALL_LO: Pt = [48, 131];
export const CONTACT_UP: Pt = [BALL_UP[0] + BALL_R, BALL_UP[1]];
export const CONTACT_LO: Pt = [BALL_LO[0] - BALL_R, BALL_LO[1]];

/** Letters group transform in the lockup: translate(196, 70) scale(1.2). */
export const WORD_X0 = 196;
export const WORD_XLINE = 70;
export const WORD_SCALE = 1.2;

export const O_CENTER: Pt = [340.20004, 130];
export const O_R = 61.8;
const SPLIT = 31;
const OVER = 6;
const U0: Pt = [O_CENTER[0], O_CENTER[1] - SPLIT];
const L0: Pt = [O_CENTER[0], O_CENTER[1] + SPLIT];
const U1: Pt = [BALL_UP[0] - OVER, BALL_UP[1]];
const L1: Pt = [BALL_LO[0] + OVER, BALL_LO[1]];
const J: Pt = [96, 232];

const PATH_UP = new ArcPath([[U0, [334, 18], [238, U1[1]], U1]]);
const PATH_LO = new ArcPath([
	[L0, [338, 236], [196, 236], J],
	[J, [-60, 228], [-100, L1[1]], L1]
]);

export type Letter = 'c' | 'r' | 'e' | 'l' | 'y';

/** Glyph outlines in word units (x-height 100), positioned as in "corely". */
export const LETTER_PATHS: Record<Letter, string> = {
	c: 'M0 26.67A26.67 26.67 0 0 1 26.67 0H63.67V29.07A25 25 0 1 0 63.67 70.93V73.33A26.67 26.67 0 0 1 37 100H0Z',
	r: 'M183.67 100V26.67A26.67 26.67 0 0 1 210.34 0H247.34V29.07A25 25 0 0 0 208.67 50V100Z',
	e: 'M254.33 26.67A26.67 26.67 0 0 1 281 0H347.66V63.67H281.95A21.67 21.67 0 0 0 300.99 75H347.61A26.67 26.67 0 0 1 320.99 100H254.33ZM279.32 46.67A21.67 21.67 0 0 1 322.67 46.67Z',
	l: 'M359.66 -37.5A12.5 12.5 0 0 1 372.16 -50H384.66V87.5A12.5 12.5 0 0 1 372.16 100H359.66Z',
	y: 'M398.66 12.5A12.5 12.5 0 0 1 411.16 0H423.66V53.34A21.66 21.66 0 0 0 466.99 53.34V0H491.99V123.33A26.67 26.67 0 0 1 465.32 150H423.66V125H466.99V100H398.66Z'
};

/** Letter centres in lockup units. */
const LETTER_CX: Record<Letter, number> = { c: 234.2, r: 454.6, e: 557.198, l: 642.596, y: 730.394 };
export const LETTERS: readonly Letter[] = ['c', 'r', 'e', 'l', 'y'];

// ------------------------------------------------------------------ timeline (ms)
const EXIT: Record<Letter, number> = { c: 0, r: 0, e: 40, l: 80, y: 120 };
const F_SPLIT = [180, 420] as const;
const F_LO = [600, 900] as const;
const F_UP = [900, 420] as const;
const SETTLE = 180;
export const CONTACT_LO_MS = F_LO[0] + F_LO[1] + SETTLE; // 1680
export const CONTACT_UP_MS = F_UP[0] + F_UP[1] + SETTLE; // 1500
/** Nav scroll scrubs 0 to this time; the squash after it is time based. */
export const NAV_END_MS = Math.max(CONTACT_LO_MS, CONTACT_UP_MS);

export interface Dot {
	x: number;
	y: number;
	r: number;
}

export interface RevealFrame {
	letters: Record<Letter, { dx: number; opacity: number }>;
	up: Dot;
	lo: Dot;
}

export function lettersState(t: number): RevealFrame['letters'] {
	const out = {} as RevealFrame['letters'];
	for (const ch of LETTERS) {
		const k = seg(t, EXIT[ch], 180, 'snap');
		out[ch] = { dx: 0.5 * (O_CENTER[0] - LETTER_CX[ch]) * k, opacity: 1 - k };
	}
	return out;
}

function dotState(t: number, start: Dot, path: ArcPath, [t0, dur]: readonly [number, number], home: Pt): Dot {
	if (t < t0) return start;
	if (t < t0 + dur) {
		const [x, y] = path.at(seg(t, t0, dur, 'mass'));
		return { x, y, r: BALL_R };
	}
	const k = seg(t, t0 + dur, SETTLE, 'snap');
	return { x: lerp(path.end[0], home[0], k), y: home[1], r: BALL_R };
}

/** Forward state at time t in ms (0 = lockup with the o, NAV_END_MS = the mark). No squash. */
export function heroForward(t: number): RevealFrame {
	const q = seg(t, F_SPLIT[0], F_SPLIT[1], 'glide');
	const r = lerp(O_R, BALL_R, q);
	const upStart = { x: O_CENTER[0], y: O_CENTER[1] - SPLIT * q, r };
	const loStart = { x: O_CENTER[0], y: O_CENTER[1] + SPLIT * q, r };
	return {
		letters: lettersState(t),
		up: dotState(t, upStart, PATH_UP, F_UP, BALL_UP),
		lo: dotState(t, loStart, PATH_LO, F_LO, BALL_LO)
	};
}
