# OmniMechanics

**How things really work** — an interactive field guide that takes everyday
machines, mechanisms and natural systems apart, sets them running, and shows
the trade-off at the heart of each one.

Every entry is a working, animated schematic drawn entirely in SVG — no video,
no image assets. Open any plate for a full teardown: scrub through the operating
cycle by hand, step through the sequence of operation, and read the parts list
and field notes.

## What's inside

Eight fully-animated mechanisms across seven disciplines:

| No. | Mechanism | Discipline | The idea |
| --- | --------- | ---------- | -------- |
| 001 | Spur Gear Train | Machines | Trades speed for turning force |
| 002 | Four-Stroke Engine | Energy | Turns controlled explosions into rotation |
| 003 | Pin-Tumbler Lock | Everyday | Aligns split pins to a shear line |
| 004 | Cam & Follower | Machines | Turns rotation into timed linear motion |
| 005 | Pendulum Escapement | Timekeeping | Rations stored power one tick at a time |
| 006 | Brushed DC Motor | Electronics | Flips its own current to keep spinning |
| 007 | Hydraulic Press | Force & Motion | Multiplies force through trapped fluid |
| 008 | The Water Cycle | Nature | The sun's phase-change engine |

## Features

- **Live mechanisms** — each schematic is animated in real time from a shared
  clock, so gears mesh, pistons reciprocate and pendulums swing at physically
  sensible rates.
- **Workbench controls** — a global power switch and 0.5× / 1× / 2× speed dial
  drive every animation on the page at once.
- **Interactive teardown** — scrub the operating cycle with a slider, jump to
  any step, and browse specimens with the ← / → keys.
- **Two themes** — "drafting paper" (light) and "workshop" (dark), remembered
  between visits.
- **Search, filter & shuffle** — find mechanisms by name or principle, filter by
  discipline, or pull a random specimen.
- **Accessible & efficient** — honours `prefers-reduced-motion` (starts paused),
  pauses off-screen diagrams, and is keyboard-navigable.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build to /dist
npm run preview   # serve the production build
```

Requires Node 18+.

## Tech

- **React 18 + TypeScript**, built with **Vite**.
- **Hand-written CSS** design system (CSS custom properties, light/dark themes) —
  no UI framework.
- **SVG** for every diagram, animated with `requestAnimationFrame` via a shared
  motion context.
- Fonts: Space Grotesk (display), IBM Plex Sans (text), IBM Plex Mono (technical
  labels).

## Project structure

```
src/
  data/mechanisms.ts        the catalogue (content + metadata)
  lib/clock.tsx             motion context + per-diagram animation clock
  lib/ui.ts                 category colours, cycle periods
  components/
    diagrams/               one file per animated mechanism
    Diagram.tsx             kind -> component dispatch + live wrapper
    Masthead / Controls / MechanismCard / DetailView ...
  styles.css                the whole design system
```

## Adding a mechanism

1. Add a diagram component in `src/components/diagrams/` that accepts
   `{ t, detailed }` (where `t` is elapsed shaft-time in seconds) and draws a
   pure SVG frame.
2. Register its `DiagramKind` in `src/types.ts`, the dispatch map in
   `Diagram.tsx`, and a cycle length in `lib/ui.ts`.
3. Add a catalogue entry in `data/mechanisms.ts`.

The card, teardown, scrubber and controls all work automatically from there.
