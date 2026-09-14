# T002 - App shell: layout, navigation, theme

- Status: Done
- Phase: 1 - Frontend
- Depends on: T001
- Plan refs: PLAN.md (Frontend structure), M0

## Outcome

A Netflix-like application shell: sidebar or top bar, a content area, and routes for Library, Media detail, Settings, and Player. Light/dark theme driven by shadcn CSS variables and the OS system preference. All pages are placeholders.

## Tasks

- Build the layout shell (nav + content region) with Tailwind and shadcn primitives.
- Set up React Router with routes: `/` (library), `/media/:id`, `/settings`, `/player/:id`, plus a fallback route.
- Establish the theme tokens (shadcn CSS variables) for both light and dark.
- Apply the theme from the OS system preference (`prefers-color-scheme`), and react to live changes via `matchMedia`.
- Add a small responsive pass so the shell works at typical desktop window sizes.
- Keep `components/ui` for shadcn and `components/app` for app components.

## Verify

- Navigate every route and confirm the shell renders and highlights the active section.
- Resize the window and confirm the layout holds.
- Switch the OS appearance between light and dark and confirm the app follows without a reload.
- Inspect theme tokens in `src/index.css`.

## Out of scope

- Any real data, mock lists beyond placeholders, or backend calls.
