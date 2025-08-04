/*
 * Central configuration layer for API base URLs and endpoint paths.
 * This is loosely inspired by the config/api pattern used in the sister project.
 */

// Base URLs for each environment. Extend / tweak per-project needs.
export const API_CONFIG = {
  development: "http://localhost:3000/",
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
  const viteEnv = (import.meta as { env?: Record<string, string> }).env ?? {};
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
  login: "/v1/auth/login",

  // Project Management
  projects: "/v1/projects",
  project: (id: string) => `/v1/projects/${id}`,

  // UGC Export Management
  ugcExports: "/v1/ugc/exports",
  ugcExport: (id: string) => `/v1/ugc/exports/${id}`,
  ugcUpload: "/v1/ugc/upload",
  ugcUploads: "/v1/ugc/uploads", // NEW: list uploaded media

  // HeyGen Export Management
  heygenExports: "/v1/heygen/exports",
  heygenExport: (id: string) => `/v1/heygen/exports/${id}`,

  // HeyGen integration (existing endpoints)
  heygenAvatars: "/v1/heygen/avatars",
  heygenVoices: "/v1/heygen/voices",
  heygenGenerateScript: "/v1/heygen/generate_script",
  heygenVideos: "/v1/heygen/videos",

  // Voice-over voices endpoint
  voices: (language: string) =>
    `/api/voices?language=${encodeURIComponent(language)}`,
} as const;
