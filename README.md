# LotBeacon G2

Sales engagement OS for car dealerships. Sequences, a Messenger inbox with a grounded copilot, appointment setting, and conversation intelligence — built for BDCs, sales reps, and GSMs.

This is a full remake of [LotBeacon](https://nathanplatteruser.github.io/lotbeacon) at Outreach / Gong depth.

## What’s in the workspace

- **Queue / Inbox** — action buckets (reply, book, window closing, appointment change). J/K next lead, ⌘↵ send & next, 1/2 book a slot. Every draft runs through a hallucination firewall.
- **Sequences** — Marketplace 5-touch, no-show rescue, be-back 72h, service-to-sales. Pause, complete, enroll.
- **Appointments** — setter board with show rate, no-shows, closer handoff.
- **Intel** — scored calls, talk ratio, trackers, transcripts, coaching (Gong for the floor).
- **Pipeline, inventory, team, analytics** — desk log, live lot feed, coaching scorecards, GSM gates.
- **Grok rewrite** — optional, user-initiated. Still blocked if it invents a payment or a Sunday hour.

Pilot store: **Zoellner Ford**, Beatrice, NE. Twenty seeded conversations, four desks (Alex / Jordan / Maya / Morgan).

## Run

This app is a TanStack Start + React 19 + Tailwind v4 workspace. Use the Grok preview or:

```bash
npm install
npm run dev
```

## Product rules that must not be simplified away

- Nothing autonomous. A human hits Send.
- Inventory is the only source of vehicle claims.
- Payments, approvals, trade values, discounts, doc fees, and Sunday hours are prohibited in-thread.
- Opt-out is forever.
- The 24-hour Messenger window is a real clock.

## Repo

`LotBeacon_G2` on GitHub under [nathanplatteruser](https://github.com/nathanplatteruser).
