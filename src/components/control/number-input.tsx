"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  suffix?: string;
};

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  suffix,
}: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
    setText(String(next));
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        step={step}
        className={cn(
          "font-mono tabular-nums",
          suffix && (suffix.length > 1 ? "pr-12" : "pr-8"),
        )}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
