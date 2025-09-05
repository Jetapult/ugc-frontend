// Utilities for uploading local media files to the backend so that the
// renderer can access them through a public URL.

import { api } from "@/lib/api";



/**
 * Upload a File via multipart/form-data and return the public URL provided
 * by the backend.
 *
 * @param file   File object obtained from drag-and-drop or input element.
 * @param projectId  Required UGC project ID for tracking uploads.
 */
export const uploadFile = async (
  file: File,
  projectId: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("ugc_project_id", projectId);

  const data = await api.ugcExports.upload(formData);
  if (!data?.url) throw new Error("Upload failed: response missing url");
  return data.url;
};
