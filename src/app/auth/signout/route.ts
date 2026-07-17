import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOut(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: Request) {
  return signOut(request);
}

export async function POST(request: Request) {
  return signOut(request);
}
