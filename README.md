# OmniMechanics

**How things really work.** Thirteen interactive drawings of machines, circuits and systems. Each is a live
simulation built on the equations engineers use, with the numbers next to the picture, the common myth it
busts, a few "try this" experiments and a short quiz.

Open **`OmniMechanics.html`** in any modern browser. It is one self-contained file (fonts included), works
offline, and sends nothing anywhere. Light theme is engineering-pad paper, dark theme is a cyanotype
blueprint, and it follows your system setting or the toggle in the header.

## What is inside

| # | Mechanism | The idea |
|---|---|---|
| 01 | Four-stroke engine | Cylinder pressure, valve timing with overlap, spark timing, throttle pumping loss, P–V diagram |
| 02 | Gears and gear trains | True involute teeth that really mesh, ratio trading speed for torque |
| 03 | Pulleys, block and tackle | Rope tensions, mechanical advantage, friction, work in = work out |
| 04 | Hydraulic jack and brakes | Pascal's principle, force against travel, why air makes a pedal spongy |
| 05 | Pin tumbler lock | Shear line, key cuts, why exactly one of 59,049 keys opens it |
| 06 | DC electric motor | Lorentz force, commutator, back-EMF, stall current, torque ripple |
| 07 | Transformer | Turns ratio, flux density, core saturation, what happens with DC |
| 08 | Adding with logic gates | XOR/AND/OR full adder, ripple carry with visible gate delay |
| 09 | Refrigerator | R-134a vapour-compression loop, P–h diagram, thermostat cycling, COP |
| 10 | Airplane wing | Exact potential flow round a Joukowski wing, pressure map, the transit-time myth, stall |
| 11 | Noise-cancelling headphones | Cancellation by delay, why low pitches work and high ones do not |
| 12 | GPS | Pseudoranges, solving for the clock error, Gauss–Newton step by step |
| 13 | Orbits and Newton's cannon | Free fall with sideways speed, circular, elliptical and escape orbits |

## Accuracy

Every model in `src/lib/` is plain JavaScript that is unit-tested against known results, for example:

* engine: peak pressure 45–58 bar at 10–16° after TDC, best spark angle near 30° before TDC, net work rising with compression ratio
* gears: meshed involute outlines never overlap at any angle (and a half-pitch phase error does, so the test is meaningful)
* lock: of all 9⁵ = 59,049 keys exactly one sets every pin on the shear line
* airfoil: lift from integrating surface pressure matches the Kutta–Joukowski lift to within 2%, the trailing edge speed stays finite, no air crosses the surface, and the air over the top arrives first
* fridge: R-134a saturation pressure within 2% of table values, COP below the Carnot limit, heat balance closes
* orbit: energy conserved over many orbits, period from Kepler's third law, escape speed √2 × circular speed
* adder: every one of the 512 inputs gives the right sum

Each page also states what its model leaves out. These are realistic teaching numbers, not design data.

## Build and test

Needs Node 20 or newer. No dependencies to install.

```
node build.mjs              # writes OmniMechanics.html
npm test                    # 41 physics unit tests (node:test)
node tests/e2e/run.cjs      # browser test, needs Playwright + Chromium
```

The browser test opens every page, pushes every control to its extremes and to 40 random combinations, runs
the `Try this` presets, and fails on any console error, non-finite number, blank canvas, slow draw, sideways
scroll at phone width, or broken quiz / theme / keyboard behaviour.

## Layout

```
src/index.html        page template (build inlines CSS, fonts and scripts)
src/styles.css        design tokens, light and dark themes
src/core/             util, drawing helpers, registry, simulation host, router and views
src/lib/              physics models (pure JS, unit tested)
src/modules/          one file per mechanism
build.mjs             bundler, no dependencies
tests/unit/           physics tests
tests/e2e/            browser tests
```

### Adding a mechanism

Create `src/modules/14-name.js` and call `OM.register({...})` with an id, title, group, hook, units, a list of
`controls`, a `content` block (steps, principle, myth, tries, quiz) and a `create(host)` that returns the
simulation (`ref`, `init`, `step`, `draw`, `readouts`, optional `pointer`/`key`). The registry validates the
shape, the library card and thumbnail appear on their own, and the browser test picks it up automatically.
See the header of `src/core/30-sim.js` for the simulation interface.

## Credits

Type is [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type under the SIL Open Font License 1.1.
Sources for each model are listed on its page.
