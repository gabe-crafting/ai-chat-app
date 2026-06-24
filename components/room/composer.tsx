"use client";

import { useEffect, useState } from "react";

import { ImageAttachment } from "@/components/room/image-attachment";
import { ModelSelect } from "@/components/room/model-select";
import { normalizeModelId } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/rooms/message-utils";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ComposerProps = {
  roomId: string;
  canPromptAi: boolean;
  roomModel: string;
  replyTarget: ChatMessage | null;
  onClearReply: () => void;
  onSendMessage: (
    content: string,
    replyToId?: string | null,
    imageUrl?: string | null,
  ) => Promise<void>;
  onSendAiPrompt?: (
    prompt: string,
    replyToId: string | null,
    model: string,
    imageUrl?: string | null,
  ) => Promise<void>;
  disabled?: boolean;
};

async function uploadAttachment(roomId: string, file: File | null) {
  if (!file) {
    return null;
  }

  const formData = new FormData();
  formData.set("roomId", roomId);
  formData.set("file", file);

  const response = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { url?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to upload image.");
  }

  if (!data.url) {
    throw new Error("Failed to upload image.");
  }

  return data.url;
}

export function Composer({
  roomId,
  canPromptAi,
  roomModel,
  replyTarget,
  onClearReply,
  onSendMessage,
  onSendAiPrompt,
  disabled,
}: ComposerProps) {
  const [message, setMessage] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState(normalizeModelId(roomModel));
  const [messageImage, setMessageImage] = useState<File | null>(null);
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useHydrated();

  useEffect(() => {
    setAiModel(normalizeModelId(roomModel));
  }, [roomModel]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if ((!text && !messageImage) || pending) return;

    setError(null);
    setPending(true);
    try {
      const imageUrl = await uploadAttachment(roomId, messageImage);
      await onSendMessage(text, replyTarget?.id ?? null, imageUrl);
      setMessage("");
      setMessageImage(null);
      onClearReply();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setPending(false);
    }
  }

  async function handleAiSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = aiPrompt.trim();
    const replyHasImage = Boolean(replyTarget?.imageUrl);
    if ((!text && !aiImage && !replyHasImage) || aiPending || !onSendAiPrompt) {
      return;
    }

    setError(null);
    setAiPending(true);
    try {
      const imageUrl = await uploadAttachment(roomId, aiImage);
      await onSendAiPrompt(text, replyTarget?.id ?? null, aiModel, imageUrl);
      setAiPrompt("");
      setAiImage(null);
      onClearReply();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to prompt the AI.",
      );
    } finally {
      setAiPending(false);
    }
  }

  const busy = pending || aiPending;
  const sendEmpty = !message.trim() && !messageImage;
  const askEmpty = !aiPrompt.trim() && !aiImage && !replyTarget?.imageUrl;

  function submitDisabled(empty: boolean) {
    if (!hydrated) return false;
    return Boolean(disabled || busy || empty);
  }

  return (
    <div className="space-y-3 border-t p-4">
      {replyTarget ? (
        <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <div className="min-w-0 text-xs">
            <p className="font-medium text-muted-foreground">
              Replying to {replyTarget.authorName}
            </p>
            {replyTarget.content ? (
              <p className="line-clamp-2 whitespace-pre-wrap text-foreground">
                {replyTarget.content}
              </p>
            ) : null}
            {replyTarget.imageUrl ? (
              <p className="text-muted-foreground">Includes an image</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Cancel reply"
            disabled={busy}
            onClick={onClearReply}
          >
            ×
          </Button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              replyTarget ? "Write a reply…" : "Message the room…"
            }
            disabled={disabled || busy}
            autoComplete="off"
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={submitDisabled(sendEmpty)}>
            Send
          </Button>
        </div>
        <ImageAttachment
          id="message-image"
          file={messageImage}
          onFileChange={setMessageImage}
          disabled={disabled || busy}
        />
      </form>

      {canPromptAi ? (
        <form onSubmit={handleAiSubmit} className="space-y-2">
          <Label htmlFor="ai-prompt">Ask AI</Label>
          <div className="flex items-center gap-2">
            <Input
              id="ai-prompt"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder={
                replyTarget?.imageUrl || aiImage
                  ? "Ask about or edit this image…"
                  : replyTarget
                    ? "Ask AI about this message…"
                    : "Ask the room AI…"
              }
              disabled={disabled || busy}
              autoComplete="off"
              className="min-w-0 flex-1"
            />
            <ModelSelect
              id="ai-model"
              value={aiModel}
              onValueChange={(value) => setAiModel(normalizeModelId(value))}
              disabled={disabled || busy}
              className="w-40 shrink-0"
            />
            <Button
              type="submit"
              variant="secondary"
              className="shrink-0"
              disabled={submitDisabled(askEmpty)}
            >
              Ask
            </Button>
          </div>
          <ImageAttachment
            id="ai-image"
            file={aiImage}
            onFileChange={setAiImage}
            disabled={disabled || busy}
          />
        </form>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
