"use client";

import type { OrganizationProfileInput } from "@/lib/organization-profile";

type Props = {
  value: OrganizationProfileInput;
  onChange: (field: keyof OrganizationProfileInput, value: string) => void;
  disabled?: boolean;
};

const fields: Array<{
  key: keyof OrganizationProfileInput;
  placeholder: string;
  type?: "text" | "email";
}> = [
  { key: "clinicName", placeholder: "Klinikens namn" },
  { key: "orgNumber", placeholder: "Organisationsnummer" },
  { key: "address", placeholder: "Besöksadress" },
  { key: "postalCode", placeholder: "Postnummer" },
  { key: "municipality", placeholder: "Ort" },
  { key: "email", placeholder: "E-post", type: "email" },
];

export default function OrganizationProfileForm({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <input
          key={field.key}
          type={field.type || "text"}
          value={value[field.key]}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      ))}
    </div>
  );
}