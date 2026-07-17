import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const answerSchema = z.object({
  answer: z.string(),
  followUpAnswer: z.string(),
});

const bodySchema = z.object({
  plan: z.enum(["step1", "step2", "step3"]).optional().nullable(),
  profile: z.object({
    clinicName: z.string().min(1),
    orgNumber: z.string().min(1),
    municipality: z.string().min(1),
    email: z.string().email(),
  }),
  answers: z.record(z.string(), answerSchema),
  requirements: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      status: z.enum(["missing", "complete"]),
    })
  ),
});

async function getOrCreateOrganization(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  profile: z.infer<typeof bodySchema>["profile"],
  selectedPlan: z.infer<typeof bodySchema>["plan"]
) {
  const { data: existing } = await supabase
    .from("organizations")
    .select("id, plan")
    .eq("org_number", profile.orgNumber)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("organizations")
      .update({
        name: profile.clinicName,
        email: profile.email,
      })
      .eq("id", existing.id);

    if (!existing.plan && selectedPlan) {
      await supabase
        .from("organizations")
        .update({
          plan: selectedPlan,
        })
        .eq("id", existing.id);
    }

    return existing.id;
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: profile.clinicName,
      org_number: profile.orgNumber,
      email: profile.email,
      plan: selectedPlan || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function getOrCreateClinic(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  profile: z.infer<typeof bodySchema>["profile"]
) {
  const { data: existing } = await supabase
    .from("clinics")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", profile.clinicName)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("clinics")
      .update({
        municipality: profile.municipality,
      })
      .eq("id", existing.id);

    return existing.id;
  }

  const { data, error } = await supabase
    .from("clinics")
    .insert({
      organization_id: organizationId,
      name: profile.clinicName,
      address: "Ej angivet",
      municipality: profile.municipality,
      region: "Ej angivet",
      has_radiology: false,
      has_sedation: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function getOrCreateApplication(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  clinicId: string
) {
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("clinic_id", clinicId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("applications")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return existing.id;
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      organization_id: organizationId,
      clinic_id: clinicId,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function ensureUserProfile(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  profile: z.infer<typeof bodySchema>["profile"]
) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: profile.clinicName,
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

async function ensureOrganizationMembership(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  organizationId: string
) {
  const { data: existing } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing?.id) {
    return;
  }

  const { error } = await supabase.from("organization_memberships").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "owner",
  });

  if (error) throw error;
}

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

    const selectedPlan = payload.plan || null;

    const organizationId = await getOrCreateOrganization(supabase, payload.profile, selectedPlan);

    await ensureUserProfile(supabase, user.id, payload.profile);
    await ensureOrganizationMembership(supabase, user.id, organizationId);
    const clinicId = await getOrCreateClinic(supabase, organizationId, payload.profile);
    const applicationId = await getOrCreateApplication(supabase, organizationId, clinicId);

    const responseRows = Object.entries(payload.answers).map(([questionKey, value]) => ({
      application_id: applicationId,
      question_key: questionKey,
      answer: value.answer,
      follow_up_answer: value.followUpAnswer || null,
      updated_at: new Date().toISOString(),
    }));

    if (responseRows.length > 0) {
      const { error: responsesError } = await supabase
        .from("questionnaire_responses")
        .upsert(responseRows, { onConflict: "application_id,question_key" });

      if (responsesError) throw responsesError;
    }

    const requirementRows = payload.requirements.map((item) => ({
      application_id: applicationId,
      code: item.code,
      title: item.title,
      status: item.status === "complete" ? "complete" : "missing",
      missing_reason: item.status === "complete" ? null : "Saknar tillräckligt underlag",
    }));

    if (requirementRows.length > 0) {
      const { error: requirementsError } = await supabase
        .from("requirements")
        .upsert(requirementRows, { onConflict: "application_id,code" });

      if (requirementsError) throw requirementsError;
    }

    return NextResponse.json({
      ok: true,
      organizationId,
      clinicId,
      applicationId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte spara workspace",
      },
      { status: 400 }
    );
  }
}
