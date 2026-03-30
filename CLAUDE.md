# @credat/langchain — Development Guidelines

## What This Package Does

Agent-side LangChain integration for Credat. Provides LangChain tools that enable AI agents to authenticate with Credat-protected services via challenge-response handshake.

Companion to `@credat/mcp` (server-side).

## Architecture

```
CredatToolkit (main entry)
├── credat_authenticate  →  transport.requestChallenge() → SDK.presentCredentials() → transport.sendPresentation()
├── credat_check_auth    →  sessionStore.get()
└── credat_list_scopes   →  sessionStore.get() || parseDelegationScopes()
```

- **Transport**: `ITransport` interface — pluggable, HTTP default
- **Session**: `ISessionStore` interface — in-memory default with lazy TTL
- **Tools**: Created via `tool()` from `@langchain/core/tools`, not class-based

## Conventions

- Follow the same patterns as `@credat/mcp`
- Named exports only (no default exports)
- `MaybePromise<T>` for store interfaces (sync or async)
- Tool names use underscores: `credat_authenticate`, not colons
- Error codes are a const object + derived type (not classes)
- Biome for linting/formatting (tabs, 100 width)
- Vitest for testing

## Testing

- `test/helpers.ts` creates real SDK fixtures (agent, owner, delegation)
- Mock transport uses real SDK `createChallenge()` + `verifyPresentation()`
- Run: `npm test`

## Don'ts

- Don't add `@langchain/langgraph` as a dependency (deferred to v0.2)
- Don't add server-side `protectTool()` (deferred to v0.2)
- Don't import from `@credat/sdk` internal paths — only from the package root
- Don't use non-null assertions (`!`)
