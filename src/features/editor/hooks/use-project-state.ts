import { useCallback } from "react";
import { api } from "@/lib/api";
import StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import { useDownloadState } from "../store/use-download-state";

interface EditorState extends Record<string, unknown> {
  timeline: Record<string, unknown>;
  menus: Record<string, unknown>;
  savedAt: string;
  version: string;
}

export const useProjectState = (stateManager: StateManager) => {
  const { projectId } = useDownloadState();
  const timelineStore = useStore();
  const layoutStore = useLayoutStore();

  // Simple manual save function - no auto-save to avoid loops
  const saveState = useCallback(async () => {
    if (!projectId) {
      console.warn("Cannot save state: no project ID");
      return;
    }

    try {
      // Get state manager data (canvas/design state)
      const stateManagerData = stateManager.getState() as unknown as Record<
        string,
        unknown
      >;



      // Get timeline state - use timeline store data since it has the actual timeline data
      const timelineState = {
        ...stateManagerData, // Include state manager data first
        // Override with timeline store data to ensure we save the correct timeline data
        duration: timelineStore.duration,
        fps: timelineStore.fps,
        scale: timelineStore.scale,
        scroll: timelineStore.scroll,
        size: timelineStore.size,
        tracks: timelineStore.tracks,
        trackItemIds: timelineStore.trackItemIds,
        trackItemsMap: timelineStore.trackItemsMap,
        trackItemDetailsMap: timelineStore.trackItemDetailsMap,
        transitionIds: timelineStore.transitionIds,
        transitionsMap: timelineStore.transitionsMap,
      };


      // Get menu states from layout store
      const menuStates = {
        activeMenuItem: layoutStore.activeMenuItem,
        showMenuItem: layoutStore.showMenuItem,
        showControlItem: layoutStore.showControlItem,
        showToolboxItem: layoutStore.showToolboxItem,
        activeToolboxItem: layoutStore.activeToolboxItem,
      };


      const editorState: EditorState = {
        timeline: timelineState,
        menus: menuStates,
        savedAt: new Date().toISOString(),
        version: "1.0.0",
      };


      await api.projects.update(projectId, {
        editor_state: editorState,
      });

    } catch (error) {
      console.error("Failed to save editor state:", error);
      throw error;
    }
  }, [projectId, stateManager, timelineStore]);

  // Simple restore function
  const restoreState = useCallback(
    async (editorState: EditorState) => {
      try {

        // Restore timeline state if it exists
        if (editorState.timeline) {
          const timelineData = editorState.timeline;


          // Restore state manager first with all timeline data
          const stateManagerKeys = [
            "tracks",
            "trackItemIds",
            "trackItemsMap",
            "trackItemDetailsMap",
            "transitionIds",
            "transitionsMap",
            "duration",
            "fps",
            "size",
            "scale",
          ];
          stateManagerKeys.forEach((key) => {
            if (timelineData[key] !== undefined) {
              try {
                (stateManager as any)[key] = timelineData[key];
              } catch (error) {
              }
            }
          });

          // Then restore timeline store with the same data

          await timelineStore.setState({
            duration: timelineData.duration || 1000,
            fps: timelineData.fps || 30,
            scale: timelineData.scale || {
              index: 7,
              unit: 300,
              zoom: 1 / 300,
              segments: 5,
            },
            scroll: timelineData.scroll || { left: 0, top: 0 },
            size: timelineData.size || { width: 1080, height: 1920 },
            tracks: timelineData.tracks || [],
            trackItemIds: timelineData.trackItemIds || [],
            trackItemsMap: timelineData.trackItemsMap || {},
            trackItemDetailsMap: timelineData.trackItemDetailsMap || {},
            transitionIds: timelineData.transitionIds || [],
            transitionsMap: timelineData.transitionsMap || {},
          });



          // Force StateManager to notify all subscribers after restoration
          setTimeout(() => {


            // Trigger state manager subscriptions by calling internal notification methods
            try {
              // Try to trigger state subscription
              if (
                typeof (stateManager as any).notifyStateSubscribers ===
                "function"
              ) {
                (stateManager as any).notifyStateSubscribers();
              }

              // Try to trigger duration subscription
              if (
                typeof (stateManager as any).notifyDurationSubscribers ===
                "function"
              ) {
                (stateManager as any).notifyDurationSubscribers();
              }

              // Try to trigger track items subscription
              if (
                typeof (stateManager as any).notifyTrackItemSubscribers ===
                "function"
              ) {
                (stateManager as any).notifyTrackItemSubscribers();
              }

              // Try to trigger add/remove items subscription
              if (
                typeof (stateManager as any).notifyAddRemoveSubscribers ===
                "function"
              ) {
                (stateManager as any).notifyAddRemoveSubscribers();
              }

              // Force timeline store update as backup
              const tracks = Array.isArray(timelineData.tracks)
                ? timelineData.tracks
                : [];
              const trackItemIds = Array.isArray(timelineData.trackItemIds)
                ? timelineData.trackItemIds
                : [];
              const trackItemsMap =
                typeof timelineData.trackItemsMap === "object" &&
                timelineData.trackItemsMap
                  ? timelineData.trackItemsMap
                  : {};

              timelineStore.setState({
                tracks: [...tracks],
                trackItemIds: [...trackItemIds],
                trackItemsMap: { ...trackItemsMap },
                trackItemDetailsMap: timelineData.trackItemDetailsMap || {},
                duration: timelineData.duration || 1000,
              });


            } catch (error) {
            }
          }, 300);
        }

        // Restore menu states - delay to ensure layout store is ready
        setTimeout(() => {
          if (editorState.menus) {

            const menuData = editorState.menus as any;
            if (menuData.activeMenuItem !== undefined) {
              layoutStore.setActiveMenuItem(menuData.activeMenuItem);
            }
            if (menuData.showMenuItem !== undefined) {
              layoutStore.setShowMenuItem(menuData.showMenuItem);
            }
            if (menuData.showControlItem !== undefined) {
              layoutStore.setShowControlItem(menuData.showControlItem);
            }
            if (menuData.showToolboxItem !== undefined) {
              layoutStore.setShowToolboxItem(menuData.showToolboxItem);
            }
            if (menuData.activeToolboxItem !== undefined) {
              layoutStore.setActiveToolboxItem(menuData.activeToolboxItem);
            }
          } else {
          }
        }, 100);

      } catch (error) {
        console.error("Failed to restore editor state:", error);
      }
    },
    [stateManager, timelineStore, layoutStore],
  );

  // Reset function to save empty editor state to database and clear memory
  const resetState = useCallback(async () => {
    if (!projectId) {
      console.warn("Cannot reset state: no project ID");
      return;
    }

    try {
      // Save empty state to database
      const emptyEditorState = {
        timeline: {},
        menus: {},
        savedAt: new Date().toISOString(),
        version: "1.0.0",
      };

      await api.projects.update(projectId, {
        editor_state: emptyEditorState,
      });

      // Clear in-memory state after saving to DB
      const emptyState = {
        size: { width: 1080, height: 1920 },
        fps: 30,
        tracks: [],
        trackItemIds: [],
        trackItemsMap: {},
        trackItemDetailsMap: {},
        transitionIds: [],
        transitionsMap: {},
        duration: 1000,
      };

      // Reset state manager
      Object.entries(emptyState).forEach(([key, value]) => {
        try {
          (stateManager as any)[key] = value;
        } catch (error) {
          console.warn(`Failed to reset state manager property ${key}:`, error);
        }
      });

      // Reset timeline store
      await timelineStore.setState({
        duration: 1000,
        fps: 30,
        scale: {
          index: 7,
          unit: 300,
          zoom: 1 / 300,
          segments: 5,
        },
        scroll: { left: 0, top: 0 },
        size: { width: 1080, height: 1920 },
        tracks: [],
        trackItemIds: [],
        trackItemsMap: {},
        trackItemDetailsMap: {},
        transitionIds: [],
        transitionsMap: {},
      });

    } catch (error) {
      console.error("❌ Failed to reset editor state:", error);
      throw error;
    }
  }, [projectId, stateManager, timelineStore]);

  return {
    saveState,
    restoreState,
    resetState,
  };
};
