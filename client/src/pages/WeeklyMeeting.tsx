/**
 * WeeklyMeeting — the primary page at /app.
 * Matches the mockup: header with week date, 5 question cards with icons,
 * AI Lead Signals section, Rina Can Help action grid, 5-stage pipeline tracker.
 *
 * No numerical scores. No /100. Grades only: CLEAR / PARTIAL / NOT_YET_VISIBLE.
 */
import RinaLayout from "@/components/RinaLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GradePill } from "@/components/ConfidenceLabel";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Eye,
  FileText,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// ─── Grade display ────────────────────────────────────────────────────────────
type Grade = "clear" | "partial" | "not_yet_visible" | null | undefined;

const GRADE_LABEL: Record<string, string> = {
  clear: "Improving",
  partial: "Needs Proof",
  not_yet_visible: "Watch",
};

const GRADE_BADGE_CLASS: Record<string, string> = {
  clear: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  partial: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  not_yet_visible: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const GRADE_ICON_BG: Record<string, string> = {
  clear: "bg-emerald-50 text-emerald-600",
  partial: "bg-amber-50 text-amber-600",
  not_yet_visible: "bg-rose-50 text-rose-500",
};

// ─── Five question definitions ────────────────────────────────────────────────
const QUESTIONS = [
  {
    key: "showingUpGrade" as const,
    number: 1,
    icon: Eye,
    question: "Are we showing up?",
    caption: "Visibility up vs last week",
    emptyCaption: "Run a scan to measure visibility",
  },
  {
    key: "beingUnderstoodGrade" as const,
    number: 2,
    icon: MessageSquareText,
    question: "Are we being understood?",
    caption: "Add clearer answers and examples",
    emptyCaption: "Schema + clarity not yet measured",
  },
  {
    key: "trustGrade" as const,
    number: 3,
    icon: ShieldCheck,
    question: "Are we trusted?",
    caption: "Add 2–3 proof points",
    emptyCaption: "Authority not yet measured",
  },
  {
    key: "recommendationReadyGrade" as const,
    number: 4,
    icon: Star,
    question: "Are we recommendation-ready?",
    caption: "Strong signals — keep building",
    emptyCaption: "Citability not yet measured",
  },
  {
    key: "geoReadinessGrade" as const,
    number: 5,
    icon: Wrench,
    question: "What should we fix next?",
    caption: "High-impact fixes identified",
    emptyCaption: "Run a scan to surface fixes",
  },
] as const;

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { label: "Recommended", statuses: ["recommended", "found"], icon: Lightbulb, hint: "priorities identified" },
  { label: "Drafted", statuses: ["drafted", "needs_input", "ready_for_review"], icon: Pencil, hint: "in progress" },
  { label: "Approved", statuses: ["approved"], icon: CheckCircle2, hint: "ready to publish" },
  { label: "Published", statuses: ["published", "scheduled"], icon: CloudUpload, hint: "live across channels" },
  { label: "Verified", statuses: ["verified"], icon: ShieldCheck, hint: "tracking impact" },
] as const;

