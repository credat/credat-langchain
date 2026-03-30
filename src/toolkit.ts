import { BaseToolkit, type StructuredToolInterface } from "@langchain/core/tools";
import { SessionStore } from "./session/store.js";
import { createAuthenticateTool } from "./tools/authenticate.js";
import { createCheckAuthTool } from "./tools/check-auth.js";
import { createListScopesTool } from "./tools/list-scopes.js";
import type { AgentSession, CredatToolkitOptions, ISessionStore } from "./types.js";

const DEFAULT_SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export class CredatToolkit extends BaseToolkit {
	tools: StructuredToolInterface[];

	private readonly sessionStore: ISessionStore;
	private readonly serviceId: string;

	constructor(options: CredatToolkitOptions) {
		super();

		if (!options.agent) {
			throw new Error("CredatToolkit: agent is required");
		}
		if (!options.delegation) {
			throw new Error("CredatToolkit: delegation is required");
		}
		if (!options.transport) {
			throw new Error("CredatToolkit: transport is required");
		}
		if (!options.service?.id) {
			throw new Error("CredatToolkit: service.id is required");
		}

		const sessionMaxAgeMs = options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS;
		this.sessionStore = options.sessionStore ?? new SessionStore(sessionMaxAgeMs);
		this.serviceId = options.service.id;

		// Parse delegation scopes from the SD-JWT claims
		const delegationScopes = parseDelegationScopes(options.delegation);

		const authenticateTool = createAuthenticateTool({
			agent: options.agent,
			delegation: options.delegation,
			transport: options.transport,
			service: options.service,
			sessionStore: this.sessionStore,
			hooks: options.hooks,
			disclosureScopes: options.disclosureScopes,
		});

		const checkAuthTool = createCheckAuthTool({
			service: options.service,
			sessionStore: this.sessionStore,
		});

		const listScopesTool = createListScopesTool({
			service: options.service,
			sessionStore: this.sessionStore,
			delegationScopes,
		});

		this.tools = [authenticateTool, checkAuthTool, listScopesTool];
	}

	/** Check if the agent is currently authenticated with the service */
	async isAuthenticated(): Promise<boolean> {
		return (await this.sessionStore.get(this.serviceId)) !== undefined;
	}

	/** Get the current session (if authenticated) */
	async getSession(): Promise<AgentSession | undefined> {
		return this.sessionStore.get(this.serviceId);
	}

	/** Clear the session, forcing re-authentication on next tool call */
	async clearSession(): Promise<void> {
		await this.sessionStore.delete(this.serviceId);
	}
}

/** Extract scopes from an SD-JWT VC delegation token */
function parseDelegationScopes(delegation: string): string[] {
	try {
		// SD-JWT format: header.payload.signature~disclosure1~disclosure2~...
		const parts = delegation.split("~");
		const jwt = parts[0] ?? "";
		const [, payloadB64] = jwt.split(".");
		if (!payloadB64) return [];

		const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(payloadB64)));

		// Scopes may be in the vc.credentialSubject or directly in claims
		const scopes = payload?.vc?.credentialSubject?.scopes ?? payload?.scopes ?? [];

		return Array.isArray(scopes) ? scopes : [];
	} catch {
		return [];
	}
}

function base64urlToBytes(base64url: string): Uint8Array {
	const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
