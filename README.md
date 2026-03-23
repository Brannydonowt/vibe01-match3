# Match3Game

A small Three.js-powered match-3 game built to ship as a static site on GitHub Pages.

## Stack

- Vite
- TypeScript
- Three.js
- Vitest for gameplay rule tests

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`

## Controls

- Click a tile to select it.
- Click an adjacent tile to attempt a swap.
- Only swaps that create a match are accepted.

## Project notes

- This folder is initialized as its own git repository.
- The gameplay board uses Three.js while the menu, HUD, and end screens use HTML/CSS overlays.
- Matchable item art lives in `public/assets/sprites/`.

## Deployment

The project is configured to build with the GitHub Pages base path for `vibe01-match3`.

When this folder is initialized as its own git repository, the included workflow can deploy `dist/` to GitHub Pages from the `main` branch.
