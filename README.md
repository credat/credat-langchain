# @credat/langchain

LangChain/LangGraph integration for [Credat](https://credat.io) — authenticate AI agents with trust and delegation.

## Overview

`@credat/langchain` provides LangChain tools that enable AI agents to authenticate with Credat-protected services using decentralized identities (DIDs) and verifiable credentials.

This is the **agent-side** companion to [`@credat/mcp`](https://www.npmjs.com/package/@credat/mcp), which provides server-side protection.

## Installation

```bash
npm install @credat/langchain @credat/sdk @langchain/core zod
```

## Quick Start

```typescript
import { createAgent, delegate, generateKeyPair, createDidWeb } from "@credat/sdk";
import { CredatToolkit, HttpTransport } from "@credat/langchain";

// 1. Create agent identity
const agent = await createAgent({ domain: "agents.example.com" });

// 2. Get delegation from owner (scoped permissions)
const ownerKeyPair = generateKeyPair("ES256");
const ownerDid = createDidWeb("owner.example.com");
const delegation = await delegate({
  agent: agent.did,
  owner: ownerDid,
  ownerKeyPair,
  scopes: ["email:read", "email:send"],
});

// 3. Create toolkit targeting a service
const toolkit = new CredatToolkit({
  agent,
  delegation: delegation.token,
  transport: new HttpTransport({ baseUrl: "https://api.example.com" }),
  service: { id: "email-api", name: "Email API" },
});

// 4. Use tools with your LangChain agent
const tools = toolkit.getTools();
// Returns: [credat_authenticate, credat_check_auth, credat_list_scopes]
```

## Tools

| Tool | Description |
|------|-------------|
| `credat_authenticate` | Performs the full challenge-response handshake in one call |
| `credat_check_auth` | Checks if the agent has an active authenticated session |
| `credat_list_scopes` | Lists granted permissions from session or delegation |

## Custom Transport

For non-HTTP services (MCP, WebSocket, etc.), use `createTransport()`:

```typescript
import { createTransport } from "@credat/langchain";

const transport = createTransport({
  requestChallenge: async () => {
    // Your custom challenge request logic
  },
  sendPresentation: async (presentation) => {
    // Your custom presentation send logic
  },
});
```

## Hooks

Monitor authentication events:

```typescript
const toolkit = new CredatToolkit({
  // ...
  hooks: {
    onAuthAttempt: (event) => console.log("Attempting auth:", event.serviceId),
    onAuthSuccess: (event) => console.log("Authenticated:", event.scopes),
    onAuthFailure: (event) => console.error("Auth failed:", event.error),
  },
});
```

## API

### `CredatToolkit`

| Method | Description |
|--------|-------------|
| `getTools()` | Returns the three LangChain tools |
| `isAuthenticated()` | Check if agent has an active session |
| `getSession()` | Get current session details |
| `clearSession()` | Force re-authentication |

### Exports

- **Toolkit:** `CredatToolkit`
- **Tool factories:** `createAuthenticateTool`, `createCheckAuthTool`, `createListScopesTool`
- **Transport:** `HttpTransport`, `createTransport`
- **Session:** `SessionStore`
- **Errors:** `LangchainAuthErrorCodes`

## Requirements

- Node.js >= 22.0.0
- `@credat/sdk` >= 0.3.0-alpha.1
- `@langchain/core` >= 0.3.0

## License

Apache-2.0
