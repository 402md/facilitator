# Code Standards — 402md Facilitator

## TypeScript

- Strict mode, target ESNext, `@types/*` for all dependencies
- Path alias `@/` for imports from `src/`
- File naming: kebab-case for everything
- Components: arrow functions, named exports (never default exports)
- Avoid `any` — use `unknown` + type narrowing

## Linting & Formatting

- **ESLint:** Flat config (`eslint.config.mjs`)
- **Prettier:** `.prettierrc`
- **Git hooks:** Husky + lint-staged (pre-commit runs lint-staged)
- **CI:** `bun run lint` + `bun run build` on every PR

## USDC

- **Always a string** — never `parseFloat`, `Number()`, or JS arithmetic
- Display: `Intl.NumberFormat` or `formatUsdc()`
- Calculations: `decimal.js` or equivalent
- Values come from backend as strings (e.g., `"0.050000"`)

## Imports

Order (no separators):
1. Runtime / framework (React, Next.js, Temporal)
2. External libraries
3. Internal components (`@/components/`)
4. Internal lib/utils (`@/lib/`, `@/config/`)

## Commits

- Format: `<type>: <description>` (lowercase, imperative, no period)
- Types: `feat`, `fix`, `chore`, `refactor`, `hotfix`, `docs`
- Minimum 10 characters
- Describe the "why", not the "what"
- Never add `Co-Authored-By` lines
