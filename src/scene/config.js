/**
 * SCENE CONFIG - the one file to edit when you want to change how the scene looks or behaves.
 *
 * Pass overrides when mounting, e.g. in CityBackground.astro:
 *   createScene(canvas, { time: 22 * 60, weather: 'snow' })
 * Anything you leave out falls back to the defaults below.
 */
export const CONFIG = {
  /** Time of day.
   *  'live'       - follows the real clock in Toronto
   *  'timelapse'  - a full day passes in `timelapseSeconds`
   *  a number     - frozen at that many minutes after midnight (22 * 60 + 30 = 22:30) */
  time: 'live',
  timelapseSeconds: 90,

  /** 'clear' | 'rain' | 'snow' */
  weather: 'clear',

  /** Fireworks go off automatically when the clock passes midnight. */
  fireworksAtMidnight: true,

  /** Art pixels are scaled up by a whole number so they stay crisp.
   *  The scale is the largest whole number that fits targetWidth x targetHeight art
   *  pixels on screen (never below `min`). Lower targets = chunkier pixels. */
  pixelScale: { targetWidth: 360, targetHeight: 190, min: 2 },

  /** Where things stand, as a fraction of the screen width (0 = left edge, 1 = right edge). */
  layout: {
    streetcarStop: 0.5,          // where streetcars stop, plus the bus shelter and street sign
    cnTower: 0.66,
    domeOffsetFromTower: -46,    // Rogers Centre, in art pixels left (-) or right (+) of the tower
    steamGrate: 0.27,
    mailbox: 0.14,
    theatre: 0.05,
    officeTowers: [0.08, 0.30, 0.90],  // the three tall towers behind the skyline
  },

  /** Streetcars. Speeds are art pixels per second. */
  traffic: {
    speed: [30, 42],             // cruising speed range
    acceleration: 22,
    stopChance: 0.6,             // chance a car stops at the shelter
    dwellSeconds: [2.8, 4.2],    // how long it waits there
    secondsBetweenCars: [8, 18], // per direction
    /** Between these minutes after midnight the 504 becomes the overnight 304. */
    nightRouteMinutes: [90, 330],
  },

  /** People on the sidewalk. */
  pedestrians: {
    perScreenWidth: 95,          // one walker per this many art pixels of width (min 3)
    speed: [8, 16],
    shirts: ['#8a2b3a', '#2a4f86', '#a67a28', '#2b2b3a', '#5a3a75', '#1f6650', '#8a8a95'],
    umbrellas: ['#b03a4a', '#3a6fb0', '#c9a030', '#6a4a9a'],
    skin: ['#d9ac8c', '#a8744e', '#6e4630'],
    hair: ['#1a1420', '#4a3020', '#8a7a5a', '#2a2a3a'],
  },

  /** Sky colours as [r, g, b] at three heights: top of the sky, middle, and horizon. */
  sky: {
    night:    { top: [4, 7, 24],    mid: [14, 20, 54],    horizon: [84, 48, 92] },
    twilight: { top: [46, 48, 120], mid: [170, 86, 110],  horizon: [255, 160, 90] },
    day:      { top: [62, 132, 214], mid: [120, 176, 232], horizon: [196, 222, 244] },
  },

  /** Little extras. */
  airplane: { secondsBetween: [25, 50], speed: 14 },
  fireworks: { showSeconds: 14 },
};

/**
 * WORLD - vertical layout of the 216-pixel-tall scene, measured from the top.
 * These are baked into the sprite art, so treat them as fixed unless you also
 * redraw the sprites in sprites.js.
 */
export const WORLD = {
  height: 216,
  skylineBaseY: 156,   // where the far buildings and the CN Tower stand
  sidewalkY: 166,
  roadY: 178,
  laneA: 196,          // westbound rail y (streetcar wheels)
  laneB: 210,          // eastbound rail y
};

/** Streetcar sprite width in art pixels (matches the SVG in sprites.js). */
export const STREETCAR_WIDTH = 106;

/** Routes a streetcar can run. e = eastbound destination, w = westbound destination. */
export const ROUTES = [
  { n: '504', nm: 'KING', e: 'DISTILLERY LOOP', w: 'DUNDAS WEST STN' },
  { n: '504', nm: 'KING', e: 'BROADVIEW STN', w: 'DUFFERIN GATE' },
];
export const ROUTE_NIGHT = { n: '304', nm: 'KING', e: 'BROADVIEW STN', w: 'DUNDAS WEST STN' };
