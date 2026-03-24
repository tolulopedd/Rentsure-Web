import { useContext } from "react";
import { SubmitLockContext } from "@/lib/submit-lock-context";

export function useSubmitLock() {
  const context = useContext(SubmitLockContext);
  if (!context) {
    throw new Error("useSubmitLock must be used within SubmitLockProvider");
  }
  return context;
}

