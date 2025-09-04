import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink, RefreshCw, Plus, Loader2 } from "lucide-react";
import { api, type Veo3Export } from "@/lib/api";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";

interface PendingVeo3ExportsProps {
  projectId?: string | null;
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

const PendingVeo3Exports: React.FC<PendingVeo3ExportsProps> = ({ projectId }) => {
  const [exports, setExports] = useState<Veo3Export[]>([]);
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
  const [refreshingExport, setRefreshingExport] = useState<string | null>(null);

  const fetchExports = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.veo3Exports.list({ ugc_project_id: projectId });
      if (response.success) {
        setExports(response.data);
      } else {
        setError("Failed to fetch Veo3 exports");
      }
    } catch (err) {
      console.error("Failed to fetch Veo3 exports:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch exports");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleHardRefresh = useCallback(async (exportId: string) => {
    setRefreshingExport(exportId);
    try {
      const response = await api.veo3Exports.get(exportId);
      if (response.success) {
        // Update the specific export in the list
        setExports(prev => prev.map(exp => 
          exp.id === exportId ? response.data : exp
        ));
      }
    } catch (err) {
      console.error("Failed to refresh export:", err);
    } finally {
      setRefreshingExport(null);
    }
  }, []);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const handleLoadToTimeline = useCallback(
    async (exp: Veo3Export) => {
      if (!exp.video_url) return;
      const current = loadStates[exp.id];
      if (current && current.phase !== "idle" && current.phase !== undefined) return;

      try {
        setLoadStates((s) => ({ ...s, [exp.id]: { phase: "downloading", progress: 0 } }));

        const response = await fetch(exp.video_url);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }

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
              setLoadStates((s) => ({
                ...s,
                [exp.id]: { phase: "downloading", progress: Math.round((received / total) * 100) },
              }));
            }
          }

          const videoBlob = new Blob(chunks, { type: "video/mp4" });
          const fileName = `veo3-${exp.id}.mp4`;
          const blobUrl = URL.createObjectURL(videoBlob);

          setLoadStates((s) => ({ ...s, [exp.id]: { phase: "adding", progress: 100 } }));

          dispatch(ADD_VIDEO, {
            payload: {
              id: generateId(),
              details: { src: exp.video_url },
              metadata: { previewUrl: blobUrl },
            },
            options: { resourceId: "main", scaleMode: "fit" },
          });

          setLoadStates((s) => ({ ...s, [exp.id]: { phase: "done", progress: 100 } }));
          setTimeout(() => {
            setLoadStates((s) => ({ ...s, [exp.id]: { phase: "idle", progress: 0 } }));
          }, 2000);
        } else {
          // Fallback for when content-length is not available
          const videoBlob = await response.blob();
          const fileName = `veo3-${exp.id}.mp4`;
          const blobUrl = URL.createObjectURL(videoBlob);

          setLoadStates((s) => ({ ...s, [exp.id]: { phase: "adding", progress: 100 } }));

          dispatch(ADD_VIDEO, {
            payload: {
              id: generateId(),
              details: { src: exp.video_url },
              metadata: { previewUrl: blobUrl },
            },
            options: { resourceId: "main", scaleMode: "fit" },
          });

          setLoadStates((s) => ({ ...s, [exp.id]: { phase: "done", progress: 100 } }));
          setTimeout(() => {
            setLoadStates((s) => ({ ...s, [exp.id]: { phase: "idle", progress: 0 } }));
          }, 2000);
        }
      } catch (err) {
        console.error("Failed to load video to timeline:", err);
        alert("Failed to load video to timeline: " + (err as Error).message);
        setLoadStates((s) => ({ ...s, [exp.id]: { phase: "idle", progress: 0 } }));
      }
    },
    [loadStates]
  );

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p>Please save your project to view Veo3 exports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="text-sm font-medium">Veo3 Video Exports</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchExports}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {loading && exports.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : exports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No Veo3 videos found</p>
            <p className="text-sm">Generate your first AI video to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exports.map((exp) => {
              const loadState = loadStates[exp.id] || { phase: "idle", progress: 0 };
              const isCompleted = exp.status === "COMPLETED" && exp.video_url;

              return (
                <Dialog key={exp.id}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm">Veo3 Video</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {new Date(exp.created_at).toLocaleDateString('en-GB')} {new Date(exp.created_at).toLocaleTimeString('en-GB', { hour12: true })}
                            </CardDescription>
                          </div>
                          <Badge variant={statusVariantMap[exp.status.toLowerCase()]}>
                            {exp.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground flex items-start gap-1">
                            <strong className="flex-shrink-0">Prompt:</strong> 
                            <span className="truncate flex-1 min-h-[1.2em]">{exp.prompt}</span>
                          </div>

                          {exp.message && (
                            <div className="text-xs text-muted-foreground">
                              <strong>Message:</strong> {exp.message}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Veo3 Video Export Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <strong>Prompt:</strong>
                        <p className="text-sm text-muted-foreground mt-1">{exp.prompt}</p>
                      </div>
                      <div>
                        <strong>Status:</strong>
                        <Badge className="ml-2" variant={statusVariantMap[exp.status.toLowerCase()]}>
                          {exp.status}
                        </Badge>
                      </div>
                      <div>
                        <strong>Created:</strong>
                        <span className="ml-2 text-sm">{new Date(exp.created_at).toLocaleDateString('en-GB')} {new Date(exp.created_at).toLocaleTimeString('en-GB', { hour12: true })}</span>
                      </div>
                      <div>
                        <strong>Updated:</strong>
                        <span className="ml-2 text-sm">{new Date(exp.updated_at).toLocaleDateString('en-GB')} {new Date(exp.updated_at).toLocaleTimeString('en-GB', { hour12: true })}</span>
                      </div>
                      <div>
                        <strong>Aspect Ratio:</strong>
                        <span className="ml-2 text-sm">{(exp as any).aspect_ratio || 'N/A'}</span>
                      </div>
                      <div>
                        <strong>Resolution:</strong>
                        <span className="ml-2 text-sm">{(exp as any).resolution || 'N/A'}</span>
                      </div>
                      <div>
                        <strong>Duration:</strong>
                        <span className="ml-2 text-sm">{(exp as any).duration || 'N/A'} seconds</span>
                      </div>
                      {(exp as any).fal_request_id && (
                        <div>
                          <strong>FAL Request ID:</strong>
                          <span className="ml-2 text-sm font-mono">{(exp as any).fal_request_id}</span>
                        </div>
                      )}
                      {(exp as any).error_message && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <strong className="text-red-800">Error:</strong>
                          <p className="text-sm text-red-700 mt-1">{(exp as any).error_message}</p>
                        </div>
                      )}
                      {exp.status.toLowerCase() === "processing" && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHardRefresh(exp.id)}
                            disabled={refreshingExport === exp.id}
                          >
                            {refreshingExport === exp.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Hard Refresh
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {exp.video_url && (
                        <div className="space-y-2">
                          <strong>Video:</strong>
                          <div className="flex gap-2">
                            <Button asChild variant="outline">
                              <a href={exp.video_url} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" />
                                Download Video
                              </a>
                            </Button>
                            <Button onClick={() => handleLoadToTimeline(exp)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Load to Timeline
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingVeo3Exports;
