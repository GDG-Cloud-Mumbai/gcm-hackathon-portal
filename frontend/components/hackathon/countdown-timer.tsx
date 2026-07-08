"use client";

import { useEffect, useState } from "react";

type Props = {
  endsAt: string;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  ended: boolean;
};

function compute(endsAt: string): TimeLeft {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, ended: true };
  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, ended: false };
}

export function CountdownTimer({ endsAt }: Props) {
  const [time, setTime] = useState<TimeLeft>(() => compute(endsAt));

  useEffect(() => {
    // Update every minute — sufficient precision for a multi-day event.
    const id = setInterval(() => setTime(compute(endsAt)), 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (time.ended) {
    return (
      <span className="font-mono text-xs text-white/30">Hackathon ended</span>
    );
  }

  const parts: string[] = [];
  if (time.days > 0) parts.push(`${time.days}d`);
  if (time.hours > 0 || time.days > 0) parts.push(`${time.hours}h`);
  parts.push(`${time.minutes}m`);

  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34A853]" />
      <span className="font-mono text-xs text-white/50">
        Ends in {parts.join(" ")}
      </span>
    </div>
  );
}
