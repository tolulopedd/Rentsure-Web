import { createContext } from "react";

export type SubmitLockContextValue = {
  isGlobalSubmitting: boolean;
  runWithSubmitLock: <T>(task: () => Promise<T>) => Promise<T | null>;
};

export const SubmitLockContext = createContext<SubmitLockContextValue | undefined>(undefined);

