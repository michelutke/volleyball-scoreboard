const BLOCK =
	'<path d="M72 10H176V37.95A39 39 0 1 0 176 100.05V142A48 48 0 0 1 128 190H24V162.05A39 39 0 1 0 24 99.95V58A48 48 0 0 1 72 10Z"/><circle cx="152" cy="69" r="24.6"/><circle cx="48" cy="131" r="24.6"/>';

/** Brand pattern P1 Turn (tile 10d, d = 24 px) in tone on tone, faded out towards the bottom left and the bottom edge so type never sits on it. */
export function turnPatternSvg(width: number, height: number, tone: string, ground: string): string {
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		`<defs><pattern id="turn" x="0" y="0" width="240" height="240" patternUnits="userSpaceOnUse" fill="${tone}">` +
		`<g transform="translate(12 12) scale(0.48)">${BLOCK}</g>` +
		`<g transform="translate(12 132) scale(0.48) rotate(90 100 100)">${BLOCK}</g>` +
		`<g transform="translate(132 12) scale(0.48) rotate(90 100 100)">${BLOCK}</g>` +
		`<g transform="translate(132 132) scale(0.48)">${BLOCK}</g></pattern>` +
		`<linearGradient id="diagonal" gradientUnits="userSpaceOnUse" x1="${width}" y1="0" x2="0" y2="${height}">` +
		`<stop offset="0.2" stop-color="${ground}" stop-opacity="0"/><stop offset="0.55" stop-color="${ground}" stop-opacity="1"/></linearGradient>` +
		`<linearGradient id="vertical" gradientUnits="userSpaceOnUse" x1="0" y1="${height * 0.42}" x2="0" y2="${height * 0.67}">` +
		`<stop offset="0" stop-color="${ground}" stop-opacity="0"/><stop offset="1" stop-color="${ground}" stop-opacity="1"/></linearGradient></defs>` +
		`<rect width="${width}" height="${height}" fill="${ground}"/>` +
		`<rect width="${width}" height="${height}" fill="url(#turn)"/>` +
		`<rect width="${width}" height="${height}" fill="url(#diagonal)"/>` +
		`<rect width="${width}" height="${height}" fill="url(#vertical)"/></svg>`
	);
}
