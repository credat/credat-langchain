// ── Error Codes ──

export const LangchainAuthErrorCodes = {
	NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
	AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
	TRANSPORT_ERROR: "TRANSPORT_ERROR",
	ALREADY_AUTHENTICATED: "ALREADY_AUTHENTICATED",
	SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;

export type LangchainAuthErrorCode =
	(typeof LangchainAuthErrorCodes)[keyof typeof LangchainAuthErrorCodes];
