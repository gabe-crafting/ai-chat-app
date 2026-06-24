"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageAttachmentProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  id?: string;
};

export function ImageAttachment({
  file,
  onFileChange,
  disabled,
  id = "image-attachment",
}: ImageAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileChange(nextFile);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Image
      </Button>
      {file && previewUrl ? (
        <div className="flex items-center gap-2">
          <div className="relative size-10 overflow-hidden rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Attached preview"
              className="size-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove image"
            disabled={disabled}
            onClick={() => onFileChange(null)}
          >
            ×
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MessageImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("relative mt-2 block max-w-xs overflow-hidden rounded-md", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-64 w-full object-contain" />
    </a>
  );
}
