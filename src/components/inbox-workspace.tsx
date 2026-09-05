import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Check,
  ChevronLeft,
  Clock,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { rewriteDraft } from "@/lib/ai";
import { bucketFor, bucketLabel, blocked, findVehicle, nextAction, STAGE_LABEL, vehicleLabel, windowLeftMs } from "@/lib/engine";
import { durationHuman, relativeTime } from "@/lib/format";
import { DEALER, TEAM, VOICES } from "@/lib/seed";
import { useApp } from "@/lib/store";
import type { Bucket, Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const BUCKET_ORDER: Bucket[] = [
  "reply_now",
  "book_now",
  "window_closing",
  "appointment_change",
  "follow_up",
  "waiting",
  "closed",
];

export function InboxWorkspace({ queueMode = false }: { queueMode?: boolean }) {
  const threads = useApp((s) => s.threads);
  const appointments = useApp((s) => s.appointments);
  const vehicles = useApp((s) => s.vehicles);
  const selectedId = useApp((s) => s.selectedThreadId);
  const selectThread = useApp((s) => s.selectThread);
  const currentRepId = useApp((s) => s.currentRepId);
  const grouped = useMemo(() => {
    const map = new Map<Bucket, Thread[]>();
    for (const b of BUCKET_ORDER) map.set(b, []);
    for (const t of threads) {
      const b = bucketFor(t, appointments);
      map.get(b)!.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
    }
    return map;
  }, [threads, appointments]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;
  const [mobilePane, setMobilePane] = useState<"list" | "thread">(selected ? "thread" : "list");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "TEXTAREA" || tag === "INPUT";
      const actionable = BUCKET_ORDER.flatMap((b) => grouped.get(b) ?? []).filter(
        (t) => bucketFor(t, appointments) !== "closed" && bucketFor(t, appointments) !== "waiting",
      );
      const list = actionable.length ? actionable : threads;
      const idx = list.findIndex((t) => t.id === selectedId);
      if (!typing && (e.key === "j" || e.key === "J")) {
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) selectThread(next.id);
      }
      if (!typing && (e.key === "k" || e.key === "K")) {
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) selectThread(prev.id);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (selected) useApp.getState().sendAndNext(selected.id);
      }
      if (!typing && (e.key === "1" || e.key === "2") && selected?.draft.slots.length) {
        const slot = selected.draft.slots[Number(e.key) - 1];
        if (slot) useApp.getState().bookSlot(selected.id, slot.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grouped, appointments, threads, selectedId, selectThread, selected]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 lg:h-[calc(100dvh-3.5rem)]">
      <section
        className={cn(
          "w-full shrink-0 overflow-y-auto border-r border-border lg:w-72",
          mobilePane === "thread" && "hidden lg:block",
        )}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
          <div className="text-xs tracking-wide text-muted-foreground uppercase">
            {queueMode ? "Action queue" : "Inbox"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">J / K next · ⌘↵ send</div>
        </div>
        {BUCKET_ORDER.map((b) => {
          const rows = grouped.get(b) ?? [];
          if (!rows.length) return null;
          return (
            <div key={b} className="px-2 py-2">
              <div className="px-2 pb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                {bucketLabel(b)}
                <span className="ml-2 tabular">{rows.length}</span>
              </div>
              {rows.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const active = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      selectThread(t.id);
                      setMobilePane("thread");
                    }}
                    className={cn(
                      "mb-0.5 w-full rounded-md px-2.5 py-2 text-left",
                      active ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.customerName}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular">
                        {relativeTime(t.lastActivityAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{t.hint}</p>
                    <p className="mt-0.5 truncate text-[12px] text-foreground/80">{last?.text}</p>
                    <p className="mt-1 truncate text-[11px] text-silver">{nextAction(t, b)}</p>
                  </button>
                );
              })}
            </div>
          );
        })}
      </section>

      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          mobilePane === "list" && "hidden lg:flex",
        )}
      >
        {selected ? (
          <ThreadPane
            thread={selected}
            onBack={() => setMobilePane("list")}
            currentRepId={currentRepId}
            vehicle={findVehicle(vehicles, selected.vehicleStock)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Pick a lead.
          </div>
        )}
      </section>
    </div>
  );
}

