const BLOCK =
	'<path d="M72 10H176V37.95A39 39 0 1 0 176 100.05V142A48 48 0 0 1 128 190H24V162.05A39 39 0 1 0 24 99.95V58A48 48 0 0 1 72 10Z"/><circle cx="152" cy="69" r="24.6"/><circle cx="48" cy="131" r="24.6"/>';
const BLOCK_PATH =
	'<path d="M72 10H176V37.95A39 39 0 1 0 176 100.05V142A48 48 0 0 1 128 190H24V162.05A39 39 0 1 0 24 99.95V58A48 48 0 0 1 72 10Z"/>';

const TILE = 240;
const CELL = 96;
const CELL_SCALE = CELL / 200;
const CELL_OFFSETS = [12, 132];
const HERO_MARGIN = 72;

export interface TurnPatternColors {
	tone: string;
	heroBlock: string;
	heroBall: string;
}

export interface TurnPatternFade {
	/** Fully visible down to this y. */
	solidUntil: number;
	/** Fully gone from this y. */
	goneFrom: number;
}

/** The upright mark cell sits `HERO_MARGIN` px from the top and right edges; the pattern origin is shifted so that cell is on the grid. */
export function heroCell(width: number): { x: number; y: number; size: number } {
	return { x: width - HERO_MARGIN - CELL, y: HERO_MARGIN, size: CELL };
}

function patternOrigin(hero: { x: number; y: number }): { x: number; y: number } {
	const wrap = (value: number) => (((value - CELL_OFFSETS[0]) % TILE) + TILE) % TILE;
	return { x: wrap(hero.x), y: wrap(hero.y) };
}

/**
 * Brand pattern P1 Turn (tile 10d, d = 24 px), shifted so the mark cell lands on the grid, on a transparent ground in a tone, faded out from `fade.solidUntil` to `fade.goneFrom`
 * by a mask on the pattern itself. The top-right-most full upright cell is the real mark in its normal colours and is not faded.
 */
export function turnPatternSvg(width: number, height: number, colors: TurnPatternColors, fade: TurnPatternFade): string {
	const hero = heroCell(width);
	const origin = patternOrigin(hero);
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		`<defs><pattern id="turn" x="${origin.x}" y="${origin.y}" width="${TILE}" height="${TILE}" patternUnits="userSpaceOnUse" fill="${colors.tone}">` +
		`<g transform="translate(12 12) scale(${CELL_SCALE})">${BLOCK}</g>` +
		`<g transform="translate(12 132) scale(${CELL_SCALE}) rotate(90 100 100)">${BLOCK}</g>` +
		`<g transform="translate(132 12) scale(${CELL_SCALE}) rotate(90 100 100)">${BLOCK}</g>` +
		`<g transform="translate(132 132) scale(${CELL_SCALE})">${BLOCK}</g></pattern>` +
		`<linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${fade.solidUntil}" x2="0" y2="${fade.goneFrom}">` +
		`<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
		`<mask id="pattern-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">` +
		`<rect width="${width}" height="${height}" fill="url(#fade)"/></mask></defs>` +
		`<rect width="${width}" height="${height}" fill="url(#turn)" mask="url(#pattern-fade)"/>` +
		`<g transform="translate(${hero.x} ${hero.y}) scale(${CELL_SCALE})">` +
		`<g fill="${colors.heroBlock}">${BLOCK_PATH}</g>` +
		`<g fill="${colors.heroBall}"><circle cx="152" cy="69" r="24.6"/><circle cx="48" cy="131" r="24.6"/></g></g></svg>`
	);
}

/** Soft ink gradient from the top-left corner that keeps a club logo readable over pattern and photo. */
export function logoScrimSvg(width: number, height: number, ink: string, opacity: number): string {
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		`<defs><radialGradient id="scrim" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(${width} ${height})">` +
		`<stop offset="0" stop-color="${ink}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></radialGradient></defs>` +
		`<rect width="${width}" height="${height}" fill="url(#scrim)"/></svg>`
	);
}
