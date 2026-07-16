import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function canManageCustomers(userId: string) {
  const supabase = createSupabaseAdminClient();

  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .limit(1);

  if (error) {
    throw error;
  }

  return (memberships || []).length > 0;
}
