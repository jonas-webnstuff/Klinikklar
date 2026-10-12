import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/resend/server";
import { COMPANY_INFO } from "@/lib/legal/company-info";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Ange ditt namn."),
  email: z.string().trim().email("Ange en giltig e-postadress."),
  message: z.string().trim().min(10, "Meddelandet är för kort."),
});

async function notifyByEmail(payload: z.infer<typeof bodySchema>) {
  const resend = getResendClient();
  if (!resend) {
    console.error("[contact] Skipping email notification: RESEND_API_KEY is not set.");
    return;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) {
    console.error("[contact] Skipping email notification: RESEND_FROM_EMAIL is not set.");
    return;
  }

  // Best-effort — the message is already safely stored in contact_messages regardless of
  // whether this notification goes out, so a Resend hiccup shouldn't fail the whole request.
  // The error is logged (not swallowed silently) so a misconfiguration is visible in Vercel's
  // Function Logs instead of just... nothing arriving.
  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: COMPANY_INFO.email,
      replyTo: payload.email,
      subject: `Nytt meddelande från ${payload.name}`,
      text: `${payload.message}\n\n— ${payload.name} (${payload.email})`,
    });

    if (result.error) {
      console.error("[contact] Resend returned an error:", result.error);
    } else {
      console.log("[contact] Email sent via Resend, id:", result.data?.id);
    }
  } catch (error) {
    console.error("[contact] Resend threw an exception:", error);
  }
}

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_MESSAGES = 3;

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentCount, error: rateLimitError } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", payload.email)
      .gte("created_at", windowStart);

    if (rateLimitError) throw rateLimitError;

    if ((recentCount ?? 0) >= RATE_LIMIT_MAX_MESSAGES) {
      return NextResponse.json(
        { ok: false, error: "Du har skickat flera meddelanden nyligen. Vänta en stund och försök igen." },
        { status: 429 }
      );
    }

    const { error } = await supabase.from("contact_messages").insert({
      name: payload.name,
      email: payload.email,
      message: payload.message,
    });

    if (error) throw error;

    await notifyByEmail(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0]?.message ?? "Ogiltiga uppgifter." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Kunde inte skicka meddelandet just nu. Försök igen strax." },
      { status: 500 }
    );
  }
}
