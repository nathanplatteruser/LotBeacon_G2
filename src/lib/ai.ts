import { createServerFn } from "@tanstack/react-start";

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
          {
            role: "system",
            content:
              "You write dealership Messenger/SMS replies for a human rep to approve. Never autonomous. Ground every claim in the vehicle record. Never invent payments, approvals, trade values, discounts, doc fees, or Sunday hours. Offer two specific time slots when booking. Match the requested voice. Return ONLY the reply text, no quotes or preamble.",
          },
          {
            role: "user",
            content: `Customer: ${data.customer}
Goal: ${data.goal}
Missing: ${data.missing}
Facts: ${data.facts}
Vehicle (authoritative): ${data.vehicle}
Hours: ${data.hours}
Voice: ${data.voice}
Prohibited: ${data.prohibited}
Last messages:
${data.lastMessages}

Write the next outbound reply.`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = (body.choices[0]?.message.content ?? "").trim();
    if (!text) return { ok: false as const, error: "Empty draft" };
    return { ok: true as const, text };
  });
