import { describe, expect, it } from "vitest";
import { SessionStore } from "../../src/session/store.js";
import type { AgentSession } from "../../src/types.js";

function makeSession(serviceId: string, overrides?: Partial<AgentSession>): AgentSession {
	return {
		serviceId,
		scopes: ["test:read"],
		authenticatedAt: Date.now(),
		...overrides,
	};
}

describe("SessionStore", () => {
	it("stores and retrieves a session", () => {
		const store = new SessionStore();
		const session = makeSession("svc-1");
		store.set("svc-1", session);

		expect(store.get("svc-1")).toEqual(session);
	});

	it("returns undefined for unknown service", () => {
		const store = new SessionStore();
		expect(store.get("unknown")).toBeUndefined();
	});

	it("deletes a session", () => {
		const store = new SessionStore();
		store.set("svc-1", makeSession("svc-1"));

		expect(store.delete("svc-1")).toBe(true);
		expect(store.get("svc-1")).toBeUndefined();
	});

	it("returns false when deleting non-existent session", () => {
		const store = new SessionStore();
		expect(store.delete("unknown")).toBe(false);
	});

	it("expires sessions after maxAgeMs", () => {
		const store = new SessionStore(100); // 100ms TTL
		const session = makeSession("svc-1", {
			authenticatedAt: Date.now() - 200,
		});
		store.set("svc-1", session);

		expect(store.get("svc-1")).toBeUndefined();
	});

	it("returns valid sessions within TTL", () => {
		const store = new SessionStore(60_000);
		const session = makeSession("svc-1");
		store.set("svc-1", session);

		expect(store.get("svc-1")).toEqual(session);
	});

	it("tracks store size", () => {
		const store = new SessionStore();
		expect(store.size).toBe(0);

		store.set("svc-1", makeSession("svc-1"));
		expect(store.size).toBe(1);

		store.set("svc-2", makeSession("svc-2"));
		expect(store.size).toBe(2);

		store.delete("svc-1");
		expect(store.size).toBe(1);
	});

	it("overwrites existing session for same service", () => {
		const store = new SessionStore();
		store.set("svc-1", makeSession("svc-1", { scopes: ["old"] }));
		store.set("svc-1", makeSession("svc-1", { scopes: ["new"] }));

		expect(store.get("svc-1")?.scopes).toEqual(["new"]);
		expect(store.size).toBe(1);
	});
});
