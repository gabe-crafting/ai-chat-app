"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CopyInviteLinkProps = {
  inviteUrl: string;
};

export function CopyInviteLink({ inviteUrl }: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input readOnly value={inviteUrl} aria-label="Room invite link" />
      <Button type="button" variant="outline" onClick={() => void copy()}>
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
