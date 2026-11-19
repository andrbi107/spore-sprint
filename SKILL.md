---
name: fungifury
description: Spore Sprint — a mushroom-forest vertical-climbing platformer PWA that teaches auto-hop physics, one-way platform collision, camera scrolling, and offline-first installable game structure.
---

# Spore Sprint

## What this skill gives the model

After reading this skill, the model understands:

- the genre and core loop of Spore Sprint (a Doodle-Jump-style vertical climber)
- the exact mechanics (auto-hop, platform types, spore streaks, rot caps, altitude multiplier, lives)
- the controls (touch + keyboard + mouse/pointer)
- the PWA structure required (manifest, service worker, icon)
- the file layout and how to deploy on GitHub Pages

## Game design

Spore Sprint is a portrait vertical-climbing platformer set in a mushroom forest at dusk. The player is a small mushroom character that bounces continuously upward between floating mossy platforms. The only direct control is horizontal movement; vertical motion is automatic — every time the mushroom lands on a platform it launches itself back into the air. The goal is to climb as high as possible, collecting glowing spores for score and dodging falling poisonous "rot caps".

The visual identity is built entirely from canvas primitives: a dark forest-green gradient sky with faint drifting fireflies, distant pine-tree silhouettes drawn as dark triangles for parallax depth, mossy green rounded-rectangle platforms topped with tiny red-capped mushrooms, a red-capped white-spotted mushroom hero with little legs that swing when it moves, glowing yellow spores with radial halos, and dark-purple rot-cap enemies with angry red eyes that tumble from above. No external images, fonts, or audio files are used.

Scoring rewards altitude and consistency. Each spore is worth 10 points times the current altitude multiplier (every 100px climbed adds +1 to the multiplier). Collecting five spores in a row without missing awards a +50 streak bonus and a brief horizontal speed boost. Touching a rot cap costs one life and grants a short blink of invulnerability; falling off the bottom of the screen also costs a life. The run ends at zero lives, and the best score persists to `localStorage` under the key `sporeSprint.best`.

Difficulty scales with altitude: the vertical gap between platforms widens, special platforms (crumbly, springy, moving) become more frequent, and rot-cap spawn rate increases. This keeps the climb tense without changing the core one-button feel.

## Mechanics in detail

- **Auto-hop**: gravity pulls the mushroom down each frame; when its feet cross a platform top while falling, it is snapped to the platform and `vy` is set to a fixed launch speed (`JUMP_V`). Springy platforms use a larger launch speed (`SPRING_V`).
- **Horizontal control**: keyboard Left/Right or A/D accelerate the player; touch-drag on the canvas steers toward the touch x; on-screen ◀ ▶ buttons set a discrete direction. The player wraps horizontally — exiting one edge re-enters the opposite edge.
- **Camera**: world coordinates increase downward. `camY` is the world y mapped to screen y=0. When the player's screen y rises above one-third of the canvas height, `camY` follows the player up. Altitude climbed = `startPlayerY - player.y`, tracked as a running maximum.
- **Platform types**: `normal` (mossy), `crumbly` (cracks drawn, breaks after one bounce), `spring` (coil drawn, extra-high bounce), `moving` (drifts horizontally via sine, arrows drawn). New platforms spawn above the highest one with a gap that widens with altitude; platforms below the screen are culled.
- **Spores**: spawned near ~40% of platforms; collected on proximity; +10 × multiplier; streak of 5 → +50 and a ~1.5s speed boost; streak resets on miss (a spore scrolling off-screen counts as a miss) or on taking damage.
- **Rot caps**: spawn just above the top of the screen at an interval that shrinks with altitude, fall downward, wobble, and are culled below the screen. AABB collision with the player while not invulnerable → lose a life, 90-frame blink invulnerability.
- **Lives & respawn**: start with 3. On losing a life (rot hit or falling off bottom), if lives remain, the mushroom respawns mid-screen on a fresh normal platform with an upward launch; altitude maximum is retained. On 0 lives → game over.
- **Multiplier**: `1 + floor(maxClimb / 100)`, applied to spore value. Altitude display in meters is `floor(maxClimb / 10)`.
- **Persistence**: best score saved to `localStorage` key `sporeSprint.best` on game over if beaten.

## Controls

- **Touch**: drag anywhere on the play area to steer toward your finger; or hold the on-screen ◀ ▶ buttons (shown on touch devices). Pause button top-right.
- **Keyboard**: Left/Right arrows or A/D to move; Esc or P to pause/resume; Space or Enter to start / retry.
- **Mouse**: click-and-drag on the play area steers the mushroom toward the pointer x (pointer events unify mouse, touch, and pen).

## File layout

- `index.html` — entry point; canvas, HUD overlay, start/pause/game-over screens, touch buttons; registers `sw.js`.
- `styles.css` — responsive portrait layout, HUD, screens, touch buttons; safe-area insets and `clamp()` sizing.
- `main.js` — full game: canvas setup, input, physics, entities, rendering, screens, loop.
- `manifest.json` — PWA manifest, `start_url: "./"`, `scope: "./"`, `orientation: "portrait"`, icon entry.
- `sw.js` — service worker precaching the shell and serving offline.
- `icon.svg` — red-capped white-spotted mushroom on a dark forest gradient.

## How to run / deploy

1. Open `index.html` directly in a browser, OR
2. Push the folder to a GitHub repo and enable Pages — the game runs from the repo root or a subfolder because all paths are relative.

## PWA install

The manifest + service worker make the game installable on Android/iOS/desktop. After first load it works offline (the shell is precached on install).

## Customization hooks

All tunables live at the top of `main.js`: `GRAVITY`, `JUMP_V`, `SPRING_V`, `MAX_VX`, `ACCEL_KEY`, `ACCEL_TOUCH`, `FRICTION`, `PLAYER_W/H`, `BASE_MIN_GAP`, `BASE_MAX_GAP`, platform-type probabilities in `pickType()`, rot-cap spawn interval in `updateRots()`, and the spore streak threshold (5) and boost duration (90) in the spore-collection block. Colors are inline in the draw functions.
