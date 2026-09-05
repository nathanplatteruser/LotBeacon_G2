import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed, TEAM } from "./seed";
import { blocked, bucketFor, generateDraft, validateClaims, findVehicle } from "./engine";
import type {
  Appointment,
  CallRecording,
  Enrollment,
  Sequence,
  Thread,
  Vehicle,
  VoiceId,
} from "./types";

export type SeedShape = ReturnType<typeof buildSeed>;

interface Actions {
  setRep: (id: string) => void;
  selectThread: (id: string | null) => void;
  setDraftText: (threadId: string, text: string) => void;
  setVoice: (threadId: string, voice: VoiceId) => void;
  regenerateDraft: (threadId: string) => void;
  applyGrokDraft: (threadId: string, text: string) => void;
  sendAndNext: (threadId: string) => void;
  bookSlot: (threadId: string, slotId: string) => void;
  takeover: (threadId: string) => void;
  setStage: (threadId: string, stage: Thread["stage"]) => void;
  correctFact: (threadId: string, factId: string, value: string) => void;
  markVehicle: (stock: string, status: Vehicle["status"]) => void;
  enroll: (threadId: string, sequenceId: string) => void;
  pauseEnrollment: (id: string) => void;
  advanceEnrollment: (id: string) => void;
  logOffline: (threadId: string, channel: string) => void;
  startFollowup: (threadId: string) => void;
  resetDemo: () => void;
}

export type Store = SeedShape & Actions & { hydrated: boolean };

function hydrateDrafts(threads: Thread[], vehicles: Vehicle[]) {
  return threads.map((t) => ({
    ...t,
    draft: t.draft.text ? t.draft : generateDraft(t, vehicles, t.voice),
  }));
}

function applySeed(): SeedShape {
  const s = buildSeed();
  return { ...s, threads: hydrateDrafts(s.threads, s.vehicles) };
}

