import { useCallback, useRef, useState, type ReactNode } from "react";
import { SubmitLockContext } from "@/lib/submit-lock-context";

export function SubmitLockProvider({ children }: { children: ReactNode }) {
  const lockRef = useRef(false);
  const [isGlobalSubmitting, setIsGlobalSubmitting] = useState(false);

  const runWithSubmitLock = useCallback(async <T,>(task: () => Promise<T>) => {
    if (lockRef.current) {
      return null;
    }

    lockRef.current = true;
    setIsGlobalSubmitting(true);
    try {
      return await task();
    } finally {
      lockRef.current = false;
      setIsGlobalSubmitting(false);
    }
  }, []);

  return (
    <SubmitLockContext.Provider value={{ isGlobalSubmitting, runWithSubmitLock }}>
      {children}
    </SubmitLockContext.Provider>
  );
}
