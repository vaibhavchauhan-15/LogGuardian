"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type CustomSelectOption<T extends string> = {
  value: T;
  label: string;
  dotClassName?: string;
};

type CustomSelectProps<T extends string> = {
  label: string;
  value: T;
  options: Array<CustomSelectOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
};

export function CustomSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  buttonClassName,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={cn("relative text-sm", className)} ref={rootRef}>
      <span className="mb-1 block text-sm text-muted-foreground">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          buttonClassName
        )}
      >
        <span className="inline-flex items-center gap-2">
          {selectedOption.dotClassName ? (
            <span className={cn("h-2 w-2 rounded-full", selectedOption.dotClassName)} aria-hidden="true" />
          ) : null}
          {selectedOption.label}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open ? "rotate-180" : "")} aria-hidden="true" />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card p-1 shadow-none"
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-brand/10 text-brand"
                      : "text-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {option.dotClassName ? (
                      <span className={cn("h-2 w-2 rounded-full", option.dotClassName)} aria-hidden="true" />
                    ) : null}
                    {option.label}
                  </span>
                  {isActive ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
