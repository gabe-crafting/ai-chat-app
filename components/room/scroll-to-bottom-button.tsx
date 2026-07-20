"use client";

import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type ScrollToBottomButtonProps = {
  targetRef: RefObject<HTMLElement | null>;
};

export function ScrollToBottomButton({ targetRef }: ScrollToBottomButtonProps) {
  function scrollToBottom() {
    targetRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="fixed top-4 right-4 z-50 shadow-md"
            aria-label="Scroll to bottom"
            onClick={scrollToBottom}
          />
        }
      >
        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>scroll to bottom</TooltipContent>
    </Tooltip>
  );
}
