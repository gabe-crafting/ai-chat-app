"use client";

import { useEffect, useState } from "react";

import { ImageAttachment } from "@/components/room/image-attachment";
import { ModelSelect } from "@/components/room/model-select";
import { readApiJson } from "@/lib/api/parse-response";
import { normalizeModelId } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/rooms/message-utils";
import { useHydrated } from "@/lib/use-hydrated";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ReasoningSelect } from "@/components/room/reasoning-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ComposerProps = {
  roomId: string;
  canPromptAi: boolean;
  isOwner?: boolean;
  roomModel: string;
  aiSystemPrompt?: string;
  onSaveAiSystemPrompt?: (prompt: string) => Promise<void>;
  allHiddenFromAi?: boolean;
  onSetAllHiddenFromAi?: (hiddenFromAi: boolean) => Promise<void>;
  aiReasoningEffort?: string;
  onAiReasoningEffortChange?: (effort: string) => Promise<void>;
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

  const { data, error } = await readApiJson<{ url?: string; error?: string }>(
    response,
  );

  if (error) {
    throw new Error(error);
  }

  if (!data?.url) {
    throw new Error("Failed to upload image.");
  }

  return data.url;
}

export function Composer({
  roomId,
  canPromptAi,
  isOwner = false,
  roomModel,
  aiSystemPrompt = "",
  onSaveAiSystemPrompt,
  allHiddenFromAi = false,
  onSetAllHiddenFromAi,
  aiReasoningEffort = "off",
  onAiReasoningEffortChange,
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
  const [aiSettingsPending, setAiSettingsPending] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState(aiSystemPrompt);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useHydrated();

  useEffect(() => {
    setAiModel(normalizeModelId(roomModel));
  }, [roomModel]);

  useEffect(() => {
    setSystemPromptDraft(aiSystemPrompt);
  }, [aiSystemPrompt]);

  const systemPromptDirty = systemPromptDraft !== aiSystemPrompt;

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

  const busy = pending || aiPending || aiSettingsPending;
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
        <div className="flex items-end gap-2">
          <AutoGrowTextarea
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
          <div className="flex items-end gap-2">
            <AutoGrowTextarea
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

      {canPromptAi || (isOwner && onSaveAiSystemPrompt) ? (
        <div className="space-y-3">
          <Label>AI settings</Label>
          {isOwner && onSaveAiSystemPrompt ? (
            <div className="space-y-2">
              <Label htmlFor="ai-system-prompt" className="text-xs font-normal text-muted-foreground">
                System prompt
              </Label>
              <AutoGrowTextarea
                id="ai-system-prompt"
                value={systemPromptDraft}
                onChange={(event) => setSystemPromptDraft(event.target.value)}
                placeholder="Describe how the AI should behave in this room…"
                disabled={disabled || busy}
                maxRows={8}
                className="min-h-20"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || busy || !systemPromptDirty}
                  onClick={() => {
                    setError(null);
                    setAiSettingsPending(true);
                    void onSaveAiSystemPrompt(systemPromptDraft)
                      .catch((err: unknown) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to save system prompt.",
                        );
                      })
                      .finally(() => {
                        setAiSettingsPending(false);
                      });
                  }}
                >
                  Save system prompt
                </Button>
                {systemPromptDirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || busy}
                    onClick={() => setSystemPromptDraft(aiSystemPrompt)}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for no system prompt. Applies to the next AI requests
                in this room.
              </p>
            </div>
          ) : null}
          {canPromptAi && (onSetAllHiddenFromAi || onAiReasoningEffortChange) ? (
            <div className="flex flex-wrap items-end gap-2">
              {onAiReasoningEffortChange ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="ai-reasoning"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    Reasoning
                  </Label>
                  <ReasoningSelect
                    id="ai-reasoning"
                    value={aiReasoningEffort}
                    onValueChange={(value) => {
                      setError(null);
                      setAiSettingsPending(true);
                      void onAiReasoningEffortChange(value)
                        .catch((err: unknown) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to update reasoning.",
                          );
                        })
                        .finally(() => {
                          setAiSettingsPending(false);
                        });
                    }}
                    disabled={disabled || busy}
                    className="w-32"
                  />
                </div>
              ) : null}
              {onSetAllHiddenFromAi ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || busy}
                  onClick={() => {
                    setError(null);
                    setAiSettingsPending(true);
                    void onSetAllHiddenFromAi(!allHiddenFromAi)
                      .catch((err: unknown) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to update AI context.",
                        );
                      })
                      .finally(() => {
                        setAiSettingsPending(false);
                      });
                  }}
                >
                  {allHiddenFromAi ? "Show all to AI" : "Hide all from AI"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
