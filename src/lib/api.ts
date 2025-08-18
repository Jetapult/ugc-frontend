/*
 * Core API service layer – wraps fetch() with sensible defaults, centralised
 * error handling, timeout support, and automatic auth token injection.
 */
"use client";

import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { getAuthToken } from "./token";
import { IDesign } from "@designcombo/types";

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
      console.warn(`Non-JSON response from ${url}`);
      data = text as unknown;
    }

    if (!res.ok) {
      const errorData = data as {
        detail?: string;
        error?: string;
        message?: string;
      };
      const message =
        errorData?.detail ||
        errorData?.error ||
        errorData?.message ||
        res.statusText ||
        "Unknown error";
      throw new ApiError(message, res.status);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("Request timed out");
    }
    if (err instanceof ApiError) throw err;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    throw new ApiError(errorMessage);
  }
}

// Convenience typed helpers mirroring sister-project style -------------------

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

// Project Management Types
export interface Project {
  id: string;
  title: string;
  design?: IDesign;
  editor_state?: Record<string, unknown>;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest extends Record<string, unknown> {
  title: string;
  design?: IDesign;
  editor_state?: Record<string, unknown>;
}

export interface UpdateProjectRequest extends Record<string, unknown> {
  title?: string;
  design?: IDesign;
  editor_state?: Record<string, unknown>;
}

// UGC Export Types
export interface UGCExport {
  id: string;
  ugc_project_id: string;
  user_id: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  url: string | null;
  error: string | null;
  design_json: IDesign;
  options_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  project_title?: string; // optional project title for display purposes
}

export interface CreateUGCExportRequest extends Record<string, unknown> {
  ugc_project_id: string;
  design: IDesign;
  options: {
    fps: number;
    size: {
      width: number;
      height: number;
    };
    format: string;
    transparent: boolean;
  };
}

// Upload Types
export interface UploadItem extends Record<string, unknown> {
  url: string;
  filename: string;
  thumbnail_url: string;
}

// HeyGen Export Types
export interface HeyGenExport {
  id: string;
  ugc_project_id: string;
  user_id: number;
  prompt: string;
  voice_id: string;
  avatar_id?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message: string | null;
  video_url: string | null;
  heygen_video_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHeyGenExportRequest extends Record<string, unknown> {
  ugc_project_id: string;
  prompt: string;
  voice_id: string;
  avatar_id?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

// HeyGen Videos API Types
export interface CreateHeyGenVideoRequest extends Record<string, unknown> {
  ugc_project_id: string; // Required for tracking
  input_text: string; // Required: Text to speak
  voice_id: string; // Required: Voice ID
  avatar_pose_id?: string; // Optional: Avatar pose
  avatar_style?: string; // Optional: Avatar style
  width?: number; // Optional: Video width
  height?: number; // Optional: Video height
}

export interface HeyGenVideoResponse extends Record<string, unknown> {
  success: boolean;
  data: {
    export_id: string;
    heygen_response: {
      code: number;
      data: {
        video_id: string;
      };
      msg: string | null;
      message: string | null;
    };
  };
}

// Veo3 Export Types
export interface Veo3Export extends Record<string, unknown> {
  id: string;
  ugc_project_id: string;
  user_id: number;
  prompt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message: string | null;
  video_url: string | null;
  veo3_video_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVeo3ExportRequest extends Record<string, unknown> {
  ugc_project_id: string;
  prompt: string;
  aspect_ratio?: string; // e.g. "16:9" or "9:16"
  resolution?: string;   // e.g. "1920x1080"
  audio_prompt?: string; // optional descriptive audio prompt
  duration?: number;     // desired video duration in seconds
  seed?: number;         // deterministic seed for generation (0 = random)
}

export const api = {
  request: apiRequest,
  auth: {
    // Login with email/password
    login: (email: string, password: string) =>
      apiRequest<LoginResponse>(API_ENDPOINTS.login, {
        method: "POST",
        body: { email, password },
      }),
  },

  // Project Management
  projects: {
    list: (params?: { limit?: number; offset?: number }) => {
      const search = params
        ? new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ).toString()
        : "";
      return apiRequest<{ success: boolean; data: ProjectListItem[] }>(
        `${API_ENDPOINTS.projects}${search ? `?${search}` : ""}`,
        { auth: true },
      );
    },

    create: (data: CreateProjectRequest) =>
      apiRequest<{ success: boolean; data: Project }>(API_ENDPOINTS.projects, {
        method: "POST",
        body: data,
        auth: true,
      }),

    get: (id: string) =>
      apiRequest<{ success: boolean; data: Project }>(
        API_ENDPOINTS.project(id),
        {
          auth: true,
        },
      ),

    update: (id: string, data: UpdateProjectRequest) =>
      apiRequest<{ success: boolean; data: Project }>(
        API_ENDPOINTS.project(id),
        {
          method: "PUT",
          body: data,
          auth: true,
        },
      ),

    delete: (id: string, deleteExports = false) =>
      apiRequest<{ success: boolean; message: string }>(
        `${API_ENDPOINTS.project(id)}?delete_exports=${deleteExports}`,
        {
          method: "DELETE",
          auth: true,
        },
      ),
  },

  // UGC Export Management
  ugcExports: {
    list: (params?: {
      ugc_project_id?: string;
      limit?: number;
      offset?: number;
    }) => {
      const search = params
        ? new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ).toString()
        : "";
      return apiRequest<{ success: boolean; data: UGCExport[] }>(
        `${API_ENDPOINTS.ugcExports}${search ? `?${search}` : ""}`,
        { auth: true },
      );
    },

    create: (data: CreateUGCExportRequest) =>
      apiRequest<{ video: { id: string } }>(API_ENDPOINTS.ugcExports, {
        method: "POST",
        body: data,
        auth: true,
      }),

    get: (id: string) =>
      apiRequest<{ success: boolean; data: UGCExport }>(
        API_ENDPOINTS.ugcExport(id),
        {
          auth: true,
        },
      ),

    update: (id: string, data: Partial<UGCExport>) =>
      apiRequest<{ success: boolean; data: UGCExport }>(
        API_ENDPOINTS.ugcExport(id),
        {
          method: "PUT",
          body: data,
          auth: true,
        },
      ),

    delete: (id: string) =>
      apiRequest<{ success: boolean; message: string }>(
        API_ENDPOINTS.ugcExport(id),
        {
          method: "DELETE",
          auth: true,
        },
      ),

    upload: (formData: FormData) =>
      apiRequest<{ url: string }>(API_ENDPOINTS.ugcUpload, {
        method: "POST",
        body: formData,
        auth: true,
      }),
  },

  // UGC Uploads Listing
  uploads: {
    list: (params?: { limit?: number; offset?: number }) => {
      const search = params
        ? new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ).toString()
        : "";
      return apiRequest<{
        success: boolean;
        data: UploadItem[];
        pagination?: Record<string, unknown>;
      }>(`${API_ENDPOINTS.ugcUploads}${search ? `?${search}` : ""}`, {
        auth: true,
      });
    },
  },

