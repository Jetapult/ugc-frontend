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
          status: "PREPARING",
          renderedFrames: 0,
          encodedFrames: 0,
          frameCount: 0,
        });

        // Assume payload to be stored in the state for POST request
        const { payload } = get();

        if (!payload) throw new Error("Payload is not defined");

        // Step 1: POST request to start rendering via central API layer
        const jobInfo: any = await api.render.create({
          design: payload,
          options: {
            fps: 30,
            size: payload.size,
            format: get().exportType === "webm" ? "webm" : "mp4",
            transparent: get().exportType === "webm",
          },
        });
        const videoId = jobInfo.video.id;

        // Step 2 & 3: Polling for status updates
        const checkStatus = async () => {
          const statusInfo: any = await api.render.status(videoId);

          const { status, progress, url, error, renderedFrames, encodedFrames, frameCount } = statusInfo.video;

          // Update progress, status, and frame information in the UI
          set({ 
            progress: progress || 0, 
            status: status || "",
            renderedFrames: renderedFrames || 0,
            encodedFrames: encodedFrames || 0,
            frameCount: frameCount || 0
          });

          if (status === "COMPLETED" && url) {
            // Export completed successfully
            set({ exporting: false, output: { url, type: get().exportType } });
          } else if (status === "FAILED" || error) {
            // Handle error case
            console.error("Export failed:", error);
            set({ exporting: false });
            // Could show an error message to the user here
          } else if (status === "PENDING" || status === "IN_PROGRESS") {
            // Continue polling (but store the timeout ID so we can cancel it)
            if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
            pollingTimeoutId = setTimeout(checkStatus, 2000); // Poll every 2 seconds
          }
        };

        // Start the polling
        checkStatus();
      } catch (error) {
        console.error(error);
        set({ exporting: false });
        // Clear any polling on error
        if (pollingTimeoutId) {
          clearTimeout(pollingTimeoutId);
          pollingTimeoutId = null;
        }
      }
    },
  },
}));
