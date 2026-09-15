import type { Fact, Thread } from "./types";

const RANK: Record<Fact["certainty"], number> = {
  asked: 0,
  tentative: 1,
  preferred: 2,
  required: 3,
  confirmed: 4,
};

function clip(text: string, re: RegExp) {
  const m = text.match(re);
  return (m?.[0] ?? text).replace(/\s+/g, " ").trim().slice(0, 90);
}

function fact(key: string, value: string, certainty: Fact["certainty"], evidence: string): Fact {
  return { id: `hf_${key}`, key, value, certainty, evidence };
}

export function harvestFacts(text: string): Fact[] {
  const t = text.trim();
  if (!t) return [];
  const out: Fact[] = [];
  const add = (key: string, value: string, certainty: Fact["certainty"], re: RegExp) => {
    out.push(fact(key, value, certainty, clip(t, re)));
  };

  if (/my wife|wife coming|bring my wife|in front of my wife/i.test(t)) {
    add("spouse", "wife involved", "confirmed", /(?:my |in front of my )?wife[^.]{0,40}/i);
  } else if (/my husband|husband coming|bring my husband/i.test(t)) {
    add("spouse", "husband involved", "confirmed", /(?:my )?husband[^.]{0,40}/i);
  } else if (/\b(spouse|partner)\b/i.test(t)) {
    add("spouse", "spouse involved", "confirmed", /\b(spouse|partner)\b[^.]{0,40}/i);
  }

  if (/booster|car ?seat/i.test(t)) {
    add("kids", "needs booster / car seat", "confirmed", /(?:booster|car ?seat)[^.]{0,40}/i);
  } else if (/\bmy kids\b|\bkids\b/i.test(t) && /insulted|family|children/i.test(t)) {
    add("kids", "has kids", "confirmed", /kids/i);
  }

  if (/drive in snow|i drive in snow|for snow/i.test(t)) {
    add("use_case", "drives in snow", "confirmed", /(?:drive in snow|for snow|i drive in snow)/i);
  }
  if (/\b4wd right\b|need (4wd|awd)|four.?wheel/i.test(t)) {
    add("drivetrain", "needs 4WD", "confirmed", /4wd|awd|four.?wheel/i);
  }

  if (/park the trade|bringing a trade|bring the (accord|trade)|my (accord|trade)/i.test(t)) {
    const unit = t.match(/\baccord\b/i) ? "Accord" : "has a trade";
    add("trade", unit, "confirmed", /(?:park the trade|bringing a trade|bring the \w+|my accord)/i);
  }

  if (/talk numbers on the lot|don'?t quote me a (payment|number)/i.test(t)) {
    add("process", "numbers on the lot, not in chat", "confirmed", /(?:talk numbers on the lot|don'?t quote me a \w+)/i);
  }

  if (/don'?t send anyone else|don'?t (call|text) me|nobody else to call/i.test(t)) {
    add("contact", "this number only, no extra callers", "confirmed", /don'?t send anyone else|don'?t (call|text) me/i);
  }

  if (/i'?ll come|i'?ll be there|see you then/i.test(t)) {
    add("visit", "committed to show", "confirmed", /i'?ll come|i'?ll be there/i);
  }

  if (/thursday 4:30 still works|4:30 still works|saturday 10:00|10:00 still/i.test(t)) {
    add("timing", clip(t, /(?:thursday|saturday|friday)?\s*\d{1,2}:\d{2}(?:\s*(?:am|pm))?/i) || "named time", "confirmed", /\d{1,2}:\d{2}|thursday|saturday/i);
  } else if (/morning is better|prefer morning|better than afternoon/i.test(t)) {
    add("timing", "prefers morning", "confirmed", /morning.{0,24}afternoon|prefer morning/i);
  } else if (/afternoon is better|prefer afternoon|better than morning|2ish/i.test(t)) {
    add("timing", "prefers afternoon", "confirmed", /afternoon|2ish|prefer afternoon/i);
  }

  return out;
}

export function mergeFacts(existing: Fact[], harvested: Fact[]): Fact[] {
  if (!harvested.length) return existing;
  const next = existing.map((f) => ({ ...f }));
  for (const h of harvested) {
    const i = next.findIndex((f) => f.key === h.key);
    if (i < 0) {
      next.push({ ...h, id: `f_${h.key}_${next.length + 1}` });
      continue;
    }
    const cur = next[i]!;
    if (RANK[h.certainty] >= RANK[cur.certainty]) {
      next[i] = {
        ...cur,
        value: h.value,
        certainty: h.certainty,
        evidence: h.evidence || cur.evidence,
      };
    }
  }
  return next.slice(0, 10);
}

export function factValue(thread: Thread, key: string) {
  return thread.facts.find((f) => f.key === key)?.value ?? "";
}
