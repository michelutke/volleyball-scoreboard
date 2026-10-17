import {
	buildSandboxHtml,
	sandboxResponse,
	MAX_CUSTOM_CODE_BYTES,
	OVERLAY_COLOR_KEYS,
	type OverlayColors
} from '$lib/server/overlay-sandbox.js';
import type { RequestHandler } from './$types.js';

/**
 * Live preview for the custom overlay editor. The editor posts the unsaved code into a named
 * iframe. A srcdoc iframe cannot be used: it inherits the app page's CSP, which blocks the
 * overlay's inline scripts. This response carries its own sandboxed CSP instead.
 */
export const POST: RequestHandler = async ({ request }) => {
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return new Response('Bad request', { status: 400 });
	}
	const code = form.get('code');
	if (typeof code !== 'string') return new Response('Bad request', { status: 400 });
	if (new TextEncoder().encode(code).byteLength > MAX_CUSTOM_CODE_BYTES) {
		return new Response('Payload too large', { status: 413 });
	}

	const colors: OverlayColors = {};
	for (const key of OVERLAY_COLOR_KEYS) {
		const value = form.get(key);
		if (typeof value === 'string') colors[key] = value;
	}

	return sandboxResponse(buildSandboxHtml(code, colors, true));
};
