# Story 1.2: Frontend Scaffold and Application Shell

Status: done

## Required Reading (read before starting implementation)

- `_bmad-output/project-context.md` — naming conventions, coding standards, British English spelling rules, and what to avoid
- `_bmad-output/planning-artifacts/architecture.md` — full architecture decisions; the dev notes in this story summarise the key constraints but the architecture doc is the authoritative reference

## Story

As a team member,
I want the frontend application initialised with routing, data-fetching infrastructure, and the application shell — and the frontend Docker service added to complete the three-service stack,
so that the browser shows a working navigation structure connected to the backend API.

## What Story 1.1 Delivered (context handoff)

Before starting, understand what already exists:

- `backend/` — fully implemented: Express app, Prisma schema + migration, meta endpoints, health endpoint, seed, Docker Compose with `db` + `backend` services only
- `docker-compose.yml` at repo root — currently has `db` and `backend` services only; Story 1.2 adds `frontend`
- `docs/decisions.md` — has ADR-001 through ADR-004; new decisions go here
- `.gitignore` — already covers `node_modules/`, `.env`, `dist/`, `build/`, `backend/node_modules/`, `frontend/node_modules/`
- `backend/src/prisma/seed.js` — exports `COUNTRIES` array (25 entries); `frontend/src/lib/countries.js` must mirror it exactly

**Express v5 is installed** (ADR-004) — relevant for Epic 2+ but not for this story.
**Jest is used for backend tests** (ADR-003) — frontend testing is post-MVP; do not add a frontend test runner in this story.

## Out of Scope

- **No data fetching hooks** (`useOrganisations`, `useOrganisation`, etc.) — those are Epic 2 and beyond
- **No API utility files** (`frontend/src/api/`) — Epic 2
- **No `CapabilityBadge`, `ActiveFilterChips`, `CompareSelectionBar`, `OrganisationCard`** custom components — those are built in their respective epics
- **No shadcn/ui components other than `Button`** — the Button is the only one required now; others (input, select, dialog, etc.) are added story-by-story in later epics
- **No form logic, no filter logic, no comparison logic** — Epic 2, 3, 4
- **No frontend test framework** — the architecture specifies Vitest as the preferred post-MVP addition; do not configure it now

---

## Acceptance Criteria

**AC1 — Three-service stack starts**

Given the frontend service is added to `docker-compose.yml` and `frontend/.env` is created from `frontend/.env.example`
When `docker compose up` is run
Then all three services (`db`, `backend`, `frontend`) start without errors
And `http://localhost:5173` is accessible in a supported browser

**AC2 — Application shell renders correctly**

Given the frontend is running
When `http://localhost:5173` is accessed
Then the page loads showing a dark (`bg-slate-800`) top navigation bar with the app name and an "Organisations" nav link
And the page background is `slate-50` with a `max-w-7xl mx-auto` content container
And navigating to `/organisations`, `/organisations/new`, `/organisations/:id`, `/organisations/:id/edit`, and `/compare` each renders a page (placeholder content is acceptable) without a JavaScript console error

**AC3 — Application infrastructure is wired correctly**

Given the application root is mounted
When the component tree is inspected
Then `QueryClientProvider` (TanStack Query v5) wraps the application at `main.jsx`
And `SelectionProvider` (from `context/SelectionContext.jsx`) wraps the route tree in `App.jsx`, exporting `selectedIds`, `toggleSelection`, and `clearSelection` via `useSelection`
And React Router v6 (`react-router-dom@6`) provides all routing — no `window.location` manipulation

**AC4 — Tailwind v3 and shadcn/ui base are configured**

Given the Tailwind and shadcn/ui base setup
When the frontend builds without errors
Then Tailwind CSS v3 is configured with a `tailwind.config.js` (not v4 CSS-based config)
And `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` are installed as production dependencies
And the `Button` shadcn/ui component is present in `frontend/src/components/ui/button.jsx` and renders with correct Tailwind styling

