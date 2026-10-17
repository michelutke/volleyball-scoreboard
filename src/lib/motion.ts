import { animate, inView, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';

export const ease = {
	snap: [0.2, 0.9, 0.1, 1] as const,
	mass: [0.6, 0.05, 0.1, 1] as const,
	glide: [0.25, 1, 0.3, 1] as const,
	outSoft: [0.16, 1, 0.3, 1] as const
};

function motionScale(): number {
	if (typeof document === 'undefined') return 1;
	const v = getComputedStyle(document.documentElement).getPropertyValue('--motion-scale').trim();
	const n = parseFloat(v);
	return Number.isFinite(n) ? n : 1;
}

function isStatic(): boolean {
	return motionScale() === 0;
}

export const SQUASH_FULL = { x: 0.88, y: 1.12 } as const;
export const SQUASH_PRESS = { x: 1.03, y: 0.94 } as const;
export const LAND_MS = 420;
export const SQUASH_DOWN_MS = 80;
export const SQUASH_UP_MS = 160;
export const PRESS_DOWN_MS = 180;
export const PRESS_UP_MS = 420;
export const REVEAL_DROP_PX = 16;
export const REVEAL_SETTLE = 0.985;

/** Milliseconds scaled by the motion scale, as seconds for motion.dev. */
export function scaledSeconds(ms: number, scale: number): number {
	return (ms * scale) / 1000;
}

export function revealFrom(x: number, y: number): string {
	return `translate(${x}px, ${y}px) scale(${REVEAL_SETTLE})`;
}

export const REVEAL_TO = 'translate(0px, 0px) scale(1)';

export function squashTransform(s: { x: number; y: number }): string {
	return `scale(${s.x}, ${s.y})`;
}

function styleEnd(node: HTMLElement) {
	node.style.opacity = '1';
	node.style.transform = 'none';
}

export function reveal(
	node: HTMLElement,
	opts?: { y?: number; x?: number; delay?: number; duration?: number; once?: boolean }
) {
	const { y = -REVEAL_DROP_PX, x = 0, delay = 0, duration = LAND_MS / 1000, once = true } = opts ?? {};
	const scale = motionScale();

	if (isStatic()) {
		styleEnd(node);
		return { destroy() {} };
	}

	node.style.opacity = '0';
	node.style.transform = revealFrom(x, y);
	node.style.transformOrigin = 'bottom';
	node.style.willChange = 'opacity, transform';

	const stop = inView(
		node,
		() => {
			animate(
				node,
				{ opacity: 1, transform: REVEAL_TO } as DOMKeyframesDefinition,
				{
					duration: duration * scale,
					delay: delay * scale,
					ease: ease.snap
				} as AnimationOptions
			);
			return once ? undefined : () => {
				animate(node, { opacity: 0, transform: revealFrom(x, y) } as DOMKeyframesDefinition, {
					duration: 0.18 * scale,
					ease: ease.snap
				} as AnimationOptions);
			};
		},
		{ amount: 0.2 }
	);

	return {
		destroy() {
			stop();
		}
	};
}

/** 420 ms snap landing from above. Ends on the static state; no-op when motion scale is 0. */
export function land(el: HTMLElement, opts?: { y?: number; delay?: number; origin?: string }) {
	const { y = -24, delay = 0, origin = 'bottom' } = opts ?? {};
	if (isStatic()) {
		styleEnd(el);
		return undefined;
	}
	const scale = motionScale();
	el.style.transformOrigin = origin;
	el.style.opacity = '0';
	el.style.transform = `translateY(${y}px)`;
	return animate(
		el,
		{ opacity: 1, transform: 'translateY(0px)' } as DOMKeyframesDefinition,
		{
			duration: scaledSeconds(LAND_MS, scale),
			delay: scaledSeconds(delay, scale),
			ease: ease.snap
		} as AnimationOptions
	);
}

/** Squash from the contact point: 80 ms snap in, 160 ms glide out. */
export function squash(el: HTMLElement, opts?: { origin?: string; strength?: { x: number; y: number } }) {
	if (isStatic()) return undefined;
	const { origin = 'bottom', strength = SQUASH_FULL } = opts ?? {};
	const scale = motionScale();
	const total = SQUASH_DOWN_MS + SQUASH_UP_MS;
	el.style.transformOrigin = origin;
	return animate(
		el,
		{ transform: ['scale(1, 1)', squashTransform(strength), 'scale(1, 1)'] } as DOMKeyframesDefinition,
		{
			duration: scaledSeconds(total, scale),
			times: [0, SQUASH_DOWN_MS / total, 1],
			ease: [ease.snap, ease.glide]
		} as AnimationOptions
	);
}

/** CTA press: half strength squash from the bottom, 180 snap down, 420 glide up. */
export function press(node: HTMLElement) {
	node.style.transformOrigin = 'bottom';

	function down() {
		if (isStatic()) return;
		animate(node, { transform: squashTransform(SQUASH_PRESS) } as DOMKeyframesDefinition, {
			duration: scaledSeconds(PRESS_DOWN_MS, motionScale()),
			ease: ease.snap
		} as AnimationOptions);
	}

	function up() {
		if (isStatic()) return;
		animate(node, { transform: 'scale(1, 1)' } as DOMKeyframesDefinition, {
			duration: scaledSeconds(PRESS_UP_MS, motionScale()),
			ease: ease.glide
		} as AnimationOptions);
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointerleave', up);
	node.addEventListener('pointercancel', up);

	return {
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointerleave', up);
			node.removeEventListener('pointercancel', up);
		}
	};
}

export function staggerChildren(
	node: HTMLElement,
	opts?: { selector?: string; gap?: number; y?: number; duration?: number }
) {
	const { selector = ':scope > *', gap = 0.06, y = 28, duration = 0.7 } = opts ?? {};
	const scale = motionScale();
	const items = Array.from(node.querySelectorAll<HTMLElement>(selector));

	if (isStatic()) {
		items.forEach((el) => {
			el.style.opacity = '1';
			el.style.transform = 'none';
		});
		return { destroy() {} };
	}

	items.forEach((el) => {
		el.style.opacity = '0';
		el.style.transform = `translateY(${y}px)`;
		el.style.willChange = 'opacity, transform';
	});

	const stop = inView(
		node,
		() => {
			items.forEach((el, i) => {
				animate(
					el,
					{ opacity: 1, transform: 'translateY(0px)' } as DOMKeyframesDefinition,
					{
						duration: duration * scale,
						delay: i * gap * scale,
						ease: ease.outSoft
					} as AnimationOptions
				);
			});
		},
		{ amount: 0.15 }
	);

	return {
		destroy() {
			stop();
		}
	};
}

export function magnetic(node: HTMLElement, opts?: { strength?: number; radius?: number }) {
	const strength = opts?.strength ?? 0.35;
	const radius = opts?.radius ?? 80;

	function onMove(e: PointerEvent) {
		if (isStatic()) return;
		const r = node.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const dist = Math.hypot(dx, dy);
		if (dist > radius * 2) return;
		const pull = Math.max(0, 1 - dist / (radius * 2));
		animate(
			node,
			{ transform: `translate(${dx * strength * pull}px, ${dy * strength * pull}px)` } as DOMKeyframesDefinition,
			{ duration: 0.25, ease: ease.snap } as AnimationOptions
		);
	}

	function onLeave() {
		animate(node, { transform: 'translate(0px, 0px)' } as DOMKeyframesDefinition, {
			duration: 0.45,
			ease: ease.mass
		} as AnimationOptions);
	}

	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerleave', onLeave);

	return {
		destroy() {
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', onLeave);
		}
	};
}

export function countUp(
	node: HTMLElement,
	opts: { to: number; from?: number; duration?: number; format?: (n: number) => string }
) {
	const { to, from = 0, duration = 1.2, format = (n) => Math.round(n).toString() } = opts;
	const scale = motionScale();

	if (isStatic()) {
		node.textContent = format(to);
		return { destroy() {} };
	}

	node.textContent = format(from);

	const stop = inView(
		node,
		() => {
			const start = performance.now();
			const total = duration * 1000 * scale;
			let raf = 0;
			const tick = (now: number) => {
				const t = Math.min(1, (now - start) / total);
				const eased = 1 - Math.pow(1 - t, 3);
				node.textContent = format(from + (to - from) * eased);
				if (t < 1) raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			return () => cancelAnimationFrame(raf);
		},
		{ amount: 0.5 }
	);

	return {
		destroy() {
			stop();
		}
	};
}

export function digitRoll(
	node: HTMLElement,
	opts: { value: number | string }
) {
	const scale = motionScale();
	const target = String(opts.value);

	function update(newValue: number | string) {
		const next = String(newValue);
		if (node.textContent === next) return;

		if (isStatic()) {
			node.textContent = next;
			return;
		}

		const old = node.cloneNode(true) as HTMLElement;
		const wrapper = node;
		wrapper.style.position = 'relative';
		wrapper.style.display = 'inline-block';
		wrapper.style.overflow = 'hidden';

		old.style.position = 'absolute';
		old.style.inset = '0';
		old.style.display = 'flex';
		old.style.alignItems = 'center';
		old.style.justifyContent = 'inherit';
		wrapper.appendChild(old);

		node.firstChild && node.removeChild(node.firstChild);
		node.textContent = next;

		animate(old, { transform: ['translateY(0%)', 'translateY(-100%)'], opacity: [1, 0] } as DOMKeyframesDefinition, {
			duration: 0.42 * scale,
			ease: ease.mass
		} as AnimationOptions).finished.then(() => old.remove());

		animate(node, { transform: ['translateY(100%)', 'translateY(0%)'] } as DOMKeyframesDefinition, {
			duration: 0.42 * scale,
			ease: ease.mass
		} as AnimationOptions);
	}

	node.textContent = target;

	return {
		update(newOpts: { value: number | string }) {
			update(newOpts.value);
		},
		destroy() {}
	};
}
