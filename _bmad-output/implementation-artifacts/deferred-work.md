# Deferred work

## Deferred from: code review of 1-3-readme-and-project-documentation.md (2026-04-02)

- **Frontend ESLint react-refresh** — `eslint-plugin-react-refresh` reports `only-export-components` in `frontend/src/components/ui/button.jsx` and `frontend/src/context/SelectionContext.jsx`; fix or adjust rule when touching those modules.

## Deferred from: code review of 1-2-frontend-scaffold-and-application-shell.md (2026-04-02)

- **No catch-all / 404 route** — paths outside defined routes render an empty main area; decide later whether to show a 404 page, redirect home, or keep as-is (`frontend/src/App.jsx`).

- **Dockerfile `npm install` vs `npm ci`** — consider `npm ci` for reproducible image builds when the stack moves beyond local-dev-only containers (`frontend/Dockerfile`).
