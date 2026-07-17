"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyTextButtonProps = {
  text: string;
  className?: string;
};

export function CopyTextButton({ text, className }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className={className}
      disabled={!text.trim()}
      onClick={() => void handleCopy()}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
