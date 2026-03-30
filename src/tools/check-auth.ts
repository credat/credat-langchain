import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { ISessionStore, ServiceTarget } from "../types.js";

export interface CheckAuthToolConfig {
	service: ServiceTarget;
	sessionStore: ISessionStore;
}

export function createCheckAuthTool(config: CheckAuthToolConfig) {
	const { service, sessionStore } = config;
	const serviceName = service.name ?? service.id;

	return tool(
		async () => {
			const session = await sessionStore.get(service.id);

			if (!session) {
				return JSON.stringify({
					authenticated: false,
					serviceId: service.id,
					message: `Not authenticated with ${serviceName}. Call credat_authenticate first.`,
				});
			}

			return JSON.stringify({
				authenticated: true,
				serviceId: service.id,
				scopes: session.scopes,
				authenticatedAt: new Date(session.authenticatedAt).toISOString(),
			});
		},
		{
			name: "credat_check_auth",
			description: `Check if you are currently authenticated with ${serviceName}. Returns authentication status and granted scopes.`,
			schema: z.object({}),
		},
	);
}
