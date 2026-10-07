"use client";

import { useState } from "react";

export function FieldHelp({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onBlur={() => setIsOpen(false)}
        aria-label="Hjälp"
        aria-expanded={isOpen}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--line-strong)] text-[10px] font-bold normal-case tracking-normal text-[color:var(--muted)] hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
      >
        i
      </button>
      {isOpen ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-lg border border-[color:var(--line)] bg-white p-2 text-xs font-normal normal-case leading-5 tracking-normal text-[color:var(--ink)] shadow-[0_10px_25px_rgba(14,31,53,0.12)]"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
