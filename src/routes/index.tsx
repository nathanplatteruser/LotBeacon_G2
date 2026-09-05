import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Mark, Wordmark } from "@/components/mark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

const PROOF = [
  { k: "2.1×", v: "appointments per setter-hour" },
  { k: "11 min", v: "median first response" },
  { k: "0", v: "autonomous sends. Ever." },
  { k: "24h", v: "Messenger window, enforced" },
];

const PILLARS = [
  {
    k: "01",
    t: "Inbox that books",
    d: "Marketplace, SMS, email, and lot calls in one queue. Every row is an action: reply, book, rescue, or close the window. J / K to the next lead. Send & next.",
  },
  {
    k: "02",
    t: "Sequences for setters",
    d: "BDC cadences that look like Outreach and speak like a desk: Marketplace 5-touch, no-show rescue, be-back 72h, service-to-sales. Never automatic past opt-out or the 24-hour window.",
  },
  {
    k: "03",
    t: "Intel on every conversation",
    d: "Gong, for the floor. Talk ratio, trackers, show-propensity, coaching clips. Price objections, Omaha matches, angry be-backs — scored, not buried in a DMS note.",
  },
  {
    k: "04",
    t: "Grounded in the lot",
    d: "Drafts may only quote live inventory. Sold units stay sold. Payments, approvals, trade values, and Sunday hours never leave the building. A hallucination firewall sits in front of Send.",
  },
];

const PERSONAS = [
  {
    t: "BDC / BDM",
    d: "Set more appointments without writing the same six texts. Two verified slots. Show-rate you can defend in the Monday meeting.",
  },
  {
    t: "Sales consultant",
    d: "Own the relationship. The copilot remembers the Accord trade, the AWD question, the Saturday. You send. Nothing autonomous.",
  },
  {
    t: "GSM / owner",
    d: "Capacity per rep-hour, responsible-AI scorecard, and the clips you actually coach from. Pilot gates, not vanity dashboards.",
  },
];

const TIERS = [
  {
    name: "Solo",
    price: "$549",
    note: "One setter or closer",
    items: ["Inbox + copilot", "Inventory firewall", "Appointments", "Personal scorecard"],
  },
  {
    name: "Three Amigos",
    price: "$1,347",
    note: "Setter, closer, manager",
    items: ["Everything in Solo", "Sequences", "Handoffs", "Call intel", "Team coaching"],
  },
  {
    name: "Umbrella",
    price: "$2,990",
    note: "Rooftop",
    items: ["Multi-store", "GSM analytics", "Audit export", "Pilot gates", "Founding-dealer onboarding"],
  },
];

function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Wordmark />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#product" className="hover:text-foreground">
              Product
            </a>
            <a href="#personas" className="hover:text-foreground">
              Floor
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
          </nav>
          <Button asChild size="sm">
            <Link to="/app">
              Open workspace
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 md:pt-24">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">For rooftops, not SDR teams</p>
        <h1 className="font-display mt-4 max-w-3xl text-4xl leading-[1.1] tracking-tight md:text-6xl">
          Book more appointments. Coach every conversation.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          LotBeacon is the sales engagement OS for dealerships — Outreach-grade sequences and a Gong-grade
          conversation graph, grounded in live inventory and a human on Send.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/app">
              Enter the Zoellner floor
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/app/intel">Watch a scored call</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {PROOF.map((p, i) => (
            <div key={p.k} className={i < 3 ? "border-r border-border px-4 py-6 md:px-6" : "px-4 py-6 md:px-6"}>
              <div className="font-display text-3xl tabular md:text-4xl">{p.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">The desk, rewritten</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl md:text-4xl">
          What Outreach built for software, LotBeacon built for the lot.
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          {PILLARS.map((p) => (
            <article key={p.k}>
              <div className="text-xs tabular text-muted-foreground">{p.k}</div>
              <h3 className="mt-2 text-xl font-medium">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <div className="border-b border-border px-4 py-12 md:border-r md:border-b-0 md:px-8 md:py-16">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Live queue</p>
            <h3 className="font-display mt-3 text-2xl">Sarah is at the top.</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Black 2024 Tahoe Premier. 2018 Accord to trade. Saturday, tentative. The draft already offers 10:00
              or 11:30 — store hours, no double-book. Send & next. She answers. Book.
            </p>
            <PreviewQueue />
          </div>
          <div className="px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Call intel</p>
            <h3 className="font-display mt-3 text-2xl">Mike talked price six times.</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Talk ratio 71%. No next step. Coaching: stop lecturing the spec sheet, stop discounting in the thread,
              put Morgan on a Thursday 4:30.
            </p>
            <PreviewIntel />
          </div>
        </div>
      </section>

      <section id="personas" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl">Three desks. One system of record.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <article key={p.t} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-medium">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl">Priced like a closer, not a seat tax.</h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Founding-dealer beta is half for 90 days. Every package is modeled at ≥4× on a pessimistic rooftop.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TIERS.map((t, i) => (
              <article
                key={t.name}
                className={cnCard(i === 1)}
              >
                <div className="text-sm text-muted-foreground">{t.name}</div>
                <div className="font-display mt-2 text-4xl tabular">
                  {t.price}
                  <span className="text-base text-muted-foreground">/mo</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{t.note}</div>
                <ul className="mt-6 space-y-2">
                  {t.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 text-silver" />
                      {it}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mark className="size-4" />
            LotBeacon · Zoellner Ford pilot · Beatrice, NE
          </div>
          <Button asChild variant="outline">
            <Link to="/app">Open the live workspace</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}

function cnCard(featured: boolean) {
  return featured
    ? "rounded-xl border border-silver/40 bg-card p-5"
    : "rounded-xl border border-border bg-card p-5";
}

function PreviewQueue() {
  const rows = [
    ["Sarah Miller", "Reply now", "Trade Accord · Saturday"],
    ["Harold Finch", "Book now", "Checkbook. Keys pulled."],
    ["Karen Doyle", "Appt change", "Cancelled Saturday 10"],
    ["Mike Torres", "Reply now", "Price grinder · manager"],
  ];
  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-border">
      {rows.map((r, i) => (
        <div key={r[0]} className={i ? "flex items-center justify-between border-t border-border px-3 py-3" : "flex items-center justify-between px-3 py-3"}>
          <div>
            <div className="text-sm">{r[0]}</div>
            <div className="text-[12px] text-muted-foreground">{r[2]}</div>
          </div>
          <div className="text-[11px] tracking-wide text-silver uppercase">{r[1]}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewIntel() {
  return (
    <div className="mt-8 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl tabular">54</span>
        <span className="text-sm text-muted-foreground">talk 71% · 3 questions · no next step</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-[54%] bg-silver" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        “Listed isn't what I asked. What's the best you can do today?”
      </p>
    </div>
  );
}
