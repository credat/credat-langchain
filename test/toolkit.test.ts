import { describe, expect, it } from "vitest";
import { CredatToolkit } from "../src/toolkit.js";
import { SessionStore } from "../src/session/store.js";
import { createMockTransport, createTestSetup } from "./helpers.js";

describe("CredatToolkit", () => {
	it("creates three tools", async () => {
		const setup = await createTestSetup();
		const toolkit = new CredatToolkit({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "test-service", name: "Test Service" },
		});

		const tools = toolkit.getTools();
		expect(tools).toHaveLength(3);

		const names = tools.map((t) => t.name);
		expect(names).toContain("credat_authenticate");
		expect(names).toContain("credat_check_auth");
		expect(names).toContain("credat_list_scopes");
	});

	it("throws when agent is missing", () => {
		expect(
			() =>
				new CredatToolkit({
					agent: undefined as never,
					delegation: "token",
					transport: {} as never,
					service: { id: "svc" },
				}),
		).toThrow("agent is required");
	});

	it("throws when delegation is missing", async () => {
		const setup = await createTestSetup();
		expect(
			() =>
				new CredatToolkit({
					agent: setup.agent,
					delegation: "",
					transport: createMockTransport(setup),
					service: { id: "svc" },
				}),
		).toThrow("delegation is required");
	});

	it("throws when transport is missing", async () => {
		const setup = await createTestSetup();
		expect(
			() =>
				new CredatToolkit({
					agent: setup.agent,
					delegation: setup.delegation.token,
					transport: undefined as never,
					service: { id: "svc" },
				}),
		).toThrow("transport is required");
	});

	it("throws when service.id is missing", async () => {
		const setup = await createTestSetup();
		expect(
			() =>
				new CredatToolkit({
					agent: setup.agent,
					delegation: setup.delegation.token,
					transport: createMockTransport(setup),
					service: { id: "" },
				}),
		).toThrow("service.id is required");
	});

	it("isAuthenticated returns false before auth", async () => {
		const setup = await createTestSetup();
		const toolkit = new CredatToolkit({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "test-service" },
		});

		expect(await toolkit.isAuthenticated()).toBe(false);
	});

	it("isAuthenticated returns true after auth", async () => {
		const setup = await createTestSetup();
		const toolkit = new CredatToolkit({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "test-service" },
		});

		// Authenticate via the tool
		const authTool = toolkit.getTools().find((t) => t.name === "credat_authenticate");
		await authTool!.invoke({});

		expect(await toolkit.isAuthenticated()).toBe(true);
	});

	it("getSession returns session after auth", async () => {
		const setup = await createTestSetup(["email:read"]);
		const toolkit = new CredatToolkit({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "test-service" },
		});

		const authTool = toolkit.getTools().find((t) => t.name === "credat_authenticate");
		await authTool!.invoke({});

		const session = await toolkit.getSession();
		expect(session).toBeDefined();
		expect(session?.scopes).toContain("email:read");
	});

	it("clearSession forces re-authentication", async () => {
		const setup = await createTestSetup();
		const toolkit = new CredatToolkit({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "test-service" },
		});

		const authTool = toolkit.getTools().find((t) => t.name === "credat_authenticate");
		await authTool!.invoke({});

		expect(await toolkit.isAuthenticated()).toBe(true);

		await toolkit.clearSession();

		expect(await toolkit.isAuthenticated()).toBe(false);
	});

	it("accepts custom session store", async () => {
		const setup = await createTestSetup();
		const customStore = new SessionStore(30_000);

		const toolkit = new CredatToolkit({
			agent: setup.agent,
			delegation: setup.delegation.token,
			transport: createMockTransport(setup),
			service: { id: "test-service" },
			sessionStore: customStore,
		});

		const authTool = toolkit.getTools().find((t) => t.name === "credat_authenticate");
		await authTool!.invoke({});

		// Session should be in the custom store
		expect(customStore.get("test-service")).toBeDefined();
	});
});
