import type { AgentSession, ISessionStore } from "../types.js";

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_THRESHOLD = 100;

export class SessionStore implements ISessionStore {
	private store = new Map<string, AgentSession>();
	private readonly maxAgeMs: number;
	private insertsSinceCleanup = 0;

	constructor(maxAgeMs = DEFAULT_MAX_AGE_MS) {
		this.maxAgeMs = maxAgeMs;
	}

	set(serviceId: string, session: AgentSession): void {
		this.store.set(serviceId, session);

		this.insertsSinceCleanup++;
		if (this.insertsSinceCleanup >= CLEANUP_THRESHOLD) {
			this.cleanup();
			this.insertsSinceCleanup = 0;
		}
	}

	get(serviceId: string): AgentSession | undefined {
		const entry = this.store.get(serviceId);
		if (!entry) return undefined;

		if (Date.now() - entry.authenticatedAt > this.maxAgeMs) {
			this.store.delete(serviceId);
			return undefined;
		}

		return entry;
	}

	delete(serviceId: string): boolean {
		return this.store.delete(serviceId);
	}

	cleanup(): void {
		const now = Date.now();
		for (const [serviceId, entry] of this.store) {
			if (now - entry.authenticatedAt > this.maxAgeMs) {
				this.store.delete(serviceId);
			}
		}
	}

	get size(): number {
		return this.store.size;
	}
}
