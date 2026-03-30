import type { AgentIdentity } from "@credat/sdk";
import { presentCredentials, selectDisclosures } from "@credat/sdk";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { LangchainAuthErrorCodes } from "../errors.js";
import type {
	AgentSession,
	CredatAgentHooks,
	ISessionStore,
	ITransport,
	ServiceTarget,
} from "../types.js";

export interface AuthenticateToolConfig {
	agent: AgentIdentity;
	delegation: string;
	transport: ITransport;
	service: ServiceTarget;
	sessionStore: ISessionStore;
	hooks?: CredatAgentHooks;
	disclosureScopes?: string[];
}

export function createAuthenticateTool(config: AuthenticateToolConfig) {
	const { agent, transport, service, sessionStore, hooks, disclosureScopes } = config;
	const { delegation } = config;
	const serviceName = service.name ?? service.id;

	return tool(
		async () => {
			// Check if already authenticated
			const existing = await sessionStore.get(service.id);
			if (existing) {
				return JSON.stringify({
					status: "already_authenticated",
					serviceId: service.id,
					scopes: existing.scopes,
				});
			}

			hooks?.onAuthAttempt?.({ serviceId: service.id, timestamp: Date.now() });

			try {
				// Step 1: Request challenge from service
				const challenge = await transport.requestChallenge();

				// Step 2: Apply selective disclosure if scopes are specified
				let token = delegation;
				if (disclosureScopes && disclosureScopes.length > 0) {
					token = selectDisclosures(delegation, disclosureScopes);
				}

				// Step 3: Sign the challenge with agent's credentials
				const presentation = await presentCredentials({
					challenge,
					delegation: token,
					agent,
				});

				// Step 4: Send presentation to service
				const result = await transport.sendPresentation(presentation);

				if (!result.authenticated) {
					const errorMsg = result.error ?? "Authentication rejected by service";
					hooks?.onAuthFailure?.({
						serviceId: service.id,
						error: errorMsg,
						timestamp: Date.now(),
					});
					return JSON.stringify({
						status: "failed",
						code: LangchainAuthErrorCodes.AUTHENTICATION_FAILED,
						error: errorMsg,
					});
				}

				// Step 5: Store session
				const session: AgentSession = {
					serviceId: service.id,
					scopes: result.scopes ?? [],
					constraints: result.constraints,
					authenticatedAt: Date.now(),
				};
				await sessionStore.set(service.id, session);

				hooks?.onAuthSuccess?.({
					serviceId: service.id,
					scopes: session.scopes,
					constraints: session.constraints,
					timestamp: Date.now(),
				});

				return JSON.stringify({
					status: "authenticated",
					serviceId: service.id,
					scopes: session.scopes,
				});
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : "Unknown transport error";
				hooks?.onAuthFailure?.({
					serviceId: service.id,
					error: errorMsg,
					timestamp: Date.now(),
				});
				return JSON.stringify({
					status: "error",
					code: LangchainAuthErrorCodes.TRANSPORT_ERROR,
					error: errorMsg,
				});
			}
		},
		{
			name: "credat_authenticate",
			description: `Authenticate with ${serviceName}. Call this before using protected tools. Performs a cryptographic handshake using your delegation credential.`,
			schema: z.object({}),
		},
	);
}
