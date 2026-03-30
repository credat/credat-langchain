import type { ChallengeMessage, PresentationMessage } from "@credat/sdk";
import type { AuthenticateResponse, ITransport } from "../types.js";

export interface HttpTransportOptions {
	/** Base URL of the Credat-protected service (e.g., "https://api.example.com") */
	baseUrl: string;
	/** Challenge endpoint path. Default: "/credat/challenge" */
	challengePath?: string;
	/** Authenticate endpoint path. Default: "/credat/authenticate" */
	authenticatePath?: string;
	/** Additional headers to include in requests */
	headers?: Record<string, string>;
	/** Custom fetch implementation (default: globalThis.fetch) */
	fetch?: typeof globalThis.fetch;
}

export class HttpTransport implements ITransport {
	private readonly baseUrl: string;
	private readonly challengePath: string;
	private readonly authenticatePath: string;
	private readonly headers: Record<string, string>;
	private readonly fetchFn: typeof globalThis.fetch;

	constructor(options: HttpTransportOptions) {
		if (!options.baseUrl) {
			throw new Error("HttpTransport: baseUrl is required");
		}

		this.baseUrl = options.baseUrl.replace(/\/$/, "");
		this.challengePath = options.challengePath ?? "/credat/challenge";
		this.authenticatePath = options.authenticatePath ?? "/credat/authenticate";
		this.headers = options.headers ?? {};
		this.fetchFn = options.fetch ?? globalThis.fetch;
	}

	async requestChallenge(): Promise<ChallengeMessage> {
		const url = `${this.baseUrl}${this.challengePath}`;

		const response = await this.fetchFn(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.headers,
			},
		});

		if (!response.ok) {
			throw new Error(`Challenge request failed: ${response.status} ${response.statusText}`);
		}

		return response.json() as Promise<ChallengeMessage>;
	}

	async sendPresentation(presentation: PresentationMessage): Promise<AuthenticateResponse> {
		const url = `${this.baseUrl}${this.authenticatePath}`;

		const response = await this.fetchFn(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.headers,
			},
			body: JSON.stringify({ presentation }),
		});

		if (!response.ok) {
			throw new Error(`Authentication request failed: ${response.status} ${response.statusText}`);
		}

		return response.json() as Promise<AuthenticateResponse>;
	}
}
