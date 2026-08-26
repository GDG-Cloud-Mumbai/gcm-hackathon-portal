"use client";

import { useEffect, useRef, useState } from "react";

interface TimezoneSelectProps {
  label?: string;
  value: string;
  onChange: (timezone: string) => void;
}

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
];

export function TimezoneSelect({ label = "Timezone", value, onChange }: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [timezones, setTimezones] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        const supported = Intl.supportedValuesOf("timeZone");
        setTimezones(supported);
      } else {
        setTimezones(COMMON_TIMEZONES);
      }
    } catch {
      setTimezones(COMMON_TIMEZONES);
    }
  }, []);

  // Detect browser default if initial value is empty
  useEffect(() => {
    if (!value) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) {
          onChange(detected);
        }
      } catch {
        onChange("Asia/Kolkata");
      }
    }
  }, [value, onChange]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = timezones.filter((tz) =>
    tz.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
          {label}
        </label>
      )}

      {/* Select button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border bg-black/60 px-4 py-3 text-sm text-left transition focus:outline-none ${
          isOpen
            ? "border-[#4285F4] ring-1 ring-[#4285F4]/30"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <span className="font-medium text-white">{value || "Select Timezone..."}</span>
        <svg
          className="h-4 w-4 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Searchable Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-60 rounded-2xl border border-white/15 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 flex flex-col">
          <input
            type="text"
            placeholder="Search timezone (e.g. Asia/Kolkata)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-[#4285F4] focus:outline-none mb-2"
          />

          <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-white/40">
                No matching timezones
              </div>
            ) : (
              filtered.map((tz) => (
                <button
                  key={tz}
                  type="button"
                  onClick={() => {
                    onChange(tz);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs transition ${
                    tz === value
                      ? "bg-[#4285F4] font-semibold text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tz}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
