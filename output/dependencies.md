# Dependencies & Execution Order

## NPM Packages to Install

### Runtime (Team 2)
```bash
npm install nodemailer
```

### Dev (Team 3)
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/nodemailer
```

## Execution Order

```
Phase 0: Team 3 (Test Architect)
├── Install test dependencies
├── Create vitest.config.ts
├── Create __tests__/setup.ts
├── Write ALL test files
└── Verify tests compile (all should fail — red phase)

Phase 1: Team 1 + Team 2 (PARALLEL)
├── Team 2:
│   ├── 2.1: Prisma schema migration (role field)  ← MUST be first in Team 2
│   ├── 2.2: Admin auth guard (src/lib/admin.ts)
│   ├── 2.3: Email service (src/lib/email.ts)
│   ├── 2.4: Stats API route
│   ├── 2.5: Shipments API route
│   ├── 2.6: Donors API route
│   ├── 2.7: Queue API route
│   └── 2.8: Queue bulk API route
│
├── Team 1:
│   ├── 1.1: AdminSidebar component
│   ├── 1.2: StatsCard component
│   ├── 1.3: StatusBadge component
│   ├── 1.4: Admin layout (depends on 1.1)
│   ├── 1.5: Admin dashboard page (depends on 1.2)
│   ├── 1.6: ShipmentsTable component (depends on 1.3)
│   ├── 1.7: Shipments page (depends on 1.6)
│   ├── 1.8: DonorsTable component
│   ├── 1.9: Donors page (depends on 1.8)
│   ├── 1.10: QueueList component (depends on 1.3)
│   └── 1.11: Queue page (depends on 1.10)

Phase 2: Integration verification
└── Run full test suite: npm run test:run
```

## Cross-Team Contracts

### Team 1 depends on Team 2:
- **API response shapes**: Team 1 fetches from Team 2's API routes. The exact response types are defined in `output/architecture.md` under "API Contracts".
- **No direct Prisma access**: Team 1 must NEVER import from `@/lib/prisma` or `prisma/schema.prisma`. All data comes through API routes.

### Team 2 depends on nothing:
- Team 2 is fully independent. It owns the schema, API routes, and email service.
- Team 2 MUST NOT modify any files in `src/app/admin/` or `src/components/admin/`.

### Team 3 depends on Teams 1 and 2:
- Team 3 writes tests first (red phase).
- Tests import from paths that Teams 1 & 2 will create.
- Tests will fail until implementation is complete (expected TDD flow).
- Team 3 MUST NOT modify any implementation files.

## Shared Files (READ ONLY for all teams)
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/auth.ts` — NextAuth config
- `src/lib/stripe.ts` — Stripe client
- `src/components/Navbar.tsx` — Main site navbar
- `src/components/Providers.tsx` — SessionProvider wrapper
- `tailwind.config.ts` — Tailwind theme config
- `src/app/globals.css` — Global styles
- `src/app/layout.tsx` — Root layout
