import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteProject: (deleteExports?: boolean) => Promise<void>;
  projectTitle: string;
}

export default function DeleteProjectDialog({
  open,
  onOpenChange,
  onDeleteProject,
  projectTitle,
}: DeleteProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleteExports, setDeleteExports] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await onDeleteProject(deleteExports);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDeleteExports(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete Project
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            This action cannot be undone. This will permanently delete the project{" "}
            <span className="font-semibold text-white">"{projectTitle}"</span> and all of its data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <label className="flex items-center space-x-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={deleteExports}
              onChange={(e) => setDeleteExports(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-500"
              disabled={loading}
            />
            <span>Also delete associated exports</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
