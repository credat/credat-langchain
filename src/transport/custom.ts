import type { ChallengeMessage, PresentationMessage } from "@credat/sdk";
import type { AuthenticateResponse, ITransport } from "../types.js";

interface TransportFunctions {
	requestChallenge: () => Promise<ChallengeMessage>;
	sendPresentation: (presentation: PresentationMessage) => Promise<AuthenticateResponse>;
}

/** Create a custom transport from two functions */
export function createTransport(fns: TransportFunctions): ITransport {
	return {
		requestChallenge: fns.requestChallenge,
		sendPresentation: fns.sendPresentation,
	};
}
