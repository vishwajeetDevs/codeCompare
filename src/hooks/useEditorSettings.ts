import { useCallback, useState } from 'react';
import { DEFAULT_EDITOR_SETTINGS } from '../utils/editorConfig';
import type { EditorSettings } from '../types/editor';

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);

  const updateSettings = useCallback((partial: Partial<EditorSettings>) => {
    setSettings((current) => ({ ...current, ...partial }));
  }, []);

  return { settings, updateSettings };
}
