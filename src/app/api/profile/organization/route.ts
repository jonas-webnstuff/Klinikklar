import { NextResponse } from "next/server";
import { z } from "zod";
import { organizationProfileSchema } from "@/lib/organization-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  profile: organizationProfileSchema,
});

export async function PATCH(request: Request) {
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
    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", payload.organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "Du har inte behörighet till organisationen." },
        { status: 403 }
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin" && membership.role !== "editor") {
      return NextResponse.json(
        { ok: false, error: "Din roll tillåter inte att ändra organisationsuppgifter." },
        { status: 403 }
      );
    }

    const { error: organizationError } = await supabase
      .from("organizations")
      .update({
        name: payload.profile.clinicName,
        org_number: payload.profile.orgNumber,
        email: payload.profile.email,
      })
      .eq("id", payload.organizationId);

    if (organizationError) throw organizationError;

    const { data: latestClinic, error: clinicLookupError } = await supabase
      .from("clinics")
      .select("id, region")
      .eq("organization_id", payload.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clinicLookupError) throw clinicLookupError;

    if (latestClinic?.id) {
      const { error: clinicUpdateError } = await supabase
        .from("clinics")
        .update({
          name: payload.profile.clinicName,
          address: payload.profile.address,
          postal_code: payload.profile.postalCode,
          municipality: payload.profile.municipality,
          region: latestClinic.region || "Ej angivet",
        })
        .eq("id", latestClinic.id);

      if (clinicUpdateError) throw clinicUpdateError;
    } else {
      const { error: clinicInsertError } = await supabase.from("clinics").insert({
        organization_id: payload.organizationId,
        name: payload.profile.clinicName,
        address: payload.profile.address,
        postal_code: payload.profile.postalCode,
        municipality: payload.profile.municipality,
        region: "Ej angivet",
      });

      if (clinicInsertError) throw clinicInsertError;
    }

    return NextResponse.json({ ok: true, profile: payload.profile });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte uppdatera organisationen.",
      },
      { status: 400 }
    );
  }
}