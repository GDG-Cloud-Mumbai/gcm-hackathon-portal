"use client";

interface LiveTimelineGanttProps {
  regStart: string;
  regEnd: string;
  eventStart: string;
  eventEnd: string;
  subStart: string;
  subDeadline: string;
}

export function LiveTimelineGantt({
  regStart,
  regEnd,
  eventStart,
  eventEnd,
  subStart,
  subDeadline,
}: LiveTimelineGanttProps) {
  const parseTime = (iso: string) => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return isNaN(t) ? null : t;
  };

  const regStartMs = parseTime(regStart);
  const regEndMs = parseTime(regEnd);
  const eventStartMs = parseTime(eventStart);
  const eventEndMs = parseTime(eventEnd);
  const subStartMs = parseTime(subStart);
  const subDeadlineMs = parseTime(subDeadline);

  const allMs = [
    regStartMs, regEndMs,
    eventStartMs, eventEndMs,
    subStartMs, subDeadlineMs,
  ].filter((ms): ms is number => ms !== null);

  if (allMs.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/40">
        Fill in timeline dates to view live Gantt chart visualization.
      </div>
    );
  }

  const minMs = Math.min(...allMs);
  const maxMs = Math.max(...allMs);
  const totalRange = maxMs - minMs || 1; // prevent divide by zero

  const calcPercentage = (startMs: number | null, endMs: number | null) => {
    if (startMs === null || endMs === null || startMs >= endMs) return null;
    const left = Math.max(0, Math.min(100, ((startMs - minMs) / totalRange) * 100));
    const width = Math.max(1, Math.min(100 - left, ((endMs - startMs) / totalRange) * 100));
    return { left, width };
  };

  const regBar = calcPercentage(regStartMs, regEndMs);
  const eventBar = calcPercentage(eventStartMs, eventEndMs);
  const subBar = calcPercentage(subStartMs, subDeadlineMs);

  // Check logical overlaps/violations
  const regOverlapViolation = regEndMs && eventStartMs && regEndMs > eventStartMs;
  const subOverlapViolation = subDeadlineMs && eventEndMs && subDeadlineMs > eventEndMs;

  const formatDateLabel = (ms: number | null) => {
    if (!ms) return "N/A";
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Live Timeline & Gantt Visualizer
          </h3>
          <p className="text-xs text-white/50">
            Real-time visualization across all event phases.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-white/70">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            <span>Registration</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
            <span>Event Execution</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
            <span>Submissions</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(regOverlapViolation || subOverlapViolation) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 space-y-1">
          {regOverlapViolation && (
            <p className="flex items-center gap-1.5 font-medium">
              &bull; Registration end date overlaps with Event start date!
            </p>
          )}
          {subOverlapViolation && (
            <p className="flex items-center gap-1.5 font-medium">
              &bull; Submission deadline extends past Event end date!
            </p>
          )}
        </div>
      )}

      {/* Gantt Bars */}
      <div className="space-y-4 pt-1">
        {/* Registration Row */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-white/60 mb-1">
            <span>Registration Phase</span>
            <span>
              {formatDateLabel(regStartMs)} &mdash; {formatDateLabel(regEndMs)}
            </span>
          </div>
          <div className="relative h-6 w-full rounded-lg bg-white/5 overflow-hidden">
            {regBar ? (
              <div
                style={{ left: `${regBar.left}%`, width: `${regBar.width}%` }}
                className={`absolute top-0 bottom-0 rounded-md transition-all duration-300 ${
                  regOverlapViolation
                    ? "bg-red-500/80 ring-2 ring-red-400"
                    : "bg-[#4285F4] shadow-sm shadow-blue-500/40"
                }`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-white/20 italic">
                Incomplete registration range
              </div>
            )}
          </div>
        </div>

        {/* Event Row */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-white/60 mb-1">
            <span>Event Phase</span>
            <span>
              {formatDateLabel(eventStartMs)} &mdash; {formatDateLabel(eventEndMs)}
            </span>
          </div>
          <div className="relative h-6 w-full rounded-lg bg-white/5 overflow-hidden">
            {eventBar ? (
              <div
                style={{ left: `${eventBar.left}%`, width: `${eventBar.width}%` }}
                className="absolute top-0 bottom-0 rounded-md bg-[#a855f7] shadow-sm shadow-purple-500/40 transition-all duration-300"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-white/20 italic">
                Incomplete event range
              </div>
            )}
          </div>
        </div>

        {/* Submission Row */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-white/60 mb-1">
            <span>Submission Window</span>
            <span>
              {formatDateLabel(subStartMs)} &mdash; {formatDateLabel(subDeadlineMs)}
            </span>
          </div>
          <div className="relative h-6 w-full rounded-lg bg-white/5 overflow-hidden">
            {subBar ? (
              <div
                style={{ left: `${subBar.left}%`, width: `${subBar.width}%` }}
                className={`absolute top-0 bottom-0 rounded-md transition-all duration-300 ${
                  subOverlapViolation
                    ? "bg-red-500/80 ring-2 ring-red-400"
                    : "bg-[#10b981] shadow-sm shadow-emerald-500/40"
                }`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-white/20 italic">
                Incomplete submission range
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Axis markers */}
      <div className="flex justify-between border-t border-white/5 pt-2 text-[10px] font-mono text-white/30">
        <span>Start: {formatDateLabel(minMs)}</span>
        <span>End: {formatDateLabel(maxMs)}</span>
      </div>
    </div>
  );
}
