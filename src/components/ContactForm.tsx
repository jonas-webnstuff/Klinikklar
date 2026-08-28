"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Något gick fel.");
      }

      setName("");
      setEmail("");
      setMessage("");
      setStatus({ type: "success", text: "Tack! Vi återkommer så snart vi kan." });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Något gick fel. Försök igen.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <label className="block space-y-1 text-sm text-[color:var(--muted)]">
        Namn
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
        />
      </label>

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
        Meddelande
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={10}
          rows={4}
          className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-2)] disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
      >
        {isLoading ? "Skickar..." : "Skicka meddelande"}
      </button>

      {status ? (
        <p
          className={`text-sm ${status.type === "success" ? "text-[color:var(--brand-2)]" : "text-red-600"}`}
        >
          {status.text}
        </p>
      ) : null}
    </form>
  );
}
