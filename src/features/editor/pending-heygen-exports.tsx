import React, { useEffect, useState, useCallback } from "react";
import { api, HeyGenExport } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface PendingHeyGenExportsProps {
  projectId?: string | null;
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

const PendingHeyGenExports: React.FC<PendingHeyGenExportsProps> = ({ projectId }) => {
  const [exports, setExports] = useState<HeyGenExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track video loading state per export
  const [loadStates, setLoadStates] = useState<
    Record<
      string,
      {
        phase: "idle" | "downloading" | "adding" | "done";
        progress: number;
      }
    >
  >({});

  const addBlobToTimeline = (videoBlob: Blob, exp: HeyGenExport) => {
    const fileName = `heygen-${exp.id}.mp4`;
    const videoSrc = exp.video_url.startsWith("https://")
      ? `https://corsproxy.io/${exp.video_url}`
      : exp.video_url;
    const blobUrl = URL.createObjectURL(videoBlob);

    // Mark as adding
    setLoadStates((s) => ({ ...s, [exp.id]: { phase: "adding", progress: 100 } }));

    const payload: IVideo = {
      id: generateId(),
      type: "video",
      details: {
        src: videoSrc,
      } as any,
      metadata: {
        previewUrl: blobUrl,
        name: fileName,
      },
    } as any;

    dispatch(ADD_VIDEO, {
      payload,
      options: { resourceId: "main", scaleMode: "fit" },
    });

    // Mark as done
    setLoadStates((s) => ({ ...s, [exp.id]: { phase: "done", progress: 100 } }));
  };

  const handleLoadToTimeline = useCallback(
    async (exp: HeyGenExport) => {
      if (!exp.video_url) return;
      const proxiedUrl = exp.video_url.startsWith("https://")
        ? `https://corsproxy.io/${exp.video_url}`
        : exp.video_url;
      const current = loadStates[exp.id];
      if (current && current.phase !== "idle" && current.phase !== undefined) return;

      // Start downloading
      setLoadStates((s) => ({ ...s, [exp.id]: { phase: "downloading", progress: 0 } }));

      try {
        const response = await fetch(proxiedUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }

        const contentLength = response.headers.get("content-length");
        if (response.body && contentLength) {
          const total = parseInt(contentLength, 10);
          let received = 0;
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              const pct = total ? (received / total) * 100 : 0;
              setLoadStates((s) => ({
                ...s,
                [exp.id]: { phase: "downloading", progress: pct },
              }));
            }
          }

          const blob = new Blob(chunks, { type: "video/mp4" });
          addBlobToTimeline(blob, exp);
        } else {
          // Fallback if streaming not supported or no content length
          const blob = await response.blob();
          addBlobToTimeline(blob, exp);
        }
      } catch (err) {
        console.error("Failed to load video", err);
        setLoadStates((s) => ({ ...s, [exp.id]: { phase: "idle", progress: 0 } }));
        alert((err as Error).message);
      }
    },
    [loadStates],
  );

  const fetchExports = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.heygenExports.list({ ugc_project_id: projectId, limit: 50 });
      setExports(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Error fetching exports");
    } finally {
      setLoading(false);
    }
  }, [projectId]);


  // Initial fetch when projectId changes
  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  // Conditional polling every 15s when there are processing or pending exports
  useEffect(() => {
    if (!projectId) return;
    const hasProcessing = exports.some((e) => {
      const status = (e.status ?? "").toLowerCase();
      return status === "processing" || status === "pending";
    });
    if (!hasProcessing) return;

    const id = setInterval(fetchExports, 15_000);
    return () => clearInterval(id);
  }, [projectId, exports, fetchExports]);

  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Open or create a project to view exports.</p>;
  }

  if (loading && exports.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (exports.length === 0) {
    return <p className="text-sm text-muted-foreground">No exports found for this project.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={fetchExports} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {exports.map((exp) => {
        const status = exp.status?.toLowerCase() ?? "pending";
        const statusVariant = statusVariantMap[status] || "secondary";
        const created = formatDistanceToNow(new Date(exp.created_at), { addSuffix: true });
        const lastUpdated = formatDistanceToNow(new Date(exp.updated_at), { addSuffix: true });
        const shortId = exp.id.slice(-5);

        return (
          <Dialog key={exp.id}>
            <DialogTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-accent cursor-pointer",
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{shortId}</span>
                  <span className="text-xs text-muted-foreground">{created}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant}>{status.toUpperCase()}</Badge>
                  <span title={`Last updated ${lastUpdated}`}>
                    <Info size={16} className="text-muted-foreground" />
                  </span>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Export Details</DialogTitle>
                <DialogDescription>
                  Created {created}. Last updated {lastUpdated}.
                </DialogDescription>
              </DialogHeader>

              <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
{JSON.stringify(exp, null, 2)}
              </pre>

              {exp.status?.toLowerCase() === "completed" && exp.video_url ? (
                <>
                  {loadStates[exp.id]?.phase === "downloading" ||
                  loadStates[exp.id]?.phase === "adding" ? (
                    <div className="mt-4 flex flex-col gap-2">
                      <Progress value={Math.round(loadStates[exp.id]?.progress ?? 0)} />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {loadStates[exp.id]?.phase === "downloading"
                            ? `Downloading… ${Math.round(loadStates[exp.id]?.progress ?? 0)}%`
                            : "Adding video to timeline…"}
                        </span>
                      </div>
                    </div>
                  ) : loadStates[exp.id]?.phase === "done" ? (
                    <p className="mt-4 text-sm text-green-500">Video added to timeline ✅</p>
                  ) : (
                    <div className="mt-4 flex w-full gap-2">
                      <Button asChild variant="secondary" className="flex-1">
                        <a
                          href={exp.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          Download Video
                        </a>
                      </Button>
                      <Button className="flex-1" onClick={() => handleLoadToTimeline(exp)}>
                        Load to Timeline
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
};

export default PendingHeyGenExports;
