/**
 * ConfidenceLabel — shows how Rina knows something.
 * Used everywhere a finding, grade, or recommendation appears.
 * No numbers. No percentages. Signal quality only.
 */
import { cn } from "@/lib/utils";

export type ConfidenceLevel = "confirmed" | "inferred" | "estimated" | "unknown";

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; dot: string; text: string; bg: string; title: string }
> = {
  confirmed: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    title: "Rina verified this directly from your website or a connected source.",
  },
  inferred: {
    label: "Inferred",
    dot: "bg-violet-500",
    text: "text-violet-700",
    bg: "bg-violet-50",
    title: "Rina inferred this from patterns across multiple signals.",
  },
  estimated: {
    label: "Estimated",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    title: "Rina estimated this — connect more sources to confirm.",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-slate-400",
    text: "text-slate-500",
    bg: "bg-slate-50",
    title: "Rina does not have enough signal to assess this yet.",
  },
};

interface ConfidenceLabelProps {
  level: ConfidenceLevel;
  className?: string;
  size?: "xs" | "sm";
}

export function ConfidenceLabel({
  level,
  className,
  size = "xs",
}: ConfidenceLabelProps) {
  const c = CONFIG[level];
  return (
    <span
      title={c.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "xs"
          ? "px-1.5 py-0.5 text-[10px]"
          : "px-2 py-0.5 text-xs",
        c.bg,
        c.text,
        className
      )}
    >
      <span className={cn("rounded-full shrink-0", size === "xs" ? "h-1.5 w-1.5" : "h-2 w-2", c.dot)} />
      {c.label}
    </span>
  );
}

/** Grade pill: clear / partial / not_yet_visible */
export type GradeValue = "clear" | "partial" | "not_yet_visible" | null | undefined;

const GRADE_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; bg: string }
> = {
  clear: {
    label: "Clear",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  partial: {
    label: "Partial",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  not_yet_visible: {
    label: "Not yet visible",
    dot: "bg-rose-500",
    text: "text-rose-700",
    bg: "bg-rose-50",
  },
};

interface GradePillProps {
  grade: GradeValue;
  className?: string;
}

export function GradePill({ grade, className }: GradePillProps) {
  const c = grade ? GRADE_CONFIG[grade] : null;
  if (!c) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-400",
          className
        )}
      >
        <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
        Not assessed
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", c.dot)} />
      {c.label}
    </span>
  );
}
