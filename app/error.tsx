"use client";

import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message ||
          "This page failed to load. Try reloading, or sign in again."}
      </p>
      <p className="text-xs text-muted-foreground">
        If this keeps happening after a recent update, hard-refresh the page
        (Ctrl+Shift+R) or open the app in a private window.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Reload
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Home
        </Button>
      </div>
    </div>
  );
}
