"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-6 font-sans">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-neutral-600">
            {error.message || "The app failed to load."}
          </p>
          <Button type="button" onClick={() => reset()}>
            Reload
          </Button>
        </div>
      </body>
    </html>
  );
}
