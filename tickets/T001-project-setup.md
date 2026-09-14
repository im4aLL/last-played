# T001 - Project setup and tooling

- Status: Done
- Phase: 0 - Setup
- Depends on: none
- Plan refs: PLAN.md (Tech stack)

## Outcome

The repository is ready for feature work: React + TypeScript + Vite + Tailwind v4 + shadcn/ui, React Router, TanStack Query, Zustand, the `@/*` path alias, lint + format, and a working test runner. `npm run tauri dev` opens a window that renders a placeholder React screen.

## Tasks

- Convert the vanilla template entry from `main.ts` to `main.tsx`; update `index.html`.
- Install and configure Tailwind v4 with the `@tailwindcss/vite` plugin; remove template CSS.
- Initialize shadcn/ui (`components.json`, `cn` helper in `src/lib/utils.ts`, theme tokens in `src/index.css`); add a couple of base components.
- Add React Router, TanStack Query, Zustand.
- Add the `@/*` alias to `tsconfig.json` and `vite.config.ts`.
- Add ESLint + Prettier (or Biome) with scripts.
- Add Vitest + React Testing Library with a smoke test.
- Confirm `npm run tauri dev` runs.

## Verify

- `npm run tauri dev` opens a window rendering a placeholder React screen.
- `npm run build`, `npm run test`, and the lint script pass.
- An import via `@/...` resolves.

## Out of scope

- Real screens, routing targets, data, or backend commands.
