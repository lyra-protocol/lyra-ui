import "server-only";

type ProviderName = "coinbase";

type ProviderState = {
  unavailableUntil: number;
};

const PROVIDER_STATE = new Map<ProviderName, ProviderState>();
const DNS_COOLDOWN_MS = 5 * 60 * 1000;

function getProviderState(provider: ProviderName) {
  const existing = PROVIDER_STATE.get(provider);
  if (existing) {
    return existing;
  }

  const initial = { unavailableUntil: 0 };
  PROVIDER_STATE.set(provider, initial);
  return initial;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error ?? "");
}

function extractCause(error: unknown) {
  if (error instanceof Error && "cause" in error) {
    return error.cause;
  }

  if (error && typeof error === "object" && "cause" in error) {
    return (error as { cause?: unknown }).cause;
  }

  return null;
}

export function isDnsResolutionFailure(error: unknown) {
  const message = extractErrorMessage(error).toLowerCase();
  if (message.includes("enotfound") || message.includes("getaddrinfo")) {
    return true;
  }

  const cause = extractCause(error);
  const causeMessage = extractErrorMessage(cause).toLowerCase();
  return causeMessage.includes("enotfound") || causeMessage.includes("getaddrinfo");
}

export function shouldSkipProvider(provider: ProviderName) {
  return Date.now() < getProviderState(provider).unavailableUntil;
}

export function markProviderUnavailable(provider: ProviderName, error: unknown) {
  if (!isDnsResolutionFailure(error)) {
    return;
  }

  getProviderState(provider).unavailableUntil = Date.now() + DNS_COOLDOWN_MS;
}
