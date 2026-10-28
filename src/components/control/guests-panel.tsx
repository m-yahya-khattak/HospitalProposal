"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatAccessUntil, visitorExpired } from "@/lib/access";
import { createClient } from "@/lib/supabase/client";

type GuestRow = {
  id: string;
  label: string;
  login_email: string;
  can_scale_beds: boolean;
  expires_at: string;
  created_at: string;
};

type Created = {
  guest_id: string;
  login_email: string;
  password: string;
  expires_at: string;
};

const DAYS = [1, 3, 7, 14] as const;

function guestSetupMessage(message: string) {
  const missing =
    /schema cache|project_guests|create_project_guest|revoke_project_guest/i.test(
      message,
    );
  if (!missing) return message;
  return "Visitor logins need a one-time database setup. In Supabase → SQL Editor, paste and run supabase/migrations/004_project_guests.sql, then try again.";
}

export function GuestsPanel({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number>(7);
  const [canScaleBeds, setCanScaleBeds] = useState(true);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error: queryError } = await supabase
      .from("project_guests")
      .select("id, label, login_email, can_scale_beds, expires_at, created_at")
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(guestSetupMessage(queryError.message));
      return;
    }
    setRows((data ?? []) as GuestRow[]);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCreated(null);
    void load();
  }, [open, projectId]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);
    setCreated(null);
    const { data, error: rpcError } = await supabase.rpc("create_project_guest", {
      p_project_id: projectId,
      p_label: label.trim() || "Visitor",
      p_days: days,
      p_can_scale_beds: canScaleBeds,
    });
    setPending(false);
    if (rpcError) {
      setError(guestSetupMessage(rpcError.message));
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.login_email || !row?.password) {
      setError("Could not create visitor login");
      return;
    }
    setCreated(row as Created);
    setLabel("");
    void load();
  };

  const onRevoke = async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    if (!window.confirm("Revoke this visitor login now?")) return;
    const { error: rpcError } = await supabase.rpc("revoke_project_guest", {
      p_guest_id: id,
    });
    if (rpcError) {
      setError(guestSetupMessage(rpcError.message));
      return;
    }
    if (created?.guest_id === id) setCreated(null);
    void load();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="min-w-0">
            <SheetTitle>Visitor access</SheetTitle>
            <SheetDescription>
              Temporary login for this project only. They cannot save edits.
            </SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>
        <SheetBody className="space-y-6">
          <form className="grid gap-3" onSubmit={(event) => void onCreate(event)}>
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Reviewer"
              />
            </div>
            <div>
              <Label>Valid for</Label>
              <Select
                value={String(days)}
                onValueChange={(value) => {
                  if (value) setDays(Number(value));
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "day" : "days"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
              <Label htmlFor="guest-beds" className="font-normal">
                Can change bed count
              </Label>
              <Switch
                id="guest-beds"
                checked={canScaleBeds}
                onCheckedChange={(checked) => setCanScaleBeds(Boolean(checked))}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create login"}
            </Button>
          </form>

          {created ? (
            <div className="space-y-2 rounded-xl bg-teal-50 px-3 py-3 text-sm">
              <p className="font-medium text-teal-900">Give these once</p>
              <CopyRow label="Email" value={created.login_email} />
              <CopyRow label="Password" value={created.password} />
              <p className="text-xs text-muted-foreground">
                Until {formatAccessUntil(created.expires_at)}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium">Active</p>
            {rows.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No visitors yet.</p>
            ) : (
              <ul className="mt-2 divide-y rounded-xl ring-1 ring-stone-200">
                {rows.map((row) => {
                  const expired = visitorExpired(row.expires_at);
                  return (
                    <li
                      key={row.id}
                      className="flex min-w-0 items-start justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.label}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.login_email}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {expired ? "Expired" : `Until ${formatAccessUntil(row.expires_at)}`}
                          {row.can_scale_beds ? " · beds" : ""}
                        </p>
                      </div>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => void onRevoke(row.id)}
                      >
                        Revoke
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <p className="min-w-0 truncate font-mono text-xs">{value}</p>
      <Button
        size="xs"
        variant="outline"
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        Copy {label}
      </Button>
    </div>
  );
}
