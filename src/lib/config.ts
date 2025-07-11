/*
 * Central configuration layer for API base URLs and endpoint paths.
 * This is loosely inspired by the config/api pattern used in the sister project.
 */

// Base URLs for each environment. Extend / tweak per-project needs.
export const API_CONFIG = {
  development: "http://localhost:8001",
  // Temporary public dev host (ngrok / cloud run etc.)
  staging: "https://ugc.vadapav.art",
  production: "https://ugc.vadapav.art",
} as const;

export type ApiEnv = keyof typeof API_CONFIG;

/**
 * Resolve the backend base URL at runtime.
 *
 * Priority order:
 *   1. Explicit Vite env `VITE_BACKEND_URL` – if defined, we trust it.
 *   2. Environment mapping via `VITE_API_ENV` (defaults to `staging`).
 *   3. Fallback to `API_CONFIG.staging`.
 */
export const getApiBaseUrl = (): string => {
  const viteEnv = (import.meta as any).env ?? {};
  // Highest priority – explicit URL
  if (viteEnv.VITE_BACKEND_URL) {
    return String(viteEnv.VITE_BACKEND_URL).replace(/\/$/, "");
  }

  // Map env tag -> base
  const envTag = (viteEnv.VITE_API_ENV as ApiEnv | undefined) ?? "staging";
  return (API_CONFIG as Record<string, string>)[envTag] ?? API_CONFIG.staging;
};

export const API_BASE_URL: string = getApiBaseUrl();

/**
 * All backend endpoint paths used throughout the application.
 * Keep these path-only (no domain) so they can be trivially concatenated
 * with API_BASE_URL or exported for SSR proxies.
 */
export const API_ENDPOINTS = {
  // Authentication
  login: "/api/auth/token",

  // HeyGen integration
  heygenAvatars: "/api/heygen/avatars",
  heygenVoices: "/api/heygen/voices",
  heygenGenerateScript: "/api/heygen/generate_script",
  heygenVideos: "/api/heygen/videos",

  // Voice-over voices endpoint
  voices: (language: string) =>
    `/api/voices?language=${encodeURIComponent(language)}`,

  // Render / upload
  renderUpload: "/api/render/upload",
  // Render endpoints – note trailing slash to avoid backend redirect
  render: "/api/render/", // POST to create, GET to poll status (?id=)
} as const;
