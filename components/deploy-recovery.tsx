"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "deploy-recovery-reloaded";

function isStaleAssetError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("this page couldn't load") ||
    normalized.includes("failed to load server-side rendering")
  );
}

function tryRecoverFromStaleCache(reason: string) {
  if (!isStaleAssetError(reason)) {
    return;
  }

  if (sessionStorage.getItem(RELOAD_FLAG)) {
    return;
  }

  sessionStorage.setItem(RELOAD_FLAG, "1");
  window.location.reload();
}

export function DeployRecovery() {
  useEffect(() => {
    const clearReloadFlag = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 30_000);

    function onError(event: ErrorEvent) {
      tryRecoverFromStaleCache(event.message);
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "");
      tryRecoverFromStaleCache(reason);
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.clearTimeout(clearReloadFlag);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
