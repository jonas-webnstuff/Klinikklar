"use client";

import { useEffect, useState } from "react";

type MembershipRole = "owner" | "admin" | "editor" | "viewer";

type MemberItem = {
  membershipId: string;
  userId: string;
  role: MembershipRole;
  email: string;
  fullName: string;
};

type Props = {
  organizationId: string;
  organizationName: string;
};

const roleOptions: MembershipRole[] = ["owner", "admin", "editor", "viewer"];

export default function OrganizationMembersManager({ organizationId, organizationName }: Props) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("editor");

  async function loadMembers() {
    if (!organizationId) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    const response = await fetch("/api/profile/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", organizationId }),
    });

    setIsLoading(false);

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      members?: MemberItem[];
    };

    if (!response.ok || !data.ok) {
      setMessage(data.error || "Kunde inte hämta användare.");
      return;
    }

    setMembers(data.members || []);
  }

  async function addMember() {
    if (!email.trim()) {
      setMessage("Ange e-postadress.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/profile/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        organizationId,
        email,
        role,
      }),
    });

    setIsSaving(false);

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };

    if (!response.ok || !data.ok) {
      setMessage(data.error || "Kunde inte lägga till användare.");
      return;
    }

    setEmail("");
    setRole("editor");
    setMessage(data.message || "Användare tillagd.");
    await loadMembers();
  }

  async function updateMemberRole(member: MemberItem, nextRole: MembershipRole) {
    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/profile/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateRole",
        organizationId,
        membershipId: member.membershipId,
        role: nextRole,
      }),
    });

    setIsSaving(false);

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };

    if (!response.ok || !data.ok) {
      setMessage(data.error || "Kunde inte uppdatera roll.");
      return;
    }

    setMessage(data.message || "Roll uppdaterad.");
    await loadMembers();
  }

  useEffect(() => {
    void loadMembers();
  }, [organizationId]);

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white p-4">
      <p className="text-sm font-semibold text-[color:var(--ink)]">
        Hantera användare i {organizationName}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-post till användare"
          className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as MembershipRole)}
          className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void addMember()}
          disabled={isSaving}
          className="rounded-xl bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Lägg till
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <p className="text-sm text-[color:var(--muted)]">Laddar användare...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Inga användare ännu.</p>
        ) : (
          members.map((member) => (
            <div
              key={member.membershipId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-[color:var(--ink)]">{member.fullName || member.email}</p>
                <p className="text-xs text-[color:var(--muted)]">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(event) =>
                    void updateMemberRole(member, event.target.value as MembershipRole)
                  }
                  disabled={isSaving}
                  className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1 text-xs font-semibold"
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {message ? <p className="mt-3 text-sm text-[color:var(--muted)]">{message}</p> : null}
    </div>
  );
}
