import React from "react";
import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type UploadItem } from "@/lib/api";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { IVideo } from "@designcombo/types";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";

const PAGE_LIMIT = 20;
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;

export const Library = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [uploads, setUploads] = React.useState<UploadItem[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const fetchUploads = async () => {
    if (loading || !hasMore) return;
    try {
      setLoading(true);
      const res = await api.uploads.list({ limit: PAGE_LIMIT, offset });
      // Deduplicate by URL to avoid duplicates if fetch is called twice (e.g., React strict-mode)
      setUploads((prev) => {
        const existing = new Set(prev.map((u) => u.url));
        const unique = res.data.filter((u) => !existing.has(u.url));
        return [...prev, ...unique];
      });
      setOffset((prev) => prev + PAGE_LIMIT);
      if (res.data.length < PAGE_LIMIT) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to fetch uploads", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddVideo = (payload: Partial<IVideo>) => {
    if (payload.details?.src && payload.details.src.startsWith("https://")) {
      payload.details.src =
        `https://corsproxy.io/${payload.details.src}` as any;
    }

    dispatch(ADD_VIDEO, {
      payload,
      options: {
        resourceId: "main",
        scaleMode: "fit",
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Library
      </div>
      <div className="flex-1 overflow-y-auto">
        {uploads.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM6 6v14h12V6H6zm3-2V3h6v1H9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 8v4m0 4h.01"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-text-primary mb-1">
                No videos in library
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload videos to get started with your project
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 px-4">
            {uploads.map((item, idx) => (
              <UploadItemComponent
                key={idx}
                upload={item}
                shouldDisplayPreview={!isDraggingOverTimeline}
                handleAddVideo={handleAddVideo}
              />
            ))}
            {hasMore && (
              <div className="my-4 flex w-full justify-center">
                <button
                  disabled={loading}
                  onClick={fetchUploads}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline disabled:opacity-50"
                >
                  {loading ? (
                    <svg
                      className="h-4 w-4 animate-spin text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Upload card with download progress ---
const UploadItemComponent = ({
  upload,
  shouldDisplayPreview,
  handleAddVideo,
}: {
  upload: UploadItem;
  shouldDisplayPreview: boolean;
  handleAddVideo: (payload: Partial<IVideo>) => void;
}) => {
  const [loadState, setLoadState] = React.useState<{ phase: "idle" | "downloading" | "adding" | "done"; progress: number }>({
    phase: "idle",
    progress: 0,
  });

  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${upload.thumbnail_url})`,
      backgroundSize: "cover",
      width: `${THUMB_WIDTH}px`,
      height: `${THUMB_HEIGHT}px`,
    }),
    [upload.thumbnail_url],
  );

  const handleClick = async () => {
    if (loadState.phase !== "idle") return;
    const proxiedUrl = upload.url.startsWith("https://")
      ? `https://corsproxy.io/${upload.url}`
      : upload.url;
    try {
      setLoadState({ phase: "downloading", progress: 0 });
      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const total = Number(response.headers.get("content-length"));
      if (response.body && total) {
        const reader = response.body.getReader();
        let received = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            setLoadState({ phase: "downloading", progress: Math.round((received / total) * 100) });
          }
        }
        const blob = new Blob(chunks, { type: "video/mp4" });
        const blobUrl = URL.createObjectURL(blob);
        setLoadState({ phase: "adding", progress: 100 });
        dispatch(ADD_VIDEO, {
          payload: {
            id: generateId(),
            details: { src: proxiedUrl },
            metadata: { previewUrl: blobUrl },
          },
          options: {
            resourceId: "main",
            scaleMode: "fit",
          },
        });
        setLoadState({ phase: "done", progress: 100 });
        setTimeout(() => setLoadState({ phase: "idle", progress: 0 }), 1500);
      } else {
        // Fallback simple
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setLoadState({ phase: "adding", progress: 100 });
        dispatch(ADD_VIDEO, {
          payload: {
            id: generateId(),
            details: { src: proxiedUrl },
            metadata: { previewUrl: blobUrl },
          },
          options: {
            resourceId: "main",
            scaleMode: "fit",
          },
        });
        setLoadState({ phase: "done", progress: 100 });
        setTimeout(() => setLoadState({ phase: "idle", progress: 0 }), 1500);
      }
    } catch (err) {
      alert((err as Error).message);
      setLoadState({ phase: "idle", progress: 0 });
    }
  };

  return (
    <Draggable
      data={{
        preview: upload.thumbnail_url,
        details: { src: upload.url },
        metadata: { previewUrl: upload.thumbnail_url },
      }}
      renderCustomPreview={<div style={style} className="draggable" />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        className={`relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-md border bg-background ${loadState.phase !== "idle" ? "border-primary ring-2 ring-primary" : "border-border/60"}`}
        onClick={handleClick}
      >
        <img
          draggable={false}
          src={upload.thumbnail_url}
          className="h-full w-full object-contain"
          alt={upload.filename}
        />
        {loadState.phase !== "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            {loadState.phase === "downloading" && (
              <>
                <Progress value={loadState.progress} className="w-2/3 h-2" />
                <span className="mt-1 text-xs text-white">{loadState.progress}%</span>
              </>
            )}
            {loadState.phase === "adding" && <Loader2 className="h-5 w-5 animate-spin text-white" />}
            {loadState.phase === "done" && (
              <span className="text-xs font-medium text-green-400">Added</span>
            )}
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default Library;
