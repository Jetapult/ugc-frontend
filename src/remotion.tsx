import React from "react";
import {
  Composition,
  registerRoot,
  Video,
  AbsoluteFill,
  Img,
  getInputProps,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Design = any;

const DynamicLayer: React.FC<{ item: any; fps: number }> = ({ item, fps }) => {
  const frame = useCurrentFrame();
  const { details, display, type, id } = item;

  const from = display?.from ?? 0;
  const to = display?.to ?? 999999;
  const fromF = Math.floor(from / (1000 / fps));
  const toF = Math.ceil(to / (1000 / fps));
  if (frame < fromF || frame > toF) return null;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    top: details.top ?? 0,
    left: details.left ?? 0,
    width: details.width ?? "100%",
    height: details.height ?? "100%",
    opacity: (details.opacity ?? 100) / 100,
    transform: details.transform,
  };

  if (type === "video") {
    return (
      <AbsoluteFill key={id} style={baseStyle}>
        <Video src={details.src} style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
    );
  }

  if (type === "image") {
    return (
      <AbsoluteFill key={id} style={baseStyle}>
        <Img src={details.src} style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
    );
  }

  if (type === "text") {
    return (
      <AbsoluteFill key={id} style={baseStyle}>
        <div
          dangerouslySetInnerHTML={{ __html: details.text ?? "" }}
          style={{
            color: details.color ?? "#fff",
            fontSize: details.fontSize ?? 40,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: details.textAlign ?? "center",
          }}
        />
      </AbsoluteFill>
    );
  }

  return null;
};

const MainComponent: React.FC<{ design: Design }> = ({ design }) => {
  const { fps } = useVideoConfig();
  if (!design?.trackItemIds?.length) {
    return <h1 style={{ color: "red" }}>Empty design JSON</h1>;
  }

  return (
    <>
      {design.trackItemIds.map((id: string) => {
        const item = design.trackItemsMap[id];
        return <DynamicLayer key={id} item={item} fps={fps} />;
      })}
    </>
  );
};

const RemotionRoot: React.FC = () => {
  const input = getInputProps();
  const design: Design = (input as any).design ?? input;

  const width = design?.size?.width ?? 1080;
  const height = design?.size?.height ?? 1920;
  const fps = design?.fps ?? 30;
  const durationMs = design?.duration ?? 5000;
  const durationInFrames = Math.ceil(durationMs / (1000 / fps));

  return (
    <Composition
      id="Main"
      component={MainComponent}
      defaultProps={{ design }}
      width={width}
      height={height}
      fps={fps}
      durationInFrames={durationInFrames}
    />
  );
};

registerRoot(RemotionRoot);

export default RemotionRoot;
