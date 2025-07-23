/*
 * Core API service layer – wraps fetch() with sensible defaults, centralised
 * error handling, timeout support, and automatic auth token injection.
 */
"use client";

import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { getAuthToken } from "./token";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: BodyInit | Record<string, unknown> | null; // allow plain object, FormData, etc.
  auth?: boolean; // include Authorization header
  timeoutMs?: number; // default 45s
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Default network timeout (ms)
export const DEFAULT_API_TIMEOUT_MS = 45_000;

export async function apiRequest<T = unknown>(
  endpoint: string,
  {
    method = "GET",
    headers = {},
    body,
    auth = false,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
  }: ApiRequestOptions = {},
): Promise<T> {
  // Ensure we don't end up with double slashes
  const url = `${API_BASE_URL.replace(/\/$/, "")}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  // If body is plain object, serialise to JSON automatically
  const isPlainObjectBody =
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob);
  let requestBody: BodyInit | undefined;
  if (isPlainObjectBody) {
    finalHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body as Record<string, unknown>);
  } else if (body !== undefined && body !== null) {
    requestBody = body as BodyInit;
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: requestBody,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Some endpoints may return 204 No Content
    if (res.status === 204) return undefined as T;

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // non-json response
      // eslint-disable-next-line no-console
      console.warn(`Non-JSON response from ${url}`);
      data = text as unknown;
    }

    if (!res.ok) {
      const message =
        (data as any)?.detail ||
        (data as any)?.error ||
        res.statusText ||
        "Unknown error";
      throw new ApiError(message, res.status);
    }

    return data as T;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError("Request timed out");
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || "Unknown error");
  }
}

// Convenience typed helpers mirroring sister-project style -------------------

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export const api = {
  request: apiRequest,
  auth: {
    // Login with email/password (no API key header required)
    login: (email: string, password: string) =>
      apiRequest<LoginResponse>(API_ENDPOINTS.login, {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      }),
  },
  heygen: {
    avatars: (params: Record<string, string | number | boolean>) => {
      const search = new URLSearchParams(
        params as Record<string, string>,
      ).toString();
      return apiRequest(`${API_ENDPOINTS.heygenAvatars}?${search}`, {
        auth: true,
      });
    },
    voices: (params: Record<string, string | number | boolean>) => {
      const search = new URLSearchParams(
        params as Record<string, string>,
      ).toString();
      return apiRequest(`${API_ENDPOINTS.heygenVoices}?${search}`, {
        auth: true,
      });
    },
    generateScript: (body: Record<string, unknown>) =>
      apiRequest(API_ENDPOINTS.heygenGenerateScript, {
        method: "POST",
        body,
        auth: true,
        timeoutMs: 300_000, // 5 minutes to accommodate long script generation
      }),
    videos: {
      create: (body: Record<string, unknown>) =>
        apiRequest(`${API_ENDPOINTS.heygenVideos}/`, {
          method: "POST",
          body,
          auth: true,
        }),
      status: (id: string) =>
        apiRequest(`${API_ENDPOINTS.heygenVideos}/${id}/status`, {
          auth: true,
        }),
    },
  },
  voices: {
    list: (language: string) => apiRequest(API_ENDPOINTS.voices(language)),
  },
  render: {
    upload: (formData: FormData) =>
      apiRequest<{ url: string }>(API_ENDPOINTS.renderUpload, {
        method: "POST",
        body: formData,
        auth: true,
      }),
    create: (body: Record<string, unknown>) =>
      apiRequest(API_ENDPOINTS.render, {
        method: "POST",
        body,
        auth: true,
      }),
    status: (id: string) =>
      apiRequest(`${API_ENDPOINTS.render}?id=${encodeURIComponent(id)}`, {
        auth: true,
      }),
  },
} as const;
