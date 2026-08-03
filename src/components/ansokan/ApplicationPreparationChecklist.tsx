"use client";

import { useState } from "react";

const checklistSections: Array<{ title: string; items: string[] }> = [
  {
    title: "Grunduppgifter om kliniken",
    items: [
      "Organisationsnummer",
      "Klinikens namn",
      "Besöksadress (gatuadress, postnummer, ort)",
      "Kontakt-e-post",
    ],
  },
  {
    title: "Uppgifter om ansvariga personer",
    items: [
      "Namn, roll och legitimationsnummer för varje ansvarig person",
      "Vem som är verksamhetschef (obligatoriskt — exakt en person)",
    ],
  },
  {
    title: "Uppgifter om ägarbild",
    items: [
      "Namn och ägarandel (%) för samtliga delägare",
      "Andelarna måste summera till 100 %",
    ],
  },
  {
    title: "Handlingar att ha skannade och redo att ladda upp",
    items: [
      "Lokalritningar",
      "Hyreskontrakt eller annan handling som visar dispositionsrätt till lokalerna",
      "Handling som styrker insikt (t.ex. examensbevis eller tjänsteintyg) — gäller tre kunskapsområden (patientsäkerhet/tandvårdslagstiftning, arbetsrätt, ekonomi), kan vara fördelat inom ägar-/ledningskretsen",
      "Handling som visar samtliga delägare (t.ex. aktiebok eller registreringsbevis från Bolagsverket)",
      "Bilaga per mottagning/verksamhetsställe (om fler än en mottagning ingår)",
    ],
  },
  {
    title: "Ekonomiska uppgifter",
    items: [
      "Förväntade intäkter och kostnader per period",
      "Hur eventuellt underskott eller uppstartskostnad finansieras",
    ],
  },
  {
    title: "Beslut att ha klart i förväg",
    items: [
      "Vilken/vilka inriktningskoder som gäller: Tandhygienistverksamhet (A01) / Tandläkarverksamhet, allmän tandvård (A02) + ev. specialistkoder (A03–A11) / Verksamhet utanför traditionell mottagning (A12)",
    ],
  },
];

export function ApplicationPreparationChecklist() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Innan du börjar
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
            Förbered dig innan du börjar
          </h2>
        </div>
        <span className="text-sm font-semibold text-[color:var(--brand)]">
          {isOpen ? "Dölj checklista ▴" : "Visa checklista ▾"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {checklistSections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4"
            >
              <p className="text-sm font-semibold text-[color:var(--ink)]">{section.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
