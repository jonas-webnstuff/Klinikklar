"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function formatAuthErrorMessage(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("password") && message.includes("least")) {
    return "Lösenordet är för kort. Använd minst 6 tecken.";
  }

  if (message.includes("same password") || message.includes("different from the old")) {
    return "Det nya lösenordet måste skilja sig från det gamla.";
  }

  return rawMessage;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasRecoverySession(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Lösenorden matchar inte.");
      return;
    }

    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setMessage(formatAuthErrorMessage(error.message));
      return;
    }

    setIsDone(true);
    setMessage("Lösenordet är uppdaterat.");
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-[1180px] items-center px-6 py-12 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_24px_60px_rgba(13,39,87,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Klinikklar konto
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
          Sätt nytt lösenord
        </h1>

        {hasRecoverySession === null ? (
          <p className="mt-3 text-[color:var(--muted)]">Kontrollerar länken...</p>
        ) : hasRecoverySession === false ? (
          <>
            <p className="mt-3 text-[color:var(--muted)]">
              Länken är ogiltig eller har gått ut. Begär en ny återställningslänk.
            </p>
            <a
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-2)]"
            >
              Tillbaka till inloggning
            </a>
          </>
        ) : isDone ? (
          <>
            <p className="mt-3 text-[color:var(--muted)]">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/workspace")}
              className="mt-6 w-full rounded-xl bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-2)]"
            >
              Fortsätt till workspace
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-[color:var(--muted)]">Ange ditt nya lösenord nedan.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block space-y-1 text-sm text-[color:var(--muted)]">
                Nytt lösenord
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
                />
              </label>

              <label className="block space-y-1 text-sm text-[color:var(--muted)]">
                Bekräfta nytt lösenord
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-xl bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-2)] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? "Sparar..." : "Spara nytt lösenord"}
              </button>

              {message ? <p className="text-sm text-[color:var(--muted)]">{message}</p> : null}
            </form>
          </>
        )}
      </section>
    </div>
  );
}
