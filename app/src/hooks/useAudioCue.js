import { useCallback, useRef } from 'react';

const cueRegistry = new Map();

export function useAudioCue({ enabled = false } = {}) {
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  const registerCue = useCallback((key, url) => {
    if (!key || !url) return;
    if (!cueRegistry.has(key)) {
      const audio = new Audio(url);
      cueRegistry.set(key, audio);
    }
  }, []);

  const playCue = useCallback((key) => {
    if (!isEnabledRef.current || !key) return;
    const audio = cueRegistry.get(key);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return { registerCue, playCue, enabled: enabled ?? false };
}

export default useAudioCue;
