import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Calendar, FileText, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type ProjectListItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import CreateProjectDialog from "../components/CreateProjectDialog";
import DeleteProjectDialog from "../components/DeleteProjectDialog";
import LoginDialog from "@/components/ui/login-dialog";

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectListItem | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showTokenErrorDialog, setShowTokenErrorDialog] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, logout, setToken } = useAuth();

  useEffect(() => {
    // Check for token in URL parameters
    const urlToken = searchParams.get('token');
    if (urlToken) {
      handleUrlToken(urlToken);
    } else if (token) {
      loadProjects();
    }
  }, [token, searchParams]);

  const handleUrlToken = async (urlToken: string) => {
    try {
      setLoading(true);
      setTokenError(null);
      
      // Store the token and update auth context
      setToken(urlToken);
      
      // Test the token by trying to load projects
      const response = await api.projects.list();
      if (response.success) {
        setProjects(response.data);
        // Remove token from URL after successful authentication
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('token');
        setSearchParams(newSearchParams, { replace: true });
      } else {
        throw new Error('Invalid token - unable to load projects');
      }
    } catch (error) {
      console.error('Token authentication failed:', error);
      setTokenError('Invalid or expired token. Please try logging in again.');
      setShowTokenErrorDialog(true);
      // Clear the invalid token
      logout();
      // Remove token from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('token');
      setSearchParams(newSearchParams, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setTokenError(null);
      const response = await api.projects.list();
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to load projects:", error);
      if (error instanceof Error && error.message.includes('401')) {
        setTokenError('Your session has expired. Please log in again.');
        setShowTokenErrorDialog(true);
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (title: string) => {
    try {
      const response = await api.projects.create({ title });
      const newProject = response.data;
      setProjects((prev) => [newProject, ...prev]);
      setShowCreateDialog(false);
      // Navigate to the new project
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleDeleteClick = (project: ProjectListItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent project click
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  const handleDeleteProject = async (deleteExports = false) => {
    if (!projectToDelete) return;

    try {
      await api.projects.delete(projectToDelete.id, deleteExports);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error; // Re-throw to let dialog handle the error state
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Show login dialog if not authenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoginDialog />
        
        {/* Token Error Dialog */}
        <Dialog open={showTokenErrorDialog} onOpenChange={setShowTokenErrorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Authentication Error</DialogTitle>
              <DialogDescription>
                {tokenError}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                onClick={() => setShowTokenErrorDialog(false)}
                className="w-full"
              >
                Continue to Login
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Show loading message if token exists but still loading projects
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {searchParams.get('token') ? 'Authenticating...' : 'Loading projects...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              Your Projects
            </h1>
            <p className="text-zinc-400">Create and manage your UGC projects</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-red-400"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="animate-pulse border-zinc-700 bg-zinc-800/50"
              >
                <CardHeader>
                  <div className="mb-2 h-4 w-3/4 rounded bg-zinc-700"></div>
                  <div className="h-3 w-1/2 rounded bg-zinc-700"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 w-full rounded bg-zinc-700"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
            <h3 className="mb-2 text-xl font-semibold text-white">
              No projects yet
            </h3>
            <p className="mb-6 text-zinc-400">
              Create your first project to get started
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group relative cursor-pointer border-zinc-700 bg-zinc-800/50 transition-colors hover:bg-zinc-800/70"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white transition-colors group-hover:text-blue-400">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-2 text-zinc-400">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(project.created_at)}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-700 hover:text-white group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="border-zinc-700 bg-zinc-800">
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(project, e)}
                          className="cursor-pointer text-red-400 hover:bg-zinc-700 hover:text-red-300"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">
                    Last updated {formatDate(project.updated_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProject}
      />

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleteProject={handleDeleteProject}
        projectTitle={projectToDelete?.title || ""}
      />
    </div>
  );
}
