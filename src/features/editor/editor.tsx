"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import StateManager from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";

import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useAuth } from "@/context/AuthContext";
import LoginDialog from "@/components/ui/login-dialog";
import { useProjectState } from "./hooks/use-project-state";

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

interface EditorProps {
  initialEditorState?: Record<string, unknown>;
  projectName?: string;
}

const Editor = ({ initialEditorState, projectName: initialProjectName }: EditorProps = {}) => {
  const [projectName, setProjectName] = useState<string>(initialProjectName || "Untitled video");
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const { timeline, playerRef } = useStore();
  const { token } = useAuth();
  const { saveState, restoreState, resetState } = useProjectState(stateManager);

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();

  // Update project name when prop changes
  useEffect(() => {
    if (initialProjectName) {
      setProjectName(initialProjectName);
    }
  }, [initialProjectName]);

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    loadFonts([
      {
        name: SECONDARY_FONT,
        url: SECONDARY_FONT_URL,
      },
    ]);
    
    // Suppress annoying deprecation warnings
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('findDOMNode is deprecated') || 
          message.includes('findDOMNode') ||
          message.includes('react-draggable')) {
        return; // Ignore these warnings
      }
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('findDOMNode is deprecated') || 
          message.includes('findDOMNode') ||
          message.includes('react-draggable')) {
        return; // Ignore these errors too
      }
      originalError.apply(console, args);
    };
  }, []);

  // Auto-restore with error handling
  useEffect(() => {
    if (timeline) {
      setTimeout(() => {
        try {
          restoreState();
        } catch (error) {
          console.error('Auto-restore failed:', error);
          localStorage.removeItem('remotion-editor-state');
        }
      }, 500); // Wait for timeline to be fully initialized
    }
  }, [timeline, restoreState]);

  useEffect(() => {
    const screenHeight = window.innerHeight;
    const desiredHeight = 300;
    const percentage = (desiredHeight / screenHeight) * 100;
    timelinePanelRef.current?.resize(percentage);
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    timeline?.resize(
      {
        height: timelineContainer.clientHeight - 90,
        width: timelineContainer.clientWidth - 40,
      },
      {
        force: true,
      },
    );
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  // Show login dialog if not authenticated
  if (!token) {
    return <LoginDialog />;
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <Navbar
        projectName={projectName}
        user={null}
        stateManager={stateManager}
        setProjectName={setProjectName}
        onSave={saveState}
        onReset={resetState}
      />
      <div className="flex flex-1">
        <ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
          <ResizablePanel className="relative" defaultSize={70}>
            <FloatingControl />
            <div className="flex h-full flex-1">
              <div className="bg-sidebar flex flex-none border-r border-border/80">
                <MenuList />
                <MenuItem />
                              </div>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <CropModal />
                <Scene stateManager={stateManager} />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            className="min-h-[50px]"
            ref={timelinePanelRef}
            defaultSize={30}
            onResize={handleTimelineResize}
          >
            {playerRef && <Timeline stateManager={stateManager} />}
          </ResizablePanel>
        </ResizablePanelGroup>
        <ControlItem />
      </div>
    </div>
  );
};

export default Editor;
