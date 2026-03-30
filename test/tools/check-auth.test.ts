import { describe, expect, it } from "vitest";
import { SessionStore } from "../../src/session/store.js";
import { createCheckAuthTool } from "../../src/tools/check-auth.js";
import type { AgentSession } from "../../src/types.js";

describe("credat_check_auth tool", () => {
	it("returns not authenticated when no session exists", async () => {
		const sessionStore = new SessionStore();
		const tool = createCheckAuthTool({
			service: { id: "test-service", name: "Test Service" },
			sessionStore,
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.authenticated).toBe(false);
		expect(result.serviceId).toBe("test-service");
		expect(result.message).toContain("Not authenticated");
	});

	it("returns authenticated with scopes when session exists", async () => {
		const sessionStore = new SessionStore();
		const session: AgentSession = {
			serviceId: "test-service",
			scopes: ["email:read", "email:send"],
			authenticatedAt: Date.now(),
		};
		sessionStore.set("test-service", session);

		const tool = createCheckAuthTool({
			service: { id: "test-service" },
			sessionStore,
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.authenticated).toBe(true);
		expect(result.scopes).toEqual(["email:read", "email:send"]);
		expect(result.authenticatedAt).toBeDefined();
	});

	it("returns not authenticated for expired session", async () => {
		const sessionStore = new SessionStore(100); // 100ms TTL
		const session: AgentSession = {
			serviceId: "test-service",
			scopes: ["email:read"],
			authenticatedAt: Date.now() - 200, // expired
		};
		sessionStore.set("test-service", session);

		const tool = createCheckAuthTool({
			service: { id: "test-service" },
			sessionStore,
		});

		const result = JSON.parse(await tool.invoke({}));
		expect(result.authenticated).toBe(false);
	});

	it("has correct tool metadata", () => {
		const tool = createCheckAuthTool({
			service: { id: "svc", name: "My API" },
			sessionStore: new SessionStore(),
		});

		expect(tool.name).toBe("credat_check_auth");
		expect(tool.description).toContain("My API");
	});
});
