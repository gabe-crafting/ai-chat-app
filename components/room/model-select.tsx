"use client";

import {
  AI_MODEL_ITEMS,
  getModelLabel,
  normalizeModelId,
} from "@/lib/ai/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ModelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function ModelSelect({
  value,
  onValueChange,
  disabled,
  className,
  id,
}: ModelSelectProps) {
  const normalizedValue = normalizeModelId(value);

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
      <SelectTrigger id={id} className={cn("w-full", className)} size="default">
        <SelectValue>{getModelLabel(normalizedValue)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AI_MODEL_ITEMS.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
