"use client";

import { isValidSwedishOrgNumber, type OrganizationProfileInput } from "@/lib/organization-profile";

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
  { key: "orgNumber", label: "Organisationsnummer", placeholder: "T.ex. 556677-8899" },
  { key: "address", label: "Besöksadress", placeholder: "Besöksadress" },
  { key: "postalCode", label: "Postnummer", placeholder: "Postnummer" },
  { key: "municipality", label: "Ort", placeholder: "Ort" },
  { key: "email", label: "E-post", placeholder: "E-post", type: "email" },
];

// Live, per-keystroke feedback for the fields that have an actual format to get wrong (not
// just "empty") — waits until the value is plausibly complete so it doesn't flash red on the
// first couple of keystrokes.
function liveFieldError(key: keyof OrganizationProfileInput, rawValue: string): string | null {
  const value = rawValue.trim();

  if (key === "orgNumber" && value.length >= 10 && !isValidSwedishOrgNumber(value)) {
    return "Stämmer inte med ett giltigt organisationsnummer (kontrollsiffran matchar inte).";
  }

  if (key === "email" && value.length > 3 && value.includes("@") && !/^\S+@\S+\.\S+$/.test(value)) {
    return "Ser inte ut som en giltig e-postadress.";
  }

  return null;
}

export default function OrganizationProfileForm({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const error = liveFieldError(field.key, value[field.key]);

        return (
          <div key={field.key}>
            <label className="text-xs font-semibold text-[color:var(--muted)]">{field.label}</label>
            <input
              type={field.type || "text"}
              value={value[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              className={`mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm text-[color:var(--ink)] disabled:cursor-not-allowed disabled:bg-slate-100 ${
                error ? "border-red-400 focus:border-red-500" : "border-[color:var(--line)]"
              }`}
            />
            {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
