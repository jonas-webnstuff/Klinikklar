import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MembershipRole = "owner" | "admin" | "editor" | "viewer";

const roleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    organizationId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("add"),
    organizationId: z.string().uuid(),
    email: z.string().email(),
    role: roleSchema,
  }),
  z.object({
    action: z.literal("updateRole"),
    organizationId: z.string().uuid(),
    membershipId: z.string().uuid(),
    role: roleSchema,
  }),
]);

async function getCurrentUser() {
  const authSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  return user;
}

async function resolveActorRole(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  organizationId: string
): Promise<MembershipRole | null> {
  const { data, error } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.role) return null;
  return data.role as MembershipRole;
}

async function findUserByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });

    if (error) throw error;

    const users = data.users || [];
    const match = users.find((item) => item.email?.toLowerCase() === normalized);

    if (match?.id && match.email) {
      return { id: match.id, email: match.email };
    }

    if (users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

async function inviteUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string
): Promise<{ id: string; email: string }> {
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectBase}/auth/callback`,
  });

  if (error) throw error;

  if (!data.user?.id || !data.user.email) {
    throw new Error("Kunde inte bjuda in användaren.");
  }

  return { id: data.user.id, email: data.user.email };
}

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Du måste vara inloggad." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const actorRole = await resolveActorRole(admin, user.id, payload.organizationId);

    if (!actorRole) {
      return NextResponse.json({ ok: false, error: "Du har inte behörighet till organisationen." }, { status: 403 });
    }

    if (payload.action === "list") {
      const { data, error } = await admin
        .from("organization_memberships")
        .select("id, user_id, role, profiles(full_name)")
        .eq("organization_id", payload.organizationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const memberships = data || [];

      const enriched = await Promise.all(
        memberships.map(async (item) => {
          const { data: authUser } = await admin.auth.admin.getUserById(item.user_id);

          return {
            membershipId: item.id,
            userId: item.user_id,
            role: item.role as MembershipRole,
            email: authUser.user?.email || "",
            fullName: ((item.profiles as { full_name?: string } | null)?.full_name || "").trim(),
          };
        })
      );

      return NextResponse.json({
        ok: true,
        members: enriched,
      });
    }

    if (actorRole !== "owner") {
      return NextResponse.json({ ok: false, error: "Endast owner kan hantera användare." }, { status: 403 });
    }

    if (payload.action === "add") {
      const normalizedEmail = payload.email.trim().toLowerCase();

      let targetUser = await findUserByEmail(admin, normalizedEmail);
      let invited = false;

      if (!targetUser) {
        targetUser = await inviteUser(admin, normalizedEmail);
        invited = true;
      }

      const { error } = await admin.from("organization_memberships").upsert(
        {
          organization_id: payload.organizationId,
          user_id: targetUser.id,
          role: payload.role,
        },
        { onConflict: "organization_id,user_id" }
      );

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: invited
          ? "Användaren bjöds in och lades till i organisationen."
          : "Användaren lades till i organisationen.",
      });
    }

    const { data: targetMembership, error: targetMembershipError } = await admin
      .from("organization_memberships")
      .select("id, user_id, role")
      .eq("id", payload.membershipId)
      .eq("organization_id", payload.organizationId)
      .maybeSingle();

    if (targetMembershipError) throw targetMembershipError;

    if (!targetMembership?.id) {
      return NextResponse.json({ ok: false, error: "Kunde inte hitta medlemskap." }, { status: 404 });
    }

    const targetCurrentRole = targetMembership.role as MembershipRole;

    if (targetMembership.user_id === user.id && payload.role !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Du kan inte ändra din egen roll från owner." },
        { status: 400 }
      );
    }

    if (targetCurrentRole === "owner" && payload.role !== "owner") {
      const { count, error: ownersCountError } = await admin
        .from("organization_memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", payload.organizationId)
        .eq("role", "owner");

      if (ownersCountError) throw ownersCountError;

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { ok: false, error: "Minst en owner måste finnas kvar i organisationen." },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await admin
      .from("organization_memberships")
      .update({ role: payload.role })
      .eq("id", payload.membershipId)
      .eq("organization_id", payload.organizationId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, message: "Roll uppdaterad." });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte hantera användare",
      },
      { status: 400 }
    );
  }
}
