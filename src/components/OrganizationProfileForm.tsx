"use client";

import type { OrganizationProfileInput } from "@/lib/organization-profile";

type Props = {
  value: OrganizationProfileInput;
  onChange: (field: keyof OrganizationProfileInput, value: string) => void;
  disabled?: boolean;
};

const fields: Array<{
  key: keyof OrganizationProfileInput;
  label: string;
  placeholder: string;
  type?: "text" | "email";
}> = [
  { key: "clinicName", label: "Klinikens namn", placeholder: "Klinikens namn" },
  { key: "orgNumber", label: "Organisationsnummer", placeholder: "Organisationsnummer" },
  { key: "address", label: "Besöksadress", placeholder: "Besöksadress" },
  { key: "postalCode", label: "Postnummer", placeholder: "Postnummer" },
  { key: "municipality", label: "Ort", placeholder: "Ort" },
  { key: "email", label: "E-post", placeholder: "E-post", type: "email" },
];

export default function OrganizationProfileForm({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-xs font-semibold text-[color:var(--muted)]">{field.label}</label>
          <input
            type={field.type || "text"}
            value={value[field.key]}
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      ))}
    </div>
  );
}