**AC5 — Frontend `.env.example` has no secrets**

Given the `frontend/.env.example` file
When it is inspected
Then `VITE_API_BASE_URL` is documented with a placeholder value and no real secrets are committed

**AC6 — Focus ring is globally applied**

Given any interactive element on any page
When it receives keyboard focus
Then the focus indicator `ring-2 ring-blue-500 ring-offset-2` is visibly rendered

---

## Tasks / Subtasks

- [x] Task 1: Initialise Vite + React frontend (AC: 1, 4)
  - [x] From repo root: `npm create vite@latest frontend -- --template react`
  - [x] `cd frontend && npm install react-router-dom@6 @tanstack/react-query@5`
  - [x] `npm install radix-ui class-variance-authority clsx tailwind-merge lucide-react`
  - [x] `npm install -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p`
  - [x] Clean up Vite defaults: remove `src/App.css`; replace `src/index.css` content with Tailwind directives + focus ring base layer (see Dev Notes)
  - [x] Update `tailwind.config.js` content paths (see Dev Notes)

- [x] Task 2: Create `frontend/src/lib/` utilities (AC: 4, 5)
  - [x] Create `frontend/src/lib/utils.js` — `cn()` helper for shadcn/ui components
  - [x] Create `frontend/src/lib/countries.js` — `COUNTRIES` constant, must exactly match `backend/src/prisma/seed.js` (25 entries, same names, same order — see Dev Notes)

- [x] Task 3: Create `SelectionContext` (AC: 3)
  - [x] Create `frontend/src/context/SelectionContext.jsx`
  - [x] Export `SelectionProvider` (wraps children with context) and `useSelection` hook
  - [x] Context shape: `{ selectedIds: string[], toggleSelection(id): void, clearSelection(): void }`

- [x] Task 4: Create placeholder page components (AC: 2)
  - [x] Create `frontend/src/pages/OrganisationListPage.jsx` — placeholder
  - [x] Create `frontend/src/pages/OrganisationDetailPage.jsx` — placeholder
  - [x] Create `frontend/src/pages/OrganisationFormPage.jsx` — placeholder (note: must be named `OrganisationFormPage` from the start — it handles both create and edit in Epic 2 via route params; see Dev Notes)
  - [x] Create `frontend/src/pages/ComparePage.jsx` — placeholder

- [x] Task 5: Wire `App.jsx` with nav bar, routes, and providers (AC: 2, 3)
  - [x] Rewrite `frontend/src/App.jsx` — remove all Vite boilerplate
  - [x] Include: `BrowserRouter`, top nav bar (`bg-slate-800`), `SelectionProvider`, `Routes` with all 5 routes
  - [x] Implement top nav bar with app name and "Organisations" `NavLink` (see Dev Notes)
  - [x] Wrap route tree with `SelectionProvider`

- [x] Task 6: Wire `main.jsx` with `QueryClientProvider` (AC: 3)
  - [x] Rewrite `frontend/src/main.jsx` — remove Vite boilerplate, add `QueryClientProvider` at root
  - [x] `QueryClient` instance created at module level (outside component), not inside the component

- [x] Task 7: Create `Button` shadcn/ui component (AC: 4)
  - [x] Create `frontend/src/components/ui/button.jsx` — manually authored, not via CLI
  - [x] Uses `radix-ui` `Slot`, `cva` from `class-variance-authority`, `cn` from `../../lib/utils`
  - [x] Variants match project UX spec colour tokens (see Dev Notes for full implementation)

- [x] Task 8: Docker Compose frontend service + Dockerfile (AC: 1)
  - [x] Create `frontend/Dockerfile` with `--host 0.0.0.0` flag (critical for Docker — see Dev Notes)
  - [x] Add `frontend` service to `docker-compose.yml` (appended to existing `db` + `backend` services)
  - [x] Create `frontend/.env.example` with `VITE_API_BASE_URL` placeholder
  - [x] Create `frontend/.env` locally (not committed) from `.env.example`

