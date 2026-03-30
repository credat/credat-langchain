import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { ISessionStore, ServiceTarget } from "../types.js";

export interface ListScopesToolConfig {
	service: ServiceTarget;
	sessionStore: ISessionStore;
	/** Scopes from the delegation credential (pre-parsed) */
	delegationScopes: string[];
}

export function createListScopesTool(config: ListScopesToolConfig) {
	const { service, sessionStore, delegationScopes } = config;
	const serviceName = service.name ?? service.id;

	return tool(
		async () => {
			const session = await sessionStore.get(service.id);

			if (session) {
				return JSON.stringify({
					source: "session",
					serviceId: service.id,
					authenticated: true,
					scopes: session.scopes,
					constraints: session.constraints ?? null,
				});
			}

			return JSON.stringify({
				source: "delegation",
				serviceId: service.id,
				authenticated: false,
				scopes: delegationScopes,
				message:
					"These are the scopes from your delegation credential. Authenticate to confirm which scopes the service grants.",
			});
		},
		{
			name: "credat_list_scopes",
			description: `List the scopes (permissions) you have for ${serviceName}. Shows granted scopes from active session or available scopes from delegation credential.`,
			schema: z.object({}),
		},
	);
}
