import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => new Response('ok', { status: 200 });