### Review Findings

- [x] [Review][Patch] Add `frontend/.dockerignore` to exclude `node_modules`, `dist`, and Vite cache from `docker build` context — without it, `COPY . .` can overwrite container `node_modules` with host copies or bloat the context [frontend/Dockerfile:5] — applied 2026-04-02 (QC batch-apply)

- [x] [Review][Patch] Stabilise `SelectionProvider` context value — the provider passes a new `{ selectedIds, toggleSelection, clearSelection }` object every render; memoise the value (and callbacks) with `useMemo` / `useCallback` so consumers are not notified on unrelated parent re-renders (e.g. router updates) [frontend/src/context/SelectionContext.jsx:16-18] — applied 2026-04-02 (QC batch-apply)

- [x] [Review][Patch] Set a meaningful document title in `index.html` (still default `frontend`) for browser tabs and accessibility [frontend/index.html:7] — applied 2026-04-02 (QC batch-apply)

- [x] [Review][Defer] No catch-all / 404 route — paths outside defined routes render an empty `<main>` with no feedback [frontend/src/App.jsx:32-39] — deferred, not required by story AC; product decision in a later UX pass

- [x] [Review][Defer] Dockerfile uses `npm install` instead of `npm ci` — less reproducible lockfile installs for container images [frontend/Dockerfile:4] — deferred, acceptable for local dev MVP image

---

## Dev Notes

### Project Structure to Create

```
frontend/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── Dockerfile
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   ├── utils.js              ← cn() helper
    │   └── countries.js          ← COUNTRIES constant (25 entries, mirrors backend seed)
    ├── context/
    │   └── SelectionContext.jsx
    ├── components/
    │   └── ui/
    │       └── button.jsx        ← only shadcn/ui component needed in this story
    └── pages/
        ├── OrganisationListPage.jsx
        ├── OrganisationDetailPage.jsx
        ├── OrganisationFormPage.jsx
        └── ComparePage.jsx
```

Do NOT create `frontend/src/api/`, `frontend/src/hooks/`, or any additional component files beyond what is listed — those belong to later stories.

---

### Module System

The **frontend uses ESM** (`import`/`export`) — this is correct for Vite. Vite projects scaffold with `"type": "module"` in `package.json` and use ESM throughout. This is completely separate from the CommonJS backend and is the right approach. Do not add `require()` or `module.exports` anywhere in the frontend.

---

### Exact Initialisation Commands

Run from the repo root:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom@6 @tanstack/react-query@5
npm install radix-ui class-variance-authority clsx tailwind-merge lucide-react
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

`npx tailwindcss init -p` creates both `tailwind.config.js` and `postcss.config.js`. After running it, update `tailwind.config.js` immediately (see below).

---

### `tailwind.config.js`

Replace the generated `content: []` with the correct paths:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Critical:** This is Tailwind v3 `tailwind.config.js` syntax (JavaScript export). Tailwind v4 uses CSS-based config with no `tailwind.config.js` at all — do NOT use v4 syntax.

---

### `frontend/src/index.css`

Replace the entire content of the Vite-generated `index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Global focus ring — satisfies UX-DR19 and AC6 */
  *:focus-visible {
    @apply outline-none ring-2 ring-blue-500 ring-offset-2;
  }
}
```

Also delete `src/App.css` — it is a Vite default file that conflicts with Tailwind.

---

### `frontend/src/lib/utils.js`

```js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

---

### `frontend/src/lib/countries.js`

This list **must exactly match** `backend/src/prisma/seed.js` — same 25 entries, same names, same order. The architecture mandates dual maintenance: if the list ever changes, both files must be updated together. This is documented in `docs/decisions.md` as part of Story 1.3.

```js
export const COUNTRIES = [
  'Australia',
  'Austria',
  'Belgium',
  'Canada',
  'Denmark',
  'Finland',
  'France',
  'Germany',
  'Ireland',
  'Italy',
  'Japan',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Poland',
  'Portugal',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
];
```

---

### `frontend/src/context/SelectionContext.jsx`

```jsx
import { createContext, useContext, useState } from 'react'

