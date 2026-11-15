# Escape Academy

Turn anything you want to learn into an escape-room adventure.

## Run locally

Requires Node.js 22.13 or newer. From this folder:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use the Clockwork Tower preview to play immediately. Ready-to-play lessons also cover the water cycle, ancient Egypt, states of matter, and food chains. The countdown resets at each chamber. Easy gives you 10 minutes per room, Medium gives you 7, and Hard gives you 5. Hold Shift to sprint.

For live custom topics, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` or `OPENAI_API_KEY`. Gemini is used when both are set. The browser only requests a plan from the application. The server uses structured output and validates the decoded plan before returning it. Generation errors and invalid plans fall back to a supported sample. See [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).

The local server assigns an HTTP-only guest session and stores the account, adventure plan, and progress in `data/academy.sqlite`. On Sites, the Worker uses platform sign-in and D1. In a running adventure, Pause pauses the session and Resume continues from the current position.

## Checks and builds

- `npm run check` checks TypeScript.
- `npm run build` builds Next.js and packages the Sites Worker. Use `npm start` to serve the Next.js production build locally.
- Set `OPENAI_API_KEY` as a private runtime secret on any hosted deployment to enable live generation.

## Code map

- `app/` — Next.js entry points and styles
- `ui/` — setup, game interface, inventory, puzzle controls, and recap
- `game/` — Three.js geometry, first-person camera, interaction targets, and animation
- `lib/plan.ts`, `lib/samples.ts`, `lib/puzzles.ts` — data format, lessons, and puzzle rules
- `lib/generate.ts`, `lib/server.ts` — server-side generation and adventure API
- `lib/db-local.ts`, `hosting/`, `drizzle/` — SQLite, hosted D1, and migrations