export const useApp = create<Store>()(
  persist(
    (set, get) => ({
      ...applySeed(),
      hydrated: false,
      setRep: (id) => set({ currentRepId: id }),
      selectThread: (id) => set({ selectedThreadId: id }),
      setDraftText: (threadId, text) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const vehicle = findVehicle(s.vehicles, t.vehicleStock);
            const claims = validateClaims(text, t, vehicle);
            return { ...t, draft: { ...t.draft, text, claims, producer: "rep" } };
          }),
        })),
      setVoice: (threadId, voice) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const next = { ...t, voice };
            return { ...next, draft: generateDraft(next, s.vehicles, voice) };
          }),
        })),
      regenerateDraft: (threadId) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, draft: generateDraft(t, s.vehicles, t.voice) } : t,
          ),
        })),
      applyGrokDraft: (threadId, text) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const vehicle = findVehicle(s.vehicles, t.vehicleStock);
            const claims = validateClaims(text, t, vehicle);
            return {
              ...t,
              draft: { ...t.draft, text, claims, producer: "grok" },
            };
          }),
        })),
      sendAndNext: (threadId) =>
        set((s) => {
          const idx = s.threads.findIndex((t) => t.id === threadId);
          const t = s.threads[idx];
          if (!t) return s;
          if (blocked(t.draft, t)) return s;
          const now = new Date().toISOString();
          const outbound = {
            id: `out_${Date.now()}`,
            at: now,
            who: "rep" as const,
            sender: TEAM.find((r) => r.id === s.currentRepId)?.name ?? "Rep",
            channel: t.channel,
            text: t.draft.text,
          };
          const nextThread: Thread = {
            ...t,
            messages: [...t.messages, outbound],
            lastActivityAt: now,
            takeover: t.takeover,
          };

          const step = t.demoScript[t.demoCursor];
          let ghostUntil = t.ghostUntil ?? null;
          let demoCursor = t.demoCursor;
          let stage = t.stage;
          const extra: Thread["messages"] = [];

          if (typeof step === "string") {
            const replyAt = new Date(Date.now() + 600).toISOString();
            extra.push({
              id: `in_${Date.now()}`,
              at: replyAt,
              who: "customer",
              sender: t.customerName,
              channel: t.channel,
              text: step,
            });
            demoCursor += 1;
            nextThread.lastInboundAt = replyAt;
            nextThread.lastActivityAt = replyAt;
            if (/10am|10:00|11:00|i'll be there|see you|4\b|5:30|saturday/i.test(step)) {
              if (stage === "engage" || stage === "qualify" || stage === "book") stage = "book";
            }
          } else if (step && typeof step === "object") {
            ghostUntil = new Date(Date.now() + step.ghost * 60 * 60_000).toISOString();
            demoCursor += 1;
            extra.push({
              id: `sys_${Date.now()}`,
              at: now,
              who: "system",
              sender: "LotBeacon",
              channel: t.channel,
              text: `${t.customerName} has not responded. Follow-up sequence available — never automatic.`,
            });
          }

          const merged: Thread = {
            ...nextThread,
            messages: [...nextThread.messages, ...extra],
            demoCursor,
            ghostUntil,
            stage,
          };
          merged.draft = generateDraft(merged, s.vehicles, merged.voice);

          const threads = s.threads.map((x) => (x.id === threadId ? merged : x));
          const actionable = threads.filter((th) => {
            const b = bucketFor(th, s.appointments);
            return b === "reply_now" || b === "book_now" || b === "window_closing" || b === "appointment_change";
          });
          const nextId =
            actionable.find((th) => th.id !== threadId)?.id ??
            threads[(idx + 1) % threads.length]?.id ??
            threadId;
          return { threads, selectedThreadId: nextId };
        }),
      bookSlot: (threadId, slotId) =>
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t) return s;
          const slot = t.draft.slots.find((sl) => sl.id === slotId) ?? t.draft.slots[0];
          if (!slot) return s;
          const apptId = t.appointmentId ?? `a_${threadId}`;
          const appt: Appointment = {
            id: apptId,
            threadId,
            vehicleStock: t.vehicleStock,
            at: slot.at,
            status: "confirmed",
            type: "test_drive",
            setterId: s.currentRepId,
            closerId: t.assignedRepId,
            notes: `Booked ${slot.label} from inbox.`,
          };
          const now = new Date().toISOString();
          const confirm = {
            id: `out_book_${Date.now()}`,
            at: now,
            who: "rep" as const,
            sender: TEAM.find((r) => r.id === s.currentRepId)?.name ?? "Rep",
            channel: t.channel,
            text: `You're on the books for ${slot.label}. I'll have the vehicle pulled. See you then.`,
          };
          const threads = s.threads.map((x) => {
            if (x.id !== threadId) return x;
            const next: Thread = {
              ...x,
              appointmentId: apptId,
              stage: "visit",
              missing: "day-of reminder",
              goal: `Show ${slot.label}`,
              messages: [...x.messages, confirm],
              lastActivityAt: now,
              facts: x.facts.map((f) =>
                f.key === "timing" ? { ...f, value: slot.label, certainty: "confirmed" } : f,
              ),
            };
            next.draft = generateDraft(next, s.vehicles, next.voice);
            return next;
          });
          const existing = s.appointments.some((a) => a.id === apptId);
          const appointments = existing
            ? s.appointments.map((a) => (a.id === apptId ? appt : a))
            : [...s.appointments, appt];
          return { threads, appointments };
        }),
      takeover: (threadId) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, takeover: !t.takeover } : t,
          ),
        })),
      setStage: (threadId, stage) =>
        set((s) => ({
          threads: s.threads.map((t) => (t.id === threadId ? { ...t, stage } : t)),
        })),
      correctFact: (threadId, factId, value) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  facts: t.facts.map((f) =>
                    f.id === factId ? { ...f, value, corrected: true, certainty: "confirmed" as const } : f,
                  ),
                }
              : t,
          ),
        })),
      markVehicle: (stock, status) =>
        set((s) => {
          const vehicles = s.vehicles.map((v) => (v.stock === stock ? { ...v, status } : v));
          const threads = s.threads.map((t) =>
            t.vehicleStock === stock
              ? { ...t, draft: { ...t.draft, claims: validateClaims(t.draft.text, t, findVehicle(vehicles, stock)) } }
              : t,
          );
          return { vehicles, threads };
        }),
      enroll: (threadId, sequenceId) =>
        set((s) => {
          const id = `e_${threadId}_${sequenceId}`;
          const enrollment: Enrollment = {
            id,
            sequenceId,
            threadId,
            status: "active",
            stepIndex: 0,
            enrolledAt: new Date().toISOString(),
            nextAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          };
          return {
            enrollments: [...s.enrollments.filter((e) => e.threadId !== threadId), enrollment],
            threads: s.threads.map((t) =>
              t.id === threadId ? { ...t, sequenceEnrollmentId: id } : t,
            ),
          };
        }),
      pauseEnrollment: (id) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.id === id ? { ...e, status: e.status === "paused" ? "active" : "paused" } : e,
          ),
        })),
      advanceEnrollment: (id) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) => {
            if (e.id !== id) return e;
            const seq = s.sequences.find((q) => q.id === e.sequenceId);
            const next = e.stepIndex + 1;
            if (!seq || next >= seq.steps.length) return { ...e, status: "finished", stepIndex: next };
            return { ...e, stepIndex: next, nextAt: new Date(Date.now() + 60 * 60_000).toISOString() };
          }),
        })),
      logOffline: (threadId, channel) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  ghostUntil: null,
                  messages: [
                    ...t.messages,
                    {
                      id: `off_${Date.now()}`,
                      at: new Date().toISOString(),
                      who: "system" as const,
                      sender: "LotBeacon",
                      channel: t.channel,
                      text: `Offline touch logged: ${channel}.`,
                    },
                  ],
                }
              : t,
          ),
        })),
      startFollowup: (threadId) =>
        set((s) => {
          const seq = s.sequences.find((q) => q.id === "seq_mkt") ?? s.sequences[0];
          if (!seq) return s;
          const id = `e_fu_${threadId}`;
          const enrollment: Enrollment = {
            id,
            sequenceId: seq.id,
            threadId,
            status: "active",
            stepIndex: 0,
            enrolledAt: new Date().toISOString(),
            nextAt: new Date().toISOString(),
          };
          return {
            enrollments: [...s.enrollments, enrollment],
            threads: s.threads.map((t) =>
              t.id === threadId ? { ...t, sequenceEnrollmentId: id, ghostUntil: null } : t,
            ),
          };
        }),
      resetDemo: () => set({ ...applySeed(), selectedThreadId: "t_sarah" }),
    }),
    {
      name: "lotbeacon-g2-v2",
      partialize: (s) => ({
        currentRepId: s.currentRepId,
        selectedThreadId: s.selectedThreadId,
        vehicles: s.vehicles,
        threads: s.threads,
        appointments: s.appointments,
        sequences: s.sequences as Sequence[],
        enrollments: s.enrollments,
        calls: s.calls as CallRecording[],
        version: s.version,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.version !== 2) {
          const fresh = applySeed();
          Object.assign(state, fresh);
        }
        state.hydrated = true;
      },
    },
  ),
);

export function useCurrentRep() {
  return useApp((s) => TEAM.find((r) => r.id === s.currentRepId) ?? TEAM[0]);
}

export { TEAM };