  // HeyGen Export Management
  heygenExports: {
    list: (params?: {
      ugc_project_id?: string;
      limit?: number;
      offset?: number;
    }) => {
      const search = params
        ? new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ).toString()
        : "";
      return apiRequest<{ success: boolean; data: HeyGenExport[] }>(
        `${API_ENDPOINTS.heygenExports}${search ? `?${search}` : ""}`,
        { auth: true },
      );
    },

    create: (data: CreateHeyGenExportRequest) =>
      apiRequest<{ success: boolean; data: HeyGenExport }>(
        API_ENDPOINTS.heygenExports,
        {
          method: "POST",
          body: data,
          auth: true,
        },
      ),

    get: (id: string) =>
      apiRequest<{ success: boolean; data: HeyGenExport }>(
        API_ENDPOINTS.heygenExport(id),
        {
          auth: true,
        },
      ),

    update: (id: string, data: Partial<HeyGenExport>) =>
      apiRequest<{ success: boolean; data: HeyGenExport }>(
        API_ENDPOINTS.heygenExport(id),
        {
          method: "PUT",
          body: data,
          auth: true,
        },
      ),

    delete: (id: string) =>
      apiRequest<{ success: boolean; message: string }>(
        API_ENDPOINTS.heygenExport(id),
        {
          method: "DELETE",
          auth: true,
        },
      ),
  },

  // HeyGen integration (existing endpoints)
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
      create: (data: CreateHeyGenVideoRequest): Promise<HeyGenVideoResponse> =>
        apiRequest<HeyGenVideoResponse>(`${API_ENDPOINTS.heygenVideos}/`, {
          method: "POST",
          body: data,
          auth: true,
        }),
      status: (id: string) =>
        apiRequest(`${API_ENDPOINTS.heygenVideos}/${id}/status`, {
          auth: true,
        }),
    },
  },

  // Veo3 Export Management
  veo3Exports: {
    list: (params?: {
      ugc_project_id?: string;
      limit?: number;
      offset?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.ugc_project_id) search.set("ugc_project_id", params.ugc_project_id);
      if (params?.limit) search.set("limit", params.limit.toString());
      if (params?.offset) search.set("offset", params.offset.toString());
      const queryString = search.toString();
      return apiRequest<{
        success: boolean;
        data: Veo3Export[];
      }>(`${API_ENDPOINTS.veo3Exports}${queryString ? `?${queryString}` : ""}`, {
        auth: true,
      });
    },
    create: (data: CreateVeo3ExportRequest) =>
      apiRequest<{
        success: boolean;
        data: Veo3Export;
      }>(API_ENDPOINTS.veo3Exports, {
        method: "POST",
        body: data,
        auth: true,
      }),
    get: (id: string) =>
      apiRequest<{
        success: boolean;
        data: Veo3Export;
      }>(API_ENDPOINTS.veo3Export(id), {
        auth: true,
      }),
    update: (id: string, data: Partial<Veo3Export>) =>
      apiRequest<{
        success: boolean;
        data: Veo3Export;
      }>(API_ENDPOINTS.veo3Export(id), {
        method: "PATCH",
        body: data,
        auth: true,
      }),
    delete: (id: string) =>
      apiRequest<{
        success: boolean;
      }>(API_ENDPOINTS.veo3Export(id), {
        method: "DELETE",
        auth: true,
      }),
  },

  voices: {
    list: (language: string) => apiRequest(API_ENDPOINTS.voices(language)),
  },
} as const;
