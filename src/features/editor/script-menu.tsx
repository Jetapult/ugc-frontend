import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "lucide-react";
import { uploadFile } from "@/utils/upload";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import type { IVideo } from "@designcombo/types";
import type StateManager from "@designcombo/state";

const ScriptMenu: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [context, setContext] = useState("");

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const file = files[0];
    if (!file || !file.type.startsWith("video/")) return;

    const objectUrl = URL.createObjectURL(file);

    let publicUrl: string;
    try {
      publicUrl = await uploadFile(file);
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
    <div className="flex flex-col gap-3 p-4 text-sm w-[300px]">
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
          <Button variant="default">Generate script</Button>
        </div>
      )}
    </div>
  );
};

export default ScriptMenu;
