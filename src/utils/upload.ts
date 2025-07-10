// Utilities for uploading local media files to the backend so that the
// renderer can access them through a public URL.
//
// The backend exposes   POST http://localhost:8001 /upload   which accepts
// multipart/form-data with the field name `file` and returns:
//   { "url": "http://localhost:8002/<uuid>.mp4" }
// Optionally the request may require a Bearer token.

import { getAuthToken } from "@/context/AuthContext";

const BACKEND_URL =
  (import.meta as any).env?.BACKEND_URL || "http://localhost:8001";
const UPLOAD_ENDPOINT = `${BACKEND_URL.replace(/\/$/, "")}/api/render/upload`;
// Default JWT provided by the backend for uploads during development
const DEFAULT_UPLOAD_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUxOTc3NDEyfQ.ZMgBWPhRw4amD-AOk1yBqKqzUCnVCje9u_qscAdKIzA";

/**
 * Upload a File via multipart/form-data and return the public URL provided
 * by the backend.
 *
 * @param file   File object obtained from drag-and-drop or input element.
 * @param token  Optional JWT or similar auth token to send as Bearer header.
 */
export const uploadFile = async (
  file: File,
  token?: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const effectiveToken = token ?? getAuthToken() ?? DEFAULT_UPLOAD_TOKEN;

  const authHeader = effectiveToken
    ? { Authorization: `Bearer ${effectiveToken}` }
    : undefined;

  const res = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: authHeader,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.url) {
    throw new Error("Upload response missing `url` field");
  }
  return data.url as string;
};
