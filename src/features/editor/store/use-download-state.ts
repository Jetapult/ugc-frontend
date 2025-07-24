import { IDesign } from "@designcombo/types";
import { create } from "zustand";
import { api } from "@/lib/api";

interface Output {
  url: string;
  type: string;
}

// For canceling polling timeouts
let pollingTimeoutId: NodeJS.Timeout | null = null;

interface DownloadState {
  projectId: string;
  exporting: boolean;
  exportType: "json" | "mp4" | "webm";
  progress: number;
  status: string;
  renderedFrames: number;
  encodedFrames: number;
  frameCount: number;
  output?: Output;
  payload?: IDesign;
  displayProgressModal: boolean;
  actions: {
    setProjectId: (projectId: string) => void;
    setExporting: (exporting: boolean) => void;
    setExportType: (exportType: "json" | "mp4" | "webm") => void;
    setProgress: (progress: number) => void;
    setState: (state: Partial<DownloadState>) => void;
    setOutput: (output: Output) => void;
    startExport: () => void;
    setDisplayProgressModal: (displayProgressModal: boolean) => void;
  };
}

export const useDownloadState = create<DownloadState>((set, get) => ({
  projectId: "",
  exporting: false,
  exportType: "mp4", // default

  progress: 0,
  status: "",
  renderedFrames: 0,
  encodedFrames: 0,
  frameCount: 0,
  displayProgressModal: false,
  actions: {
    setProjectId: (projectId) => set({ projectId }),
    setExporting: (exporting) => set({ exporting }),
    setExportType: (exportType) => set({ exportType }),
    setProgress: (progress) => set({ progress }),
    setState: (state) => set({ ...state }),
    setOutput: (output) => set({ output }),
    setDisplayProgressModal: (displayProgressModal) => {
      // If closing the modal, cancel any ongoing polling
      if (!displayProgressModal && pollingTimeoutId) {
        clearTimeout(pollingTimeoutId);
        pollingTimeoutId = null;
      }
      set({ displayProgressModal });
    },
    startExport: async () => {
      try {
        // Set exporting to true at the start
        set({
          exporting: true,
          displayProgressModal: true,
          status: "PENDING",
          renderedFrames: 0,
          encodedFrames: 0,
          frameCount: 0,
          progress: 0,
        });

        // Get payload and project ID from state
        const { payload, projectId } = get();

        if (!payload) throw new Error("Payload is not defined");
        if (!projectId) throw new Error("Project ID is not defined");

        // Step 1: POST request to create UGC export
        const exportResponse = await api.ugcExports.create({
          ugc_project_id: projectId,
          design: payload,
          options: {
            fps: 30,
            size: payload.size,
            format: get().exportType === "webm" ? "webm" : "mp4",
            transparent: get().exportType === "webm",
          },
        });

        const exportId = exportResponse.video.id;

        // Step 2: Polling for status updates
        const checkStatus = async () => {
          try {
            const statusResponse = await api.ugcExports.get(exportId);
            const exportData = statusResponse.data;

            const { status, progress, url, error } = exportData;

            // Update progress and status in the UI
            set({
              progress: progress || 0,
              status: status || "PENDING",
              // Note: The new API doesn't provide frame counts in the same way
              // We'll keep the existing frame tracking for UI consistency
            });

            if (status === "COMPLETED" && url) {
              // Export completed successfully
              set({
                exporting: false,
                output: { url, type: get().exportType },
                progress: 100,
              });
            } else if (status === "FAILED" || error) {
              // Handle error case
              console.error("Export failed:", error);
              set({ exporting: false, status: "FAILED" });
              // Could show an error message to the user here
            } else if (status === "PENDING" || status === "PROCESSING") {
              // Continue polling (but store the timeout ID so we can cancel it)
              if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
              pollingTimeoutId = setTimeout(checkStatus, 2000); // Poll every 2 seconds
            }
          } catch (error) {
            console.error("Error checking export status:", error);
            // Continue polling on API errors (might be temporary)
            if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
            pollingTimeoutId = setTimeout(checkStatus, 5000); // Poll less frequently on errors
          }
        };

        // Start the polling
        checkStatus();
      } catch (error) {
        console.error("Error starting export:", error);
        set({ exporting: false, status: "FAILED" });
        // Clear any polling on error
        if (pollingTimeoutId) {
          clearTimeout(pollingTimeoutId);
          pollingTimeoutId = null;
        }
      }
    },
  },
}));
