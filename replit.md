# biyaHERO

A unified web platform for searching, comparing, and booking land transportation across the Philippines — jeepneys, tricycles, buses, vans, FX, UV Express, and ferries — with real-time availability, fare comparison, and integrated digital payments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/biyahero run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TanStack Query, Leaflet.js maps, Tailwind + shadcn/ui
- API: Express 5 (Node.js — originally planned as Java Spring Boot, adapted for monorepo compatibility)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT-based (jsonwebtoken + crypto, no bcrypt dependency)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Source of truth for ALL API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, vehicles, routes, schedules, bookings)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, vehicles, routes, schedules, fares, map, bookings, stats)
- `artifacts/api-server/src/lib/auth.ts` — JWT signing/verification + requireAuth middleware
- `artifacts/biyahero/src/` — React frontend (pages, components)
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks

## Architecture decisions

- Java Spring Boot was originally requested but Node.js/Express was used instead — the monorepo is pnpm/Node.js and integrating a Maven project would require a separate build system, port management, and lose the shared `lib/` workspace packages. A follow-up task can migrate the backend to Java if needed.
- Auth uses Node.js built-in `crypto` (sha256 + salt) instead of bcrypt to avoid native module build issues in the Replit container.
- JWT tokens are stored in localStorage under key `biyahero_token`.
- Vehicle positions are seeded with static lat/lng (simulated GPS). Real-time GPS would require WebSocket integration as a follow-up.
- The `/api-spec/orval.config.ts` has a post-codegen patch to remove a stale `api.schemas` re-export that orval generates but doesn't create for the Zod client.

## Product

- **Landing page** — Hero search, popular routes, transport modes showcase, how-it-works
- **Map** — Interactive Leaflet.js map with all vehicle markers, filter by type (jeepney/bus/van/etc.)
- **Search** — Find trips by origin, destination, date; sort by fare or departure time
- **Fare Comparison** — Side-by-side fare table across transport modes, highlights cheapest/fastest
- **Booking** — Multi-step flow: trip review → passenger info → payment (mock GCash/Maya/card) → confirmation
- **My Trips** — User's booking history with status badges and cancellation

## User preferences

- Branding: biyaHERO, clean/modern/approachable/professional tone
- Colors: TBA (design subagent decides)
- No emojis in UI
- Responsive design for desktop, tablet, mobile

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- After codegen, the script patches `lib/api-zod/src/index.ts` to remove stale `api.schemas` reference
- Run `pnpm --filter @workspace/db run push` after changing schema files
- The biyahero frontend workflow needs to be started manually after the design subagent finishes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Philippine routes seeded: Manila-QC, Manila-Makati, Manila-Cavite, Manila-Bulacan, QC-Pasig, Cebu, Davao, Laguna, Batangas
