# King St W at John - background scene

An animated pixel-art street scene (Toronto, looking south toward the CN Tower) that
plays behind the home page. It is drawn on a `<canvas>`; there are no dependencies.

## Files

| File | What it is | Edit it when you want to... |
|---|---|---|
| `config.js` | Every setting, with comments | change time, weather, positions, traffic, sky colours, routes |
| `sprites.js` | Every object as a tiny SVG | recolour or redraw a building, streetcar, person, etc. |
| `scene.js` | The engine, in numbered sections | change behaviour (how things move, what is drawn on top of what) |
| `../components/CityBackground.astro` | Mounts the scene on a page | pick options for a page, or add the scene to another page |

## Common changes

**Freeze the time of day** - in `CityBackground.astro`, `time: 22 * 60 + 30` (22:30). Use `'live'` for
the real Toronto clock, or `'timelapse'` for a full day every 90 seconds.

**Weather** - `weather: 'rain'` or `'snow'`.

**Move things around** - `layout` in `config.js` (fractions of the screen width).

**More / fewer streetcars** - `traffic.secondsBetweenCars` (smaller = busier).

**Different routes** - `ROUTES` at the bottom of `config.js`.

**Chunkier or finer pixels** - `pixelScale.targetWidth` (smaller number = chunkier).

**Recolour a sprite** - open `sprites.js`, find the builder (`B.streetcar`, `B.theatre`, ...), and change
the hex colours. Night and day colours are chosen by the `day` option. Shared street colours are in `SP()`.

**Use it on another page** - `import CityBackground from '../components/CityBackground.astro'` and add
`<CityBackground />`. Add a dark overlay above it if you put text on top.

## How a frame works (scene.js)

1. The static parts (skyline, street, lights) are painted **once** into off-screen canvases, at night and by day.
2. Each frame, `update()` moves streetcars, people, steam, clouds, rain/snow and fireworks.
3. `draw()` paints back to front: sky, sun/moon, stars, clouds, skyline, street, people, streetcars, weather.
   Day and night layers are cross-faded by how high the sun is.

The scene stops itself when its canvas leaves the page, and shows a single still frame if the visitor has
"reduce motion" turned on.

## Controlling it from code

```js
const scene = createScene(canvas, { time: 'live', weather: 'clear' });
scene.setTime(6 * 60);      // 06:00
scene.setWeather('snow');
scene.fireworks();
scene.callStreetcar();
scene.destroy();
```
