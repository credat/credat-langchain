import {
	createAgent,
	createChallenge,
	createDidWeb,
	delegate,
	generateKeyPair,
	verifyPresentation,
} from "@credat/sdk";
import type {
	AgentIdentity,
	ChallengeMessage,
	DelegationCredential,
	KeyPair,
	PresentationMessage,
} from "@credat/sdk";
import type { AuthenticateResponse, ITransport } from "../src/types.js";

export interface TestSetup {
	ownerKeyPair: KeyPair;
	ownerDid: string;
	agent: AgentIdentity;
	delegation: DelegationCredential;
	serverDid: string;
}

export async function createTestSetup(
	scopes = ["email:read", "email:send"],
	validUntil?: string,
): Promise<TestSetup> {
	const ownerKeyPair = generateKeyPair("ES256");
	const ownerDid = createDidWeb("owner.example.com");
	const serverDid = createDidWeb("server.example.com");

	const agent = await createAgent({
		domain: "agents.example.com",
		path: "test-agent",
		algorithm: "ES256",
	});

	const delegation = await delegate({
		agent: agent.did,
		owner: ownerDid,
		ownerKeyPair,
		scopes,
		validUntil,
	});

	return { ownerKeyPair, ownerDid, agent, delegation, serverDid };
}

/**
 * Creates a mock transport that simulates a real Credat-protected service.
 * Uses real SDK functions for challenge/verify so the handshake is cryptographically valid.
 */
export function createMockTransport(setup: TestSetup): ITransport {
	let lastChallenge: ChallengeMessage | undefined;

	return {
		async requestChallenge(): Promise<ChallengeMessage> {
			const challenge = createChallenge({ from: setup.serverDid });
			lastChallenge = challenge;
			return challenge;
		},

		async sendPresentation(presentation: PresentationMessage): Promise<AuthenticateResponse> {
			if (!lastChallenge) {
				return { authenticated: false, error: "No challenge issued" };
			}

			const result = await verifyPresentation(presentation, {
				challenge: lastChallenge,
				ownerPublicKey: setup.ownerKeyPair.publicKey,
				agentPublicKey: setup.agent.keyPair.publicKey,
			});

			lastChallenge = undefined;

			if (result.valid) {
				return {
					authenticated: true,
					scopes: result.scopes,
					constraints: result.constraints,
				};
			}

			return {
				authenticated: false,
				error: result.errors.map((e) => e.message).join("; "),
			};
		},
	};
}

/** Creates a transport that always rejects authentication */
export function createRejectingTransport(setup: TestSetup): ITransport {
	return {
		async requestChallenge(): Promise<ChallengeMessage> {
			return createChallenge({ from: setup.serverDid });
		},
		async sendPresentation(): Promise<AuthenticateResponse> {
			return { authenticated: false, error: "Access denied" };
		},
	};
}

/** Creates a transport that throws on every call */
export function createFailingTransport(): ITransport {
	return {
		async requestChallenge(): Promise<ChallengeMessage> {
			throw new Error("Network error: connection refused");
		},
		async sendPresentation(): Promise<AuthenticateResponse> {
			throw new Error("Network error: connection refused");
		},
	};
}
