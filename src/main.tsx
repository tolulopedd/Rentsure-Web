import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/routes";
import { Toaster } from "@/components/ui/sonner";
import { SubmitLockProvider } from "@/lib/submit-lock";
import { SessionTimeoutGuard } from "@/components/SessionTimeoutGuard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SubmitLockProvider>
      <SessionTimeoutGuard />
      <RouterProvider router={router} />
      <Toaster richColors />
    </SubmitLockProvider>
  </React.StrictMode>
);
