import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Editor from "@/features/editor/editor";
import useDataState from "@/features/editor/store/use-data-state";
import { useDownloadState } from "@/features/editor/store/use-download-state";
import { getCompactFontData } from "@/features/editor/utils/fonts";
import { FONTS } from "@/features/editor/data/fonts";
import { api, type Project } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import LoginDialog from "@/components/ui/login-dialog";
import { useProjectState } from "@/features/editor/hooks/use-project-state";

export default function ProjectEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { setCompactFonts, setFonts } = useDataState();
  const { actions: downloadActions } = useDownloadState();

  useEffect(() => {
    // Initialize fonts
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, [setCompactFonts, setFonts]);

  useEffect(() => {
    if (!projectId) {
      setError("Project ID is required");
      setLoading(false);
      return;
    }

    if (!token) {
      navigate("/");
      return;
    }

    loadProject();
  }, [projectId, token, navigate]);

  useEffect(() => {
    // Set project ID in download state for exports
    if (projectId) {
      downloadActions.setProjectId(projectId);
    }
  }, [projectId, downloadActions]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.projects.get(projectId);
      setProject(response.data);
    } catch (error: any) {
      console.error("Failed to load project:", error);
      
      // Handle different error types
      if (error.status === 404) {
        setError("Project not found. It may have been deleted or you don't have access to it.");
      } else if (error.status === 401 || error.status === 403) {
        setError("You don't have permission to access this project.");
      } else {
        setError("Failed to load project. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  if (!token) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Project Not Found</h2>
          <p className="text-zinc-400 mb-6">
            {error || "The project you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Button
            onClick={handleGoBack}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return <Editor initialEditorState={project.editor_state} projectName={project.title} />;
}