const SelectionContext = createContext(null)

export function SelectionProvider({ children }) {
  const [selectedIds, setSelectedIds] = useState([])

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const clearSelection = () => setSelectedIds([])

  return (
    <SelectionContext.Provider value={{ selectedIds, toggleSelection, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}
```

**Contract — all agents must use this interface:**
- `selectedIds`: `string[]` — array of organisation UUID strings
- `toggleSelection(id)`: adds if absent, removes if present
- `clearSelection()`: resets to `[]`

`SelectionProvider` wraps the route tree in `App.jsx` (inside `BrowserRouter`, outside `Routes`). Never nest it inside a route component.

---

### `frontend/src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
```

`QueryClient` is instantiated once at module level — not inside the component render cycle. `QueryClientProvider` wraps the entire app, outside `App`. `App` contains `BrowserRouter` and `SelectionProvider`.

---

### `frontend/src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { SelectionProvider } from './context/SelectionContext.jsx'
import OrganisationListPage from './pages/OrganisationListPage.jsx'
import OrganisationDetailPage from './pages/OrganisationDetailPage.jsx'
import OrganisationFormPage from './pages/OrganisationFormPage.jsx'
import ComparePage from './pages/ComparePage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <span className="text-white font-semibold text-sm">
                DMCF Stack Mapper
              </span>
              <NavLink
                to="/organisations"
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-white font-medium' : 'text-slate-300 hover:text-white'}`
                }
              >
                Organisations
              </NavLink>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SelectionProvider>
            <Routes>
              <Route path="/organisations" element={<OrganisationListPage />} />
              <Route path="/organisations/new" element={<OrganisationFormPage />} />
              <Route path="/organisations/:id" element={<OrganisationDetailPage />} />
              <Route path="/organisations/:id/edit" element={<OrganisationFormPage />} />
              <Route path="/compare" element={<ComparePage />} />
            </Routes>
          </SelectionProvider>
        </main>
      </div>
    </BrowserRouter>
  )
}
```

**Notes:**
- `BrowserRouter` is in `App.jsx`, not `main.jsx` — keeps routing collocated with routes
- `SelectionProvider` wraps `Routes` (inside `main`), not the nav — correct; the nav doesn't need selection state
- `NavLink` uses the `isActive` callback for active styling — correct React Router v6 pattern
- All imports use `.jsx` extension — required for Vite to resolve JSX files correctly

---

### Placeholder Page Components

All four placeholder pages should render without console errors. Apply the `max-w-7xl mx-auto` container constraint in `App.jsx` (`<main>` wrapper) — pages do not need to re-apply it.

**`OrganisationListPage.jsx`** — important: note the dual-mode pattern for `OrganisationFormPage`:

```jsx
export default function OrganisationListPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-slate-800">Organisations</h1>
      <p className="mt-2 text-slate-500">Organisation list — implemented in Epic 2.</p>
    </div>
  )
}
```

**`OrganisationDetailPage.jsx`**:

```jsx
export default function OrganisationDetailPage() {
  return (
    <div className="py-8">
      <p className="text-sm text-blue-600 mb-4">← Back to organisations</p>
      <h1 className="text-2xl font-semibold text-slate-800">Organisation Detail</h1>
      <p className="mt-2 text-slate-500">Organisation detail — implemented in Epic 2.</p>
    </div>
  )
}
```

**`OrganisationFormPage.jsx`** — this component handles BOTH create (`/organisations/new`) and edit (`/organisations/:id/edit`) in Epic 2. Name it `OrganisationFormPage` now so no rename is needed later. Include a comment explaining this:

```jsx
// OrganisationFormPage handles both create (/organisations/new) and edit (/organisations/:id/edit).
// The mode is determined in Epic 2 by the presence of the :id route param via useParams().
export default function OrganisationFormPage() {
  return (
    <div className="py-8">
      <p className="text-sm text-blue-600 mb-4">← Back to organisations</p>
      <h1 className="text-2xl font-semibold text-slate-800">Organisation Form</h1>
      <p className="mt-2 text-slate-500">Create / edit form — implemented in Epic 2.</p>
    </div>
  )
}
```

**`ComparePage.jsx`**:

```jsx
export default function ComparePage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-slate-800">Compare Organisations</h1>
      <p className="mt-2 text-slate-500">Comparison view — implemented in Epic 4.</p>
    </div>
  )
}
```

---

### `frontend/src/components/ui/button.jsx`

Manually authored — do not use `npx shadcn@latest add`. Uses `radix-ui` unified package (not individual `@radix-ui/react-slot`).

Variants use project colour tokens directly (per UX-DR16) — no CSS variable setup needed:

```jsx
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
        destructive: 'text-red-600 hover:text-red-700',
        ghost: 'hover:bg-slate-100 text-slate-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
