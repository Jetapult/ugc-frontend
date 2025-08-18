import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, UGCExport } from "@/lib/api";
import { Loader2, RefreshCcw, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface UGCExportsDialogProps {
  projectId?: string | null;
  // The serialized design json and options are expected from caller if needed
  getExportPayload?: () => Promise<{ design: any; options: any }>;
}

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  completed: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

const UGCExportsDialog: React.FC<UGCExportsDialogProps> = ({
  projectId,
  getExportPayload,
}) => {
  const [open, setOpen] = useState(false);
  const [exports, setExports] = useState<UGCExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExports = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.ugcExports.list({
        ugc_project_id: projectId,
        limit: 50,
      });
      setExports(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Error fetching exports");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // initial fetch whenever open or projectId changes
  useEffect(() => {
    if (open) fetchExports();
  }, [open, fetchExports]);

  // conditional polling when processing exports exist
  useEffect(() => {
    if (!open) return;
    const hasProcessing = exports.some((e) => {
      const s = (e.status ?? "").toLowerCase();
      return s === "processing" || s === "pending";
    });
    if (!hasProcessing) return;
    const id = setInterval(fetchExports, 15_000);
    return () => clearInterval(id);
  }, [exports, open, fetchExports]);

  const handleCreateExport = async () => {
    if (!projectId || !getExportPayload) return;
    try {
      setCreating(true);
      const payload = getExportPayload
        ? await getExportPayload()
        : ({ design: {}, options: {} } as any);
      if (!payload.design || payload.design === null) payload.design = {};
      if (!payload.options || payload.options === null) payload.options = {};
      // Extra safeguard: stringify/parse to strip undefined keys
      payload.design = JSON.parse(JSON.stringify(payload.design));
      payload.options = JSON.parse(JSON.stringify(payload.options));
      await api.ugcExports.create({
        ugc_project_id: projectId,
        design: payload.design,
        options: {
          ...(payload.options || {}),
          format: "mp4",
        },
      } as any);
      await fetchExports();
    } catch (err: any) {
      alert(err.message ?? "Failed to create export");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex h-8 gap-1 border border-border"
        >
          <Download size={18} /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border border-border bg-zinc-900 [&_button[data-dialog-close]]:hidden">
        <h2 className="mb-2 text-lg font-semibold">Project Exports</h2>
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            onClick={handleCreateExport}
            disabled={creating || !getExportPayload}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Render Current Project"
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={fetchExports}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw size={16} />
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {exports.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No exports yet.</p>
        )}
        <div className="max-h-56 space-y-1 overflow-auto pr-1">
          {exports.map((exp) => {
            const status = (exp.status ?? "").toLowerCase();
            const variant = statusVariantMap[status] || "secondary";
            const created = formatDistanceToNow(new Date(exp.created_at), {
              addSuffix: true,
            });
            return (
              <div
                key={exp.id}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-1 text-sm hover:bg-accent",
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {exp.project_title ?? "Export"}
                  </span>
                  <span className="text-muted-foreground">{created}</span>
                  {status === "processing" || status === "pending" ? (
                    <span className="text-muted-foreground">
                      Progress: {exp.progress ?? 0}%
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={variant}>{status.toUpperCase()}</Badge>
                  {status === "completed" && exp.url ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={exp.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UGCExportsDialog;
