import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, Loader2 } from "lucide-react";
import { uploadFile } from "@/utils/upload";
import { api } from "@/lib/api";
import { dispatch } from "@designcombo/events";

import { useDownloadState } from "./store/use-download-state";
import AvatarPickerDialog from "@/components/heygen/avatar-picker-dialog";
import { ADD_VIDEO } from "@designcombo/state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// Add interface to support video cache on window object
declare global {
  interface Window {
    videoCache?: Record<string, { url: string; blob: Blob }>;
  }
}
import { generateId } from "@designcombo/timeline";
import type { IVideo } from "@designcombo/types";
import VoicePickerDialog from "../../components/heygen/voice-picker-dialog";
import { Input } from "../../components/ui/input";
import PendingHeyGenExports from "./pending-heygen-exports";

const ScriptMenu: React.FC = () => {
  const { projectId } = useDownloadState();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<{
    voice_id: string;
    name: string;
  } | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  // possible values:
  // - idle: initial state or reset
  // - pending: request has been sent but remote processing hasn’t started
  // - processing: remote service is actively generating the video
  // - completed: finished successfully
  // - error: something went wrong
  const [videoStatus, setVideoStatus] = useState<
    "idle" | "pending" | "processing" | "completed" | "error"
  >("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoAdded, setVideoAdded] = useState(false);
  // tab navigation state
  const [activeTab, setActiveTab] = useState<"generate" | "pending">(
    "generate",
  );

  // Ensure onValueChange matches expected signature (string => void)
  const handleTabChange = (value: string) =>
    setActiveTab(value as "generate" | "pending");

  // track auto-download & timeline insertion phases
  const [addPhase, setAddPhase] = useState<
    "idle" | "downloading" | "adding" | "done"
  >("idle");

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const file = files[0];
    if (!file || !file.type.startsWith("video/")) return;

    const objectUrl = URL.createObjectURL(file);
    setIsUploading(true);
    setUploadProgress(0);

    let publicUrl: string;
    try {
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      publicUrl = await uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedUrl(publicUrl);
    } catch (err) {
      console.error("Upload failed", err);
      URL.revokeObjectURL(objectUrl);
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.src = objectUrl;
    videoEl.onloadedmetadata = () => {
      const payload: Partial<IVideo> = {
        id: generateId(),
        type: "video",
        duration: videoEl.duration * 1000,
        details: {
          src: publicUrl,
          width: videoEl.videoWidth,
          height: videoEl.videoHeight,
        } as any,
        metadata: {
          previewUrl: objectUrl,
          name: file.name,
        },
      };

      console.log(ADD_VIDEO);
      console.log(payload);
      dispatch(ADD_VIDEO, {
        payload,
        options: { resourceId: "main", scaleMode: "fit" },
      });
      setVideoUploaded(true);
      setIsUploading(false);
    };
  };

  // When video completes, auto download and add to editor once
  useEffect(() => {
    if (videoStatus === "completed" && videoUrl && !videoAdded) {
      handleAddToTimeline();

      setAddPhase("done");
      return;
    }
  }, [videoStatus, videoUrl, videoAdded]);

  // Manually download + add to timeline on button click
  const handleAddToTimeline = async () => {
    if (!videoUrl || videoAdded) return;
    try {
      // Start download phase
      setAddPhase("downloading");

      // Fetch the video file
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const videoBlob = await response.blob();
      const fileName = `heygen-${Date.now()}.mp4`;

      // Create blob URL for the video
      const blobUrl = URL.createObjectURL(videoBlob);

      // Save the blob URL globally to prevent garbage collection
      if (!window.videoCache) {
        window.videoCache = {};
      }
      window.videoCache["current"] = {
        url: blobUrl,
        blob: videoBlob,
      };

      // Trigger browser download
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Now add to timeline
      setAddPhase("adding");

      // Create video object for timeline
      const payload: IVideo = {
        id: generateId(),
        type: "video",
        details: {
          src: videoUrl,
        } as any,
        metadata: {
          previewUrl: blobUrl,
          name: fileName,
        },
      } as any;

      console.log(payload);
      // Dispatch event to add to timeline
      dispatch(ADD_VIDEO, {
        payload,
        options: { resourceId: "main", scaleMode: "fit" },
      });

      // Update UI state
      setVideoAdded(true);
      setAddPhase("done");

      console.log("Video added to timeline successfully");
    } catch (err) {
      console.error("Add to timeline failed", err);
      alert("Failed to add video to timeline: " + (err as Error).message);
      setAddPhase("done");
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 overflow-auto p-4 text-sm">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Video</TabsTrigger>
          <TabsTrigger value="pending">Pending Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <div className="flex w-full flex-col gap-3">
            <Button
              className="flex gap-1 border border-border"
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading || generating}
            >
              {isUploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <PlusIcon size={18} />
              )}
              {isUploading ? "Uploading..." : "Upload video"}
            </Button>
            {isUploading && (
              <div className="flex flex-col gap-2">
                <Progress value={uploadProgress} className="w-full" />
                <span className="text-xs text-muted-foreground text-center">
                  Uploading video... {Math.round(uploadProgress)}%
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFilesSelected}
            />

            {videoUploaded && (
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Additional context (optional)"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="min-h-[80px] text-xs"
                  disabled={generating}
                />
                <Button
                  variant="default"
                  disabled={generating || !uploadedUrl}
                  onClick={async () => {
                    if (!uploadedUrl) return;
                    setGenerating(true);
                    setScriptError(null);
                    try {
                      const data: any = await api.heygen.generateScript({
                        studio_id: '1',
                        user_id: '1', 
                        query_text: '',
                        context: context || '',
                        media_file: '',
                        media_url: encodeURI(uploadedUrl),
                        creative_gallery_id: ''
                      });
                      
                      if (data.success === false) {
                        setScriptError(data.message || 'Script generation failed');
                        return;
                      }
                      
                      const text = data?.script ?? data?.text ?? data;
                      const scriptText = String(text);
                      
                      if (scriptText.length > 500) {
                        setScriptError(`Generated script is ${scriptText.length} characters (limit: 500). Please use a shorter video to avoid generation failures.`);
                      }
                      
                      setScript(scriptText);
                    } catch (err: any) {
                      console.error(err);
                      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to generate script';
                      setScriptError(errorMessage);
                    } finally {
                      setGenerating(false);
                    }
                  }}
                >
                  {generating ? "Generating…" : "Generate script"}
                </Button>
                
                {scriptError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {scriptError}
                  </div>
                )}
              </div>
            )}

            {script !== null && (
              <>
                <div className="space-y-2">
                  <Textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="min-h-[140px] w-full text-xs"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${script.length > 500 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {script.length}/500 characters
                    </span>
                    {script.length > 500 && (
                      <span className="text-orange-600 font-medium">
                        ⚠️ May exceed video length limits
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAvatarDialogOpen(true)}
                    disabled={isUploading || generating}
                  >
                    {selectedAvatar ? "Change avatar" : "Select avatar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setVoiceDialogOpen(true)}
                  >
                    {selectedVoice ? "Change voice" : "Select voice"}
                  </Button>
                </div>
                <div className="mt-1 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">Resolution</p>
                  <div className="flex w-full items-center gap-2">
                    <Input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="flex-1"
                      min={1}
                    />
                    <span className="text-sm">x</span>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="flex-1"
                      min={1}
                    />
                  </div>
                </div>

                {selectedVoice && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selected voice:{" "}
                    <span className="font-medium text-foreground">
                      {selectedVoice.name}
                    </span>
                  </p>
                )}
                {selectedAvatar && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selected avatar:{" "}
                    <span className="font-medium text-foreground">
                      {selectedAvatar.avatar_name}
                    </span>
                  </p>
                )}
                <AvatarPickerDialog
                  open={avatarDialogOpen}
                  onOpenChange={setAvatarDialogOpen}
                  onSelect={(a) => setSelectedAvatar(a)}
                />
                <VoicePickerDialog
                  open={voiceDialogOpen}
                  onOpenChange={setVoiceDialogOpen}
                  onSelect={(v) =>
                    setSelectedVoice({ voice_id: v.voice_id, name: v.name })
                  }
                />
                <Button
                  className="mt-3 w-full"
                  variant="default"
                  disabled={
                    creating || ["processing", "pending"].includes(videoStatus) || !script || !selectedAvatar || !selectedVoice
                  }
                  onClick={async () => {
                        if (!selectedAvatar || !selectedVoice || !script)
                          return;
                        // Reset any previous error state
                        setVideoStatus("pending");
                        setActiveTab("pending");
                        setVideoAdded(false);
                        setCreating(true);

                        try {
                          if (!projectId) {
                            throw new Error(
                              "Project ID is required for HeyGen video creation",
                            );
                          }

                          const data: any = await api.heygen.videos.create({
                            ugc_project_id: projectId,
                            avatar_pose_id:
                              selectedAvatar.avatar_id ??
                              selectedAvatar.avatar_pose_id ??
                              selectedAvatar.avatarId ??
                              selectedAvatar.avatar_id,
                            avatar_style: "normal",
                            input_text: script,
                            voice_id: selectedVoice.voice_id,
                            width,
                            height,
                          });
                          const vid =
                            data?.data?.heygen_response?.data?.video_id;
                          if (!vid) {
                            console.error(
                              "Full response:",
                              JSON.stringify(data, null, 2),
                            );
                            throw new Error("Missing video_id in response");
                          }
                          console.log("Video created", vid);
                          setVideoStatus("processing");
                          setVideoUrl(null);
                        } catch (err: any) {
                          console.error("Video creation error:", err);
                          alert(err.message ?? "Error creating video");
                          setVideoStatus("error");
                        } finally {
                          setCreating(false);
                        }
                      }}
                    >
                      {creating
                        ? "Creating…"
                        : videoStatus === "error"
                          ? "Retry video creation"
                          : "Generate video"}
                    </Button>


                    {/* Completed state - show download and add to timeline buttons */}
                    {videoStatus === "completed" &&
                      videoUrl &&
                      !videoAdded &&
                      addPhase === "done" && (
                      <div className="mt-3 flex w-full gap-2">
                        <Button asChild variant="secondary" className="flex-1">
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          >
                            Download
                          </a>
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleAddToTimeline}
                          variant="default"
                        >
                          Add to timeline
                        </Button>
                      </div>
                    )}

                    {/* Video already added - show download button */}
                    {videoStatus === "completed" && videoUrl && videoAdded && (
                      <Button asChild className="mt-3 w-full" variant="default">
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          Download video
                        </a>
                      </Button>
                    )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingHeyGenExports projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScriptMenu;
