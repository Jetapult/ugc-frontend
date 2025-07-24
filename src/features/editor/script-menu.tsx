import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, Loader2 } from "lucide-react";
import { uploadFile } from "@/utils/upload";
import { api } from "@/lib/api";
import { dispatch } from "@designcombo/events";
import { useAuth } from "@/context/AuthContext";
import { useDownloadState } from "./store/use-download-state";
import AvatarPickerDialog from "@/components/heygen/avatar-picker-dialog";
import { ADD_VIDEO } from "@designcombo/state";

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
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<
    "idle" | "processing" | "completed" | "error" | "pending"
  >("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoAdded, setVideoAdded] = useState(false);
  const [resumeVideoId, setResumeVideoId] = useState("");
  // track auto-download & timeline insertion phases
  const [addPhase, setAddPhase] = useState<
    "idle" | "downloading" | "adding" | "done"
  >("idle");
  const { token } = useAuth();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const file = files[0];
    if (!file || !file.type.startsWith("video/")) return;

    const objectUrl = URL.createObjectURL(file);

    let publicUrl: string;
    try {
      publicUrl = await uploadFile(file);
      setUploadedUrl(publicUrl);
    } catch (err) {
      console.error("Upload failed", err);
      URL.revokeObjectURL(objectUrl);
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
    };
  };

  // Poll video processing status
  useEffect(() => {
    if (videoStatus !== "processing" || !videoId) return;
    const interval = setInterval(async () => {
      try {
        const statusJson: any = await api.heygen.videos.status(videoId);
        const status = statusJson?.data?.status;
        if (status === "completed") {
          setVideoStatus("completed");
          setVideoUrl(statusJson?.data?.video_url || "");
        } else if (status && status !== "processing") {
          // setVideoStatus("error");
          console.log("Video processing failed", status);
        }
      } catch {
        setVideoStatus("error");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [videoStatus, videoId, token]);

  // When video completes, auto download and add to editor once
  useEffect(() => {
    if (videoStatus === "completed" && videoUrl && !videoAdded) {
      handleAddToTimeline();

      setAddPhase("done");
      return;
    }
  }, [videoStatus, videoUrl, videoAdded, videoId]);

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
      const fileName = `heygen-${videoId ?? Date.now()}.mp4`;

      // Create blob URL for the video
      const blobUrl = URL.createObjectURL(videoBlob);

      // Save the blob URL globally to prevent garbage collection
      if (!window.videoCache) {
        window.videoCache = {};
      }
      window.videoCache[videoId || "current"] = {
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
      <Button
        className="flex gap-1 border border-border"
        variant="outline"
        onClick={handleUploadClick}
      >
        <PlusIcon size={18} /> Upload video
      </Button>
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
          />
          <Button
            variant="default"
            disabled={generating || !uploadedUrl}
            onClick={async () => {
              if (!uploadedUrl) return;
              setGenerating(true);
              try {

                const data: any = await api.heygen.generateScript({ url: uploadedUrl, context });
                const text = data?.script ?? data?.text ?? data;
                setScript(String(text));
              } catch (err) {
                console.error(err);
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? "Generating…" : "Generate script"}
          </Button>
        </div>
      )}

      {script !== null && (
        <>
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="min-h-[140px] w-full text-xs"
          />
          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setAvatarDialogOpen(true)}
            >
              {selectedAvatar ? "Change avatar" : "Select avatar"}
            </Button>
            <Button
              variant="secondary"
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
          {selectedAvatar &&
            selectedVoice &&
            (videoStatus === "processing" ||
            (videoStatus === "completed" &&
              !videoAdded &&
              addPhase !== "done") ? (
              <div className="mt-3 flex w-full flex-col items-center gap-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  {videoStatus === "processing"
                    ? `Current Status: ${videoStatus}. this can take a few minutes`
                    : addPhase === "downloading"
                      ? "Downloading processed video…"
                      : addPhase === "adding"
                        ? "Adding video to timeline…"
                        : "Finalizing…"}
                </p>
              </div>
            ) : videoStatus === "completed" && videoUrl && videoAdded ? (
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
            ) : (
              <Button
                className="mt-3 w-full"
                variant="default"
                disabled={creating || !script}
                onClick={async () => {
                  if (!selectedAvatar || !selectedVoice || !script) return;
                  setVideoStatus("processing");
                  setVideoAdded(false);
                  setCreating(true);

                  try {
                    if (!projectId) {
                      throw new Error("Project ID is required for HeyGen video creation");
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
                    const vid = data?.data?.heygen_response?.data?.video_id;
                    if (!vid) {
                      console.error("Full response:", JSON.stringify(data, null, 2));
                      throw new Error("Missing video_id in response");
                    }
                    console.log("Video created", vid);
                    setVideoId(vid);
                    setVideoStatus("processing");
                    setVideoUrl(null);
                  } catch (err: any) {
                    alert(err.message ?? "Error");
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? "Creating…" : "Create video"}
              </Button>
            ))}

          <Input
            placeholder="Existing video ID"
            value={resumeVideoId}
            onChange={(e) => setResumeVideoId(e.target.value)}
          />

          <Button
            variant="secondary"
            disabled={!resumeVideoId}
            onClick={() => {
              if (!resumeVideoId) return;
              setVideoId(resumeVideoId.trim());
              setVideoStatus("processing");
              setVideoUrl(null);
              setVideoAdded(false);
              setAddPhase("idle");
            }}
          >
            Resume
          </Button>

          {videoStatus === "processing" ||
          (videoStatus === "completed" &&
            !videoAdded &&
            addPhase !== "done") ? (
            <div className="mt-3 flex w-full flex-col items-center gap-1">
              {/* <Loader2 className="h-5 w-5 animate-spin text-primary" /> */}
              {/* <p className="text-xs text-muted-foreground">
                {videoStatus === "processing"
                  ? `Current Status: ${videoStatus}. this can take a few minutes`
                  : addPhase === "downloading"
                    ? "Downloading processed video…"
                    : addPhase === "adding"
                      ? "Adding video to timeline…"
                      : "Finalizing…"}
              </p> */}
            </div>
          ) : videoStatus === "completed" &&
            videoUrl &&
            !videoAdded &&
            addPhase === "done" ? (
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
          ) : videoStatus === "completed" && videoUrl && videoAdded ? (
            // <Button asChild className="mt-3 w-full" variant="default">
            //   <a
            //     href={videoUrl}
            //     target="_blank"
            //     rel="noopener noreferrer"
            //     download
            //   >
            //     Download video
            //   </a>
            // </Button>
            <div></div>
          ) : (
            <></>
          )}
        </>
      )}
    </div>
  );
};

export default ScriptMenu;
