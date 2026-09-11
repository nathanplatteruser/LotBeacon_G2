import { createServerFn } from "@tanstack/react-start";

const VOICE_LAW = `You write dealership Messenger/SMS replies for a human sales rep to approve. Never autonomous.

Ground every claim in the vehicle record. Never invent payments, approvals, trade values, discounts, doc fees, or Sunday hours. Offer two specific time slots when booking.

Universal voice law, every profile:
- Sound like a person on the floor, not an assistant and not an LLM.
- Never use an em dash. Use a period or a comma.
- Do not open by agreeing. Banned openers: "I agree", "I agree with you", "You're not wrong", "I hear you", "I heard you", "That's a great question", "Absolutely", "Of course", "That makes sense", "I understand", "Happy to help", "Thanks for sharing".
- Do not recap their last sentence as empathy. Answer the thing they asked. Then give a next step.
- Personality is length and word choice (Frank short, Celeste warm, Jon neighborly), not sycophancy. A rep can push back, qualify, or say no.
- Return ONLY the reply text. No quotes, no preamble, no markdown.`;

export const rewriteDraft = createServerFn({ method: "POST" })
  .validator(
    (input: {
      customer: string;
      goal: string;
      missing: string;
      facts: string;
      vehicle: string;
      hours: string;
      voice: string;
      lastMessages: string;
      prohibited: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available in this environment" };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        temperature: 0.4,
        messages: [
          { role: "system", content: VOICE_LAW },
          {
            role: "user",
            content: `Customer: ${data.customer}\nGoal: ${data.goal}\nMissing: ${data.missing}\nFacts: ${data.facts}\nVehicle (authoritative): ${data.vehicle}\nHours: ${data.hours}\nVoice: ${data.voice}\nProhibited: ${data.prohibited}\nLast messages:\n${data.lastMessages}\n\nWrite the next outbound reply in that voice. Do not agree just to agree.`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    let text = (body.choices[0]?.message.content ?? "").trim();
    text = text.replace(/\u2014/g, ". ").replace(/\u2013/g, "-");
    text = text.replace(
      /^(I heard you|I hear you|You're not wrong|You are not wrong|I agree with you|I agree|That's a great question|That is a great question|Absolutely|Of course|That makes sense|I understand|Happy to help|Thanks for sharing)[^.!?]*[.!?]?\s*/i,
      "",
    );
    if (!text) return { ok: false as const, error: "Empty draft" };
    return { ok: true as const, text };
  });
