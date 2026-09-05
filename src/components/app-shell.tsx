import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  Inbox,
  LayoutGrid,
  LineChart,
  Menu,
  MessageSquare,
  Radio,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DEALER } from "@/lib/seed";
import { TEAM, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const NAV = [
  { to: "/app", label: "Queue", icon: LayoutGrid, end: true },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/sequences", label: "Sequences", icon: Radio },
  { to: "/app/appointments", label: "Appointments", icon: Calendar },
  { to: "/app/intel", label: "Intel", icon: Sparkles },
  { to: "/app/pipeline", label: "Pipeline", icon: Activity },
  { to: "/app/inventory", label: "Inventory", icon: Warehouse },
  { to: "/app/team", label: "Team", icon: Users },
  { to: "/app/analytics", label: "Analytics", icon: LineChart },
];

const MOBILE = [
  { to: "/app", label: "Queue", icon: LayoutGrid },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/appointments", label: "Appts", icon: Calendar },
  { to: "/app/intel", label: "Intel", icon: Sparkles },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentRepId = useApp((s) => s.currentRepId);
  const setRep = useApp((s) => s.setRep);
  const resetDemo = useApp((s) => s.resetDemo);
  const threads = useApp((s) => s.threads);
  const [open, setOpen] = useState(false);
  const rep = TEAM.find((r) => r.id === currentRepId) ?? TEAM[0];
  const waiting = threads.filter((t) => {
    const last = t.messages[t.messages.length - 1];
    return last?.who === "customer" && !t.dnc;
  }).length;

  const NavLinks = ({ onGo }: { onGo?: () => void }) => (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onGo}
            className={cn(
              "flex h-10 items-center gap-3 rounded-sm px-3 text-sm",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
            {item.to === "/app/inbox" && waiting > 0 && (
              <span className="ml-auto tabular text-[11px] text-silver">{waiting}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Mark className="size-5" />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-none">LotBeacon</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">{DEALER.name}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-border p-3">
          <p className="px-2 pb-2 text-[10px] tracking-wide text-muted-foreground uppercase">You are</p>
          <RolePicker />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border px-3 lg:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </Button>
          <Link to="/" className="lg:hidden">
            <Mark className="size-5" />
          </Link>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm text-muted-foreground">
              {rep.title} · {DEALER.address.split(",")[1]?.trim()} · no autonomous sends
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto hidden sm:inline-flex"
            onClick={() => {
              resetDemo();
              toast("Demo reset to the Zoellner floor.");
            }}
          >
            Reset demo
          </Button>
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-medium">
            {initials(rep.name)}
          </div>
        </header>
        <main className="min-h-0 flex-1 pb-16 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card lg:hidden">
        {MOBILE.map((item) => {
          const active = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[10px]",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 py-2 text-[10px] text-muted-foreground"
        >
          <MessageSquare className="size-4" />
          More
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col p-4">
          <div className="mb-4 flex items-center gap-2">
            <Mark className="size-5" />
            <span className="font-medium">LotBeacon</span>
          </div>
          <NavLinks onGo={() => setOpen(false)} />
          <div className="mt-auto space-y-3 pt-6">
            <RolePicker />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetDemo();
                setOpen(false);
                toast("Demo reset.");
              }}
            >
              Reset demo
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  function RolePicker() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[10px]">
              {initials(rep.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm">{rep.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{rep.title}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Switch desk</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TEAM.map((r) => (
            <DropdownMenuItem key={r.id} onSelect={() => setRep(r.id)}>
              {r.name}
              <span className="ml-auto text-[11px] text-muted-foreground">{r.role.replace("_", " ")}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
