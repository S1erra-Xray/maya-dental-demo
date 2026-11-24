// PROTOTYPE-ONLY. Answers apiFetch calls in mock mode: matches method + path against the routes in
// src/mocks/index.ts and returns what the handler returns, after a small fake latency.
import { ApiRequestError, type ApiError } from "@/lib/api-client";
import { mockRoutes } from "./index";

export type MockRequest = {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
};

export type MockRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Backend path with :params, e.g. "/api/v1/items/:id". */
  path: string;
  /** Return the response body; return undefined for 204. Throw mockError(...) for failures. */
  handler: (request: MockRequest) => unknown;
};

const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 450;

/** Throw from a handler to answer with a ProblemDetails error, the way the FSH API does. */
export function mockError(
  status: number,
  title: string,
  errors?: Record<string, string[]>,
): never {
  const problem: ApiError = { status, title, errors };
  throw new ApiRequestError(status, title, problem);
}

export async function handleMockRequest<T>(
  method: string,
  url: string,
  body: BodyInit | null | undefined,
): Promise<T> {
  await delay(MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS));
  const [pathname, search = ""] = url.split("?");
  const verb = method.toUpperCase();

  for (const route of mockRoutes) {
    if (route.method !== verb) continue;
    const params = matchPath(route.path, pathname);
    if (params) {
      const result = route.handler({
        params,
        query: new URLSearchParams(search),
        body: parseBody(body),
      });
      return (result === undefined ? undefined : structuredClone(result)) as T;
    }
  }
  return mockError(404, `No mock for ${verb} ${pathname}`);
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (part !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
