import type { TransitionConfig } from 'svelte/transition';
import { ease } from '$lib/brand/reveal.js';

function motionScale(): number {
	const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
	return Number.isFinite(n) ? n : 1;
}

interface SlideParams {
	duration: number;
	delay?: number;
	/** 'x' slides out from behind the element on the left, 'y' from behind the element above. */
	axis: 'x' | 'y';
}

/** Slide out from behind a neighbour by the element's own size; the static end state is untransformed. */
export function slideOut(_node: Element, { duration, delay = 0, axis }: SlideParams): TransitionConfig {
	const scale = motionScale();
	return {
		duration: duration * scale,
		delay: delay * scale,
		easing: (t) => ease('snap', t),
		css: (t) => `transform: translate${axis.toUpperCase()}(${(t - 1) * 100}%)`
	};
}
