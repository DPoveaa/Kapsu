import { useEffect, useRef } from 'react';

/**
 * Polling sem sobreposição: pausa fora da aba ou offline e atualiza
 * imediatamente quando o usuário retorna.
 */
export function useVisibilityPolling(
  callback: () => Promise<void> | void,
  intervalMs: number,
  enabled = true,
): void {
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const isActive = () => document.visibilityState === 'visible' && navigator.onLine;

    const clearScheduled = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const run = async () => {
      if (disposed || runningRef.current || !isActive()) return;
      runningRef.current = true;
      try {
        await callbackRef.current();
      } catch {
        // O callback é responsável por tratar e exibir erros.
      } finally {
        runningRef.current = false;
      }
    };

    const schedule = (delay = intervalMs) => {
      clearScheduled();
      if (disposed || !isActive()) return;
      timeoutId = setTimeout(async () => {
        timeoutId = null;
        await run();
        schedule();
      }, delay);
    };

    const handleActivityChange = () => {
      if (isActive()) {
        schedule(0);
      } else {
        clearScheduled();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', handleActivityChange);
    window.addEventListener('focus', handleActivityChange);
    window.addEventListener('online', handleActivityChange);
    window.addEventListener('offline', handleActivityChange);

    return () => {
      disposed = true;
      clearScheduled();
      document.removeEventListener('visibilitychange', handleActivityChange);
      window.removeEventListener('focus', handleActivityChange);
      window.removeEventListener('online', handleActivityChange);
      window.removeEventListener('offline', handleActivityChange);
    };
  }, [enabled, intervalMs]);
}
