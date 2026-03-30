import { describe, expect, it, vi } from "vitest";
import { HttpTransport } from "../../src/transport/http.js";
import type { ChallengeMessage } from "@credat/sdk";
import type { AuthenticateResponse } from "../../src/types.js";

function createMockFetch(responses: Array<{ status: number; body: unknown }>) {
	let callIndex = 0;
	return vi.fn(async () => {
		const response = responses[callIndex++];
		if (!response) throw new Error("No more mock responses");
		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			statusText: response.status === 200 ? "OK" : "Error",
			json: async () => response.body,
		} as Response;
	});
}

describe("HttpTransport", () => {
	it("throws if baseUrl is empty", () => {
		expect(() => new HttpTransport({ baseUrl: "" })).toThrow("baseUrl is required");
	});

	it("requests challenge from correct URL", async () => {
		const challenge: ChallengeMessage = {
			type: "credat:challenge",
			nonce: "test-nonce",
			from: "did:web:server.example.com",
			timestamp: new Date().toISOString(),
		};

		const mockFetch = createMockFetch([{ status: 200, body: challenge }]);
		const transport = new HttpTransport({
			baseUrl: "https://api.example.com",
			fetch: mockFetch,
		});

		const result = await transport.requestChallenge();

		expect(result).toEqual(challenge);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/credat/challenge",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("sends presentation to correct URL", async () => {
		const authResponse: AuthenticateResponse = {
			authenticated: true,
			scopes: ["email:read"],
		};

		const mockFetch = createMockFetch([{ status: 200, body: authResponse }]);
		const transport = new HttpTransport({
			baseUrl: "https://api.example.com",
			fetch: mockFetch,
		});

		const presentation = {
			type: "credat:presentation" as const,
			delegation: "token",
			nonce: "nonce",
			proof: "proof",
			from: "did:web:agent.example.com",
		};

		const result = await transport.sendPresentation(presentation);

		expect(result).toEqual(authResponse);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/credat/authenticate",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ presentation }),
			}),
		);
	});

	it("uses custom paths", async () => {
		const mockFetch = createMockFetch([
			{ status: 200, body: { type: "credat:challenge", nonce: "n", from: "d", timestamp: "t" } },
		]);

		const transport = new HttpTransport({
			baseUrl: "https://api.example.com/",
			challengePath: "/auth/challenge",
			authenticatePath: "/auth/verify",
			fetch: mockFetch,
		});

		await transport.requestChallenge();

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/auth/challenge",
			expect.any(Object),
		);
	});

	it("includes custom headers", async () => {
		const mockFetch = createMockFetch([
			{ status: 200, body: { type: "credat:challenge", nonce: "n", from: "d", timestamp: "t" } },
		]);

		const transport = new HttpTransport({
			baseUrl: "https://api.example.com",
			headers: { Authorization: "Bearer token123" },
			fetch: mockFetch,
		});

		await transport.requestChallenge();

		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer token123",
				}),
			}),
		);
	});

	it("throws on HTTP error for challenge", async () => {
		const mockFetch = createMockFetch([{ status: 500, body: {} }]);
		const transport = new HttpTransport({
			baseUrl: "https://api.example.com",
			fetch: mockFetch,
		});

		await expect(transport.requestChallenge()).rejects.toThrow("Challenge request failed: 500");
	});

	it("throws on HTTP error for authenticate", async () => {
		const mockFetch = createMockFetch([{ status: 403, body: {} }]);
		const transport = new HttpTransport({
			baseUrl: "https://api.example.com",
			fetch: mockFetch,
		});

		const presentation = {
			type: "credat:presentation" as const,
			delegation: "t",
			nonce: "n",
			proof: "p",
			from: "d",
		};

		await expect(transport.sendPresentation(presentation)).rejects.toThrow(
			"Authentication request failed: 403",
		);
	});

	it("strips trailing slash from baseUrl", async () => {
		const mockFetch = createMockFetch([
			{ status: 200, body: { type: "credat:challenge", nonce: "n", from: "d", timestamp: "t" } },
		]);

		const transport = new HttpTransport({
			baseUrl: "https://api.example.com/",
			fetch: mockFetch,
		});

		await transport.requestChallenge();

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/credat/challenge",
			expect.any(Object),
		);
	});
});
