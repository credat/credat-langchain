import { describe, expect, it, vi } from "vitest";
import { SessionStore } from "../../src/session/store.js";
import { createAuthenticateTool } from "../../src/tools/authenticate.js";
import type { CredatAgentHooks } from "../../src/types.js";
import {
	createFailingTransport,
	createMockTransport,
	createRejectingTransport,
	createTestSetup,
} from "../helpers.js";

describe("credat_authenticate tool", () => {
	it("performs a full handshake and returns scopes", async () => {
		const setup = await createTestSetup(["email:read", "email:send"]);
		const sessionStore = new SessionStore();
		const transport = createMockTransport(setup);

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service", name: "Test Service" },
			sessionStore,
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.status).toBe("authenticated");
		expect(result.scopes).toContain("email:read");
		expect(result.scopes).toContain("email:send");
		expect(result.serviceId).toBe("test-service");
	});

	it("returns early if already authenticated", async () => {
		const setup = await createTestSetup();
		const sessionStore = new SessionStore();
		const transport = createMockTransport(setup);

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service" },
			sessionStore,
		});

		// First call — actual handshake
		await tool.invoke({});

		// Second call — should return early
		const result = JSON.parse(await tool.invoke({}));
		expect(result.status).toBe("already_authenticated");
		expect(result.scopes).toBeDefined();
	});

	it("stores session after successful auth", async () => {
		const setup = await createTestSetup();
		const sessionStore = new SessionStore();
		const transport = createMockTransport(setup);

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service" },
			sessionStore,
		});

		await tool.invoke({});

		const session = sessionStore.get("test-service");
		expect(session).toBeDefined();
		expect(session?.scopes).toContain("email:read");
	});

	it("returns error when authentication is rejected", async () => {
		const setup = await createTestSetup();
		const sessionStore = new SessionStore();
		const transport = createRejectingTransport(setup);

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service" },
			sessionStore,
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.status).toBe("failed");
		expect(result.code).toBe("AUTHENTICATION_FAILED");
		expect(result.error).toBe("Access denied");
	});

	it("returns error on transport failure", async () => {
		const setup = await createTestSetup();
		const sessionStore = new SessionStore();
		const transport = createFailingTransport();

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service" },
			sessionStore,
		});

		const result = JSON.parse(await tool.invoke({}));

		expect(result.status).toBe("error");
		expect(result.code).toBe("TRANSPORT_ERROR");
		expect(result.error).toContain("connection refused");
	});

	it("fires hooks on success", async () => {
		const setup = await createTestSetup();
		const sessionStore = new SessionStore();
		const transport = createMockTransport(setup);

		const hooks: CredatAgentHooks = {
			onAuthAttempt: vi.fn(),
			onAuthSuccess: vi.fn(),
			onAuthFailure: vi.fn(),
		};

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service" },
			sessionStore,
			hooks,
		});

		await tool.invoke({});

		expect(hooks.onAuthAttempt).toHaveBeenCalledOnce();
		expect(hooks.onAuthSuccess).toHaveBeenCalledOnce();
		expect(hooks.onAuthFailure).not.toHaveBeenCalled();

		const successEvent = (hooks.onAuthSuccess as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(successEvent.serviceId).toBe("test-service");
		expect(successEvent.scopes).toContain("email:read");
	});

	it("fires hooks on failure", async () => {
		const setup = await createTestSetup();
		const sessionStore = new SessionStore();
		const transport = createRejectingTransport(setup);

		const hooks: CredatAgentHooks = {
			onAuthAttempt: vi.fn(),
			onAuthSuccess: vi.fn(),
			onAuthFailure: vi.fn(),
		};

		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport,
			service: { id: "test-service" },
			sessionStore,
			hooks,
		});

		await tool.invoke({});

		expect(hooks.onAuthAttempt).toHaveBeenCalledOnce();
		expect(hooks.onAuthFailure).toHaveBeenCalledOnce();
		expect(hooks.onAuthSuccess).not.toHaveBeenCalled();
	});

	it("has correct tool metadata", async () => {
		const setup = await createTestSetup();
		const tool = createAuthenticateTool({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "svc", name: "My Service" },
			sessionStore: new SessionStore(),
		});

		expect(tool.name).toBe("credat_authenticate");
		expect(tool.description).toContain("My Service");
	});
});
