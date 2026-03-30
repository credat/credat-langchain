import { describe, expect, it } from "vitest";
import { SessionStore } from "../../src/session/store.js";
import { createListScopesTool } from "../../src/tools/list-scopes.js";
import type { AgentSession } from "../../src/types.js";

describe("credat_list_scopes tool", () => {
	it("returns delegation scopes when not authenticated", async () => {
		const sessionStore = new SessionStore();
		const tool = createListScopesTool({
			service: { id: "test-service" },
			sessionStore,
			delegationScopes: ["email:read", "email:send"],
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.source).toBe("delegation");
		expect(result.authenticated).toBe(false);
		expect(result.scopes).toEqual(["email:read", "email:send"]);
		expect(result.message).toContain("Authenticate to confirm");
	});

	it("returns session scopes when authenticated", async () => {
		const sessionStore = new SessionStore();
		const session: AgentSession = {
			serviceId: "test-service",
			scopes: ["email:read"],
			constraints: { maxTransactionValue: 1000 },
			authenticatedAt: Date.now(),
		};
		sessionStore.set("test-service", session);

		const tool = createListScopesTool({
			service: { id: "test-service" },
			sessionStore,
			delegationScopes: ["email:read", "email:send"],
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.source).toBe("session");
		expect(result.authenticated).toBe(true);
		expect(result.scopes).toEqual(["email:read"]);
		expect(result.constraints).toEqual({ maxTransactionValue: 1000 });
	});

	it("returns empty scopes when delegation has none", async () => {
		const sessionStore = new SessionStore();
		const tool = createListScopesTool({
			service: { id: "test-service" },
			sessionStore,
			delegationScopes: [],
		});

		const result = JSON.parse(await tool.invoke({}));
		expect(result.scopes).toEqual([]);
	});

	it("has correct tool metadata", () => {
		const tool = createListScopesTool({
			service: { id: "svc", name: "Shop API" },
			sessionStore: new SessionStore(),
			delegationScopes: [],
		});

		expect(tool.name).toBe("credat_list_scopes");
		expect(tool.description).toContain("Shop API");
	});
});
