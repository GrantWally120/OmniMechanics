# OmniMechanics

**How things really work.** Nineteen interactive drawings of machines, circuits and systems. Each is a live
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
| 06 | Cam and follower | Motion laws, pressure angle, undercut, and the follower leaving the cam ("valve float") when it spins too fast |
| 07 | Pendulum clock escapement | Dead-beat escapement with real pallet contact, exact period at any swing, drive against drag, rate error, optional tick sound |
| 08 | DC electric motor | Lorentz force, commutator, back-EMF, stall current, torque ripple |
| 09 | Transformer | Turns ratio, flux density, core saturation, what happens with DC |
| 10 | Adding with logic gates | XOR/AND/OR full adder, ripple carry with visible gate delay |
| 11 | Solar panel | Single-diode cell model, the I–V curve, maximum power point, fill factor, heat and shade |
| 12 | Refrigerator | R-134a vapour-compression loop, P–h diagram, thermostat cycling, COP |
| 13 | Airplane wing | Exact potential flow round a Joukowski wing, pressure map, the transit-time myth, stall |
| 14 | The water cycle over a mountain | Evaporation, cloud base, latent heat, orographic rain and the rain shadow on the far side |
| 15 | Wind turbine and the Betz limit | Momentum theory, power coefficient, tip-speed ratio, blade pitch, the power curve |
| 16 | Noise-cancelling headphones | Cancellation by delay, why low pitches work and high ones do not |
| 17 | GPS | Pseudoranges, solving for the clock error, Gauss–Newton step by step |
| 18 | Orbits and Newton's cannon | Free fall with sideways speed, circular, elliptical and escape orbits |
| 19 | Lenses and images | Thin-lens equation, the three principal rays, real and virtual images, camera, projector and magnifier |

Every page also has a labelled parts list, a few verified facts with their dates, the era it comes from and a
difficulty level, and a link that reopens exactly the setup you are looking at.

## Putting it on Google Drive

Drive cannot run web pages, and the app is too big to paste through a chat, so `loader/OmniMechanics-loader.html`
is a 7 KB starter page. Put it in Drive (or anywhere), download it and open it in a browser. It fetches
`OmniMechanics.html` from this repository, keeps a copy in the browser, and from then on opens offline. When
you are online it always fetches the newest build first. `node tests/e2e/loader.cjs` tests it.

## Accuracy

Every model in `src/lib/` is plain JavaScript that is unit-tested against known results, for example:

* engine: peak pressure 45–58 bar at 10–16° after TDC, best spark angle near 30° before TDC, net work rising with compression ratio
* gears: meshed involute outlines never overlap at any angle (and a half-pitch phase error does, so the test is meaningful)
* lock: of all 9⁵ = 59,049 keys exactly one sets every pin on the shear line
* airfoil: lift from integrating surface pressure matches the Kutta–Joukowski lift to within 2%, the trailing edge speed stays finite, no air crosses the surface, and the air over the top arrives first
* fridge: R-134a saturation pressure within 2% of table values, COP below the Carnot limit, heat balance closes
* orbit: energy conserved over many orbits, period from Kepler's third law, escape speed √2 × circular speed
* adder: every one of the 512 inputs gives the right sum
* cam: peak-acceleration coefficients 4.0, 4.93 and 6.28 for the three motion laws, the follower leaves the cam at exactly the speed where the contact force first goes negative, and a cam with a roller bigger than its tip is flagged as undercut
* escapement: exact period ratios (1.0174 at 30°, 1.1803 at 90°), a 0.994 m pendulum beats seconds, a 30-tooth wheel turns once a minute, energy in equals energy lost at the working swing, and no pallet ever passes through a tooth
* water cycle: vapour pressure against tables, Bolton cloud base against the 125 m per degree rule, the far side is warmer by exactly the latent heat released, evaporation about 4 mm and 120 W/m² for a warm sea
* wind turbine: the power coefficient never exceeds 16/27 and peaks at an induction factor of 1/3, power goes with the cube of wind speed below rated and is held flat above it, and the blades are feathered at cut-out
* solar panel: about 300 W and 18% at one sun and 25 °C, current proportional to light while voltage grows only with its logarithm, about −0.3 to −0.5 % power per kelvin, and the maximum power point matches a brute-force search
* lens: 1/s + 1/s′ = 1/f for any distance, Newton's x·x′ = f², and the three principal rays meet at the image for every case including diverging lenses

Each page also states what its model leaves out. These are realistic teaching numbers, not design data.

## Build and test

Needs Node 20 or newer. Nothing is required to install. `npm install` adds esbuild, which makes the file about 40% smaller; without it the build still works and just skips minifying.

```
node build.mjs              # writes OmniMechanics.html
npm test                    # 96 physics unit tests (node:test)
npm run test:e2e            # browser tests, need Playwright + Chromium
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

Create `src/modules/20-name.js` and call `OM.register({...})` with an id, title, group, hook, units, a list of
`controls`, a `content` block (steps, principle, myth, tries, quiz, era, level, parts, facts) and a `create(host)` that returns the
simulation (`ref`, `init`, `step`, `draw`, `readouts`, optional `pointer`/`key`). The registry validates the
shape, the library card and thumbnail appear on their own, and the browser test picks it up automatically.
See the header of `src/core/30-sim.js` for the simulation interface.

## Credits

Type is [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type under the SIL Open Font License 1.1.
Sources for each model are listed on its page.
