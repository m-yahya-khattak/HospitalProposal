"use client";

import { NumberInput } from "@/components/control/number-input";
import { useMoney } from "@/components/currency-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BASE_CURRENCY, currencyName, formatFxAsOf } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencySwitcher() {
  const money = useMoney();
  const canPin = money.persist && money.currency !== BASE_CURRENCY;
  const dated = formatFxAsOf(money.asOf);
  const status = money.missing
    ? "USD"
    : money.source === "override"
      ? "manual"
      : money.source === "pinned"
        ? "pinned"
        : money.liveLoading
          ? "…"
          : "live";

  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
      >
        {money.currency}
        <span className="text-muted-foreground">{status}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <div>
          <p className="text-sm font-medium">Display currency</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Prices are stored in USD. This only changes how amounts are shown.
          </p>
        </div>
        <Select
          value={money.currency}
          onValueChange={(value) => {
            if (value) money.setCurrency(value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start" className="max-h-72">
            {money.currencies.map((code) => (
              <SelectItem key={code} value={code}>
                {code} · {currencyName(code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {money.quote}
          {dated ? ` · ${dated}` : ""}
          {money.liveError && money.source === "live" ? ` · ${money.liveError}` : ""}
        </p>
        {canPin ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-1">
              <Button
                size="xs"
                variant={money.source === "live" ? "default" : "outline"}
                onClick={money.useLive}
              >
                Live
              </Button>
              <Button
                size="xs"
                variant={money.source === "pinned" ? "default" : "outline"}
                onClick={money.pin}
                disabled={money.missing || money.liveLoading}
              >
                Pin this rate
              </Button>
            </div>
            <div>
              <Label htmlFor="fx-override" className="text-xs">
                Override (per 1 USD)
              </Label>
              <NumberInput
                className="mt-1"
                value={money.rate}
                min={0.0001}
                step={0.01}
                suffix={money.currency}
                onChange={money.setOverride}
              />
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
