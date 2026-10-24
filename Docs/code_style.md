# Code Style

## TypeScript

Use strict TypeScript. Prefer explicit domain types at module boundaries and `unknown` in catch blocks. Keep provider-specific response shapes narrow and normalize them before use. Use `async`/`await` for network work, return typed promises, and fail closed on missing configuration.

## Naming

Use `PascalCase` for React components and types, `camelCase` for functions and variables, and `SCREAMING_SNAKE_CASE` only for fixed chain/config constants. Name event fields descriptively: `timestamp`, `message`, `level`, `txHash`. Use `compactAddress` only for display; never truncate addresses in transaction payloads.

## Imports

Use native Node `node:` imports in backend code. Use `@/` aliases for frontend source imports. Keep CSS imports in the application entrypoint. Avoid circular dependencies between the context and presentational components.

## React

Keep API/RPC side effects in `AgentContext`; components should consume state and render it. Memoize context callbacks that appear in effect dependencies. Use semantic buttons for actions and preserve disabled states while the backend lock is active.

## Error handling

Messages shown in the terminal should explain what happened and what prerequisite is missing. Do not include private keys, authorization headers, full provider bodies, or unbounded user input. Errors may be logged with severity but should not crash the server’s SSE loop.

## Formatting and review

Run the root typecheck and frontend build before opening a PR. Keep components focused, use Tailwind utility classes for layout, and move repeated visual patterns into small UI primitives. Review network addresses and transaction semantics separately from styling changes.
