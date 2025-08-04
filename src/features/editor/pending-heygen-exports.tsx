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
                <Button asChild className="mt-4 w-full" variant="default">
                  <a href={exp.video_url} target="_blank" rel="noopener noreferrer" download>
                    Download Video
                  </a>
                </Button>
              ) : null}
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
};

export default PendingHeyGenExports;