```

**Import in other files:** `import { Button } from '../components/ui/button'` (relative path — no `@/` alias configured in this project).

**Variant map:**
- `default` → primary (`bg-blue-600`) — the "Add organisation" button, Save button
- `secondary` → secondary action — cancel, back-style buttons
- `destructive` → destructive text action — delete triggers
- `ghost` → ghost / icon-adjacent actions

---

### `frontend/.env.example`

```
VITE_API_BASE_URL=http://localhost:3001
```

`VITE_*` prefix is Vite's convention for env vars exposed to the client bundle. All API calls in later stories will use `import.meta.env.VITE_API_BASE_URL` as the base URL. Never hardcode `http://localhost:3001` in source files.

---

### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

**Critical:** `--host 0.0.0.0` is required. Without it, Vite's dev server binds to `localhost` inside the container and is not reachable from the host machine or other Docker services. Omitting this flag is the most common Docker + Vite setup failure.

---

### `docker-compose.yml` — Adding the Frontend Service

Append the `frontend` service to the existing `docker-compose.yml`. **Do not modify `db` or `backend` — only add:**

```yaml
  frontend:
    build:
      context: ./frontend
    env_file:
      - ./frontend/.env
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - dmcf_network
```

The frontend depends on `backend` (not on `db` directly — it talks to the backend over HTTP, not to the DB). The full `docker-compose.yml` after this story should have all three services: `db`, `backend`, `frontend`.

---

### WSL2 / Docker Note

Docker is not available in the WSL2 sandbox during implementation (same constraint as Story 1.1). Write and author all files correctly; verify the Vite dev server starts with `npm run dev` locally (outside Docker) as the primary smoke test. Docker Compose validation happens when the full stack is run in a Docker-capable environment.

---

### Project Structure Notes

- **React component filenames are `PascalCase.jsx`** — `OrganisationListPage.jsx`, `OrganisationFormPage.jsx`, etc. (per project-context.md)
- **Non-component JS files are `camelCase.js`** — `utils.js`, `countries.js` (per project-context.md)
- **No deep nesting in `components/`** — `ui/` is the only subdirectory; all other custom components are flat siblings at `components/`
- **No `@/` path alias** — use relative imports throughout the frontend. The `cn()` import in `button.jsx` is `../../lib/utils` not `@/lib/utils`
- **`src/App.css` must be deleted** — leaving it causes Vite to apply conflicting default styles that override Tailwind classes

### Anti-Patterns — Never Do These

