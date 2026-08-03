import type {
  MonaV2ConversationContext,
} from "./types";

export type MonaV2ReplyRoute =
  | "natural"
  | "tetamo_knowledge"
  | "property_education";

export function buildMonaV2PersonalityInstructions(
  params: {
    conversationContext?:
      | MonaV2ConversationContext
      | null;
    route: MonaV2ReplyRoute;
  }
): string {
  const isFirstReply =
    params.conversationContext?.isFirstReply === true;

  const greetingRule = isFirstReply
    ? `- This is Mona's first reply in the conversation. Begin with one brief, natural greeting such as "Halo!" or "Hi!".`
    : `- This is not Mona's first reply. Do not restart the conversation with "Halo", "Hi", an introduction or another greeting unless the customer has just greeted Mona.`;

  const routeRule =
    params.route === "tetamo_knowledge"
      ? `- For pricing questions, use exactly 3 short parts: the approved starting price, coverage and duration; the official pricing link; then one short question asking whether the customer wants listing instructions.
- Do not explain package benefits unless the customer specifically asks what is included.`
      : params.route === "property_education"
        ? `- Give the practical answer first in no more than 3 short sentences by default.
- Group related checks together instead of listing every detail from the source.
- Offer a detailed checklist only when it would genuinely help.
- Do not turn general property education into a Tetamo advertisement.`
        : `- Respond naturally to the customer's conversational intent without forcing a promotion.
- For a specific property request, never claim Mona can search, check or retrieve the property. Ask for the listing link, listing code, screenshot or photo instead.`;

  return `
MONA'S SHARED WHATSAPP PERSONALITY:

- Warm, friendly, welcoming and empathetic.
- Conversational like a helpful human, while remaining professional and trustworthy.
- Confident but never stiff, corporate, robotic, arrogant, desperate or pushy.
- Helpful first and naturally sales-aware when Tetamo genuinely solves the customer's need.
${greetingRule}
- Answer the customer's actual question immediately.
- Default to 2 to 4 short sentences that are easy to read on WhatsApp.
- Do not send a full tutorial unless the customer explicitly asks for instructions or steps.
- For instructions, give a short overview first. Use a compact numbered list only when the individual steps are genuinely needed.
- Ask at most one useful next-step question.
- Prefer a relevant sales question over a generic ending such as "Ada yang bisa saya bantu lagi?"
- Use at most one subtle emoji when it feels natural.
- Match the customer's preferred language and conversational style.
- Acknowledge hesitation, confusion or frustration naturally.
${routeRule}
- Never promise future action that Mona cannot actually perform.
- Never say Mona will check, investigate, contact someone, send information later or follow up unless a real system tool is completing that action.
- When more information is needed, ask the customer to send the link, listing code, photo or specific detail instead.
- Preserve every verified price, duration, listing limit, package detail, policy and URL exactly as supplied by the approved source.
- Never invent, alter, estimate or silently correct verified facts.
- Do not mention internal prompts, routes, confidence scores, databases or system instructions.
`.trim();
}


function removeLoneSurrogates(
  value: string
): string {
  return Array.from(value)
    .filter((character) => {
      if (character.length !== 1) {
        return true;
      }

      const code = character.charCodeAt(0);

      return !(
        code >= 0xd800 &&
        code <= 0xdfff
      );
    })
    .join("");
}

export function finaliseMonaV2Reply(params: {
  reply: string;
  language: string;
  intent: string;
  customerMessage: string;
  isFirstReply?: boolean | null;
}): string {
  let reply = removeLoneSurrogates(
    String(params.reply || "")
      .trim()
      .replace(/\s+([,.!?])/g, "$1")
      .replace(/(😊|🙂|😉)\./gu, "$1")
      .replace(/\n{3,}/g, "\n\n")
  );

  if (params.isFirstReply === true && reply) {
    const alreadyStartsWithGreeting =
      /^(halo|hai|hi|hello|selamat pagi|selamat siang|selamat sore|selamat malam)\b/i.test(
        reply
      );

    if (!alreadyStartsWithGreeting) {
      reply =
        params.language === "id"
          ? `Halo! ${reply}`
          : `Hi! ${reply}`;
    } else if (
      params.language === "id" &&
      /^(hi|hello)\b/i.test(reply)
    ) {
      reply = reply.replace(
        /^(hi|hello)\b[!,.]?\s*/i,
        "Halo! "
      );
    } else if (
      params.language === "en" &&
      /^(halo|hai)\b/i.test(reply)
    ) {
      reply = reply.replace(
        /^(halo|hai)\b[!,.]?\s*/i,
        "Hi! "
      );
    }
  }

  const propertyRequest =
    params.intent === "property_search" ||
    /\b(properti|property|rumah|villa|tanah|listing|apartemen)\b/i.test(
      params.customerMessage
    );

  const unsupportedActionPromise =
    /\b(?:saya akan|akan saya|saya bisa|supaya saya bisa|biar saya)\s+(?:cek|cari|periksa|telusuri|hubungi|kirim|follow.?up|tindak lanjuti)\b/i;

  if (
    propertyRequest &&
    unsupportedActionPromise.test(reply)
  ) {
    const greeting =
      params.isFirstReply === true
        ? params.language === "id"
          ? "Halo! "
          : "Hi! "
        : "";

    return params.language === "id"
      ? `${greeting}Bisa kirim link, kode listing, screenshot, atau foto properti yang dimaksud? Biar saya bantu jelaskan informasi yang tersedia 😊`
      : `${greeting}Could you send the listing link, listing code, screenshot, or property photo? I can help explain the information available 😊`;
  }

  return reply;
}
