// PROTOTYPE-ONLY. Same public surface as web's src/lib/api-client.ts (`apiFetch`, `ApiRequestError`,
// `ApiError`), so src/api/* modules port to web without edits. No auth: prototypes have no sign-in;
// web's apiFetch adds the bearer token and refresh. Not ported.
import { env } from "@/env";
import i18n from "@/i18n";

export type ApiError = {
  status: number;
  title?: string;
  detail?: string;
  // FluentValidation errors arrive keyed by field; CustomException sends a flat string[].
  errors?: Record<string, string[]> | string[];
  code?: string;
  reason?: string;
  [key: string]: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly problem?: ApiError;

  constructor(status: number, message: string, problem?: ApiError) {
    super(message);
    this.status = status;
    this.problem = problem;
  }
}

type RequestInitEx = RequestInit & {
  /** Accepted for signature parity with web; prototypes never authenticate. */
  skipAuth?: boolean;
  timeoutMs?: number;
  onResponse?: (response: Response) => void;
};

const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiFetch<T = unknown>(path: string, init: RequestInitEx = {}): Promise<T> {
  if (env.mock) {
    // Loaded on demand: keeps the mock layer out of the module graph web will copy.
    const { handleMockRequest } = await import("@/mocks/router");
    return handleMockRequest<T>(init.method ?? "GET", path, init.body);
  }
  return fetchLive<T>(path, init);
}

async function fetchLive<T>(path: string, init: RequestInitEx): Promise<T> {
  const { headers, timeoutMs = DEFAULT_TIMEOUT_MS, onResponse, signal, ...rest } = init;
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has("Content-Type") && typeof rest.body === "string") {
    mergedHeaders.set("Content-Type", "application/json");
  }
  if (!mergedHeaders.has("Accept-Language")) {
    mergedHeaders.set("Accept-Language", i18n.resolvedLanguage || "en-US");
  }

  const timeout = AbortSignal.timeout(timeoutMs);
  const url = path.startsWith("http") ? path : `${env.apiBase}${path}`;
  const response = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  onResponse?.(response);

  if (!response.ok) {
    const problem = await parseError(response);
    throw new ApiRequestError(
      response.status,
      problem?.title ?? problem?.detail ?? response.statusText,
      problem,
    );
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined as T;
  return (await response.json()) as T;
}

async function parseError(response: Response): Promise<ApiError | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined;
  try {
    return (await response.json()) as ApiError;
  } catch {
    return undefined;
  }
}
