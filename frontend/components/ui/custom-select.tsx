"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type CustomSelectOption = {
  value: string;
  label: string;
  dotColor?: string; // hex or tailwind class
};

type CustomSelectProps = {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  className?: string;
};

export function CustomSelect({ options, value, onChange, label, id, className = "" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="block font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.4px] text-[var(--muted-foreground)]">
          {label}
        </span>
      )}
      <div ref={ref} className="relative" id={id}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-9 w-full min-w-[140px] items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 font-['IBM_Plex_Mono'] text-xs text-[var(--foreground)] transition-colors duration-150 hover:border-[var(--brand)] hover:bg-[var(--muted)] focus:outline-none"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.dotColor && (
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: selected.dotColor }}
                aria-hidden="true"
              />
            )}
            {selected?.label}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute top-full z-50 mt-1.5 w-full min-w-[140px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
          >
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 font-['IBM_Plex_Mono'] text-xs transition-colors duration-100 ${
                    isActive
                      ? "bg-[#3ecf8e]/10 text-[#3ecf8e]"
                      : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {option.dotColor && (
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: option.dotColor }}
                      aria-hidden="true"
                    />
                  )}
                  {option.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
