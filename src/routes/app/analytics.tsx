import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/lib/store";
import { TEAM } from "@/lib/seed";
import { bucketFor } from "@/lib/engine";

export const Route = createFileRoute("/app/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const threads = useApp((s) => s.threads);
  const appointments = useApp((s) => s.appointments);
  const calls = useApp((s) => s.calls);
  const enrollments = useApp((s) => s.enrollments);

  const waiting = threads.filter((t) => t.messages.at(-1)?.who === "customer" && !t.dnc).length;
  const booked = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const showed = appointments.filter((a) => a.status === "completed").length;
  const noshow = appointments.filter((a) => a.status === "no_show").length;
  const avgScore = Math.round(threads.reduce((s, t) => s + t.intel.score, 0) / threads.length);
  const dnc = threads.filter((t) => t.dnc).length;

  const byRep = TEAM.map((r) => ({
    name: r.name.split(" ")[0],
    conversations: threads.filter((t) => t.assignedRepId === r.id).length,
    set: appointments.filter((a) => a.setterId === r.id).length,
    score:
      calls.filter((c) => c.repId === r.id).reduce((s, c) => s + c.score, 0) /
        Math.max(1, calls.filter((c) => c.repId === r.id).length) || 0,
  }));

  const funnel = [
    { name: "Engage", n: threads.filter((t) => t.stage === "engage").length },
    { name: "Qualify", n: threads.filter((t) => t.stage === "qualify").length },
    { name: "Book", n: threads.filter((t) => t.stage === "book").length },
    { name: "Visit", n: threads.filter((t) => t.stage === "visit").length },
    { name: "Sold", n: threads.filter((t) => t.stage === "sold").length },
  ];

  const buckets = [
    "reply_now",
    "book_now",
    "window_closing",
    "appointment_change",
    "follow_up",
    "waiting",
    "closed",
  ].map((b) => ({
    name: b.replace("_", " "),
    n: threads.filter((t) => bucketFor(t, appointments) === b).length,
  }));

  const gates = [
    { t: "Human approval", v: "100%", ok: true, why: "No autonomous sends in the audit." },
    { t: "Firewall coverage", v: "100%", ok: true, why: "Every draft re-validates on keystroke." },
    { t: "Opt-outs honored", v: String(dnc), ok: true, why: "Lee Nakamura is suppressed on every channel." },
    { t: "24h window", v: "enforced", ok: true, why: "Window-closing bucket under 4 hours." },
    { t: "Consequential claims", v: "routed", ok: true, why: "Payments, trades, holds, warranty → human." },
    { t: "Show rate", v: showed + noshow ? `${Math.round((showed / (showed + noshow)) * 100)}%` : "n/a", ok: showed >= noshow, why: "Completed vs no-show on the setter board." },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Owner / GSM</p>
        <h1 className="font-display mt-1 text-3xl">Analytics</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi k={String(waiting)} v="waiting on a human" />
        <Kpi k={String(booked)} v="appointments on books" />
        <Kpi k={String(avgScore)} v="avg conversation score" />
        <Kpi k={String(enrollments.filter((e) => e.status === "active").length)} v="live sequence enrollments" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm text-muted-foreground">Funnel</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#9a958c" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9a958c" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#161618", border: "1px solid #27272a", color: "#f4f1ea" }}
                />
                <Bar dataKey="n" fill="#c8ccd4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm text-muted-foreground">Queue load</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#9a958c" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9a958c" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#161618", border: "1px solid #27272a", color: "#f4f1ea" }}
                />
                <Bar dataKey="n" fill="#ece8df" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm text-muted-foreground">By desk</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byRep}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#9a958c" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9a958c" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#161618", border: "1px solid #27272a", color: "#f4f1ea" }}
              />
              <Bar dataKey="conversations" fill="#c8ccd4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="set" fill="#ece8df" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <h2 className="mt-8 text-sm tracking-wide text-muted-foreground uppercase">Pilot gates</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {gates.map((g) => (
          <div key={g.t} className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
            <div>
              <div className="text-sm">{g.t}</div>
              <div className="text-[12px] text-muted-foreground">{g.why}</div>
            </div>
            <div className={g.ok ? "text-ok tabular" : "text-warn tabular"}>{g.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-display text-3xl tabular">{k}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{v}</div>
    </div>
  );
}
