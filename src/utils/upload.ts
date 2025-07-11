// Utilities for uploading local media files to the backend so that the
// renderer can access them through a public URL.

import { api } from "@/lib/api";



/**
 * Upload a File via multipart/form-data and return the public URL provided
 * by the backend.
 *
 * @param file   File object obtained from drag-and-drop or input element.
 * @param token  Optional JWT or similar auth token to send as Bearer header.
 */
export const uploadFile = async (
  file: File,
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file, file.name);

    const data = await api.render.upload(formData);
  if (!data?.url) throw new Error("Upload failed: response missing url");
  return data.url;

};
