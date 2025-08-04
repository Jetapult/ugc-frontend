import React from "react";
import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type UploadItem } from "@/lib/api";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
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
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Library
      </div>
      <ScrollArea className="flex-1">
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
      </ScrollArea>
    </div>
  );
};

const UploadItemComponent = ({
  upload,
  shouldDisplayPreview,
  handleAddVideo,
}: {
  upload: UploadItem;
  shouldDisplayPreview: boolean;
  handleAddVideo: (payload: Partial<IVideo>) => void;
}) => {
  const [adding, setAdding] = React.useState(false);

  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${upload.thumbnail_url})`,
      backgroundSize: "cover",
      width: `${THUMB_WIDTH}px`,
      height: `${THUMB_HEIGHT}px`,
    }),
    [upload.thumbnail_url],
  );

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
        className={`relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-md border bg-background ${adding ? "border-primary ring-2 ring-primary" : "border-border/60"}`}
        onClick={() => {
          if (adding) return;
          setAdding(true);
          handleAddVideo({
            id: generateId(),
            details: { src: upload.url },
            metadata: { previewUrl: upload.thumbnail_url },
          } as any);
          setTimeout(() => setAdding(false), 1000);
        }}
      >
        <img
          draggable={false}
          src={upload.thumbnail_url}
          className="h-full w-full object-contain"
          alt={upload.filename}
        />
        {adding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <svg
              className="h-6 w-6 animate-spin text-white"
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
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default Library;
