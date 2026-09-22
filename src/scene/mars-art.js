/**
 * Shared Mars pixel art: used by the launch easter egg (MarsEasterEgg.astro) and by the permanent
 * Mars background (mars.js). Everything is drawn with fillRect on a small canvas, one unit = one art pixel.
 */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- little sprites, drawn with rectangles ---------- */
export const HEAD = [ // Mars, a spotted hyena, front-facing: rounded ears, tawny spotted coat, blunt black nose.
	'.BBB...BBB.', // B dark fur/rim  G tawny coat  S spot  C cream muzzle  E eye  N nose
	'BBBBB.BBBBB',
	'BGGGGGGGGGB',
	'GGSGGGGGSGG',
	'GGEGGGGGEGG',
	'GSGGGGGGGSG',
	'.GGCCCCCGG.',
	'..GCCCCCG..',
	'...CCNNCC..',
	'....CCCC...',
];
const HEAD_COL = { B: '#2a1b12', G: '#c9932f', S: '#4a2f18', C: '#e8c98a', E: '#2fa84f', N: '#111111' };
/** Lynix (site theme "lynix"), a front-facing wolf: black fur, purple muzzle, lavender ears, amber eyes. L lavender  P purple  A amber  W white */
export const HEAD_LYNIX = [
	'..B.....B..', // pointed ears, tapering wider as they meet the head
	'.BLB...BLB.',
	'BBLBB.BBLBB',
	'BBLBBBBBLBB',
	'BBBBBBBBBBB',
	'BBABBBBBABB',
	'BBBPPPPPBBB',
	'.BBPPPPPBB.',
	'..BPPNPPB..',
	'...BPWPB...',
];
const HEAD_COL_LYNIX = { B: '#14101f', P: '#5b34c7', L: '#c9a7ee', W: '#f4f0ff', A: '#e0a840', N: '#050508' };
/** Who gets launched depends on the site theme. */
export const isLynix = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'lynix';
export const characterName = () => (isLynix() ? 'Lynix' : 'Mars');
export const themeAccent = () => (isLynix() ? { accent: '#a855f7', shadow: '#3b0764' } : { accent: '#ff6b1a', shadow: '#7a3200' });
/** force: 'mars' | 'lynix' overrides the site theme - used by the SLS, which always carries both. */
export function drawHead(g, cx, cy, force) {
	const lynix = force ? force === 'lynix' : isLynix(), grid = lynix ? HEAD_LYNIX : HEAD, cols = lynix ? HEAD_COL_LYNIX : HEAD_COL;
	for (let r = 0; r < grid.length; r++) for (let c = 0; c < 11; c++) {
		const k = grid[r][c]; if (k === '.') continue;
		g.fillStyle = cols[k]; g.fillRect(cx - 5 + c, cy - (lynix ? 5 : 4) + r, 1, 1);
	}
}
export function ring(g, cx, cy, R, fill, rim) {
	for (let dy = -R; dy <= R; dy++) {
		const o = Math.round(Math.sqrt(R * R - dy * dy));
		if (fill) { g.fillStyle = fill; g.fillRect(cx - o, cy + dy, 2 * o + 1, 1); }
	}
	g.fillStyle = rim;
	for (let dy = -R; dy <= R; dy++) {
		const o = Math.round(Math.sqrt(R * R - dy * dy));
		const inner = Math.abs(dy) < R - 1 ? Math.round(Math.sqrt((R - 1) * (R - 1) - dy * dy)) : -1;
		if (inner < 0) g.fillRect(cx - o, cy + dy, 2 * o + 1, 1);
		else { g.fillRect(cx - o, cy + dy, o - inner, 1); g.fillRect(cx + inner + 1, cy + dy, o - inner, 1); }
	}
}
export const RH = 44; // rocket height
/** Rocket standing with its nozzle at baseY. flame 0..1, legs/door optional. */
export function drawRocket(g, cx, baseY, o) {
	const top = baseY - RH;
	const noseW = [2, 2, 4, 4, 6, 6, 8, 8, 10, 10];
	noseW.forEach((w, i) => { g.fillStyle = '#d21f2f'; g.fillRect(cx - (w >> 1), top + i, w, 1); g.fillStyle = '#f04a58'; g.fillRect(cx - (w >> 1), top + i, 1, 1); });
	g.fillStyle = '#f2f3f8'; g.fillRect(cx - 5, top + 10, 10, 31);
	g.fillStyle = '#c9ccdc'; g.fillRect(cx + 2, top + 10, 3, 31);
	g.fillStyle = '#ffffff'; g.fillRect(cx - 5, top + 10, 1, 31);
	g.fillStyle = themeAccent().accent; g.fillRect(cx - 5, top + 30, 10, 1);
	g.fillStyle = '#d21f2f'; g.fillRect(cx - 5, top + 34, 10, 3);
	// porthole with Mars inside
	const py = top + 19;
	ring(g, cx, py, 5, '#0d1230', '#8a90a8');
	if (!o.empty) { g.save(); g.beginPath(); g.arc(cx + .5, py + .5, 4, 0, 6.3); g.clip(); drawHead(g, cx, py, o.head); g.restore(); } // empty once he has stepped out
	// hatch on the lower body
	g.fillStyle = o.door > 0 ? '#1b1e2e' : '#8a90a8'; g.fillRect(cx - 1, top + 25, 4, 7);
	// fins
	for (let i = 0; i < 10; i++) {
		const fw = 1 + Math.floor(i * .4);
		g.fillStyle = '#d21f2f'; g.fillRect(cx - 5 - fw, top + 31 + i, fw, 1);
		g.fillStyle = '#a51824'; g.fillRect(cx + 5, top + 31 + i, fw, 1);
	}
	// nozzle
	g.fillStyle = '#3a3f55'; g.fillRect(cx - 3, top + 41, 6, 3); g.fillStyle = '#171a2b'; g.fillRect(cx - 2, top + 43, 4, 1);
	if (o.legs) {
		g.fillStyle = '#8a90a8';
		for (let i = 0; i < 7; i++) { g.fillRect(cx - 4 - ((i * .8) | 0), baseY - 7 + i, 1, 1); g.fillRect(cx + 3 + ((i * .8) | 0), baseY - 7 + i, 1, 1); }
		g.fillRect(cx - 11, baseY, 5, 1); g.fillRect(cx + 7, baseY, 5, 1);
	}
	if (o.flame > 0) {
		const len = (8 + 16 * o.flame) * (.85 + Math.random() * .3);
		g.globalAlpha = .28; g.fillStyle = '#ff9a3a'; g.fillRect(cx - 7, baseY, 14, len * .55); g.globalAlpha = 1;
		for (let k = 0; k < len; k++) {
			const w = Math.max(1, Math.round(6 * (1 - k / len)));
			g.fillStyle = k < len * .3 ? '#fff6c8' : k < len * .6 ? '#ffd25a' : '#ff7a1a';
			g.fillRect(cx - (w >> 1), baseY + k, w, 1);
		}
	}
}
/** A pilot in a space suit (feet at gy). o.head: 'mars' | 'lynix' overrides the site theme (for scenes with both). o.accent overrides the suit stripe colour. */
export function drawAstronaut(g, x, gy, o) {
	const f = o.walk ? Math.floor(o.t * 5) % 2 : 0;
	g.fillStyle = '#f2f3f8'; g.fillRect(x - 2 + f, gy - 6, 2, 5); g.fillRect(x + 1 - f, gy - 6, 2, 5);
	g.fillStyle = '#3a2114'; g.fillRect(x - 3 + f, gy - 1, 3, 2); g.fillRect(x + 1 - f, gy - 1, 3, 2);
	g.fillStyle = '#8a90a8'; g.fillRect(x - 6, gy - 12, 2, 6);
	g.fillStyle = '#f2f3f8'; g.fillRect(x - 4, gy - 13, 8, 7);
	g.fillStyle = '#c9ccdc'; g.fillRect(x + 2, gy - 13, 2, 7);
	g.fillStyle = o.accent || themeAccent().accent; g.fillRect(x - 4, gy - 10, 8, 1);
	g.fillStyle = '#f2f3f8';
	if (o.wave) { g.fillRect(x + 3, gy - 18 - (Math.floor(o.t * 4) % 2), 2, 6); g.fillStyle = '#3a2114'; g.fillRect(x + 3, gy - 20 - (Math.floor(o.t * 4) % 2), 2, 2); }
	else { g.fillRect(x + 3, gy - 12, 2, 5); g.fillStyle = '#3a2114'; g.fillRect(x + 3, gy - 7, 2, 2); }
	ring(g, x, gy - 20, 6, 'rgba(191,224,255,.28)', '#e8f2ff');
	drawHead(g, x, gy - 20, o.head);
}



