import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  orgNumber: z.string().trim().optional().default(""),
});

export async function POST(request: Request) {
  try {
    const { orgNumber } = bodySchema.parse(await request.json());
    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Du måste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    let targetOrganizationId: string | null = null;
    let organization:
      | {
          id: string;
          name: string;
          org_number: string;
          email: string;
        }
      | null = null;

    if (orgNumber) {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, org_number, email")
        .eq("org_number", orgNumber)
        .limit(1)
        .maybeSingle();

      organization = data;
      targetOrganizationId = data?.id || null;
    } else {
      const { data: membership } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      targetOrganizationId = membership?.organization_id || null;

      if (targetOrganizationId) {
        const { data } = await supabase
          .from("organizations")
          .select("id, name, org_number, email")
          .eq("id", targetOrganizationId)
          .limit(1)
          .maybeSingle();

        organization = data;
      }
    }

    if (!organization) {
      return NextResponse.json({ ok: true, found: false });
    }

    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "Du har inte behörighet till organisationen." },
        { status: 403 }
      );
    }

    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, name, municipality")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.json({ ok: true, found: false });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("clinic_id", clinic.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ ok: true, found: false });
    }

    const { data: responses, error: responsesError } = await supabase
      .from("questionnaire_responses")
      .select("question_key, answer, follow_up_answer")
      .eq("application_id", application.id);

    if (responsesError) throw responsesError;

    const answers = Object.fromEntries(
      (responses || []).map((item) => [
        item.question_key,
        {
          answer: item.answer,
          followUpAnswer: item.follow_up_answer || "",
        },
      ])
    );

    return NextResponse.json({
      ok: true,
      found: true,
      profile: {
        clinicName: clinic.name,
        orgNumber: organization.org_number,
        municipality: clinic.municipality,
        email: organization.email,
      },
      answers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte ladda workspace",
      },
      { status: 400 }
    );
  }
}
