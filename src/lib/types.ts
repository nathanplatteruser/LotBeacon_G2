export type Channel = "messenger" | "sms" | "email" | "phone" | "lot";
export type Role = "sales" | "bdc" | "bdc_manager" | "gsm";
export type Stage = "engage" | "qualify" | "book" | "visit" | "sold" | "lost";
export type Bucket =
  | "reply_now"
  | "book_now"
  | "window_closing"
  | "appointment_change"
  | "follow_up"
  | "waiting"
  | "closed";
export type VehicleStatus = "available" | "pending" | "sold" | "hold";
export type ClaimSeverity = "ok" | "warn" | "block";
export type ApptStatus = "proposed" | "confirmed" | "completed" | "no_show" | "cancelled";
export type SequenceStatus = "active" | "paused" | "finished" | "replied";

export type VoiceId = "auto" | "frank" | "celeste" | "jon" | "dogg" | "zee";

export interface Rep {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
}

export interface Vehicle {
  stock: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  color: string;
  body: string;
  miles: number;
  price: number;
  status: VehicleStatus;
  drivetrain: string;
}

export interface Fact {
  id: string;
  key: string;
  value: string;
  certainty: "asked" | "preferred" | "required" | "tentative" | "confirmed";
  evidence: string;
  corrected?: boolean;
}

export interface Message {
  id: string;
  at: string;
  who: "customer" | "rep" | "ai" | "system";
  sender: string;
  channel: Channel;
  text: string;
}

export interface Claim {
  text: string;
  severity: ClaimSeverity;
  reason: string;
}

export interface Slot {
  id: string;
  at: string;
  label: string;
}

export interface Draft {
  text: string;
  voice: VoiceId;
  claims: Claim[];
  slots: Slot[];
  producer: "rules" | "grok" | "rep";
}

export interface Moment {
  at: string;
  label: string;
  kind: "positive" | "risk" | "commit" | "objection";
  quote: string;
}

export interface Intel {
  score: number;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  propensityToShow: number;
  trend: "up" | "flat" | "down";
  trackers: string[];
  risks: string[];
  nextStepSet: boolean;
  coaching: string;
  moments: Moment[];
  talkRatio?: number;
}

export interface Thread {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  channel: Channel;
  source: string;
  assignedRepId: string;
  setterId?: string;
  stage: Stage;
  dnc: boolean;
  takeover: boolean;
  hint: string;
  vehicleStock: string | null;
  goal: string;
  missing: string;
  facts: Fact[];
  messages: Message[];
  demoScript: Array<string | { ghost: number }>;
  demoCursor: number;
  ghostUntil?: string | null;
  voice: VoiceId;
  lastInboundAt: string;
  lastActivityAt: string;
  createdAt: string;
  appointmentId: string | null;
  sequenceEnrollmentId: string | null;
  intel: Intel;
  draft: Draft;
}

export interface Appointment {
  id: string;
  threadId: string;
  vehicleStock: string | null;
  at: string;
  status: ApptStatus;
  type: "test_drive" | "write_up" | "delivery" | "be_back";
  setterId: string;
  closerId: string;
  notes: string;
}

export interface SequenceStep {
  day: number;
  channel: Channel;
  title: string;
  template: string;
}

export interface Sequence {
  id: string;
  name: string;
  ownerRole: Role;
  purpose: string;
  steps: SequenceStep[];
}

export interface Enrollment {
  id: string;
  sequenceId: string;
  threadId: string;
  status: SequenceStatus;
  stepIndex: number;
  enrolledAt: string;
  nextAt: string;
}

export interface TranscriptLine {
  t: number;
  speaker: "rep" | "customer" | "manager";
  text: string;
  tracker?: string;
}

export interface CallRecording {
  id: string;
  threadId: string;
  title: string;
  durationSec: number;
  occurredAt: string;
  repId: string;
  score: number;
  talkRatio: number;
  questionsAsked: number;
  nextStepSet: boolean;
  trackers: { key: string; label: string; count: number; tone: "pos" | "neg" | "neu" }[];
  transcript: TranscriptLine[];
  coaching: string[];
}

export interface Dealer {
  name: string;
  address: string;
  timezone: string;
  hours: Record<string, string>;
}
