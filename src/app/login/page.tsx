"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/workspace");
  const [selectedPlan, setSelectedPlan] = useState<"step1" | "step2" | "step3" | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const next = query.get("next");
    const plan = query.get("plan");

    if (next && next.startsWith("/")) {
      setNextPath(next);
    }

    if (plan === "step1" || plan === "step2" || plan === "step3") {
      setSelectedPlan(plan);
    }
  }, []);

  const planLabelMap: Record<"step1" | "step2" | "step3", string> = {
    step1: "Bli klinikklar",
    step2: "Driv kliniken rätt",
    step3: "Var alltid redo",
  };

  const destinationPath =
    selectedPlan && nextPath.startsWith("/")
      ? `${nextPath}${nextPath.includes("?") ? "&" : "?"}plan=${selectedPlan}`
      : nextPath;

  async function handleOAuth(provider: "google" | "azure") {
    setIsOAuthLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destinationPath)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      setMessage(error.message);
      setIsOAuthLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      setIsLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Konto skapat. Du kan nu logga in.");
      setMode("login");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(destinationPath);
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-[1180px] items-center px-6 py-12 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_24px_60px_rgba(13,39,87,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Klinikklar konto
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
          {mode === "login" ? "Logga in" : "Skapa konto"}
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Logga in för att komma åt workspace, dokument och organisationens data.
        </p>

        {selectedPlan ? (
          <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink)]">
            Vald nivå: <span className="font-semibold">{planLabelMap[selectedPlan]}</span>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={isOAuthLoading || isLoading}
            className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--line-strong)] disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Fortsätt med Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("azure")}
            disabled={isOAuthLoading || isLoading}
            className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--line-strong)] disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Fortsätt med Microsoft
          </button>
        </div>

        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Du kan aktivera dessa providers i Supabase när du vill.
        </p>

        <div className="mt-6 inline-flex rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-1">
          <button
            onClick={() => setMode("login")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-white text-[color:var(--ink)] shadow-[0_8px_20px_rgba(13,39,87,0.06)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            Logga in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-white text-[color:var(--ink)] shadow-[0_8px_20px_rgba(13,39,87,0.06)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            Skapa konto
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1 text-sm text-[color:var(--muted)]">
            E-post
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
            />
          </label>

          <label className="block space-y-1 text-sm text-[color:var(--muted)]">
            Lösenord
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading || isOAuthLoading}
            className="mt-2 w-full rounded-xl bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-2)] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Väntar..." : mode === "login" ? "Logga in" : "Skapa konto"}
          </button>

          {message ? <p className="text-sm text-[color:var(--muted)]">{message}</p> : null}
        </form>
      </section>
    </div>
  );
}
