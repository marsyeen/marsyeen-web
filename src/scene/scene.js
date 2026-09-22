/**
 * 
 *
 *   const scene = createScene(canvas, { time: 'live', weather: 'clear' });
 *   scene.setTime(22 * 60);      // minutes after midnight, or 'live' / 'timelapse'
 *   scene.setWeather('snow');    // 'clear' | 'rain' | 'snow'
 *   scene.fireworks();
 *   scene.callStreetcar();
 *   scene.destroy();
 *
 * HOW THIS FILE IS ORGANISED (search for the banner comments):
 *   1. SETTINGS & STATE     - config, and the variables everything shares
 *   2. HELPERS              - tiny maths / canvas utilities
 *   3. LIGHTING             - what colour the sky is at a given time of day
 *   4. SPRITES              - turns SVGs from sprites.js into bitmaps
 *   5. STATIC LAYERS        - sky, skyline, street and lights, drawn once per resize
 *   6. ACTORS               - streetcars and pedestrians
 *   7. FIREWORKS
 *   8. UPDATE               - advances the world by one tick
 *   9. DRAW                 - paints one frame, back to front
 *  10. START-UP & CONTROLS
 *
 * All numbers you might want to change live in config.js.
 * The "art pixel" is the scene's unit: the canvas is small (about 360 px wide) and is
 * scaled up by a whole number so it stays crisp.
 */
import { sprites } from './sprites.js';
import { CONFIG, WORLD, STREETCAR_WIDTH as L, ROUTES, ROUTE_NIGHT } from './config.js';
import { isLynix, drawHead } from './mars-art.js';

const WEATHERS = ['clear', 'rain', 'snow'];
const FIREWORK_COLOURS = ['255,90,90', '255,220,120', '120,200,255', '200,140,255', '140,255,180', '255,255,255', '255,150,60'];
const WINDOW_COLOURS = ['#ffd27a', '#ffe9a8', '#9fd8ff', '#ffb46b'];

