import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "@/components/ui/select";
import { api, UGCExport } from "@/lib/api";
import { Loader2, RefreshCcw, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UGCExportsDialogProps {
  projectId?: string | null;
  // The serialized design json and options are expected from caller if needed
  getExportPayload?: () => Promise<{ design_json: any; options_json: any }>;
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

const UGCExportsDialog: React.FC<UGCExportsDialogProps> = ({ projectId, getExportPayload }) => {
  const [open, setOpen] = useState(false);
  const [exports, setExports] = useState<UGCExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState("mp4");

  const fetchExports = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.ugcExports.list({ ugc_project_id: projectId, limit: 50 });
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
      const payload = await getExportPayload();
      await api.ugcExports.create({
        ugc_project_id: projectId,
        ...payload,
        options_json: {
          ...(payload.options_json || {}),
          format,
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
        <Button variant="outline" className="flex h-8 gap-1 border border-border">
          <Download size={18} /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border border-border bg-zinc-900">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>Configure export settings and view previous exports.</DialogDescription>
        </DialogHeader>

        {/* Export settings */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v)}>
              <SelectTrigger id="format" className="w-32">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreateExport} disabled={creating || !getExportPayload}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Export"}
          </Button>
        </div>

        <hr className="my-4 border-border" />

        {/* Exports list */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Previous Exports</h3>
          <Button size="icon" variant="ghost" onClick={fetchExports} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={16} />}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {exports.length === 0 && !loading && <p className="text-sm text-muted-foreground">No exports yet.</p>}
        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {exports.map((exp) => {
            const status = (exp.status ?? "").toLowerCase();
            const variant = statusVariantMap[status] || "secondary";
            const created = formatDistanceToNow(new Date(exp.created_at), { addSuffix: true });
            return (
              <div
                key={exp.id}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-xs hover:bg-accent",
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{exp.project_title ?? "Export"}</span>
                  <span className="text-muted-foreground">{created}</span>
                  {status === "processing" || status === "pending" ? (
                    <span className="text-muted-foreground">Progress: {exp.progress ?? 0}%</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={variant}>{status.toUpperCase()}</Badge>
                  {status === "completed" && exp.url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={exp.url} download target="_blank" rel="noopener noreferrer">
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
