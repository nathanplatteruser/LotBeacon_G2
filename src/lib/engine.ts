import type {
  Appointment,
  Bucket,
  Claim,
  Draft,
  Slot,
  Thread,
  Vehicle,
  VoiceId,
} from "./types";

export const WINDOW_MS = 24 * 60 * 60 * 1000;

export function vehicleLabel(v: Vehicle) {
  return `${v.year} ${v.make} ${v.model} ${v.trim}`;
}

export function findVehicle(vehicles: Vehicle[], stock: string | null) {
  if (!stock) return null;
  return vehicles.find((v) => v.stock === stock) ?? null;
}

function nextSaturday(hour: number, minute = 0) {
  const d = new Date();
  const day = d.getDay();
  const add = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function proposeSlots(thread: Thread): Slot[] {
  const t = thread.customerName;
  if (thread.id === "t_harold") {
    const at = new Date(Date.now() + 50 * 60_000);
    return [{ id: "s1", at: at.toISOString(), label: at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }];
  }
  if (thread.id === "t_frankie") {
    const d = new Date();
    d.setHours(16, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return [{ id: "s1", at: d.toISOString(), label: "Today 4:00 PM" }];
  }
  if (thread.id === "t_marcus") {
    const d = new Date();
    const add = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    d.setHours(17, 30, 0, 0);
    return [
      { id: "s1", at: d.toISOString(), label: "Friday 5:30 PM" },
      { id: "s2", at: nextSaturday(10).toISOString(), label: "Saturday 10:00 AM" },
    ];
  }
  if (thread.id === "t_karen") {
    return [
      { id: "s1", at: nextSaturday(10).toISOString(), label: "Next Saturday 10:00 AM" },
      { id: "s2", at: (() => { const d = new Date(); const add = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add); d.setHours(16, 30, 0, 0); return d.toISOString(); })(), label: "Friday 4:30 PM" },
    ];
  }
  if (thread.id === "t_tyler") {
    return [
      { id: "s1", at: nextSaturday(13, 30).toISOString(), label: "Saturday 1:30 PM" },
      { id: "s2", at: nextSaturday(14, 30).toISOString(), label: "Saturday 2:30 PM" },
    ];
  }
  if (thread.id === "t_rachel") {
    return [
      { id: "s1", at: nextSaturday(11).toISOString(), label: "Saturday 11:00 AM" },
      { id: "s2", at: nextSaturday(13).toISOString(), label: "Saturday 1:00 PM" },
    ];
  }
  void t;
  return [
    { id: "s1", at: nextSaturday(10).toISOString(), label: "Saturday 10:00 AM" },
    { id: "s2", at: nextSaturday(11, 30).toISOString(), label: "Saturday 11:30 AM" },
  ];
}

const BLOCK_RES = [
  { re: /\$\s?\d{2,3}\s?\/?\s?month|per month|\/mo\b/i, reason: "Payment quotes are F&I only." },
  { re: /you'?re approved|pre-?approved|you qualify/i, reason: "Credit decisions are prohibited in-thread." },
  { re: /worth about|trade(?:-?in)? (?:value|offer|is)|\$\d{1,2},?\d{3} for (?:your|the) /i, reason: "Trade values are appraisal-only." },
  { re: /knock \$?\d|\$\d{3,},?\d{0,3} off|best price is|i can do \$\d/i, reason: "Discounts go through the desk. Never in Messenger." },
  { re: /out the door|out-the-door|otd (?:is|price)|doc fee is \$\d/i, reason: "OTD and doc fees are itemized by the store, not invented here." },
  { re: /please stop|we'?ll keep texting|ignore the opt/i, reason: "Opt-out language is never overridden." },
];

export function validateClaims(text: string, thread: Thread, vehicle: Vehicle | null): Claim[] {
  const claims: Claim[] = [];
  if (thread.dnc) {
    claims.push({ text: "Send", severity: "block", reason: "Customer opted out. All channels suppressed." });
    return claims;
  }
  for (const rule of BLOCK_RES) {
    const m = text.match(rule.re);
    if (m) claims.push({ text: m[0], severity: "block", reason: rule.reason });
  }
  if (/you'?re (all )?set for|booked for|confirmed for/i.test(text) && !thread.appointmentId) {
    const stillProposed = !/10:00|11:30|1:30|2:30|4:00|5:30|Saturday|Friday/.test(text);
    if (stillProposed) {
      claims.push({ text: "appointment confirmation", severity: "block", reason: "Don't confirm an appointment until a slot is booked." });
    }
  }
  if (vehicle) {
    if (vehicle.status === "sold" && /still (here|available)|on the lot|we have it/i.test(text)) {
      claims.push({ text: "availability", severity: "block", reason: `${vehicle.stock} is sold. Do not claim it is here.` });
    }
    if (vehicle.status === "pending" && /still available|on the lot/i.test(text)) {
      claims.push({ text: "availability", severity: "warn", reason: "Unit is pending. Say 'let me verify' rather than available." });
    }
    const priceMention = text.match(/\$\s?([0-9,]{4,})/);
    if (priceMention) {
      const n = Number(priceMention[1].replace(/,/g, ""));
      if (n !== vehicle.price && n > 1000) {
        claims.push({ text: priceMention[0], severity: "block", reason: `List price is $${vehicle.price.toLocaleString()}. Don't invent another number.` });
      }
    }
    if (/\bAWD\b/.test(text) && vehicle.drivetrain !== "AWD") {
      claims.push({ text: "AWD", severity: "warn", reason: `This unit is ${vehicle.drivetrain}, not AWD. Clarify once.` });
    }
  }
  if (/sunday/i.test(text)) {
    claims.push({ text: "Sunday", severity: "block", reason: "Sales floor is closed Sunday." });
  }
  if (claims.length === 0) {
    claims.push({ text: "Grounded", severity: "ok", reason: "No prohibited or unverifiable claims." });
  }
  return claims;
}

function stripLlmTells(text: string): string {
  let s = text.replace(/\u2014/g, ". ").replace(/\u2013/g, "-");
  const openers = [
    /^I heard you\.?\s*/i,
    /^I hear you\.?\s*/i,
    /^I heard [^.\n]{0,120}\.\s*/i,
    /^You(?:'re| are) not wrong\.?\s*/i,
    /^I agree(?: with you)?[^.]*\.\s*/i,
    /^That(?:'s| is) a great question\.?\s*/i,
    /^Absolutely[.,!]?\s*/i,
    /^Of course[.,!]?\s*/i,
    /^That makes sense\.?\s*/i,
    /^I understand(?: your \w+)?\.?\s*/i,
    /^Happy to help[^.]*\.\s*/i,
    /^Thanks for sharing\.?\s*/i,
  ];
  for (const re of openers) s = s.replace(re, "");
  return s.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}

function voiceWrap(base: string, voice: VoiceId, thread: Thread): string {
  const v = voice === "auto" ? thread.voice : voice;
  if (v === "zee") {
    return base.replace(/Saturday/g, "sat").replace(/I've got/g, "got").replace(/Which works\?/g, "which one works?");
  }
  if (v === "frank") {
    return base.replace(/I've got two times[^.]*\./, "Two times:").replace(/Which works\?/, "Which one?");
  }
  if (v === "jon") {
    return `${base.replace(/Which works\?/, "Would either of those suit you folks?")}`;
  }
  if (v === "celeste") {
    return base.replace(/Which works\?/, "Whichever is easier. I will hold it.");
  }
  return base;
}

export function generateDraft(thread: Thread, vehicles: Vehicle[], voice: VoiceId = thread.voice): Draft {
  const vehicle = findVehicle(vehicles, thread.vehicleStock);
  const slots = proposeSlots(thread);
  const slotLine =
    slots.length === 2
      ? `I've got ${slots[0].label} or ${slots[1].label}. Which works?`
      : slots.length === 1
        ? `I can take you at ${slots[0].label}.`
        : "";

  let text = "";
  if (thread.dnc) {
    text = "";
  } else if (thread.id === "t_sarah" && vehicle) {
    text = `The black ${vehicleLabel(vehicle)} is here, ${vehicle.drivetrain}, ${vehicle.miles.toLocaleString()} miles, stock ${vehicle.stock}. ${slotLine} Bring the Accord if you want an appraisal while you're here.`;
  } else if (thread.id === "t_mike" && vehicle) {
    text = `The ${vehicle.color} ${vehicleLabel(vehicle)} is on the lot at $${vehicle.price.toLocaleString()}. I don't discount in Messenger. That's Morgan's desk. I can put you with him Thursday 4:30 or 5:30. Which one gets you here?`;
  } else if (thread.id === "t_jen" && vehicle) {
    text = `Yes. A ${vehicleLabel(vehicle)} in ${vehicle.color}, ${vehicle.drivetrain}, ${vehicle.miles.toLocaleString()} miles, listed at $${vehicle.price.toLocaleString()}. Under your $40k cap. ${slotLine}`;
  } else if (thread.id === "t_dan") {
    text = `I won't quote a payment in Messenger. That's a finance conversation and I don't want to guess your structure. I can have F&I do a 20-minute pre-qual so you don't waste a trip. ${slotLine}`;
  } else if (thread.id === "t_pat") {
    text = `The 2021 RST is sold. I won't pretend otherwise. The 2024 Tahoe LT in Summit White is here, 4WD, 12,980 miles, stock T2402. Want me to walk you through it Saturday?`;
  } else if (thread.id === "t_tyler" && vehicle) {
    text = `yep the yukon slt is here, ${vehicle.drivetrain}, ${vehicle.miles.toLocaleString()} miles. ${slotLine}`;
  } else if (thread.id === "t_karen") {
    text = `No stress on the cancel. We're closed Sunday, so I can do next Saturday 10:00 or Friday 4:30. Which is kinder to the game schedule?`;
  } else if (thread.id === "t_harold" && vehicle) {
    text = `Yes. Gray Telluride SX is on the lot. Keys pulled. Park on the north row, I'll meet you there.`;
  } else if (thread.id === "t_priya" && vehicle) {
    text = `The Palisade SEL lists at $${vehicle.price.toLocaleString()}. I won't invent a doc fee or match Omaha in writing. Morgan is sending the itemized sheet. If that lands by Friday, ${slotLine}`;
  } else if (thread.id === "t_craig") {
    text = `I'm not going to yes-or-no a $3k cut over text. Morgan will talk numbers in person. Saturday I can do 10:00 or 11:30. No games, just the desk.`;
  } else if (thread.id === "t_denise" && vehicle) {
    text = `Glad you're back. The Explorer XLT is still here. ${slotLine} I'll send a same-morning ping so it doesn't get lost in the week.`;
  } else if (thread.id === "t_marcus" && vehicle) {
    text = `I can't silently hold the ${vehicleLabel(vehicle)} until payday. That's how last week's mess started. Refundable deposit, or first-come, and I'll see you Friday 5:30 when you get paid.`;
  } else if (thread.id === "t_linda" && vehicle) {
    text = `Switching to the ${vehicleLabel(vehicle)}. Not mixing in the Yukon. Tow rating is on the window sticker; I won't guess a number here. ${slotLine} I'll have two seats at the desk for you and your husband.`;
  } else if (thread.id === "t_omar" && vehicle) {
    text = `The ${vehicleLabel(vehicle)} is here. Delivery to Omaha is a manager call, not a promise I can make in chat. If that's a no, Saturday you drive down. Clean title, I'll have it pulled.`;
  } else if (thread.id === "t_rachel" && vehicle) {
    text = `The ${vehicleLabel(vehicle)} is on the lot. Alpine White, stock ${vehicle.stock}. I'll greet you myself. Saturday 11:00, and I'll text a photo of it on the ground this afternoon.`;
  } else if (thread.id === "t_frankie" && vehicle) {
    text = `Yes. Ram Big Horn is on the lot. Keys at 4.`;
  } else if (thread.id === "t_skyler" && vehicle) {
    text = `The ${vehicleLabel(vehicle)} is here. I won't guess remaining factory warranty months in chat. We'll pull the window sticker together. ${slotLine}`;
  } else if (thread.id === "t_gene" && vehicle) {
    text = `You bet, the Accord Sport is still around. ${slotLine} No rush. I'll have a second coffee for whoever rides along.`;
  } else if (thread.id === "t_victor") {
    text = `Glad you landed something. Thanks for saying so. If your brother-in-law wants a truck, send him my way. I'll treat him like I treated you.`;
  } else if (vehicle) {
    text = `${vehicleLabel(vehicle)} is ${vehicle.status === "available" ? "on the lot" : vehicle.status}. ${slotLine}`;
  } else {
    text = `Thanks for the note. Want me to pull two times that work this week?`;
  }

  const usedVoice = voice === "auto" ? thread.voice : voice;
  text = stripLlmTells(voiceWrap(text, usedVoice, thread));
  const claims = validateClaims(text, thread, vehicle);
  return { text, voice: usedVoice, claims, slots, producer: "rules" };
}

export function windowLeftMs(thread: Thread, now = Date.now()) {
  const start = new Date(thread.lastInboundAt).getTime();
  return WINDOW_MS - (now - start);
}

export function bucketFor(thread: Thread, appointments: Appointment[], now = Date.now()): Bucket {
  if (thread.dnc || thread.stage === "sold" || thread.stage === "lost") return "closed";
  const appt = appointments.find((a) => a.id === thread.appointmentId);
  if (appt?.status === "cancelled") return "appointment_change";
  const last = thread.messages[thread.messages.length - 1];
  const waitingOnUs = last?.who === "customer";
  const left = windowLeftMs(thread, now);
  if (thread.ghostUntil && new Date(thread.ghostUntil).getTime() > now) return "follow_up";
  if (waitingOnUs && left < 4 * 60 * 60 * 1000 && left > 0) return "window_closing";
  if (waitingOnUs && last && /10am|10:00|11:00|4:00|5:30|i'll be there|see you|book/i.test(last.text) && thread.stage !== "visit") {
    return "book_now";
  }
  if (waitingOnUs) return "reply_now";
  if (thread.stage === "visit" || appt?.status === "confirmed") return "waiting";
  return "waiting";
}

export function bucketLabel(b: Bucket) {
  switch (b) {
    case "reply_now": return "Reply now";
    case "book_now": return "Time selected. Book now";
    case "window_closing": return "Window closing";
    case "appointment_change": return "Appointment changes";
    case "follow_up": return "Follow-up due";
    case "waiting": return "Waiting";
    case "closed": return "Closed";
  }
}

export function nextAction(thread: Thread, b: Bucket) {
  if (b === "book_now") return "Book the selected time and send confirmation.";
  if (b === "appointment_change") return "Offer two new verified slots. Sunday is closed.";
  if (b === "window_closing") return "Reply before the 24h Messenger window dies.";
  if (b === "follow_up") return "They've gone quiet. Sequence or log an offline touch.";
  if (b === "closed") return thread.dnc ? "Suppressed. Do not contact." : "No action.";
  if (b === "waiting") return "Customer has the ball.";
  return thread.intel.coaching.split(".")[0] + ".";
}

export function blocked(draft: Draft, thread: Thread) {
  if (thread.dnc) return true;
  return draft.claims.some((c) => c.severity === "block");
}

export const STAGE_LABEL: Record<Thread["stage"], string> = {
  engage: "Engage",
  qualify: "Qualify",
  book: "Book",
  visit: "Visit",
  sold: "Sold",
  lost: "Lost",
};
