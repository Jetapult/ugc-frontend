import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Sparkles } from "lucide-react";
import { api, type CreateVeo3ExportRequest } from "@/lib/api";
import { useDownloadState } from "./store/use-download-state";
import PendingVeo3Exports from "./pending-veo3-exports";

// Default gameplay prompt for convenience
const DEFAULT_GAMEPLAY_PROMPT =
  "First-person gameplay video of a heroic character battling a giant dragon boss in a lava-filled arena, dramatic camera angles, cinematic lighting";

const Veo3Menu: React.FC = () => {
  const { projectId } = useDownloadState();
  const [prompt, setPrompt] = useState(DEFAULT_GAMEPLAY_PROMPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a video prompt");
      return;
    }

    if (!projectId) {
      setError("Project ID is required. Please save your project first.");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const requestData: CreateVeo3ExportRequest = {
        ugc_project_id: projectId,
        prompt: prompt.trim(),
        aspect_ratio: "9:16",
        resolution: "1080x1920",
        duration: 15,
        audio_prompt: "",
        seed: 0,
      };

      const response = await api.veo3Exports.create(requestData);

      if (response.success) {
        // Clear the form on success
        setPrompt("");
        // Success feedback could be added here
        console.log("Veo3 video generation started:", response.data);
      } else {
        setError("Failed to start video generation");
      }
    } catch (err) {
      console.error("Veo3 generation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate video"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        <Sparkles className="mr-2 h-4 w-4" />
        Veo3 AI Video
      </div>

      <Tabs defaultValue="generate" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mb-3">
          <TabsTrigger value="generate">Generate Video</TabsTrigger>
          <TabsTrigger value="pending">Pending Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="flex-1 px-4 space-y-3 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Video Generation</CardTitle>
              <CardDescription>
                Describe the gameplay video you want to create with Veo3 AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the gameplay video you want... e.g., 'Epic MOBA team fight with spell effects and dynamic camera'"
                  className="min-h-[120px] resize-none"
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about scenes, actions, style, and mood for best results
                </p>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Video generation typically takes 2-5 minutes</p>
                <p>• Check the "Pending Videos" tab to monitor progress</p>
                <p>• Generated videos will be available for download and timeline addition</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="flex-1 min-h-0">
          <PendingVeo3Exports projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Veo3Menu;
