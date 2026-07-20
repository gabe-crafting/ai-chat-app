"use client";

import {
  AI_REASONING_EFFORTS,
  normalizeAiReasoningEffort,
} from "@/lib/ai/reasoning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ReasoningSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  size?: "sm" | "default";
};

export function ReasoningSelect({
  value,
  onValueChange,
  disabled,
  className,
  id,
  size = "sm",
}: ReasoningSelectProps) {
  const normalizedValue = normalizeAiReasoningEffort(value);

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(String(nextValue));
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)} size={size}>
        <SelectValue>
          {AI_REASONING_EFFORTS.find((option) => option.value === normalizedValue)
            ?.label ?? "Off"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AI_REASONING_EFFORTS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
