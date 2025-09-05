import useStore from "../store/use-store";
import { dispatch } from "@designcombo/events";
import { ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IImage, IVideo } from "@designcombo/types";
import React, { useEffect, useRef, useState } from "react";
import { useDownloadState } from "../store/use-download-state";
import { Droppable } from "@/components/ui/droppable";
import { PlusIcon } from "lucide-react";
import { DroppableArea } from "./droppable";

const SceneEmpty = () => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [desiredSize, setDesiredSize] = useState({ width: 0, height: 0 });
  const { size } = useStore();
  const { projectId } = useDownloadState();

  useEffect(() => {
    const container = containerRef.current!;
    const PADDING = 96;
    const containerHeight = container.clientHeight - PADDING;
    const containerWidth = container.clientWidth - PADDING;
    const { width, height } = size;

    const desiredZoom = Math.min(
      containerWidth / width,
      containerHeight / height,
    );
    setDesiredSize({
      width: width * desiredZoom,
      height: height * desiredZoom,
    });
    setIsLoading(false);
  }, [size]);

  const onSelectFiles = async (files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        console.log("Not a video");
        return;
      }
      const objectUrl = URL.createObjectURL(file);

      // Upload to backend to get a publicly accessible URL
      let publicUrl: string;
      try {
        const { uploadFile } = await import("../../../utils/upload");
        publicUrl = await uploadFile(file, projectId || "default");
      } catch (err) {
        console.error("Failed to upload file", err);
        // Optionally notify the user here (toast/snackbar)
        // Abort adding this file to the timeline – we *must* have a real URL
        URL.revokeObjectURL(objectUrl);
        continue; // move to the next selected file
      }

      console.log("valid video");
      // Load metadata to get duration & dimensions before dispatching
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.src = objectUrl;
      videoEl.onloadedmetadata = () => {
        const payload: Partial<IVideo> = {
          id: generateId(),
          type: "video",
          duration: videoEl.duration * 1000, // ms
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
          options: {
            resourceId: "main",
            scaleMode: "fit",
          },
        });
        // Removed immediate URL.revokeObjectURL(objectUrl) to avoid media element errors
      };
    }
  };

  return (
    <div ref={containerRef} className="absolute z-50 flex h-full w-full flex-1">
      {!isLoading ? (
        <Droppable
          maxFileCount={4}
          maxSize={1024 * 1024 * 1024} // allow up to 1 GB
          disabled={false}
          onValueChange={onSelectFiles}
          className="h-full w-full flex-1 bg-background"
        >
          <DroppableArea
            onDragStateChange={setIsDraggingOver}
            className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center border border-dashed text-center transition-colors duration-200 ease-in-out ${
              isDraggingOver ? "border-white bg-white/10" : "border-white/15"
            }`}
            style={{
              width: desiredSize.width,
              height: desiredSize.height,
            }}
          >
            <div className="flex flex-col items-center justify-center gap-4 pb-12">
              <div className="hover:bg-primary-dark cursor-pointer rounded-md border bg-primary p-2 text-secondary transition-colors duration-200">
                <PlusIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-px">
                <p className="text-sm text-muted-foreground">Click to upload</p>
                <p className="text-xs text-muted-foreground/70">
                  Or drag and drop files here
                </p>
              </div>
            </div>
          </DroppableArea>
        </Droppable>
      ) : (
        <div className="bg-background-subtle flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      )}
    </div>
  );
};

export default SceneEmpty;
