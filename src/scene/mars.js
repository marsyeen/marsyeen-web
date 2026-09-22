/**
 * The permanent Mars (or Moon) background - what the home page shows once the launch easter egg has landed.
 * Same API as createScene (scene.js), so CityBackground can swap one for the other:
 *
 *   const scene = createMarsScene(canvas, 'mars'); // or 'moon'
 *   scene.destroy();
 */
import { CONFIG } from './config.js';
import { makeMarsWorld } from './mars-art.js';

export function createMarsScene(canvas, kind = 'mars') {
  const g = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, world = null, elapsed = 0, rafId = 0, destroyed = false, lastFrame = performance.now(), resizeTimer = 0;
  const SETTLED = 100; // seconds into the landing story: rocket down, flag planted, Mars waving

  function build() {
    const vw = window.innerWidth, vh = window.innerHeight, ps = CONFIG.pixelScale;
    const P = Math.max(ps.min, Math.floor(Math.min(vw / ps.targetWidth, vh / ps.targetHeight)));
    W = Math.ceil(vw / P); H = Math.ceil(vh / P);
    canvas.width = W; canvas.height = H; canvas.style.width = W * P + 'px'; canvas.style.height = H * P + 'px';
    g.imageSmoothingEnabled = false;
    if (world) world.destroy();
    world = makeMarsWorld(W, H, { rx: .7, flag: .88, kind, character: kind === 'moon' ? 'lynix' : 'mars' }); // off to the right, clear of the page text
    if (reduceMotion) draw(0);
  }

  function draw(dt) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H);
    world.draw(g, SETTLED + elapsed, dt);
    world.actors(g, SETTLED + elapsed, elapsed);
  }

  function frame(now) {
    if (destroyed || !canvas.isConnected) { destroy(); return; }
    const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now; elapsed += dt;
    draw(dt);
    rafId = requestAnimationFrame(frame);
  }

  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 150); }
  function destroy() {
    destroyed = true; cancelAnimationFrame(rafId); clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    if (world) world.destroy();
  }

  build();
  if (!reduceMotion) rafId = requestAnimationFrame(frame);
  window.addEventListener('resize', onResize);
  return { destroy };
}
