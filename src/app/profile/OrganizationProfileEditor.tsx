"use client";

import { useState } from "react";
import OrganizationProfileForm from "@/components/OrganizationProfileForm";
import type { OrganizationProfileInput } from "@/lib/organization-profile";

type Props = {
  organizationId: string;
  initialProfile: OrganizationProfileInput;
  canEdit: boolean;
};

export default function OrganizationProfileEditor({ organizationId, initialProfile, canEdit }: Props) {
  const [profile, setProfile] = useState<OrganizationProfileInput>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProfile() {
    if (!canEdit) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/profile/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, profile }),
    });

    setIsSaving(false);

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      profile?: OrganizationProfileInput;
    };

    if (!response.ok || !data.ok || !data.profile) {
      setMessage(data.error || "Kunde inte uppdatera organisationen.");
      return;
    }

    setProfile(data.profile);
    setMessage("Organisation uppdaterad.");
  }

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white p-4">
      <p className="text-sm font-semibold text-[color:var(--ink)]">Redigera organisationsuppgifter</p>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Samma grundformulär som används när organisationen sätts upp första gången.
      </p>

      <div className="mt-4">
        <OrganizationProfileForm
          value={profile}
          onChange={(field, value) => setProfile((current) => ({ ...current, [field]: value }))}
          disabled={!canEdit || isSaving}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={!canEdit || isSaving}
          className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Sparar..." : "Spara uppgifter"}
        </button>
        <p className="text-sm text-[color:var(--muted)]">
          {canEdit
            ? "Ändringarna uppdaterar organisationen och primär klinik."
            : "Du behöver owner-, admin- eller editor-roll för att redigera."}
        </p>
      </div>

      {message ? <p className="mt-3 text-sm text-[color:var(--muted)]">{message}</p> : null}
    </div>
  );
}