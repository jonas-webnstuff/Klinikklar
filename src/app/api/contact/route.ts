import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Ange ditt namn."),
  email: z.string().trim().email("Ange en giltig e-postadress."),
  message: z.string().trim().min(10, "Meddelandet är för kort."),
});

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
