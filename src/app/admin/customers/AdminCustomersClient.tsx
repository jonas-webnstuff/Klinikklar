"use client";

import { useMemo, useState } from "react";

type OrganizationRow = {
  id: string;
  name: string;
  org_number: string;
  email: string;
  phone: string | null;
  created_at: string;
  clinicCount: number;
  membershipCount: number;
};

type Props = {
  initialOrganizations: OrganizationRow[];
};

type DraftState = {
  name: string;
  orgNumber: string;
  email: string;
  phone: string;
};

export function AdminCustomersClient({ initialOrganizations }: Props) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creatingForm, setCreatingForm] = useState<DraftState>({
    name: "",
    orgNumber: "",
    email: "",
    phone: "",
  });
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(
      initialOrganizations.map((item) => [
        item.id,
        {
          name: item.name,
          orgNumber: item.org_number,
          email: item.email,
          phone: item.phone || "",
        },
      ])
    )
  );
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const filteredOrganizations = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return organizations;
    }

    return organizations.filter((item) => {
      return (
        item.name.toLowerCase().includes(needle) ||
        item.org_number.toLowerCase().includes(needle) ||
        item.email.toLowerCase().includes(needle)
      );
    });
  }, [organizations, query]);

  function upsertOrganization(updated: OrganizationRow) {
    setOrganizations((current) => {
      const exists = current.some((item) => item.id === updated.id);

      if (exists) {
        return current.map((item) => (item.id === updated.id ? updated : item));
      }

      return [updated, ...current];
    });

    setDrafts((current) => ({
      ...current,
      [updated.id]: {
        name: updated.name,
        orgNumber: updated.org_number,
        email: updated.email,
        phone: updated.phone || "",
      },
    }));
  }

  async function createOrganization() {
    if (!creatingForm.name.trim() || !creatingForm.orgNumber.trim() || !creatingForm.email.trim()) {
      setMessage("Fyll i namn, organisationsnummer och e-post.");
      return;
    }

    setIsCreating(true);
    setMessage("");

    const response = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creatingForm),
    });

    setIsCreating(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error || "Kunde inte skapa kund.");
      return;
    }

    const data = (await response.json()) as { organization: OrganizationRow };
    upsertOrganization(data.organization);
    setCreatingForm({ name: "", orgNumber: "", email: "", phone: "" });
    setMessage("Kund skapad.");
  }

  async function saveOrganization(id: string) {
    const draft = drafts[id];

    if (!draft?.name.trim() || !draft.orgNumber.trim() || !draft.email.trim()) {
      setMessage("Fyll i namn, organisationsnummer och e-post innan du sparar.");
      return;
    }

    setSavingIds((current) => ({ ...current, [id]: true }));
    setMessage("");

    const response = await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: draft.name,
        orgNumber: draft.orgNumber,
        email: draft.email,
        phone: draft.phone,
      }),
    });

    setSavingIds((current) => ({ ...current, [id]: false }));

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error || "Kunde inte uppdatera kund.");
      return;
    }

    const data = (await response.json()) as { organization: OrganizationRow };
    upsertOrganization(data.organization);
    setMessage("Kund uppdaterad.");
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Kundregister
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
            Skapa och uppdatera kunder
          </h2>
        </div>
        <label className="block min-w-[260px] flex-1 max-w-md text-sm text-[color:var(--muted)]">
          Sök kund
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Namn, org.nr eller e-post"
            className="mt-1 w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-[color:var(--ink)]"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <h3 className="text-lg font-semibold text-[color:var(--ink)]">Ny kund</h3>
          <div className="mt-4 space-y-3">
            <input
              value={creatingForm.name}
              onChange={(event) => setCreatingForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Kundnamn"
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
            />
            <input
              value={creatingForm.orgNumber}
              onChange={(event) =>
                setCreatingForm((current) => ({ ...current, orgNumber: event.target.value }))
              }
              placeholder="Organisationsnummer"
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
            />
            <input
              type="email"
              value={creatingForm.email}
              onChange={(event) => setCreatingForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="E-post"
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
            />
            <input
              value={creatingForm.phone}
              onChange={(event) => setCreatingForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Telefon (valfritt)"
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
            />
            <button
              type="button"
              onClick={createOrganization}
              disabled={isCreating}
              className="w-full rounded-xl bg-[color:var(--brand)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isCreating ? "Sparar..." : "Skapa kund"}
            </button>
          </div>
          {message ? <p className="mt-4 text-sm text-[color:var(--muted)]">{message}</p> : null}
        </div>

        <div className="space-y-4">
          {filteredOrganizations.length === 0 ? (
            <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] px-5 py-6 text-sm text-[color:var(--muted)]">
              Inga kunder matchar sökningen.
            </div>
          ) : (
            filteredOrganizations.map((organization) => {
              const draft = drafts[organization.id] || {
                name: organization.name,
                orgNumber: organization.org_number,
                email: organization.email,
                phone: organization.phone || "",
              };

              return (
                <article
                  key={organization.id}
                  className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                        Kund #{organization.org_number}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                        {organization.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--ink)]">
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1">
                        {organization.clinicCount} kliniker
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1">
                        {organization.membershipCount} medlemmar
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [organization.id]: { ...draft, name: event.target.value },
                        }))
                      }
                      className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
                    />
                    <input
                      value={draft.orgNumber}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [organization.id]: { ...draft, orgNumber: event.target.value },
                        }))
                      }
                      className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
                    />
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [organization.id]: { ...draft, email: event.target.value },
                        }))
                      }
                      className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
                    />
                    <input
                      value={draft.phone}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [organization.id]: { ...draft, phone: event.target.value },
                        }))
                      }
                      className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[color:var(--muted)]">
                      Skapad {new Date(organization.created_at).toLocaleDateString("sv-SE")}
                    </p>
                    <button
                      type="button"
                      onClick={() => saveOrganization(organization.id)}
                      disabled={Boolean(savingIds[organization.id])}
                      className="rounded-xl bg-[color:var(--brand)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {savingIds[organization.id] ? "Sparar..." : "Spara kund"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