- `import { Slot } from '@radix-ui/react-slot'` — use `import { Slot } from 'radix-ui'` (unified package)
- `npx shadcn@latest add button` — the CLI installs runtime package dependencies; use the manual copy in Dev Notes
- Adding `"type": "module"` to `package.json` — Vite already handles this via `vite.config.js`; adding it explicitly can cause unexpected import resolution issues
- Hardcoding `http://localhost:3001` in any source file — always use `import.meta.env.VITE_API_BASE_URL`
- `window.location.href = '/organisations'` — always use React Router `useNavigate`
- Creating `frontend/src/api/` or `frontend/src/hooks/` directories — out of scope for this story
- Binding Vite dev server without `--host 0.0.0.0` in the Dockerfile CMD

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Gap Analysis — shadcn/ui JavaScript setup]
- [Source: _bmad-output/planning-artifacts/architecture.md#Environment Variables]
- [Source: _bmad-output/project-context.md#Stack, Naming Conventions, Coding Standards]
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-04-02T17-25-47Z.md#Concern m3]
- [Source: docs/decisions.md#ADR-003, ADR-004]
- [Source: backend/src/prisma/seed.js#COUNTRIES]

---

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent mode)

### Debug Log References

- Vite scaffold via `npm create vite@latest frontend -- --template react` (create-vite@9.0.3)
- All dependencies installed successfully: react-router-dom@6, @tanstack/react-query@5, radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react, tailwindcss@3, postcss, autoprefixer
- Vite build passes cleanly (71 modules transformed, 0 errors)
- Vite dev server starts successfully on http://localhost:5173/
- Backend regression tests: 22/22 pass, 0 failures
- No linter errors in frontend source files

### Completion Notes List

- ✅ Task 1: Scaffolded Vite + React project, installed all deps, configured Tailwind v3, cleaned up Vite defaults (removed App.css, assets/react.svg, assets/vite.svg, assets/hero.png), replaced index.css with Tailwind directives + global focus ring
- ✅ Task 2: Created `lib/utils.js` (cn helper) and `lib/countries.js` (25 entries, exact match with backend seed.js)
- ✅ Task 3: Created `SelectionContext.jsx` with `SelectionProvider` and `useSelection` hook exposing `selectedIds`, `toggleSelection`, `clearSelection`
- ✅ Task 4: Created all 4 placeholder pages: OrganisationListPage, OrganisationDetailPage, OrganisationFormPage (dual-mode comment included), ComparePage
- ✅ Task 5: Rewrote App.jsx with BrowserRouter, dark nav bar (bg-slate-800), NavLink with isActive styling, SelectionProvider wrapping Routes, all 5 routes wired
- ✅ Task 6: Rewrote main.jsx with QueryClientProvider at root, QueryClient instantiated at module level
- ✅ Task 7: Created Button shadcn/ui component with 4 variants (default/secondary/destructive/ghost) and 4 sizes, using radix-ui Slot, cva, and cn
- ✅ Task 8: Created Dockerfile (--host 0.0.0.0), added frontend service to docker-compose.yml, created .env.example and .env

### Implementation Plan

Followed exact task sequence from story file. All source code authored per Dev Notes specifications. No deviations from architecture — no extra files, no extra dependencies, no test framework.

### File List

**New files:**
- frontend/package.json
- frontend/package-lock.json
- frontend/vite.config.js
- frontend/tailwind.config.js
- frontend/postcss.config.js
- frontend/index.html
- frontend/Dockerfile
- frontend/.dockerignore
- frontend/.env.example
- frontend/.env
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/index.css
- frontend/src/lib/utils.js
- frontend/src/lib/countries.js
- frontend/src/context/SelectionContext.jsx
- frontend/src/components/ui/button.jsx
- frontend/src/pages/OrganisationListPage.jsx
- frontend/src/pages/OrganisationDetailPage.jsx
- frontend/src/pages/OrganisationFormPage.jsx
- frontend/src/pages/ComparePage.jsx

**Modified files:**
- docker-compose.yml (added frontend service)

## Change Log

- 2026-04-02: Story 1.2 implemented — frontend scaffold with Vite + React, Tailwind v3, shadcn/ui Button, React Router v6, TanStack Query v5, SelectionContext, 4 placeholder pages, Docker frontend service added to compose
- 2026-04-02: Code-review patches applied — `frontend/.dockerignore`, memoised `SelectionProvider` context value, document title `DMCF Stack Mapper` in `index.html` (QC batch-apply)