export function createScene(canvas, userConfig = {}) {
  /* ===================================================================
     1. SETTINGS & STATE
     =================================================================== */
  const cfg = { ...CONFIG, ...userConfig };
  const g = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Screen size, in art pixels (W x H), and the whole-number zoom P.
  // yOff shifts the 216px-tall scene down so it sits on the bottom of tall screens.
  let W = 0, H = 0, P = 2, yOff = 0;
  let rand = Math.random;            // swapped for a seeded generator while building layers

  // Time and light
  let clock = 0;                     // minutes after midnight (0-1440)
  let timeMode = 'live';             // 'live' | 'timelapse' | 'fixed'
  let liveSync = 0;                  // seconds until we re-read the real clock
  let sunHeight = 0, dayF = 0, nightF = 1, twilight = 0, lightsF = 1, overcast = 0;
  // sunHeight: -1..1 (sun's elevation). dayF/nightF: 0..1 blend. twilight: 1 at dawn/dusk.
  // lightsF: how strongly artificial lights are on. overcast: extra grey from rain/snow.

  // Weather
  let weather = 0;                   // index into WEATHERS
  let snowCover = 0;                 // 0..1, how much snow has settled

  // World layout (set in build())
  let stopX = 0, towerX = 0, ventX = 0, towerGeo = null, tower = null;

  // Things that move
  let elapsed = 0;                   // seconds since start
  let cars = [], peds = [], puffs = [], drops = [], flakes = [], splashes = [], clouds = [], stars = [];
  let rockets = [], sparks = [], flashes = [], showTime = 0, showTimer = 0;
  let clearing = false, clearSent = false; // the Mars launch asks the street to empty out before the pad is built
  const plane = { on: false, timer: 10, x: 0, y: 0, dir: 1 };
  const timers = { eastbound: 2.5, westbound: 6, steam: 0, windows: 0 };

  // Pre-rendered layers and per-layer data
  const layer = {};                  // cityNight, cityDay, streetNight, streetDay, lights, vignette
  let litWindows = [], beacons = [], roofsMid = [], roofsStreet = [], snowNoise = [], puddleSpeck = [], snowColour = '#fff';

  /* ===================================================================
     2. HELPERS
     =================================================================== */
  function seeded(a) { // small deterministic random generator, so the city looks the same every load
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const between = (a, b) => a + rand() * (b - a);
  const intBetween = (a, b) => Math.floor(a + rand() * (b - a + 1));
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const rangeOf = ([a, b]) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);        // blend two [r,g,b] colours
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  function makeCanvas(w, h) {
    const k = document.createElement('canvas'); k.width = w; k.height = h;
    const x = k.getContext('2d'); x.imageSmoothingEnabled = false;
    return { k, x };
  }
  /** Soft round glow, drawn as stepped pixel rings. */
  function drawGlow(x, cx, cy, r, col, a) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy); if (d > r) continue;
      let t = 1 - d / r; t = Math.ceil(t * 4) / 4;
      x.fillStyle = `rgba(${col},${(a * t * t).toFixed(3)})`; x.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
  const glowCache = {};
  function glowSprite(r, col, a) {
    const key = r + '|' + col + '|' + a;
    if (!glowCache[key]) { const m = makeCanvas(r * 2 + 1, r * 2 + 1); drawGlow(m.x, r, r, r, col, a); glowCache[key] = m.k; }
    return glowCache[key];
  }
  function hueToRgb(h) { // hue (0-360) -> "r,g,b", used for the colour-cycling CN Tower lights
    const s = .9, l = .62, a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return f(0) + ',' + f(8) + ',' + f(4);
  }

  /* ===================================================================
     3. LIGHTING
     =================================================================== */
  function readTorontoMinutes() {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = t => +parts.find(q => q.type === t).value;
      return get('hour') * 60 + get('minute') + get('second') / 60;
    } catch (err) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  }

  /** Works out sun height and the day/night/twilight blend for the current clock. */
  function updateLighting() {
    const hour = clock / 60;
    if (hour >= 6.5 && hour <= 19) sunHeight = Math.sin(Math.PI * (hour - 6.5) / 12.5);          // sun is up 06:30-19:00
    else sunHeight = -Math.sin(Math.PI * ((hour >= 19 ? hour - 19 : hour + 5) / 11.5));          // otherwise the moon
    dayF = smoothstep(-.10, .22, sunHeight);
    nightF = 1 - dayF;
    twilight = Math.exp(-Math.pow(sunHeight / .16, 2));
    lightsF = 1 - smoothstep(.02, .30, sunHeight);
  }
  function skyColours() {
    const out = {};
    for (const k of ['top', 'mid', 'horizon']) {
      let col = mix(cfg.sky.night[k], cfg.sky.day[k], dayF);
      col = mix(col, cfg.sky.twilight[k], twilight * .85);
      if (overcast > 0) { const grey = (col[0] + col[1] + col[2]) / 3 * .85; col = mix(col, [grey, grey, grey * 1.05], overcast); }
      out[k] = col;
    }
    return out;
  }
  /** Where the sun or moon sits on its arc; phi runs 0 (rising) to PI (setting). */
  function skyBodyPosition(phi) {
    const x = W * (.06 + .88 * (1 - Math.cos(phi)) / 2);
    const arc = 135 + Math.max(0, yOff) * .55;
    return [Math.round(x), Math.round(150 - arc * Math.sin(phi))];
  }
  /** Colours for the ground (sidewalk, road, rails), day and night. */
  function groundColours(day) {
    return day
      ? { walk: '#9a9fb5', walkHi: '#c0c5d8', slab: 'rgba(0,0,0,.14)', curb: '#7a80a0', curbDark: '#4a4f6a', road: '#4a4e5f', noiseA: '#555a6c', noiseB: '#40445a', ripple: '#5a5f72', rail: '#8a90a8', rail2: '#3c4058', spark: '#d0d6ea', lane: '#d8c860' }
      : { walk: '#232747', walkHi: '#343a6a', slab: 'rgba(0,0,0,.25)', curb: '#3c4270', curbDark: '#090b1c', road: '#0f1129', noiseA: '#151936', noiseB: '#0b0d22', ripple: '#1b2148', rail: '#2e3560', rail2: '#171b38', spark: '#6a76c0', lane: '#4a4828' };
  }

  /* ===================================================================
     4. SPRITES  (SVG -> cached bitmap)
     =================================================================== */
  const spriteCache = {};
  function sprite(name, opts) {
    const key = name + '|' + JSON.stringify(opts || {});
    if (spriteCache[key]) return spriteCache[key];
    const built = sprites.build(name, opts);
    const size = /width="(\d+)" height="(\d+)"/.exec(built.svg);
    const bmp = makeCanvas(+size[1], +size[2]);
    // Sprites are only plain <rect>s, so we paint them directly rather than decoding the SVG.
    const rectRe = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="([^"]+)"(?: fill-opacity="([\d.]+)")?\/>/g;
    let m;
    while ((m = rectRe.exec(built.svg))) { bmp.x.globalAlpha = m[6] ? +m[6] : 1; bmp.x.fillStyle = m[5]; bmp.x.fillRect(+m[1], +m[2], +m[3], +m[4]); }
    bmp.x.globalAlpha = 1;
    return (spriteCache[key] = { cv: bmp.k, meta: built.meta });
  }

  /* ===================================================================
     5. STATIC LAYERS  (built once per resize; the animation just blits them)
     =================================================================== */
  function buildSky() {
    rand = seeded(7);
    stars = [];
    const count = Math.floor(W * (120 + yOff) / 420);
    for (let i = 0; i < count; i++) stars.push({ x: intBetween(0, W - 1), y: intBetween(-yOff, 118), phase: between(0, 6.28), speed: between(.8, 3), colour: pick(['#ffffff', '#bcd0ff', '#ffe6b0']), big: rand() < .07 });
    clouds = [];
    const n = 3 + Math.floor(H / 90);
    for (let i = 0; i < n; i++) {
      const w = intBetween(90, 170), h = intBetween(10, 16), seed = intBetween(1, 99999);
      clouds.push({ night: sprite('cloud', { w, h, seed, day: false }).cv, day: sprite('cloud', { w, h, seed, day: true }).cv, w, x: between(-w, W), y: between(-yOff + 8, 105), speed: between(1.5, 4) });
    }
  }

  /** The skyline: distant buildings, three tall towers, Rogers Centre, CN Tower, mid-rise buildings. */
  function buildCity(day) {
    rand = seeded(101);
    const { k, x } = makeCanvas(W, H); x.translate(0, yOff);
    layer[day ? 'cityDay' : 'cityNight'] = k;
    const windowList = day ? [] : litWindows, beaconList = day ? [] : beacons;
    if (!day) { litWindows.length = 0; beacons.length = 0; roofsMid.length = 0; }
    const baseY = WORLD.skylineBaseY;

    // Far away buildings (small, dim)
    for (let px = -6; px < W;) {
      const w = intBetween(10, 22), h = intBetween(30, 82);
      x.drawImage(sprite('building', { kind: 'far', w, h, ci: intBetween(0, 2), cap: rand() < .3, ant: rand() < .2, seed: intBetween(1, 99999), day }).cv, px, baseY - h - 12);
      px += w + intBetween(-2, 2);
    }
    // Three tall office towers
    cfg.layout.officeTowers.forEach(frac => {
      const w = intBetween(15, 20), h = intBetween(96, 112), bx = Math.round(W * frac + intBetween(-6, 6));
      x.drawImage(sprite('building', { kind: 'tower', w, h, seed: intBetween(1, 99999), day }).cv, bx, baseY - h - 12);
      beaconList.push({ x: bx + (w >> 1), y: baseY - h - 1, phase: rand() * 3 });
    });
    // Rogers Centre and the CN Tower
    const towerSprite = sprite('cn_tower', { day, geo: towerGeo });
    x.drawImage(towerSprite.cv, towerX - towerSprite.meta.cx, towerGeo.top);
    // Mid-rise buildings (kept short where the dome is, so it stays visible)
    for (let px = -8; px < W;) {
      const w = intBetween(13, 26), h = intBetween(26, 74);
      const y = baseY - h, style = intBetween(0, 3);
      const b = sprite('building', { kind: 'mid', w, h, ci: intBetween(0, 3), st: style, seed: intBetween(1, 99999), day });
      x.drawImage(b.cv, px - 1, y - 12);
      if (!day) {
        for (const q of b.meta.wins) windowList.push({ x: px + q.x, y: y + q.y, on: q.on, colour: q.c });
        roofsMid.push(style === 1 ? { x: px + 3, w: w - 6, y: y - 6 } : { x: px, w, y });
      }
      if (h > 58) beaconList.push({ x: px + (w >> 1), y: (style === 1 ? y - 6 : style === 2 ? y - 10 : y) - 1, phase: rand() * 3 });
      px += w + intBetween(0, 2);
    }
  }

  /** The street: storefronts, sidewalk, road, rails, and street furniture. Returns data for the lights layer. */
  function buildStreet(day) {
    rand = seeded(202);
    const { k, x } = makeCanvas(W, H); x.translate(0, yOff);
    layer[day ? 'streetDay' : 'streetNight'] = k;
    const gc = groundColours(day), sidewalk = WORLD.sidewalkY;
    const glows = [], spots = [], lamps = [], roofs = [];
    const collect = (meta, ox, oy) => { // light sources and roof lines that come with a sprite
      for (const l of meta.lights) glows.push([l[0] + ox, l[1] + oy, l[2], l[3], l[4]]);
      if (meta.spot) spots.push({ x: meta.spot.x + ox, w: meta.spot.w, col: meta.spot.col });
      if (meta.roof) roofs.push({ x: meta.roof.x + ox, w: meta.roof.w, y: meta.roof.y + oy });
    };

    // Row of shopfronts along the sidewalk, with the theatre near the left
    const theatreAt = Math.round(W * cfg.layout.theatre); let theatreDone = false;
    for (let px = -6; px < W;) {
      if (!theatreDone && px >= theatreAt) {
        const t = sprite('theatre', { day }); x.drawImage(t.cv, px - 1, sidewalk - 48); collect(t.meta, px - 1, sidewalk - 48);
        px += 60; theatreDone = true; continue;
      }
      const w = intBetween(26, 40), h = intBetween(34, 52), top = sidewalk - h;
      const s = sprite('storefront', { w, h, seed: intBetween(1, 999999), day });
      x.drawImage(s.cv, px - 1, top); collect(s.meta, px - 1, top);
      px += w + intBetween(0, 1);
    }
    // Sidewalk
    x.fillStyle = gc.walk; x.fillRect(0, sidewalk, W, 10);
    x.fillStyle = gc.walkHi; x.fillRect(0, sidewalk, W, 1);
    x.fillStyle = gc.slab; for (let xx = 0; xx < W; xx += 13) x.fillRect(xx, sidewalk + 1, 1, 9);
    x.fillStyle = gc.curb; x.fillRect(0, WORLD.roadY - 2, W, 1);
    x.fillStyle = gc.curbDark; x.fillRect(0, WORLD.roadY - 1, W, 1);
    // Road with texture, rails and lane dashes
    x.fillStyle = gc.road; x.fillRect(0, WORLD.roadY, W, 44);
    for (let i = 0; i < W * 3; i++) { x.fillStyle = rand() < .5 ? gc.noiseA : gc.noiseB; x.fillRect(intBetween(0, W - 1), intBetween(178, 215), 1, 1); }
    for (let i = 0; i < W / 6; i++) { x.fillStyle = gc.ripple; x.fillRect(intBetween(0, W - 1), intBetween(180, 214), intBetween(2, 4), 1); }
    for (const railY of [WORLD.laneA, WORLD.laneB]) {
      x.fillStyle = gc.rail; x.fillRect(0, railY, W, 1);
      x.fillStyle = gc.rail2; x.fillRect(0, railY + 1, W, 1);
      for (let xx = intBetween(0, 8); xx < W; xx += intBetween(7, 12)) { x.fillStyle = gc.spark; x.fillRect(xx, railY, 1, 1); }
    }
    x.fillStyle = gc.lane; for (let xx = 0; xx < W; xx += 12) x.fillRect(xx, 203, 6, 1);
    // Street furniture
    x.drawImage(sprite('vent', { day }).cv, ventX - 4, 175);
    x.drawImage(sprite('mailbox').cv, Math.round(W * cfg.layout.mailbox), 167);
    const shelterX = stopX - 15;
    x.drawImage(sprite('shelter', { day }).cv, shelterX - 1, 148);
    // Street lamps every ~118px, alternating which way the arm points (skipping the shelter)
    let lampIndex = 0;
    for (let lx = intBetween(28, 54); lx < W + 50; lx += 118) {
      let poleX = lx; if (Math.abs(poleX - stopX) < 26) poleX += 34;
      const armDir = (lampIndex++ % 2) ? -1 : 1, headX = poleX + armDir * 9;
      const wobble = []; for (let i = 0; i < 19; i++) wobble.push(intBetween(-1, 1)); // road reflection jitter
      lamps.push({ headX, wobble });
      const lamp = sprite('street_lamp', { day, dn: armDir });
      x.drawImage(lamp.cv, poleX - lamp.meta.poleX, 138);
    }
    return { glows, spots, lamps, shelterX, roofs };
  }

  /** Night-time glow from windows, shop lights and street lamps. */
  function buildLights(street) {
    const { k, x } = makeCanvas(W, H); x.translate(0, yOff);
    layer.lights = k;
    for (const gl of street.glows) drawGlow(x, gl[0], gl[1], gl[3], gl[2], gl[4]);
    for (const s of street.spots) { // light spilling from shop doors onto the sidewalk and road
      x.fillStyle = `rgba(${s.col},.07)`; x.fillRect(s.x, WORLD.sidewalkY, s.w, 10);
      for (let yy = 178; yy < 216; yy += 2) {
        x.fillStyle = `rgba(${s.col},${(.06 * (1 - (yy - 178) / 46)).toFixed(3)})`;
        x.fillRect(s.x + (((yy >> 1) % 2) ? 0 : 1), yy, s.w - 1, 1);
      }
    }
    drawGlow(x, street.shelterX + 22, 167, 16, '170,210,255', .16); // bus shelter light
    for (const lamp of street.lamps) {
      const hx = lamp.headX;
      drawGlow(x, hx, 142, 24, '255,214,140', .20);
      x.fillStyle = 'rgba(255,220,150,.045)';
      x.beginPath(); x.moveTo(hx - 2, 141); x.lineTo(hx + 2, 141); x.lineTo(hx + 22, 176); x.lineTo(hx - 22, 176); x.closePath(); x.fill();
      x.fillStyle = '#ffe6a8'; x.fillRect(hx - 2, 139, 5, 2);
      for (let i = 0, yy = 178; yy < 216; yy += 2, i++) { // reflection on wet-looking road
        x.fillStyle = `rgba(255,220,150,${(.10 * (1 - (yy - 178) / 45)).toFixed(3)})`;
        x.fillRect(hx - 1 + lamp.wobble[i], yy, 3, 1);
      }
    }
  }

  /** Screen-edge darkening, walkers, and rain/snow particles. */
  function buildMisc() {
    const v = makeCanvas(W, H);
    const grad = v.x.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .35, W / 2, H * .55, Math.max(W, H) * .75);
    grad.addColorStop(0, 'rgba(2,3,14,0)'); grad.addColorStop(1, 'rgba(2,3,14,.55)');
    v.x.fillStyle = grad; v.x.fillRect(0, 0, W, H); layer.vignette = v.k;

    rand = Math.random;
    peds = []; for (let i = 0, n = Math.max(3, Math.round(W / cfg.pedestrians.perScreenWidth)); i < n; i++) peds.push(makePedestrian(Math.random() * W, Math.random() < .5 ? 1 : -1, false));
    drops = []; for (let i = 0, n = Math.round(W * H / 220); i < n; i++) drops.push({ x: Math.random() * W, y: -yOff + Math.random() * H, speed: 260 + Math.random() * 80, groundY: 160 + Math.random() * 54 });
    flakes = []; for (let i = 0, n = Math.round(W * H / 320); i < n; i++) flakes.push({ x: Math.random() * W, y: -yOff + Math.random() * H, speed: 12 + Math.random() * 16, phase: Math.random() * 6, size: Math.random() < .3 ? 2 : 1 });
    splashes = []; puffs = []; rockets = []; sparks = []; flashes = [];
    snowNoise = []; for (let i = 0; i < W; i++) snowNoise.push(Math.random());
    puddleSpeck = []; for (let i = 0; i < Math.round(W * .8); i++) puddleSpeck.push({ x: Math.floor(Math.random() * W), y: 179 + Math.floor(Math.random() * 36), t: Math.random() });
  }

  /* ===================================================================
     6. ACTORS  (streetcars and pedestrians)
     =================================================================== */
  /** Adds a streetcar at the edge of the screen. dir: 1 = eastbound (moves right), -1 = westbound. */
  function spawnStreetcar(dir, forceStop) {
    const lane = dir < 0 ? 'A' : 'B';
    for (const q of cars) { if (q.lane === lane) { const busy = dir > 0 ? q.x < L + 26 : q.x > W - L - 26; if (busy) return null; } } // entrance still occupied
    const [nightFrom, nightTo] = cfg.traffic.nightRouteMinutes;
    const route = (clock >= nightFrom && clock < nightTo) ? ROUTE_NIGHT : ROUTES[(Math.random() * ROUTES.length) | 0];
    const speed = rangeOf(cfg.traffic.speed);
    const car = {
      dir, lane, railY: lane === 'A' ? WORLD.laneA : WORLD.laneB,
      x: dir > 0 ? -L - 2 : W + 2, v: speed, maxSpeed: speed,
      route, destination: dir > 0 ? route.e : route.w,
      sprite: sprite('streetcar', { dir, num: route.n, seed: (Math.random() * 4) | 0 }).cv,
      willStop: !!forceStop || Math.random() < cfg.traffic.stopChance, served: false,
      state: 'run', dwell: 0, sparkTimer: 0,   // state: 'run' | 'dwell' (waiting at the stop)
    };
    cars.push(car); return car;
  }
  function makePedestrian(x, dir, temporary) {
    const p = cfg.pedestrians;
    return { x, dir, speed: rangeOf(p.speed), shirt: pick2(p.shirts), skin: pick2(p.skin), hair: pick2(p.hair), umbrella: pick2(p.umbrellas), temporary, phase: Math.random() * 4, age: 0 };
  }
  const pick2 = arr => arr[(Math.random() * arr.length) | 0];
  /** Passengers step off a stopped streetcar. */
  function passengersAlight(car) {
    const n = Math.random() < .35 ? 0 : 1 + (Math.random() < .5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const door = [6, 42, 73][(Math.random() * 3) | 0] + 3;
      peds.push(makePedestrian(car.dir > 0 ? car.x + door : car.x + L - door, Math.random() < .5 ? 1 : -1, true));
    }
  }
  /** Distance from a streetcar's middle to the stop (positive = still approaching). */
  const distanceToStop = c => c.dir > 0 ? stopX - (c.x + L / 2) : (c.x + L / 2) - stopX;

  /* ===================================================================
     7. FIREWORKS
     =================================================================== */
  function startFireworks() { showTime = cfg.fireworks.showSeconds; showTimer = 0; }
  function launchRocket() {
    rockets.push({ x: W * (.1 + .8 * Math.random()), y: 150, targetY: Math.max(-yOff + 22, 28 + Math.random() * 60), speed: 70 + Math.random() * 30, colour: pick2(FIREWORK_COLOURS), trail: [] });
  }
  function burst(r) {
    const ring = Math.random() < .3, n = 34 + Math.floor(Math.random() * 30), second = pick2(FIREWORK_COLOURS), spd = 25 + Math.random() * 30;
    flashes.push({ x: Math.round(r.x), y: Math.round(r.y), t: 0, colour: r.colour });
    for (let i = 0; i < n; i++) {
      const a = ring ? i / n * Math.PI * 2 : Math.random() * Math.PI * 2, s = ring ? spd : spd * (.25 + Math.random() * .75);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.2 + Math.random() * .9, colour: Math.random() < .7 ? r.colour : second });
    }
    if (sparks.length > 900) sparks.splice(0, sparks.length - 900);
  }
  function updateFireworks(dt) {
    if (showTime > 0) {
      showTime -= dt; showTimer -= dt;
      if (showTimer <= 0) { launchRocket(); if (Math.random() < .25) launchRocket(); showTimer = .35 + Math.random() * .7; }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.trail.unshift({ x: r.x, y: r.y }); if (r.trail.length > 6) r.trail.pop();
      r.y -= r.speed * dt; r.x += Math.sin(elapsed * 9 + r.speed) * 4 * dt;
      if (r.y <= r.targetY) { burst(r); rockets.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const q = sparks[i];
      q.vx *= 1 - dt * .9; q.vy = q.vy * (1 - dt * .9) + 30 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.life += dt;
      if (q.life > q.max) sparks.splice(i, 1);
    }
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > .3) flashes.splice(i, 1); }
  }
  function drawFireworks() {
    if (!rockets.length && !sparks.length && !flashes.length) return;
    const alpha = .25 + .75 * nightF;
    for (const r of rockets) {
      for (let i = 0; i < r.trail.length; i++) { g.globalAlpha = alpha * (1 - i / r.trail.length) * .6; g.fillStyle = '#ffd890'; g.fillRect(Math.round(r.trail[i].x), Math.round(r.trail[i].y), 1, 1); }
      g.globalAlpha = alpha; g.fillStyle = '#fff3c8'; g.fillRect(Math.round(r.x), Math.round(r.y), 1, 2);
    }
    for (const f of flashes) { g.globalAlpha = (1 - f.t / .3) * alpha; g.drawImage(glowSprite(12, f.colour, .45), f.x - 12, f.y - 12); }
    for (const q of sparks) {
      g.globalAlpha = (1 - q.life / q.max) * alpha; g.fillStyle = `rgb(${q.colour})`;
      const size = q.life < .25 ? 2 : 1; g.fillRect(Math.round(q.x), Math.round(q.y), size, size);
    }
    g.globalAlpha = 1;
  }

  /* ===================================================================
     8. UPDATE  (advance the world by dt seconds)
     =================================================================== */
  function updateClock(dt) {
    const before = clock;
    if (timeMode === 'timelapse') clock = (clock + dt * 1440 / cfg.timelapseSeconds) % 1440;
    else if (timeMode === 'live') {
      clock = (clock + dt / 60) % 1440;
      liveSync -= dt; if (liveSync <= 0) { clock = readTorontoMinutes(); liveSync = 5; } // drift correction
    }
    if (cfg.fireworksAtMidnight && clock < before - 600) startFireworks();               // wrapped past midnight
  }

  function update(dt) {
    updateClock(dt);
    updateFireworks(dt);
    updateLighting();
    // Weather effects on lighting and ground
    snowCover = weather === 2 ? Math.min(1, snowCover + dt / 45) : Math.max(0, snowCover - dt * (weather === 1 ? 1 / 25 : (dayF > .5 ? 1 / 60 : 1 / 180)));
    const overcastTarget = weather === 1 ? .45 : weather === 2 ? .3 : 0;
    overcast += (overcastTarget - overcast) * Math.min(1, dt * .8);

    // Spawn streetcars on a timer per direction
    if (!clearing) for (const [key, dir] of [['westbound', -1], ['eastbound', 1]]) {
      timers[key] -= dt;
      if (timers[key] <= 0) timers[key] = spawnStreetcar(dir, false) ? rangeOf(cfg.traffic.secondsBetweenCars) : 1.5;
    }
    // Move streetcars: accelerate, slow for the car ahead, stop at the shelter
    const accel = cfg.traffic.acceleration * (clearing ? 2 : 1);
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      if (clearing) { c.willStop = false; c.served = true; c.maxSpeed = Math.max(c.maxSpeed, 60); if (c.state === 'dwell') c.dwell = 0; } // everyone drives off
      if (c.ridden) { c.willStop = false; c.served = true; c.maxSpeed = Math.max(c.maxSpeed, 55); if (c.state === 'dwell') c.dwell = 0; } // carries its rider straight off screen
      if (c.state === 'dwell') { c.v = 0; c.dwell -= dt; if (c.dwell <= 0) { c.state = 'run'; c.served = true; } }
      else {
        let wanted = c.maxSpeed;
        const d = distanceToStop(c);
        if (c.willStop && !c.served && d > -1) wanted = Math.min(wanted, Math.sqrt(Math.max(0, 2 * accel * d)));
        let gap = 1e9;
        for (const q of cars) { if (q === c || q.lane !== c.lane) continue; const gp = c.dir > 0 ? q.x - (c.x + L) : c.x - (q.x + L); if (gp > -2 && gp < gap) gap = gp; }
        if (gap < 60) wanted = Math.min(wanted, Math.sqrt(Math.max(0, 2 * accel * (gap - 10))));
        c.v = c.v < wanted ? Math.min(c.v + accel * dt, wanted) : wanted;
        c.x += c.dir * c.v * dt;
        if (c.willStop && !c.served && distanceToStop(c) <= .6) { c.x = stopX - L / 2; c.v = 0; c.state = 'dwell'; c.dwell = rangeOf(cfg.traffic.dwellSeconds); passengersAlight(c); }
      }
      c.sparkTimer -= dt; if (c.sparkTimer <= 0 && c.state !== 'dwell' && Math.random() < dt * .5) c.sparkTimer = .09; // pantograph spark
      if ((c.dir > 0 && c.x > W + 6) || (c.dir < 0 && c.x < -L - 6)) {
        if (c.ridden) riding = false; // free to pick another car once this one's gone
        cars.splice(i, 1);
      }
    }
    if (clearing && !clearSent && !cars.length && !peds.length) { clearSent = true; window.dispatchEvent(new Event('mars-street-clear')); }
    // Pedestrians: walkers wrap around the screen; passengers leave and disappear
    for (let i = peds.length - 1; i >= 0; i--) {
      const p = peds[i];
      if (p.wait > 0) { p.wait -= dt; if (clearing) peds.splice(i, 1); continue; } // walkers re-entering after the launch prep
      if (clearing) p.speed = Math.max(p.speed, 40);                                // everyone walks off screen
      p.x += p.dir * p.speed * dt; p.age += dt;
      if (clearing) { if (p.x > W + 8 || p.x < -8) peds.splice(i, 1); }
      else if (p.temporary) { if (p.x > W + 8 || p.x < -8 || p.age > 25) peds.splice(i, 1); }
      else { if (p.x > W + 6) p.x = -6; else if (p.x < -6) p.x = W + 6; }
    }
    // Steam rising from the grate
    timers.steam -= dt;
    if (timers.steam <= 0) { timers.steam = .22; puffs.push({ x: ventX + Math.random() * 2 - 1, y: 173, t: 0, life: 3.5 + Math.random() * 1.5, phase: Math.random() * 6 }); }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t += dt; p.y -= 9 * dt; p.x += Math.sin(elapsed * 1.3 + p.phase) * 4 * dt; if (p.t > p.life) puffs.splice(i, 1); }
    // Office windows flicker on and off
    timers.windows += dt;
    if (timers.windows > .3) { timers.windows = 0; for (let i = 0, n = 1 + ((Math.random() * 3) | 0); i < n; i++) { const w = litWindows[(Math.random() * litWindows.length) | 0]; if (w) w.on = !w.on; } }
    // Clouds and the occasional plane
    for (const cl of clouds) { cl.x += cl.speed * dt; if (cl.x > W + 4) cl.x = -cl.w; }
    if (!plane.on) { plane.timer -= dt; if (plane.timer <= 0) { plane.on = true; plane.dir = Math.random() < .5 ? 1 : -1; plane.x = plane.dir > 0 ? -6 : W + 6; plane.y = 30 + Math.random() * 40; } }
    else { plane.x += plane.dir * cfg.airplane.speed * dt; if (plane.x < -8 || plane.x > W + 8) { plane.on = false; plane.timer = rangeOf(cfg.airplane.secondsBetween); } }
    // Rain and snow
    if (weather === 1) {
      for (const d of drops) {
        d.y += d.speed * dt; d.x -= d.speed * dt * .18;
        if (d.y >= d.groundY) { splashes.push({ x: d.x, y: d.groundY, t: 0 }); d.y = -yOff - Math.random() * 30; d.x = Math.random() * W; d.groundY = 160 + Math.random() * 54; }
        if (d.x < 0) d.x += W;
      }
      for (let i = splashes.length - 1; i >= 0; i--) { splashes[i].t += dt; if (splashes[i].t > .18) splashes.splice(i, 1); }
    } else if (weather === 2) {
      for (const f of flakes) { f.y += f.speed * dt; f.x += Math.sin(elapsed * 1.2 + f.phase) * 8 * dt; if (f.y > 216) { f.y = -yOff - 4; f.x = Math.random() * W; } if (f.x < 0) f.x += W; if (f.x > W) f.x -= W; }
    }
  }

  /* ===================================================================
     9. DRAW  (one frame, back to front)
     =================================================================== */
  const blit = k => g.drawImage(k, 0, -yOff);

  function drawSkyGradient() {
    const pal = skyColours();
    for (let y = -yOff - 3; y < 160; y += 3) {
      const t = clamp(y / 155, 0, 1);
      g.fillStyle = rgb(t < .62 ? mix(pal.top, pal.mid, t / .62) : mix(pal.mid, pal.horizon, (t - .62) / .38));
      g.fillRect(0, y, W, 3);
    }
    g.fillStyle = rgb(pal.horizon); g.fillRect(0, 158, W, 70);
  }
  function drawSunAndMoon() {
    const hour = clock / 60, visible = 1 - overcast * .85;
    if (hour >= 6.5 && hour <= 19) {
      const [sx, sy] = skyBodyPosition(Math.PI * (hour - 6.5) / 12.5);
      const low = clamp(1 - sunHeight / .4, 0, 1);  // 0 = high noon sun, 1 = orange sunrise/sunset
      g.globalAlpha = (1 - low) * visible; g.drawImage(glowSprite(30, '255,225,150', .35), sx - 30, sy - 30); g.drawImage(sprite('sun', { tone: 'yellow' }).cv, sx - 8, sy - 8);
      g.globalAlpha = low * visible; g.drawImage(glowSprite(30, '255,140,70', .40), sx - 30, sy - 30); g.drawImage(sprite('sun', { tone: 'orange' }).cv, sx - 8, sy - 8);
      g.globalAlpha = 1;
    } else {
      const [mx, my] = skyBodyPosition(Math.PI * ((hour >= 19 ? hour - 19 : hour + 5) / 11.5));
      g.globalAlpha = visible; g.drawImage(glowSprite(22, '170,185,255', .10), mx - 22, my - 22); g.drawImage(sprite('moon').cv, mx - 8, my - 8); g.globalAlpha = 1;
    }
  }
  function drawStars() {
    const strength = nightF * (1 - overcast * .85);
    if (strength <= .02) return;
    for (const s of stars) {
      const a = (.35 + .65 * (.5 + .5 * Math.sin(elapsed * s.speed + s.phase))) * strength;
      g.globalAlpha = a; g.fillStyle = s.colour; g.fillRect(s.x, s.y, 1, 1);
      if (s.big) { g.globalAlpha = a * .5; g.fillRect(s.x - 1, s.y, 3, 1); g.fillRect(s.x, s.y - 1, 1, 3); }
    }
    g.globalAlpha = 1;
  }
  function drawCloudsAndPlane() {
    for (const cl of clouds) {
      const cx = Math.round(cl.x), cy = Math.round(cl.y);
      if (dayF < .98) { g.globalAlpha = 1 - dayF; g.drawImage(cl.night, cx, cy); }
      if (dayF > .02) { g.globalAlpha = dayF; g.drawImage(cl.day, cx, cy); }
    }
    g.globalAlpha = 1;
    if (!plane.on) return;
    const px = Math.round(plane.x), py = Math.round(plane.y);
    g.drawImage(sprite('airplane', { day: dayF > .5 }).cv, px - 2, py);
    if (lightsF > .4 && elapsed % 1 < .5) { g.fillStyle = '#ff4a4a'; g.fillRect(px + (plane.dir > 0 ? -2 : 1), py, 1, 1); } // blinking red light on the tail
  }
  function drawSkyline() {
    blit(layer.cityNight);
    if (dayF > .01) { g.globalAlpha = dayF; blit(layer.cityDay); g.globalAlpha = 1; }
    if (snowCover > .03) { const cap = Math.max(1, Math.round(snowCover * 3)); g.fillStyle = snowColour; for (const m of roofsMid) g.fillRect(m.x, m.y - cap, m.w, cap); }
    // Haze at the horizon
    const haze = mix(mix([150, 80, 120], [235, 242, 255], dayF), [255, 160, 100], twilight * .6);
    for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(${haze[0] | 0},${haze[1] | 0},${haze[2] | 0},${(.03 + i * .02 + dayF * .015).toFixed(3)})`; g.fillRect(0, 130 + i * 7, W, 8); }
    if (lightsF > .02) {
      g.globalAlpha = lightsF;
      WINDOW_COLOURS.forEach((col, ci) => { g.fillStyle = col; for (const w of litWindows) if (w.on && w.colour === ci) g.fillRect(w.x, w.y, 2, 3); });
      // CN Tower: colour-cycling lights
      const hue = (elapsed * 60) % 360, T = tower, glowR = Math.round(18 * T.k);
      g.drawImage(glowSprite(glowR, hueToRgb((Math.round(hue / 15) * 15) % 360), .2), towerX - glowR, T.bandY - glowR);
      // RGB light rings: a rainbow that travels around each pod
      for (let i = -T.podHW; i <= T.podHW; i++) { g.fillStyle = `hsl(${(hue + i * 14 + 720) % 360},95%,60%)`; g.fillRect(towerX + i, T.bandY, 1, T.bandH); }
      for (let i = -T.skHW; i <= T.skHW; i++) { g.fillStyle = `hsl(${(hue + 180 + i * 18 + 720) % 360},95%,60%)`; g.fillRect(towerX + i, T.skBandY, 1, T.skBandH); }
      g.globalAlpha = 1;
    }
    // Red aircraft beacons on tall buildings and the tower tip
    for (const b of beacons) if ((elapsed + b.phase) % 1.8 < .25) { g.globalAlpha = .4 + .6 * lightsF; g.drawImage(glowSprite(5, '255,60,60', .5), b.x - 5, b.y - 5); g.fillStyle = '#ff5050'; g.fillRect(b.x, b.y, 1, 1); g.globalAlpha = 1; }
    if (elapsed % 1.6 < .35) { g.globalAlpha = .4 + .6 * lightsF; g.drawImage(glowSprite(6, '255,50,50', .5), towerX - 6, tower.top + 1 - 6); g.fillStyle = '#ff4444'; g.fillRect(towerX, tower.top, 1, 2); g.globalAlpha = 1; }
  }
  function drawStreet() {
    blit(layer.streetNight);
    if (dayF > .01) { g.globalAlpha = dayF; blit(layer.streetDay); g.globalAlpha = 1; }
    if (lightsF > .02) { g.globalAlpha = lightsF; blit(layer.lights); g.globalAlpha = 1; }
    if (snowCover > .02) { // snow on roofs, sidewalk and road
      const cap = Math.max(1, Math.round(snowCover * 3));
      g.fillStyle = snowColour;
      for (const r of roofsStreet) g.fillRect(r.x, r.y - cap, r.w, cap);
      g.fillRect(stopX - 16, 157 - cap, 32, cap);
      for (let xx = 0; xx < W; xx++) {
        const n = snowNoise[xx] || 0, depth = Math.round(snowCover * 8 * (.55 + .45 * n)); if (depth > 0) g.fillRect(xx, WORLD.sidewalkY, 1, depth);
        const roadDepth = Math.round(snowCover * 3 * n); if (roadDepth > 0) g.fillRect(xx, WORLD.roadY, 1, roadDepth);
      }
      g.globalAlpha = .55; for (const q of puddleSpeck) if (q.t < snowCover * .4) g.fillRect(q.x, q.y, 1, 1); g.globalAlpha = 1;
    }
    for (const p of puffs) { const a = 1 - p.t / p.life, size = 2 + Math.floor(p.t * 1.6); g.fillStyle = `rgba(226,232,248,${(.24 * a).toFixed(3)})`; g.fillRect(Math.round(p.x - size / 2), Math.round(p.y), size, size); }
  }
  function drawPedestrian(p) {
    if (p.wait > 0) return;
    const frameNo = Math.floor(elapsed * 4 + p.phase) % 2;
    g.drawImage(sprite('pedestrian', { shirt: p.shirt, skin: p.skin, hair: p.hair, frame: frameNo, umb: weather === 1 ? p.umbrella : null }).cv, Math.round(p.x) - 3, 175 - 16);
  }
  function drawStreetcar(c) {
    const xi = Math.round(c.x), yi = c.railY - 34, d = c.dir;
    if (lightsF > .02) for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(255,190,100,${((.07 - i * .013) * lightsF).toFixed(3)})`; g.fillRect(xi + 6 + i, c.railY + 1 + i * 2, L - 16 - i * 2, 2); } // light on the road
    const reflection = .4 + .6 * nightF;
    for (const [from, to, alpha] of [[0, 8, .24], [8, 16, .14], [16, 26, .07]]) { // faded mirror image on the road
      g.save(); g.beginPath(); g.rect(xi, c.railY + 1 + from, L, to - from); g.clip();
      g.globalAlpha = alpha * reflection; g.translate(xi, c.railY + 1); g.scale(1, -1); g.drawImage(c.sprite, 0, -34); g.restore();
    }
    g.drawImage(c.sprite, xi, yi);
    if (c.ridden) { // clicked - whoever's home right now rides this one until it leaves the screen
      const riderX = xi + 53, riderY = yi + 19;
      g.save(); g.beginPath(); g.arc(riderX + .5, riderY + .5, 3, 0, 6.3); g.clip();
      drawHead(g, riderX, riderY, c.rideTheme);
      g.restore();
    }
    if (snowCover > .25) { g.fillStyle = snowColour; g.fillRect(xi + (d > 0 ? 1 : 4), yi + 7, 100, 1); }
    if (c.state === 'dwell') { g.fillStyle = 'rgba(255,250,210,.35)'; for (const dx of [6, 42, 73]) g.fillRect(xi + (d > 0 ? dx : L - dx - 6), yi + 16, 6, 12); } // open doors
    const frontX = d > 0 ? xi + L - 1 : xi, headY = c.railY - 12;
    g.fillStyle = `rgba(255,244,200,${(.02 + .055 * lightsF).toFixed(3)})`; // headlight beam
    g.beginPath(); g.moveTo(frontX, headY - 1); g.lineTo(frontX + d * 64, headY - 9); g.lineTo(frontX + d * 64, c.railY + 7); g.lineTo(frontX, headY + 2); g.closePath(); g.fill();
    g.globalAlpha = .3 + .7 * lightsF; g.drawImage(glowSprite(6, '255,244,200', .6), frontX - 6 + d * 2, headY - 5); g.globalAlpha = 1;
    if (c.sparkTimer > 0) { const sy = c.lane === 'A' ? 163 : 177, sx = xi + (d > 0 ? 42 : L - 1 - 42); g.fillStyle = '#bfefff'; g.fillRect(sx - 1, sy - 1, 3, 1); g.fillRect(sx, sy - 2, 1, 3); }
  }
  /** Rain drops, splashes and snow flakes. Drawn before the people and streetcars so they stay in front. */
  function drawWeatherParticles() {
    if (weather === 1) {
      g.fillStyle = dayF > .5 ? 'rgba(130,150,205,.55)' : 'rgba(170,190,255,.45)';
      for (const d of drops) g.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
      g.fillStyle = 'rgba(150,170,240,.6)';
      for (const s of splashes) { const x0 = Math.round(s.x), y0 = Math.round(s.y); g.fillRect(x0 - 1, y0, 1, 1); g.fillRect(x0 + 1, y0, 1, 1); if (s.t < .09) g.fillRect(x0, y0 - 1, 1, 1); }
    } else if (weather === 2) {
      for (const f of flakes) { g.fillStyle = f.size > 1 ? 'rgba(250,252,255,.95)' : 'rgba(240,244,255,.75)'; g.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size); }
    }
  }

  /** The grey-blue wash over everything in rain and snow. */
  function drawWeatherTint() {
    if (weather === 1) { g.fillStyle = `rgba(4,8,28,${(.10 + .06 * nightF).toFixed(3)})`; g.fillRect(0, -yOff, W, H); }
    else if (weather === 2) { g.fillStyle = 'rgba(120,140,220,.05)'; g.fillRect(0, -yOff, W, H); }
  }

  function draw() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.translate(0, yOff);
    snowColour = rgb(mix([150, 165, 210], [245, 248, 255], dayF));

    drawSkyGradient();
    drawSunAndMoon();
    drawStars();
    drawCloudsAndPlane();
    drawFireworks();
    drawSkyline();
    drawStreet();
    drawWeatherParticles();

    // Sidewalk walkers, then the far (westbound) lane, then the near (eastbound) lane
    const wall = mix([110, 120, 180], [60, 66, 96], dayF);
    g.fillStyle = `rgba(${wall[0] | 0},${wall[1] | 0},${wall[2] | 0},.5)`; g.fillRect(0, 163, W, 1);
    for (const p of peds) drawPedestrian(p);
    for (const c of cars) if (c.lane === 'A') drawStreetcar(c);
    const curb = mix([20, 24, 50], [44, 48, 74], dayF);
    g.fillStyle = `rgba(${curb[0] | 0},${curb[1] | 0},${curb[2] | 0},.55)`; g.fillRect(0, 177, W, 1);
    for (const c of cars) if (c.lane === 'B') drawStreetcar(c);

    drawWeatherTint();
    if (twilight > .02) { g.fillStyle = `rgba(255,120,60,${(.10 * twilight).toFixed(3)})`; g.fillRect(0, -yOff, W, H); } // warm dawn/dusk tint
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = .3 + .7 * nightF; g.drawImage(layer.vignette, 0, 0); g.globalAlpha = 1;
  }

  /* ===================================================================
     10. START-UP & CONTROLS
     =================================================================== */
  function applyTime(t) {
    if (t === 'live') { timeMode = 'live'; clock = readTorontoMinutes(); liveSync = 5; }
    else if (t === 'timelapse') { timeMode = 'timelapse'; }
    else { timeMode = 'fixed'; clock = ((+t % 1440) + 1440) % 1440; }
    updateLighting();
  }
  function applyWeather(name) { const i = WEATHERS.indexOf(name); weather = i < 0 ? 0 : i; }

  /** (Re)builds everything that depends on the screen size. */
  function build() {
    const vw = window.innerWidth, vh = window.innerHeight, ps = cfg.pixelScale;
    P = Math.max(ps.min, Math.floor(Math.min(vw / ps.targetWidth, vh / ps.targetHeight)));
    W = Math.ceil(vw / P); H = Math.ceil(vh / P); yOff = H - WORLD.height;
    canvas.width = W; canvas.height = H; canvas.style.width = W * P + 'px'; canvas.style.height = H * P + 'px';
    g.imageSmoothingEnabled = false;
    stopX = Math.round(W * cfg.layout.streetcarStop); towerX = Math.round(W * cfg.layout.cnTower); ventX = Math.round(W * cfg.layout.steamGrate);
    towerGeo = sprites.towerGeo(yOff);
    tower = Object.assign({}, towerGeo, sprite('cn_tower', { day: false, geo: towerGeo }).meta);
    buildSky();
    buildCity(false); buildCity(true);
    const street = buildStreet(false); buildStreet(true);
    roofsStreet = street.roofs;
    buildLights(street);
    buildMisc();
    rand = Math.random;
    cars = []; timers.westbound = 6; timers.eastbound = 2.5;
    if (!clearing) { const first = spawnStreetcar(-1, true); if (first) first.x = W * .74; } // start with a car already in view
    if (reduceMotion) { updateLighting(); draw(); }
  }

  applyTime(cfg.time);
  applyWeather(cfg.weather);
  build();

  let rafId = 0, destroyed = false, lastFrame = performance.now(), resizeTimer = 0;
  function frame(now) {
    // Stop quietly if the page navigated away and the canvas was removed
    if (destroyed || !canvas.isConnected) { destroy(); return; }
    const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now; elapsed += dt;
    update(dt); draw();
    rafId = requestAnimationFrame(frame);
  }
  if (!reduceMotion) rafId = requestAnimationFrame(frame);

  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 150); }
  window.addEventListener('resize', onResize);

  // The Mars launch easter egg asks the street to empty out first (see MarsEasterEgg.astro).
  function onClearStreet() {
    clearing = true; clearSent = false;
    if (reduceMotion) { cars = []; peds = []; draw(); clearSent = true; window.dispatchEvent(new Event('mars-street-clear')); }
  }
  function onResumeStreet() {
    clearing = false; timers.westbound = 3; timers.eastbound = 6;
    for (let i = 0, n = Math.max(3, Math.round(W / cfg.pedestrians.perScreenWidth)); i < n; i++) { // walkers stroll back in from the edges
      const dir = Math.random() < .5 ? 1 : -1, p = makePedestrian(dir > 0 ? -6 : W + 6, dir, false); p.wait = i * 2.5 + Math.random() * 2; peds.push(p);
    }
  }
  window.addEventListener('mars-clear-street', onClearStreet);
  window.addEventListener('mars-resume-street', onResumeStreet);

  // Click a passing streetcar and whoever's home right now hops on, riding along until it drives off screen.
  let riding = false;
  function onClick(e) {
    if (riding || clearing || document.querySelector('#mars-egg')) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / P, y = (e.clientY - rect.top) / P - yOff;
    for (const c of cars) {
      if (x >= c.x && x <= c.x + L && y >= c.railY - 34 && y <= c.railY) {
        riding = true; c.ridden = true; c.rideTheme = isLynix() ? 'lynix' : 'mars';
        return;
      }
    }
  }
  document.addEventListener('click', onClick);

  function destroy() {
    destroyed = true; cancelAnimationFrame(rafId); clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mars-clear-street', onClearStreet);
    window.removeEventListener('mars-resume-street', onResumeStreet);
    document.removeEventListener('click', onClick);
  }

  return {
    setTime: applyTime,
    setWeather: applyWeather,
    fireworks: startFireworks,
    callStreetcar() { if (clearing) return; const d = Math.random() < .5 ? 1 : -1; if (!spawnStreetcar(d, true)) spawnStreetcar(-d, true); },
    destroy,
  };
}
