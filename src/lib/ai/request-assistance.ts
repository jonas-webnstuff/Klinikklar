export type AiAssistCallResult<T> = { ok: true; data: T } | { ok: false; error: string; reason?: string };

export async function callAiAssist<T = unknown>(
  endpoint: "/api/ai/assist" | "/api/ai/generate" | "/api/documents/draft",
  body: Record<string, unknown>
): Promise<AiAssistCallResult<T>> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
    return { ok: false, error: data.error || "Kunde inte hämta AI-svar.", reason: data.reason };
  }

  const data = (await response.json()) as T;
  return { ok: true, data };
}
