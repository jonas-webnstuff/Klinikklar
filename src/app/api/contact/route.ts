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
  if (!resend) return;

  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) return;

  // Best-effort — the message is already safely stored in contact_messages regardless of
  // whether this notification goes out, so a Resend hiccup shouldn't fail the whole request.
  try {
    await resend.emails.send({
      from: fromAddress,
      to: COMPANY_INFO.email,
      replyTo: payload.email,
      subject: `Nytt meddelande från ${payload.name}`,
      text: `${payload.message}\n\n— ${payload.name} (${payload.email})`,
    });
  } catch {
    // Swallowed deliberately; see comment above.
  }
}

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

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