// ─── Rina Can Help actions ────────────────────────────────────────────────────
const RINA_ACTIONS = [
  { label: "Draft FAQ", icon: MessageSquareText, hint: "Answer top customer questions" },
  { label: "Update Metadata", icon: FileText, hint: "Refine titles and descriptions" },
  { label: "Create Blog Post", icon: Pencil, hint: "Publish a fresh signal" },
  { label: "Send to Wix", icon: Send, hint: "Push approved fixes" },
  { label: "Schedule Social Post", icon: CalendarDays, hint: "Reinforce visibility" },
  { label: "Verify Change", icon: ShieldCheck, hint: "Confirm fixes landed" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function WeeklyMeeting() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const { current, isLoading: bizLoading, hasNone } = useCurrentBusiness();
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  const briefing = trpc.briefing.latest.useQuery(
    { businessId: current?.id ?? 0 },
    { enabled: !!current }
  );

  const snapshot = trpc.snapshot.get.useQuery(
    { businessId: current?.id ?? 0 },
    { enabled: !!current }
  );

  const fixes = trpc.fixes.list.useQuery(
    { businessId: current?.id ?? 0 },
    { enabled: !!current }
  );

  const leads = trpc.leads.summary.useQuery(
    { businessId: current?.id ?? 0 },
    { enabled: !!current }
  );

  const generateBriefing = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      utils.briefing.latest.invalidate({ businessId: current!.id });
      utils.snapshot.get.invalidate({ businessId: current!.id });
      toast.success("Briefing updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      utils.snapshot.get.invalidate({ businessId: current!.id });
      utils.fixes.list.invalidate({ businessId: current!.id });
      toast.success("Scan complete. Refreshing your meeting…");
    },
    onError: (e) => toast.error("Scan failed: " + e.message),
  });

  const isScanning = runScan.isPending;
  const isGenerating = generateBriefing.isPending;
  const isBusy = isScanning || isGenerating;

  // Pipeline counts
  const fixList = fixes.data ?? [];
  const pipelineCounts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: fixList.filter((f) => stage.statuses.includes(f.status as never)).length,
  }));

  const b = briefing.data;
  const snap = snapshot.data;

  // Week label
  const weekLabel = b?.weekStartDate
    ? `Week of ${new Date(b.weekStartDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : `Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <RinaLayout>
        <div className="space-y-6 py-2">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        </div>
      </RinaLayout>
    );
  }

  // ─── No business ──────────────────────────────────────────────────────────
  if (hasNone) {
    return (
      <RinaLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl text-slate-800 mb-2">
            Let's introduce Rina to your business.
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            Before Rina can run your weekly meeting, she needs to understand what you do and who you serve.
          </p>
          <Button
            onClick={() => navigate("/onboarding")}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" /> Start the interview
          </Button>
        </div>
      </RinaLayout>
    );
  }

  // ─── No briefing yet ──────────────────────────────────────────────────────
  if (!b && !briefing.isLoading) {
    return (
      <RinaLayout>
        <div className="space-y-6 py-2">
          <WeeklyHeader weekLabel={weekLabel} businessName={current?.name} />
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl text-slate-800 mb-2">
              Your first meeting is almost ready.
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              {snap && snap.openFindings > 0
                ? `I found ${snap.openFindings} signal${snap.openFindings !== 1 ? "s" : ""} on your first scan. Let me write your briefing.`
                : "I need to scan your website before I can write your briefing."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {snap && snap.openFindings > 0 ? (
                <Button
                  onClick={() => generateBriefing.mutate({ businessId: current!.id })}
                  disabled={isBusy}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Write my briefing
                </Button>
              ) : (
                <Button
                  onClick={() => runScan.mutate({ businessId: current!.id })}
                  disabled={isBusy}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isScanning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Scan my website
                </Button>
              )}
            </div>
          </div>
        </div>
      </RinaLayout>
    );
  }

  // ─── Full meeting ─────────────────────────────────────────────────────────
  return (
    <RinaLayout>
      <div className="space-y-7 py-2">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <WeeklyHeader
          weekLabel={weekLabel}
          businessName={current?.name}
          onRefresh={() => current && runScan.mutate({ businessId: current.id })}
          isBusy={isBusy}
        />

        {/* ── Big question headline ─────────────────────────────────────── */}
        <div>
          <h2 className="font-display text-3xl text-violet-700 leading-tight">
            How are we doing with AI visibility this week?{" "}
            <span className="text-amber-400">✦</span>
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Your AI visibility snapshot, insights, and actions — so we keep getting better.
          </p>
        </div>

        {/* ── Five question cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {QUESTIONS.map((q) => {
            const grade = b ? (b[q.key] as Grade) : undefined;
            const Icon = q.icon;
            const gradeLabel = grade ? (GRADE_LABEL[grade] ?? grade) : "Pending";
            const badgeClass = grade ? (GRADE_BADGE_CLASS[grade] ?? GRADE_BADGE_CLASS.not_yet_visible) : "bg-slate-100 text-slate-500";
            const iconBg = grade ? (GRADE_ICON_BG[grade] ?? GRADE_ICON_BG.not_yet_visible) : "bg-slate-100 text-slate-400";
            const caption = grade ? q.caption : q.emptyCaption;

            return (
              <button
                key={q.key}
                onClick={() => navigate("/app/scorecard")}
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 flex flex-col items-center text-center hover:border-violet-200 hover:shadow-[0_8px_36px_-16px_rgba(80,40,160,0.22)] transition-all duration-200 active:scale-[0.99]"
              >
                {/* Number badge */}
                <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-600 text-[11px] font-bold flex items-center justify-center mb-3">
                  {q.number}
                </div>
                {/* Icon */}
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${iconBg}`}>
                  <Icon className="h-6 w-6" />
                </div>
                {/* Question */}
                <div className="font-display text-sm leading-snug mb-2.5 text-slate-800">
                  {q.question}
                </div>
                {/* Grade badge */}
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeClass}`}>
                  {gradeLabel}
                </span>
                {/* Caption */}
                <div className="text-[11px] text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                  {caption}
                </div>
                {/* Arrow */}
                <div className="mt-3 text-slate-300 group-hover:text-violet-400 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── AI Lead Signals + Rina Can Help ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* AI Lead Signals */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-display text-base text-slate-800">AI Lead Signals</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Where your leads are coming from.</p>
              </div>
            </div>

            <div className="space-y-3">
              <LeadSignalRow
                icon={CheckCircle2}
                iconClass="text-emerald-600 bg-emerald-50"
                label="Confirmed AI-assisted leads"
                value={leads.data?.confirmedAi ?? "—"}
              />
              <LeadSignalRow
                icon={HelpCircle}
                iconClass="text-amber-600 bg-amber-50"
                label="Likely visibility-influenced leads"
                value={leads.data?.likelyAi ?? "—"}
              />
              <LeadSignalRow
                icon={HelpCircle}
                iconClass="text-slate-400 bg-slate-50"
                label="Unknown source"
                value={leads.data?.unknown ?? "—"}
              />
            </div>

            <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total tracked</span>
              <span className="font-display text-xl text-slate-800">
                {leads.data
                  ? (leads.data.confirmedAi ?? 0) + (leads.data.likelyAi ?? 0) + (leads.data.unknown ?? 0)
                  : "—"}
              </span>
            </div>
          </div>

          {/* Rina Can Help */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <h3 className="font-display text-base text-slate-800">Rina Can Help</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Take action, update content, and integrate — faster.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {RINA_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() => navigate("/app/fixes")}
                    className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-left hover:border-violet-200 hover:bg-violet-50/40 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-violet-600 group-hover:border-violet-200 transition-colors">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-800 leading-tight truncate">
                        {a.label}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 5-Stage Pipeline Tracker ──────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Fix pipeline
            </div>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs"
              onClick={() => {
                if (b) navigate("/app/briefing");
                else if (snap) generateBriefing.mutate({ businessId: current!.id });
                else toast.message("Run your first scan to unlock briefings.");
              }}
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              {b ? "View Full Action Plan" : "Generate Action Plan"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {pipelineCounts.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div key={stage.label} className="flex-1 flex items-center gap-2">
                  <button
                    onClick={() => navigate("/app/fixes")}
                    className="flex-1 group flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-3 hover:border-violet-200 hover:bg-violet-50/40 transition-colors text-center"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stage.count > 0 ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`font-display text-xl font-bold leading-none ${stage.count > 0 ? "text-violet-600" : "text-slate-300"}`}>
                      {stage.count}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {stage.hint}
                    </div>
                  </button>
                  {i < pipelineCounts.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Refresh controls ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => current && runScan.mutate({ businessId: current.id })}
            disabled={isBusy}
            className="bg-white"
          >
            {isScanning ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Run new scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => current && generateBriefing.mutate({ businessId: current.id })}
            disabled={isBusy}
            className="bg-white"
          >
            {isGenerating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh briefing
          </Button>
        </div>

      </div>
    </RinaLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function WeeklyHeader({
  weekLabel,
  businessName,
  onRefresh,
  isBusy,
}: {
  weekLabel: string;
  businessName?: string;
  onRefresh?: () => void;
  isBusy?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl text-slate-800 leading-tight">
          Rina's Weekly Visibility Meeting
        </h1>
        {businessName && (
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-medium text-slate-700">{businessName}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {weekLabel}
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isBusy}
            className="bg-white h-8"
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function LeadSignalRow({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  iconClass: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-700 leading-tight">{label}</div>
      </div>
      <div className="font-display text-xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