export const CA_FLAG = [ // the Maple Leaf, at 11x6 art pixels. R red  W white
	'RRRWWRWWRRR',
	'RRRWRRRWRRR',
	'RRRRRRRRRRR',
	'RRRWRRRWRRR',
	'RRRWWRWWRRR',
	'RRRWWRWWRRR',
];
const CA_FLAG_COL = { R: '#d21f2f', W: '#ffffff' };

const LAND_T = 3.8; // seconds the powered landing takes

/**
 * The Martian (or, on the "lynix" theme, lunar) surface for a canvas W x H art pixels: sky, sun,
 * ridges, rocks, rover, dust, plus the landed rocket, the flag and the pilot himself.
 *   draw(g, ms, dt)         backdrop. ms = seconds since touchdown started (only the rover uses it)
 *   actors(g, ms, t)        rocket, flag and astronaut for that moment of the landing story
 *   alt(ms)                 rocket height above the ground while landing (0 once down)
 * opts.rx / opts.flag: where the rocket and the flag stand, as a fraction of the width.
 * opts.kind: 'mars' (default) or 'moon' - a black airless sky, grey ground, craters, no dust, Earth overhead.
 * opts.character: 'mars' | 'lynix' - who's landing, fixed regardless of the live site theme.
 */
export function makeMarsWorld(W, H, opts = {}) {
	const r = rng(9);
	const moon = opts.kind === 'moon';
	const character = opts.character || null;
	const accent = character === 'lynix' ? '#a855f7' : character === 'mars' ? '#ff6b1a' : undefined;
	const rx = Math.round(W * (opts.rx ?? .42));
	const hy = Math.round(H * .55), gy = Math.round(H * .8);     // horizon and ground line
	const ridge = (base, a1, a2, seed) => { const rr = rng(seed), p1 = rr() * 6, p2 = rr() * 6, f1 = .02 + rr() * .02, f2 = .07 + rr() * .05; return Array.from({ length: W }, (_, x) => Math.round(base - (a1 * (Math.sin(x * f1 + p1) * .5 + .5) + a2 * (Math.sin(x * f2 + p2) * .5 + .5)))); };
	const layers = moon
		? [{ h: ridge(hy, 9, 4, 1), c: '#9a99a2' }, { h: ridge(hy + 10, 11, 5, 2), c: '#807f88' }, { h: ridge(gy - 22, 7, 4, 3), c: '#66646e' }]
		: [{ h: ridge(hy, 10, 4, 1), c: '#c98a5e' }, { h: ridge(hy + 10, 12, 5, 2), c: '#b06a44' }, { h: ridge(gy - 22, 8, 4, 3), c: '#9a5535' }];
	const rocks = Array.from({ length: 46 }, () => { const y = gy - 6 + r() * (H - gy + 4); const s = 1 + Math.floor((y - gy + 6) / (H - gy + 4) * 4 * r() + r() * 2); return { x: Math.floor(r() * W), y: Math.floor(y), w: s + 1, h: s, c: moon ? (r() < .5 ? '#4c4b54' : '#8c8b95') : (r() < .5 ? '#5e2a19' : '#a35a38') }; });
	const craters = moon ? Array.from({ length: 9 }, () => ({ x: r() * W, y: gy + 4 + r() * (H - gy - 6), rd: 2 + Math.floor(r() * 3) })) : [];
	const flagX = Math.round(W * (opts.flag ?? .64)), doorX = rx + 6;
	const dust = Array.from({ length: 26 }, () => ({ x: r() * W, y: hy + r() * (H - hy), v: 4 + r() * 10, s: 1 + Math.floor(r() * 2) }));
	const stars = moon ? Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * (hy - 4), tw: r() * 6 })) : [];

	function draw(g, ms, dt) {
	// sky
	if (moon) {
		g.fillStyle = '#03030a'; g.fillRect(0, 0, W, hy + 4);
		for (const s of stars) { g.globalAlpha = .5 + .5 * Math.sin(ms * 2 + s.tw); g.fillStyle = '#fff'; g.fillRect(s.x | 0, s.y | 0, 1, 1); }
		g.globalAlpha = 1;
		// Earth, small and blue, hanging in the black sky
		const ex = Math.round(W * .27), ey = Math.round(H * .16);
		ring(g, ex, ey, 7, '#1c3f8a', '#5a8fe0');
		g.fillStyle = '#3f8f5a'; g.fillRect(ex - 3, ey - 2, 3, 2); g.fillRect(ex + 1, ey + 1, 3, 2);
		g.globalAlpha = .5; g.fillStyle = '#eef4ff'; g.fillRect(ex - 5, ey - 4, 4, 2); g.globalAlpha = 1;
	} else {
		const top = [96, 52, 48], mid = [190, 116, 80], hor = [238, 184, 138];
		for (let y = 0; y < hy; y += 3) { const k = y / hy; g.fillStyle = rgb(k < .6 ? mixC(top, mid, k / .6) : mixC(mid, hor, (k - .6) / .4)); g.fillRect(0, y, W, 3); }
		g.fillStyle = rgb(hor); g.fillRect(0, hy - 2, W, 4);
	}
	// sun, moons
	const sx = Math.round(W * .8), sy = Math.round(hy - 42);
	if (moon) {
		for (const [rad, a] of [[10, .10], [6, .18]]) { g.globalAlpha = a; ring(g, sx, sy, rad, '#ffffff', '#ffffff'); }
		g.globalAlpha = 1; ring(g, sx, sy, 4, '#ffffff', '#ffffff');
	} else {
		for (const [rad, a] of [[13, .08], [9, .14], [6, .25]]) { g.globalAlpha = a; g.fillStyle = '#fff1d0'; ring(g, sx, sy, rad, '#fff1d0', '#fff1d0'); }
		g.globalAlpha = 1; ring(g, sx, sy, 4, '#fff8e4', '#fff8e4');
		g.fillStyle = '#c9b8ac'; g.fillRect(Math.round(W * .22), Math.round(H * .13), 2, 2); g.fillStyle = '#b8a89c'; g.fillRect(Math.round(W * .4), Math.round(H * .08), 1, 1);
	}
	// distant peaks: Olympus Mons, hazy, or a sharp airless crater rim on the Moon
	const oc = Math.round(W * .68), ow = Math.round(W * .2);
	g.fillStyle = moon ? '#8f8e97' : '#c99570';
	for (let x = oc - ow; x <= oc + ow; x++) { const d = (x - oc) / ow, h = Math.round((moon ? 13 : 20) * Math.sqrt(Math.max(0, 1 - d * d)) * (1 - Math.abs(d) * .25)); g.fillRect(x, hy - h, 1, h + 2); }
	// ridges and ground
	for (const L of layers) { g.fillStyle = L.c; for (let x = 0; x < W; x++) g.fillRect(x, L.h[x], 1, H - L.h[x]); }
	g.fillStyle = moon ? '#57565f' : '#86452b'; g.fillRect(0, gy - 8, W, H - gy + 8);
	g.fillStyle = moon ? '#4a4952' : '#7a3d26'; g.fillRect(0, gy + 10, W, H - gy - 10);
	for (const k of rocks) { g.fillStyle = k.c; g.fillRect(k.x, k.y, k.w, k.h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(k.x, k.y + k.h, k.w, 1); }
	for (const c of craters) { ring(g, c.x, c.y, c.rd, null, 'rgba(0,0,0,.35)'); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(c.x - c.rd, c.y - 1, c.rd * 2, 1); }
	// far away rover crawling along the ridge
	const rvx = ((ms * 3 + 40) % (W + 60)) - 30, rvy = gy - 14;
	g.fillStyle = '#d8d8e0'; g.fillRect(rvx, rvy - 5, 12, 3); g.fillStyle = '#3a5aa8'; g.fillRect(rvx + 1, rvy - 7, 10, 1);
	g.fillStyle = '#8a90a8'; g.fillRect(rvx + 9, rvy - 9, 1, 4); g.fillStyle = '#c9ccdc'; g.fillRect(rvx + 8, rvy - 10, 3, 2);
	g.fillStyle = '#22242e'; for (const wx of [1, 5, 9]) g.fillRect(rvx + wx, rvy - 2, 3, 3);
	// drifting dust - Mars has a thin atmosphere to carry it, the Moon doesn't
	if (!moon) for (const d of dust) { d.x = (d.x + d.v * dt) % W; g.globalAlpha = .18; g.fillStyle = '#f0c090'; g.fillRect(d.x | 0, d.y | 0, d.s + 3, d.s); }
	g.globalAlpha = 1;

	}
	const alt = ms => 190 * Math.pow(1 - clamp(ms / LAND_T, 0, 1), 2);
	function actors(g, ms, t) {
		const a = alt(ms), rbase = Math.round(gy + 2 - a);
		const out = 5.8;
		drawRocket(g, rx, rbase, { flame: ms < LAND_T ? .9 - ms / LAND_T * .4 : 0, legs: a < 45, door: ms > 5.2 ? 1 : 0, empty: ms > out, head: character });
		// Mars steps out, walks to the flag, plants it, waves
		const walkSpeed = 20, dist = flagX - doorX, arrive = out + dist / walkSpeed;
		const flagT = clamp((ms - arrive - .4) / 1.8, 0, 1);
		if (flagT > 0) {
			const ph = Math.round(20 * flagT);
			g.fillStyle = '#d8d8e0'; g.fillRect(flagX + 8, gy + 3 - ph, 1, ph);
			if (flagT > .5) { // the Maple Leaf, unfurling left to right
				const fw = Math.round(11 * ((flagT - .5) * 2)), fy = gy + 3 - 20;
				for (let row = 0; row < CA_FLAG.length; row++) for (let col = 0; col < fw; col++) { g.fillStyle = CA_FLAG_COL[CA_FLAG[row][col]]; g.fillRect(flagX + 9 + col, fy + row, 1, 1); }
			}
		}
		if (ms > out) {
			const ax = Math.min(flagX, Math.round(doorX + (ms - out) * walkSpeed));
			drawAstronaut(g, ax, gy + 3, { walk: ax < flagX, wave: flagT >= 1, t, head: character, accent });
		}
	}
	return { rx, hy, gy, W, H, draw, actors, alt, landT: LAND_T, kind: moon ? 'moon' : 'mars' };
}
