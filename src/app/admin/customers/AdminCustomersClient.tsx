"use client";

import { useMemo, useState } from "react";
import OrganizationProfileForm from "@/components/OrganizationProfileForm";
import type { OrganizationProfileInput } from "@/lib/organization-profile";

type OrganizationRow = {
  id: string;
  name: string;
  org_number: string;
  email: string;
  phone: string | null;
  plan: "step1" | "step2" | "step3" | null;
  created_at: string;
  clinicCount: number;
  membershipCount: number;
  clinic_id: string | null;
  clinic_name: string;
  address: string;
  postal_code: string;
  municipality: string;
};

type Props = {
  initialOrganizations: OrganizationRow[];
};

type DraftState = {
  clinicName: string;
  orgNumber: string;
  address: string;
  postalCode: string;
  municipality: string;
  email: string;
  phone: string;
  plan: "step1" | "step2" | "step3" | "";
};

const planLabelMap: Record<"step1" | "step2" | "step3", string> = {
  step1: "Klinikklar Komplett",
  step2: "Klinikklar Drift",
  step3: "Klinikklar Premium",
};

export function AdminCustomersClient({ initialOrganizations }: Props) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creatingForm, setCreatingForm] = useState<DraftState>({
    clinicName: "",
    orgNumber: "",
    address: "",
    postalCode: "",
    municipality: "",
    email: "",
    phone: "",
    plan: "",
  });
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(
      initialOrganizations.map((item) => [
        item.id,
        {
          clinicName: item.clinic_name || item.name,
          orgNumber: item.org_number,
          address: item.address || "",
          postalCode: item.postal_code || "",
          municipality: item.municipality || "",
          email: item.email,
          phone: item.phone || "",
          plan: item.plan || "",
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
        clinicName: updated.clinic_name || updated.name,
        orgNumber: updated.org_number,
        address: updated.address || "",
        postalCode: updated.postal_code || "",
        municipality: updated.municipality || "",
        email: updated.email,
        phone: updated.phone || "",
        plan: updated.plan || "",
      },
    }));
  }

  async function createOrganization() {
    if (
      !creatingForm.clinicName.trim() ||
      !creatingForm.orgNumber.trim() ||
      !creatingForm.address.trim() ||
      !creatingForm.postalCode.trim() ||
      !creatingForm.municipality.trim() ||
      !creatingForm.email.trim()
    ) {
      setMessage("Fyll i kliniknamn, organisationsnummer, adress, postnummer, ort och e-post.");
      return;
    }

    setIsCreating(true);
    setMessage("");

    const response = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          clinicName: creatingForm.clinicName,
          orgNumber: creatingForm.orgNumber,
          address: creatingForm.address,
          postalCode: creatingForm.postalCode,
          municipality: creatingForm.municipality,
          email: creatingForm.email,
        },
        phone: creatingForm.phone,
        plan: creatingForm.plan || null,
      }),
    });

    setIsCreating(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error || "Kunde inte skapa kund.");
      return;
    }

    const data = (await response.json()) as { organization: OrganizationRow };
    upsertOrganization(data.organization);
    setCreatingForm({
      clinicName: "",
      orgNumber: "",
      address: "",
      postalCode: "",
      municipality: "",
      email: "",
      phone: "",
      plan: "",
    });
    setMessage("Kund skapad.");
  }

  async function saveOrganization(id: string) {
    const draft = drafts[id];

    if (
      !draft?.clinicName.trim() ||
      !draft.orgNumber.trim() ||
      !draft.address.trim() ||
      !draft.postalCode.trim() ||
      !draft.municipality.trim() ||
      !draft.email.trim()
    ) {
      setMessage("Fyll i samma grunduppgifter som i uppstartsformuläret innan du sparar.");
      return;
    }

    setSavingIds((current) => ({ ...current, [id]: true }));
    setMessage("");

    const response = await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        profile: {
          clinicName: draft.clinicName,
          orgNumber: draft.orgNumber,
          address: draft.address,
          postalCode: draft.postalCode,
          municipality: draft.municipality,
          email: draft.email,
        },
        phone: draft.phone,
        plan: draft.plan || null,
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
            <OrganizationProfileForm
              value={{
                clinicName: creatingForm.clinicName,
                orgNumber: creatingForm.orgNumber,
                address: creatingForm.address,
                postalCode: creatingForm.postalCode,
                municipality: creatingForm.municipality,
                email: creatingForm.email,
              }}
              onChange={(field, value) =>
                setCreatingForm((current) => ({
                  ...current,
                  [field]: value,
                }))
              }
            />
            <input
              value={creatingForm.phone}
              onChange={(event) => setCreatingForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Telefon (valfritt)"
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
            />
            <select
              value={creatingForm.plan}
              onChange={(event) =>
                setCreatingForm((current) => ({
                  ...current,
                  plan: event.target.value as DraftState["plan"],
                }))
              }
              className="w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
            >
              <option value="">Välj plan</option>
              <option value="step1">{planLabelMap.step1}</option>
              <option value="step2">{planLabelMap.step2}</option>
              <option value="step3">{planLabelMap.step3}</option>
            </select>
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
                clinicName: organization.clinic_name || organization.name,
                orgNumber: organization.org_number,
                address: organization.address || "",
                postalCode: organization.postal_code || "",
                municipality: organization.municipality || "",
                email: organization.email,
                phone: organization.phone || "",
                plan: organization.plan || "",
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
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1">
                        Plan: {organization.plan ? planLabelMap[organization.plan] : "Ej vald"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <OrganizationProfileForm
                      value={{
                        clinicName: draft.clinicName,
                        orgNumber: draft.orgNumber,
                        address: draft.address,
                        postalCode: draft.postalCode,
                        municipality: draft.municipality,
                        email: draft.email,
                      }}
                      onChange={(field, value) =>
                        setDrafts((current) => ({
                          ...current,
                          [organization.id]: { ...draft, [field]: value },
                        }))
                      }
                    />
                    <div className="grid gap-3 md:grid-cols-2">
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
                    <select
                      value={draft.plan}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [organization.id]: { ...draft, plan: event.target.value as DraftState["plan"] },
                        }))
                      }
                      className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--ink)]"
                    >
                      <option value="">Välj plan</option>
                      <option value="step1">{planLabelMap.step1}</option>
                      <option value="step2">{planLabelMap.step2}</option>
                      <option value="step3">{planLabelMap.step3}</option>
                    </select>
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
