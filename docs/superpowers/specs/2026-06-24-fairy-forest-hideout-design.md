# Fairy Forest Hideout Visual Design

## Goal

Make the village feel closer to a fairy-tale secret forest hideout while staying within free-to-use assets and reversible procedural Three.js changes.

## Non-Goals

- Do not add paid assets.
- Do not add user-owned decoration, inventory, placement, or persistence.
- Do not replace the current 3D scene architecture.
- Do not introduce large binary assets in this pass.

## Visual Direction

The target mood is "storybook forest hideout": warm, cute, dense, and discoverable. The main path should feel less like a plain straight lane and more like a hidden trail framed by flowers, mushrooms, leaves, and lantern light. The campfire area should read as a secret gathering circle, and the library entrance should feel like a small place found inside the woods.

## Asset Strategy

- Use procedural Three.js geometry first for mushrooms, lanterns, leaf arches, glow stones, flower clusters, and garlands.
- Keep existing free/CC0-compatible assets available in the repo.
- Treat Kenney and Poly Haven as safe future candidates only after each concrete asset is selected and recorded in `frontend/public/assets/village/LICENSE.md`.
- Avoid CC BY or unclear assets in this pass so no new public credits surface is required.

## Implementation Shape

- Extend `frontend/src/three/scenes/villageDecor.ts`.
- Keep all new objects deterministic and static except existing low-frequency update loops.
- Add `userData.villageDecorRole` markers for new visual groups so tests can confirm the scene composition.
- Keep ground-level meshes outside the protected central walking path.

## Acceptance Criteria

- The scene includes a fairy mushroom ring around the campfire.
- The central trail has flower/glow details and hanging lantern garlands.
- The library approach has a leafy secret arch and richer entrance dressing.
- Existing path clearance remains protected.
- Relevant Three.js scene tests pass.
