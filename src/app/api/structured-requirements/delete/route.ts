import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Du måste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const context = await resolveUserApplicationContext(supabase, user.id);

    if (!context) {
      return NextResponse.json(
        { ok: false, error: "Ingen aktiv ansökan hittades." },
        { status: 400 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from("structured_requirement_items")
      .select("id, requirement_code")
      .eq("id", payload.id)
      .eq("application_id", context.applicationId)
      .maybeSingle();

    if (itemError) throw itemError;

    if (!item?.id) {
      return NextResponse.json({ ok: false, error: "Posten hittades inte." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("structured_requirement_items")
      .delete()
      .eq("id", item.id)
      .eq("application_id", context.applicationId);

    if (deleteError) throw deleteError;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "structured_requirement_deleted",
      message: `Strukturerat krav borttaget: ${item.requirement_code}`,
      metadata: {
        itemId: item.id,
        requirementCode: item.requirement_code,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte ta bort posten" },
      { status: 400 }
    );
  }
}
