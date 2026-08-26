"use client";

import { useEffect, useRef, useState } from "react";

interface CustomDateTimePickerProps {
  label?: string;
  value: string; // ISO string e.g. "2026-08-15T09:00" or ISO format
  onChange: (isoString: string) => void;
  error?: string;
  placeholder?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CustomDateTimePicker({
  label,
  value,
  onChange,
  error,
  placeholder = "Select date and time",
}: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing date or default to current date
  const parsedDate = value ? new Date(value) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validDate.getMonth());

  const [selectedDay, setSelectedDay] = useState(validDate.getDate());
  const [hours12, setHours12] = useState(() => {
    const h = validDate.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  });
  const [minutes, setMinutes] = useState(validDate.getMinutes());
  const [ampm, setAmpm] = useState<"AM" | "PM">(validDate.getHours() >= 12 ? "PM" : "AM");

  // Keep internal states in sync if value prop changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDay(d.getDate());
        const h = d.getHours();
        setHours12(h === 0 ? 12 : h > 12 ? h - 12 : h);
        setMinutes(d.getMinutes());
        setAmpm(h >= 12 ? "PM" : "AM");
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function emitChange(year: number, month: number, day: number, h12: number, min: number, period: "AM" | "PM") {
    let h24 = h12 % 12;
    if (period === "PM") h24 += 12;

    // Build ISO datetime string in YYYY-MM-DDTHH:mm format
    const yyyy = year.toString().padStart(4, "0");
    const mm = (month + 1).toString().padStart(2, "0");
    const dd = day.toString().padStart(2, "0");
    const hh = h24.toString().padStart(2, "0");
    const mi = min.toString().padStart(2, "0");

    const isoStr = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    onChange(isoStr);
  }

  function handleSelectDay(day: number) {
    setSelectedDay(day);
    emitChange(viewYear, viewMonth, day, hours12, minutes, ampm);
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function handleHourChange(newH12: number) {
    setHours12(newH12);
    emitChange(viewYear, viewMonth, selectedDay, newH12, minutes, ampm);
  }

  function handleMinuteChange(newMin: number) {
    setMinutes(newMin);
    emitChange(viewYear, viewMonth, selectedDay, hours12, newMin, ampm);
  }

  function handleAmpmToggle(newAmpm: "AM" | "PM") {
    setAmpm(newAmpm);
    emitChange(viewYear, viewMonth, selectedDay, hours12, minutes, newAmpm);
  }

  // Days calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Formatting display text
  function formatDisplay() {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const dayStr = d.getDate().toString().padStart(2, "0");
    const monthStr = MONTH_NAMES[d.getMonth()].slice(0, 3);
    const yearStr = d.getFullYear();
    const h = d.getHours();
    const displayH = (h === 0 ? 12 : h > 12 ? h - 12 : h).toString().padStart(2, "0");
    const displayM = d.getMinutes().toString().padStart(2, "0");
    const displayPeriod = h >= 12 ? "PM" : "AM";

    return `${dayStr} ${monthStr} ${yearStr}, ${displayH}:${displayM} ${displayPeriod}`;
  }

  const displayText = formatDisplay();

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
          {label}
        </label>
      )}

      {/* Control button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border bg-black/60 px-4 py-3 text-sm text-left transition focus:outline-none ${error
            ? "border-red-500/60 focus:border-red-500"
            : isOpen
              ? "border-[#4285F4] ring-1 ring-[#4285F4]/30"
              : "border-white/10 hover:border-white/20"
          }`}
      >
        <span className={displayText ? "text-white font-medium" : "text-white/30"}>
          {displayText || placeholder}
        </span>
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {error && <p className="mt-1 text-xs text-red-400 font-medium">{error}</p>}

      {/* Popover Calendar Grid */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 rounded-2xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
            >
              &larr;
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
            >
              &rarr;
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-semibold text-white/40">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                selectedDay === dayNum &&
                validDate.getMonth() === viewMonth &&
                validDate.getFullYear() === viewYear;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-lg flex items-center justify-center font-medium transition ${isSelected
                      ? "bg-[#4285F4] text-white shadow-md shadow-blue-500/30 font-bold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Time Picker Controls */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Time
            </span>
            <div className="flex items-center gap-1.5 text-xs text-white">
              {/* Hours */}
              <select
                value={hours12}
                onChange={(e) => handleHourChange(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-white focus:border-[#4285F4] focus:outline-none"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const h = i + 1;
                  return (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}
                    </option>
                  );
                })}
              </select>

              <span>:</span>

              {/* Minutes */}
              <select
                value={minutes}
                onChange={(e) => handleMinuteChange(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-white focus:border-[#4285F4] focus:outline-none"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {m.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>

              {/* AM / PM */}
              <div className="flex rounded-lg border border-white/10 bg-black/80 overflow-hidden ml-1">
                <button
                  type="button"
                  onClick={() => handleAmpmToggle("AM")}
                  className={`px-2 py-1 text-[11px] font-semibold transition ${ampm === "AM" ? "bg-[#4285F4] text-white" : "text-white/50 hover:text-white"
                    }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleAmpmToggle("PM")}
                  className={`px-2 py-1 text-[11px] font-semibold transition ${ampm === "PM" ? "bg-[#4285F4] text-white" : "text-white/50 hover:text-white"
                    }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
