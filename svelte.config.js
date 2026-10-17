import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ out: 'build' }),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'https://js.stripe.com'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
				'img-src': ['self', 'https:', 'data:', 'blob:'],
				'connect-src': ['self', 'https://api.stripe.com'],
				'frame-src': ['self', 'https://js.stripe.com'],
				'frame-ancestors': ['self'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
		}
	}
};

export default config;
