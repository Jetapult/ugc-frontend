import { useCallback } from "react";
import StateManager from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_AUDIO, ADD_IMAGE, ADD_TEXT } from "@designcombo/state";

export const useProjectState = (stateManager: StateManager) => {
  
  // Simple save using Remotion's built-in state management
  const saveState = useCallback(() => {
    try {
      const state = stateManager.getState();
      localStorage.setItem('remotion-editor-state', JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }, [stateManager]);

  // Simple reset
  const resetState = useCallback(() => {
    try {
      console.log(' Resetting state...');
      
      // Clear localStorage
      localStorage.removeItem('remotion-editor-state');
      
      // Reset StateManager to default state
      const defaultState = {
        tracks: [],
        trackItemIds: [],
        trackItemsMap: {},
        trackItemDetailsMap: {},
        transitionIds: [],
        transitionsMap: {},
        duration: 1000,
        fps: 30,
        size: { width: 1080, height: 1920 },
      };

      // Set each property
      Object.keys(defaultState).forEach((key) => {
        (stateManager as any)[key] = (defaultState as any)[key];
      });

      // Trigger subscriptions to update UI
      setTimeout(() => {
        ['notifyStateSubscribers', 'notifyAddRemoveSubscribers'].forEach(method => {
          if (typeof (stateManager as any)[method] === "function") {
            (stateManager as any)[method]();
          }
        });
      }, 100);
      
      console.log(' State reset successfully');
    } catch (error) {
      console.error("Failed to reset state:", error);
    }
  }, [stateManager]);

  // Restore using proper dispatch events like the working test button
  const restoreState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('remotion-editor-state');
      
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // First clear current state by resetting
        resetState();
        
        // Wait a bit for reset to complete, then restore items
        setTimeout(() => {
          // Restore each track item using proper dispatch events with delays
          if (state.trackItemsMap && state.trackItemIds) {
            state.trackItemIds.forEach((itemId: string, index: number) => {
              const item = state.trackItemsMap[itemId];
              if (item) {
                // Add delay between items to help with layers
                setTimeout(() => {
                  if (item.type === 'video') {
                    // Fix blob URL issue - use actual src from details, not blob
                    let videoSrc = item.details?.src || item.src;
                    
                    // Skip blob URLs and corrupted URLs
                    if (!videoSrc || videoSrc.startsWith('blob:') || videoSrc.includes('undefined')) {
                      return;
                    }
                    
                    // Create a clean payload with position data preserved
                    const cleanPayload = {
                      id: item.id,
                      type: "video" as const,
                      details: {
                        src: videoSrc,
                        width: item.details?.width || 360,
                        height: item.details?.height || 640,
                        // Preserve position and transform properties
                        top: item.details?.top,
                        left: item.details?.left,
                        transform: item.details?.transform,
                        opacity: item.details?.opacity,
                        borderRadius: item.details?.borderRadius,
                        borderWidth: item.details?.borderWidth,
                        borderColor: item.details?.borderColor,
                        boxShadow: item.details?.boxShadow,
                        blur: item.details?.blur,
                        brightness: item.details?.brightness,
                        flipX: item.details?.flipX,
                        flipY: item.details?.flipY,
                        rotate: item.details?.rotate,
                        visibility: item.details?.visibility,
                        volume: item.details?.volume,
                      },
                      metadata: {
                        name: item.metadata?.name || "Restored Video",
                        // Preserve safe metadata, exclude blob URLs
                        previewUrl: undefined
                      }
                    };
                    
                    try {
                      dispatch(ADD_VIDEO, {
                        payload: cleanPayload,
                        options: { resourceId: "main", scaleMode: "fit" },
                      });
                    } catch (error) {
                      console.error('Failed to dispatch video:', error);
                    }
                  } else if (item.type === 'audio') {
                    dispatch(ADD_AUDIO, {
                      payload: {
                        id: item.id,
                        type: "audio",
                        details: item.details,
                        metadata: item.metadata
                      },
                      options: { resourceId: "main" },
                    });
                  } else if (item.type === 'image') {
                    dispatch(ADD_IMAGE, {
                      payload: {
                        id: item.id,
                        type: "image",
                        details: item.details,
                        metadata: item.metadata
                      },
                      options: { resourceId: "main", scaleMode: "fit" },
                    });
                  } else if (item.type === 'text') {
                    dispatch(ADD_TEXT, {
                      payload: {
                        id: item.id,
                        type: "text",
                        details: item.details,
                        metadata: item.metadata
                      },
                      options: { resourceId: "main" },
                    });
                  }
                }, index * 100); // 100ms delay between each item
              }
            });
          }
        }, 200);
      }
    } catch (error) {
      console.error("Failed to restore state:", error);
    }
  }, [stateManager, resetState]);

  return {
    saveState,
    restoreState,
    resetState,
  };
};
