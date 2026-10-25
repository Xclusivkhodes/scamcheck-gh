import { connection } from "next/server";
import { verdictWord } from "@/lib/copy";
import { isDemoMode } from "@/lib/config";
import { CheckError } from "@/lib/errors";
import { runCheck } from "@/lib/pipeline";

/**
 * WhatsApp Cloud API stub.
 * GET answers Meta's verify handshake when WHATSAPP_VERIFY_TOKEN is set.
 * POST checks a forwarded message. It does not call Meta unless WHATSAPP_SEND=1,
 * and live Nemotron calls still require DEMO_MODE=false.
 */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return Response.json(
    {
      ready: false,
      needs: ["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_SEND=1"],
      note: "The bot is not connected to Meta. POST {\"text\":\"...\"} runs a local check.",
    },
    { status: expected ? 403 : 200 },
  );
}

export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: string; entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ text?: { body?: string } }> } }> }> };
    text = body.text?.trim() || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body?.trim() || "";
  } catch {
    return Response.json({ error: "Send JSON with a text field." }, { status: 400 });
  }
  if (text.length < 8) return Response.json({ error: "Paste the whole message." }, { status: 400 });

  try {
    const result = await runCheck({ text, language: "en" });
    const reply = `${verdictWord(result.verdict, "en")}. ${result.headline} Do not send money or share your PIN. Call 292 if you already did.`;
    if (process.env.WHATSAPP_SEND === "1" && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      return Response.json({
        reply,
        sent: false,
        note: "Tokens are set, but this stub does not post to Meta yet. Keep the reply and wire the Graph send yourself.",
        demoMode: isDemoMode(),
      });
    }
    return Response.json({ reply, sent: false, demoMode: isDemoMode() });
  } catch (error) {
    if (error instanceof CheckError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "The check did not finish." }, { status: 500 });
  }
}