function ThreadPane({
  thread,
  onBack,
  currentRepId,
  vehicle,
}: {
  thread: Thread;
  onBack: () => void;
  currentRepId: string;
  vehicle: ReturnType<typeof findVehicle>;
}) {
  const setDraftText = useApp((s) => s.setDraftText);
  const sendAndNext = useApp((s) => s.sendAndNext);
  const bookSlot = useApp((s) => s.bookSlot);
  const setVoice = useApp((s) => s.setVoice);
  const takeover = useApp((s) => s.takeover);
  const applyGrokDraft = useApp((s) => s.applyGrokDraft);
  const startFollowup = useApp((s) => s.startFollowup);
  const logOffline = useApp((s) => s.logOffline);
  const markVehicle = useApp((s) => s.markVehicle);
  const endRef = useRef<HTMLDivElement>(null);
  const [rewriting, setRewriting] = useState(false);
  const left = windowLeftMs(thread);
  const isBlocked = blocked(thread.draft, thread);
  const owner = TEAM.find((r) => r.id === thread.assignedRepId);
  const lastCustomer = [...thread.messages].reverse().find((m) => m.who === "customer");
  const timePicked = lastCustomer && /10am|10:00|11:00|1:30|2:30|4:00|5:30|i'll be there|see you then/i.test(lastCustomer.text);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length, thread.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-w-0 min-h-0 flex-1 flex-col border-b border-border lg:border-r lg:border-b-0">
        <div className="flex items-start gap-2 border-b border-border px-3 py-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back">
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium">{thread.customerName}</h2>
              <Badge>{thread.channel}</Badge>
              <Badge variant="silver">{STAGE_LABEL[thread.stage]}</Badge>
              {thread.dnc && <Badge variant="danger">Do not contact</Badge>}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {thread.source} · {thread.city} · AI drafting · {owner?.name ?? "unassigned"} sends
            </p>
            <p className="mt-1 text-[12px] text-warn">{thread.hint}</p>
          </div>
          <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
            {thread.channel === "messenger" && left > 0 && (
              <div className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {durationHuman(left)} left to reply
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {thread.messages.map((m) => (
            <div
              key={m.id}
              className={cn("mb-3 flex", m.who === "customer" ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[min(100%,34rem)] rounded-lg px-3 py-2",
                  m.who === "customer" && "bg-secondary text-foreground",
                  m.who === "rep" && "bg-primary text-primary-foreground",
                  m.who === "system" && "border border-dashed border-border bg-transparent text-muted-foreground",
                  m.who === "ai" && "bg-accent text-foreground",
                )}
              >
                <div className="mb-1 flex gap-2 text-[10px] tracking-wide uppercase opacity-70">
                  <span>{m.sender}</span>
                  <span className="tabular">{relativeTime(m.at)}</span>
                </div>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {thread.ghostUntil && (
            <div className="mb-3 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
              {thread.customerName} has not responded.
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startFollowup(thread.id)}>
                  Start follow-up sequence
                </Button>
                <Button size="sm" variant="ghost" onClick={() => logOffline(thread.id, "call")}>
                  Log a call
                </Button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col overflow-y-auto lg:w-[380px]">
        <div className="border-b border-border px-4 py-3">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">One action</div>
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Goal · </span>
            {thread.goal}
          </p>
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Missing · </span>
            {thread.missing}
          </p>
        </div>

        {vehicle && (
          <button
            type="button"
            className="flex items-center justify-between border-b border-border px-4 py-3 text-left hover:bg-accent/40"
            onClick={() => {
              if (vehicle.status === "available") {
                markVehicle(vehicle.stock, "sold");
                toast(`${vehicle.stock} marked sold — claims will re-check.`);
              } else {
                markVehicle(vehicle.stock, "available");
                toast(`${vehicle.stock} restored.`);
              }
            }}
          >
            <div>
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Verified vehicle</div>
              <div className="mt-0.5 text-sm">{vehicleLabel(vehicle)}</div>
              <div className="text-[12px] text-muted-foreground">
                {vehicle.color} · {vehicle.drivetrain} · {vehicle.miles.toLocaleString()} mi · ${vehicle.price.toLocaleString()}
              </div>
            </div>
            <Badge variant={vehicle.status === "available" ? "ok" : vehicle.status === "sold" ? "danger" : "warn"}>
              {vehicle.status}
            </Badge>
          </button>
        )}

        <div className="border-b border-border px-4 py-3">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Known</div>
          <ul className="mt-2 space-y-1.5">
            {thread.facts.map((f) => (
              <li key={f.id} className="text-[13px]">
                <span className="text-muted-foreground">{f.key} · </span>
                {f.value}
                <span className="ml-1 text-[11px] text-muted-foreground">{f.certainty}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Draft</div>
            <select
              className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
              value={thread.voice}
              onChange={(e) => setVoice(thread.id, e.target.value as Thread["voice"])}
              aria-label="Reply style"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            value={thread.draft.text}
            onChange={(e) => setDraftText(thread.id, e.target.value)}
            disabled={thread.dnc}
            rows={7}
            className="min-h-32"
          />
          <div className="mt-2 space-y-1">
            {thread.draft.claims.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                {c.severity === "ok" && <Check className="mt-0.5 size-3.5 text-ok" />}
                {c.severity === "warn" && <TriangleAlert className="mt-0.5 size-3.5 text-warn" />}
                {c.severity === "block" && <Ban className="mt-0.5 size-3.5 text-destructive" />}
                <span className={c.severity === "block" ? "text-destructive" : "text-muted-foreground"}>{c.reason}</span>
              </div>
            ))}
          </div>

          {thread.draft.slots.length > 0 && !thread.dnc && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {thread.draft.slots.map((slot, i) => (
                <Button
                  key={slot.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    bookSlot(thread.id, slot.id);
                    toast(`Booked ${slot.label}`);
                  }}
                >
                  {i + 1} · {slot.label}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={isBlocked || !thread.draft.text}
              onClick={() => {
                sendAndNext(thread.id);
                toast(timePicked ? "Booked & next" : "Sent & next");
              }}
            >
              {timePicked ? "Book & next" : "Send & next"}
            </Button>
            <Button
              variant="outline"
              disabled={rewriting || thread.dnc}
              onClick={async () => {
                setRewriting(true);
                try {
                  const res = await rewriteDraft({
                    data: {
                      customer: thread.customerName,
                      goal: thread.goal,
                      missing: thread.missing,
                      facts: thread.facts.map((f) => `${f.key}: ${f.value}`).join("; "),
                      vehicle: vehicle
                        ? `${vehicleLabel(vehicle)}, ${vehicle.color}, ${vehicle.drivetrain}, ${vehicle.miles} mi, $${vehicle.price}, ${vehicle.status}, stock ${vehicle.stock}`
                        : "none",
                      hours: Object.entries(DEALER.hours)
                        .map(([d, h]) => `${d} ${h}`)
                        .join(", "),
                      voice: thread.voice,
                      lastMessages: thread.messages
                        .slice(-6)
                        .map((m) => `${m.who}: ${m.text}`)
                        .join("\n"),
                      prohibited: "payments, approvals, trade values, discounts, doc fees, Sunday hours, sold-unit availability",
                    },
                  });
                  if (res.ok) {
                    applyGrokDraft(thread.id, res.text);
                    toast("Grok rewrote the draft. Claims re-checked.");
                  } else {
                    toast(res.error);
                  }
                } finally {
                  setRewriting(false);
                }
              }}
            >
              <Sparkles className="size-4" />
              {rewriting ? "Rewriting" : "Rewrite with Grok"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => takeover(thread.id)}>
              {thread.takeover ? "Resume AI" : "Take over"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Producer: {thread.draft.producer} · you are {TEAM.find((r) => r.id === currentRepId)?.name}
          </p>
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
            <ShieldAlert className="size-3.5" />
            Conversation score
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl tabular">{thread.intel.score}</span>
            <span className="text-sm text-muted-foreground">
              show {Math.round(thread.intel.propensityToShow * 100)}% · {thread.intel.trend}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{thread.intel.coaching}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {thread.intel.trackers.map((tr) => (
              <Badge key={tr}>{tr.replace("_", " ")}</Badge>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
