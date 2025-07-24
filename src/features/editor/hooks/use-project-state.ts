import { useCallback } from 'react';
import { api } from '@/lib/api';
import StateManager from '@designcombo/state';
import useStore from '../store/use-store';
import { useDownloadState } from '../store/use-download-state';

interface EditorState extends Record<string, unknown> {
  stateManagerData: Record<string, unknown>;
  timelineState: Record<string, unknown>;
  savedAt: string;
  version: string;
}

export const useProjectState = (stateManager: StateManager) => {
  const { projectId } = useDownloadState();
  const timelineStore = useStore();

  // Simple manual save function - no auto-save to avoid loops
  const saveState = useCallback(async () => {
    if (!projectId) {
      console.warn('Cannot save state: no project ID');
      return;
    }

    try {
      const stateManagerData = stateManager.getState() as unknown as Record<string, unknown>;
      const timelineState = {
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

      const editorState: EditorState = {
        stateManagerData,
        timelineState,
        savedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      await api.projects.update(projectId, {
        editor_state: editorState,
      });
      
      console.log('Editor state saved successfully');
    } catch (error) {
      console.error('Failed to save editor state:', error);
      throw error;
    }
  }, [projectId, stateManager, timelineStore]);

  // Simple restore function
  const restoreState = useCallback(async (editorState: EditorState) => {
    try {
      console.log('Restoring editor state...', editorState);
      
      // For now, just log - we can implement actual restoration later
      // to avoid any potential loops during development
      
      console.log('Editor state restore logged (implementation pending)');
    } catch (error) {
      console.error('Failed to restore editor state:', error);
    }
  }, []);

  return {
    saveState,
    restoreState,
  };
};
