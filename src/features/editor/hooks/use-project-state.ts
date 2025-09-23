import { useCallback } from "react";
import StateManager from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_AUDIO, ADD_IMAGE, ADD_TEXT } from "@designcombo/state";

export const useProjectState = (stateManager: StateManager) => {
  
  // Simple save using Remotion's built-in state management
  const saveState = useCallback(() => {
    try {
      console.log('💾 Saving state to localStorage...');
      const state = stateManager.getState();
      console.log('📊 State being saved:', state);
      localStorage.setItem('remotion-editor-state', JSON.stringify(state));
      console.log('✅ State saved successfully');
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

      Object.keys(defaultState).forEach((key) => {
        (stateManager as any)[key] = (defaultState as any)[key];
      });

      // Trigger subscriptions
      setTimeout(() => {
        const notificationMethods = [
          'notifyStateSubscribers',
          'notifyDurationSubscribers',
          'notifyTrackItemSubscribers', 
          'notifyAddRemoveSubscribers'
        ];

        notificationMethods.forEach(method => {
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
      console.log('🔄 Restoring state from localStorage...');
      const savedState = localStorage.getItem('remotion-editor-state');
      
      if (savedState) {
        const state = JSON.parse(savedState);
        console.log('📋 Found saved state:', state);
        console.log('📊 State has tracks:', state.tracks?.length || 0);
        console.log('📊 State has trackItems:', state.trackItemIds?.length || 0);
        
        // First clear current state by resetting
        console.log('🧹 Clearing current state...');
        resetState();
        
        // Wait a bit for reset to complete, then restore items
        setTimeout(() => {
          console.log('🔄 Restoring items using dispatch events...');
          
          // Restore each track item using proper dispatch events with delays
          if (state.trackItemsMap && state.trackItemIds) {
            state.trackItemIds.forEach((itemId: string, index: number) => {
              const item = state.trackItemsMap[itemId];
              if (item) {
                // Add delay between items to help with layers
                setTimeout(() => {
                  console.log(`📦 Restoring ${item.type} item:`, item);
                  console.log('📍 Item position data:', {
                    top: item.details?.top,
                    left: item.details?.left,
                    transform: item.details?.transform,
                    opacity: item.details?.opacity
                  });
                  
                  if (item.type === 'video') {
                    // Fix blob URL issue - use actual src from details, not blob
                    let videoSrc = item.details?.src || item.src;
                    
                    // Skip blob URLs and corrupted URLs
                    if (!videoSrc || videoSrc.startsWith('blob:') || videoSrc.includes('undefined')) {
                      console.log('⚠️ Skipping invalid video src:', videoSrc);
                      return;
                    }
                    
                    console.log('🔗 Video src being restored:', videoSrc);
                    
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
                    
                    console.log('📦 Clean video payload:', cleanPayload);
                    
                    dispatch(ADD_VIDEO, {
                      payload: cleanPayload,
                      options: { resourceId: "main", scaleMode: "fit" },
                    });
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
          
          console.log('✅ State restoration completed using dispatch events');
        }, 200);
        
      } else {
        console.log('ℹ️ No saved state found');
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
