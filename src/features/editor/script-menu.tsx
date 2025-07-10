import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "lucide-react";
import { uploadFile } from "@/utils/upload";
import { dispatch } from "@designcombo/events";
import { useAuth } from "@/context/AuthContext";
import AvatarPickerDialog from "@/components/heygen/avatar-picker-dialog";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import type { IVideo } from "@designcombo/types";
import type StateManager from "@designcombo/state";

const BACKEND_URL = (import.meta as any).env?.BACKEND_URL || "http://localhost:8001";
const GENERATE_ENDPOINT = `${BACKEND_URL.replace(/\/$/, "")}/api/heygen/generate_script`;

import VoicePickerDialog from "../../components/heygen/voice-picker-dialog";

const ScriptMenu: React.FC = () => {
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
  const { token } = useAuth();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      dispatch(ADD_VIDEO, {
        payload,
        options: { resourceId: "main", scaleMode: "fit" },
      });
      setVideoUploaded(true);
    };
  };

  return (
    <div className="flex flex-col gap-3 p-4 text-sm w-full">
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
                const res = await fetch(GENERATE_ENDPOINT, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ url: uploadedUrl, context }),
                });
                if (!res.ok) {
                  throw new Error(`Generate failed: ${res.status}`);
                }
                const data = await res.json().catch(() => null);
                const text = data?.script ?? data?.text ?? data ?? (await res.text());
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
            className="min-h-[140px] text-xs w-full"
          />
          <div className="grid grid-cols-2 gap-2 mt-2 w-full">
            <Button variant="secondary" className="w-full" onClick={() => setAvatarDialogOpen(true)}>
              {selectedAvatar ? "Change avatar" : "Select avatar"}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setVoiceDialogOpen(true)}>
                {selectedVoice ? "Change voice" : "Select voice"}
              </Button>
          </div>
          {selectedVoice && (
            <p className="mt-1 text-xs text-muted-foreground">Selected voice: <span className="font-medium text-foreground">{selectedVoice.name}</span></p>
          )}
          {selectedAvatar && (
            <p className="mt-1 text-xs text-muted-foreground">Selected avatar: <span className="font-medium text-foreground">{selectedAvatar.avatar_name}</span></p>
          )}
          <AvatarPickerDialog
            open={avatarDialogOpen}
            onOpenChange={setAvatarDialogOpen}
            onSelect={(a) => setSelectedAvatar(a)}
          />
          <VoicePickerDialog
            open={voiceDialogOpen}
            onOpenChange={setVoiceDialogOpen}
            onSelect={(v) => setSelectedVoice({ voice_id: v.voice_id, name: v.name })}
          />
        </>
      )}
    </div>
  );
};

export default ScriptMenu;
