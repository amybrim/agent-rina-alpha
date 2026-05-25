/**
 * FixQueue — all fix items for the current business.
 * Tabbed by pipeline stage. Rina-voice header. No scores. No /100.
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceLabel, type ConfidenceLevel } from "@/components/ConfidenceLabel";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type FixStatus =
  | "found"
  | "recommended"
  | "drafted"
  | "needs_input"
  | "ready_for_review"
  | "approved"
  | "scheduled"
  | "published"
  | "verified"
  | "deferred"
  | "rejected"
  | "failed";

type ImpactLevel = "high" | "medium" | "low";

const TABS: Array<{ label: string; statuses: FixStatus[]; description: string }> = [
  {
    label: "Active",
    statuses: ["found", "recommended", "needs_input", "drafted", "ready_for_review"],
    description: "Fixes Rina has identified and is working through with you.",
  },
  {
    label: "Approved",
    statuses: ["approved", "scheduled"],
    description: "Fixes you've approved. Ready to go live.",
  },
  {
    label: "Live",
    statuses: ["published", "verified"],
    description: "Fixes that are live on your website or platforms.",
  },
  {
    label: "Deferred",
    statuses: ["deferred", "rejected", "failed"],
    description: "Fixes you've set aside or that didn't make it through.",
  },
];

const IMPACT_COLOR: Record<ImpactLevel, string> = {
  high: "text-rose-600 bg-rose-50 border-rose-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-slate-500 bg-slate-50 border-slate-200",
};

const STATUS_LABEL: Record<FixStatus, string> = {
  found: "Found",
  recommended: "Recommended",
  drafted: "Draft ready",
  needs_input: "Needs input",
  ready_for_review: "Ready for review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  verified: "Verified",
  deferred: "Deferred",
  rejected: "Rejected",
  failed: "Failed",
};

export default function FixQueue() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const { current, isLoading: bizLoading, hasNone } = useCurrentBusiness();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState(0);

  const utils = trpc.useUtils();

  const fixes = trpc.fixes.list.useQuery(
    { businessId: current?.id ?? 0 },
    { enabled: !!current }
  );

  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      utils.fixes.list.invalidate({ businessId: current!.id });
      toast.success("Scan complete. Queue updated.");
    },
    onError: (e) => toast.error("Scan failed: " + e.message),
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const fixList = fixes.data ?? [];
  const tab = TABS[activeTab];
  const filtered = fixList.filter((f) => tab.statuses.includes(f.status as FixStatus));

  const activeCount = fixList.filter((f) =>
    ["found", "recommended", "needs_input", "drafted", "ready_for_review"].includes(f.status)
  ).length;
  const needsInputCount = fixList.filter((f) => f.status === "needs_input").length;

  if (bizLoading || fixes.isLoading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (hasNone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Sparkles className="h-8 w-8 text-violet-300 mb-3" />
        <p className="text-slate-500 text-sm mb-4">
          Set up your business first so Rina can start finding fixes.
        </p>
        <Button
          onClick={() => navigate("/onboarding")}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          Get started
        </Button>
      </div>
    );
  }

  let headerTitle: string;
  let headerSub: string;
  if (activeCount === 0 && fixList.length === 0) {
    headerTitle = `Your queue is clear, ${firstName}.`;
    headerSub = "Run a scan and Rina will start finding things to fix.";
  } else if (activeCount === 0) {
    headerTitle = `Everything is moving forward, ${firstName}.`;
    headerSub = "No active fixes right now. Run a new scan to find more.";
  } else if (needsInputCount > 0) {
    headerTitle = `${needsInputCount} fix${needsInputCount !== 1 ? "es" : ""} need${needsInputCount === 1 ? "s" : ""} your input, ${firstName}.`;
    headerSub = `${activeCount} active fix${activeCount !== 1 ? "es" : ""} in total. The ones marked "Needs input" are waiting on you.`;
  } else {
    headerTitle = `${activeCount} fix${activeCount !== 1 ? "es" : ""} in progress, ${firstName}.`;
    headerSub = "Rina is working through these with you. Review and approve when ready.";
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-800 leading-tight">
            {headerTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{headerSub}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => current && runScan.mutate({ businessId: current.id })}
          disabled={runScan.isPending}
          className="bg-white shrink-0"
        >
          {runScan.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          New scan
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t, i) => {
          const count = fixList.filter((f) =>
            t.statuses.includes(f.status as FixStatus)
          ).length;
          return (
            <button
              key={t.label}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === i
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-5 min-w-[20px] rounded-full text-[10px] font-bold px-1",
                    activeTab === i
                      ? "bg-violet-100 text-violet-700"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">{tab.description}</p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm text-slate-400">Nothing in this stage right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fix) => (
            <button
              key={fix.id}
              onClick={() => navigate(`/app/fixes/${fix.id}`)}
              className="w-full flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left hover:border-violet-200 hover:shadow-sm transition-all group"
            >
              <div className="shrink-0 mt-0.5">
                <StatusDot status={fix.status as FixStatus} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {STATUS_LABEL[fix.status as FixStatus]}
                  </span>
                  {fix.targetPlatform && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{fix.targetPlatform}</span>
                    </>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-800 leading-snug mb-1">
                  {fix.issue}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {fix.recommendation}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      IMPACT_COLOR[fix.impactLevel as ImpactLevel] ??
                        "text-slate-500 bg-slate-50 border-slate-200"
                    )}
                  >
                    {fix.impactLevel} impact
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {fix.difficulty} effort
                  </span>
                  <ConfidenceLabel
                    level={(fix.status === "verified" ? "confirmed" : fix.status === "published" ? "estimated" : "inferred") as ConfidenceLevel}
                  />
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: FixStatus }) {
  if (status === "verified")
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "rejected" || status === "failed")
    return <XCircle className="h-5 w-5 text-rose-400" />;
  if (status === "approved" || status === "published")
    return <CheckCircle2 className="h-5 w-5 text-violet-500" />;
  if (status === "needs_input")
    return (
      <div className="h-5 w-5 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      </div>
    );
  return <Clock className="h-5 w-5 text-slate-400" />;
}
