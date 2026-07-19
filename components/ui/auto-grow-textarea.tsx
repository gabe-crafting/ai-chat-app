import * as React from "react";

import { cn } from "@/lib/utils";

const textareaStyles =
  "w-full min-w-0 resize-none rounded-md border border-input bg-input/20 px-2 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

type AutoGrowTextareaProps = React.ComponentProps<"textarea"> & {
  maxRows?: number;
};

export function AutoGrowTextarea({
  className,
  maxRows = 6,
  onKeyDown,
  ...props
}: AutoGrowTextareaProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const styles = getComputedStyle(element);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
    const padding =
      Number.parseFloat(styles.paddingTop) +
      Number.parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * maxRows + padding;

    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    element.style.overflowY =
      element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [maxRows]);

  React.useLayoutEffect(() => {
    resize();
  }, [props.value, resize]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }

    onKeyDown?.(event);
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      data-slot="textarea"
      onKeyDown={handleKeyDown}
      className={cn(textareaStyles, className)}
      {...props}
    />
  );
}
