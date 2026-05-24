import { useEffect, useRef } from "react";

/**
 * Declaratives setInterval. delay=null pausiert. Callback darf während
 * der Laufzeit wechseln, ohne dass der Timer neu gestartet wird.
 * Aufräumen bei unmount ist automatisch.
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
