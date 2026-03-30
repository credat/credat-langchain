import type {
	AgentIdentity,
	ChallengeMessage,
	DelegationConstraints,
	PresentationMessage,
} from "@credat/sdk";

// ── Utility Types ──

export type MaybePromise<T> = T | Promise<T>;

// ── Service Target ──

export interface ServiceTarget {
	/** Unique identifier for this service (used as session key) */
	id: string;
	/** Human-readable name used in tool descriptions for the LLM */
	name?: string;
}

// ── Session ──

export interface AgentSession {
	serviceId: string;
	scopes: string[];
	constraints?: DelegationConstraints;
	authenticatedAt: number;
}

// ── Session Store ──

export interface ISessionStore {
	set(serviceId: string, session: AgentSession): MaybePromise<void>;
	get(serviceId: string): MaybePromise<AgentSession | undefined>;
	delete(serviceId: string): MaybePromise<boolean>;
}

// ── Transport ──

export interface ITransport {
	/** Request a challenge from the service */
	requestChallenge(): Promise<ChallengeMessage>;
	/** Send the signed presentation to the service and receive the auth result */
	sendPresentation(presentation: PresentationMessage): Promise<AuthenticateResponse>;
}

export interface AuthenticateResponse {
	authenticated: boolean;
	scopes?: string[];
	constraints?: DelegationConstraints;
	error?: string;
}

// ── Observability Hooks ──

export interface AuthAttemptEvent {
	serviceId: string;
	timestamp: number;
}

export interface AuthSuccessEvent {
	serviceId: string;
	scopes: string[];
	constraints?: DelegationConstraints;
	timestamp: number;
}

export interface AuthFailureEvent {
	serviceId: string;
	error: string;
	timestamp: number;
}

export interface CredatAgentHooks {
	/** Fired when the agent starts a handshake */
	onAuthAttempt?: (event: AuthAttemptEvent) => void;
	/** Fired when authentication succeeds */
	onAuthSuccess?: (event: AuthSuccessEvent) => void;
	/** Fired when authentication fails */
	onAuthFailure?: (event: AuthFailureEvent) => void;
}

// ── Toolkit Options ──

export interface CredatToolkitOptions {
	/** The agent's identity (from createAgent/loadAgent) */
	agent: AgentIdentity;
	/** The delegation credential token (SD-JWT VC string) */
	delegation: string;
	/** Transport for communicating with the target service */
	transport: ITransport;
	/** Target service metadata */
	service: ServiceTarget;
	/** Custom session store (default: in-memory with 1h TTL) */
	sessionStore?: ISessionStore;
	/** Session TTL in milliseconds (default: 3_600_000 = 1 hour) */
	sessionMaxAgeMs?: number;
	/** Observability hooks */
	hooks?: CredatAgentHooks;
	/** Scopes to selectively disclose (if omitted, all scopes are presented) */
	disclosureScopes?: string[];
}

export type { AgentIdentity, ChallengeMessage, DelegationConstraints, PresentationMessage };
