/**
 * WeeklyMeeting — rebuilt to match the mockup exactly.
 *
 * Layout:
 * • Header: "Rina's Weekly Visibility Meeting" + business name + week date + refresh
 * • Big violet headline: "How are we doing with AI visibility this week? ✦"
 * • 5 question cards in a row — each with: number badge, icon, question, grade badge, Rina interpretation, chevron
 * • Two bottom panels: AI Lead Signals (left) + Rina Can Help (right)
 * • 5-stage pipeline bar at the very bottom
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
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

// ─── Grade helpers ────────────────────────────────────────────────────────────
type Grade = "clear" | "partial" | "not_yet_visible" | null | undefined;

function GradeBadge({ grade }: { grade: Grade }) {
  if (!grade) return <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400">—</span>;

  const cfg: Record<string, { label: string; cls: string }> = {
    clear:            { label: "Improving",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    partial:          { label: "Needs Proof",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
    not_yet_visible:  { label: "Watch",         cls: "bg-slate-50 text-slate-600 border-slate-200" },
  };

  const { label, cls } = cfg[grade] ?? cfg.not_yet_visible;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function DraftReadyBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
      Draft Ready
    </span>
  );
}

// ─── Interpretation copy per grade ───────────────────────────────────────────
const INTERP: Record<string, Record<string, string>> = {
  showing_up: {
    clear:           "Visibility up vs. last week",
    partial:         "Showing up in some searches",
    not_yet_visible: "Not yet appearing in AI results",
  },
  being_understood: {
    clear:           "AI describes you accurately",
    partial:         "Add clearer answers and examples",
    not_yet_visible: "AI can't interpret your offer yet",
  },
  trusted: {
    clear:           "Strong signals — keep building",
    partial:         "Add 2–3 proof points",
    not_yet_visible: "Trust signals not yet detected",
  },
  recommendation_ready: {
    clear:           "Strong signals — keep building",
    partial:         "Almost recommendation-ready",
    not_yet_visible: "Not yet in recommendation pool",
  },
};

// ─── 5 question card definitions ─────────────────────────────────────────────
const QUESTIONS = [
  {
    num: 1,
    key: "showing_up",
    question: "Are we showing up?",
    icon: Eye,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    link: "/app/scorecard",
  },
  {
    num: 2,
    key: "being_understood",
    question: "Are we being understood?",
    icon: MessageSquareText,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-50",
    link: "/app/scorecard",
  },
  {
    num: 3,
    key: "trusted",
    question: "Are we trusted?",
    icon: ShieldCheck,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    link: "/app/scorecard",
  },
  {
    num: 4,
    key: "recommendation_ready",
    question: "Are we recommendation-ready?",
    icon: Star,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    link: "/app/scorecard",
  },
  {
    num: 5,
    key: "fix_priority",
    question: "What should we fix next?",
    icon: Wrench,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    link: "/app/fixes",
  },
];

// ─── Rina Can Help actions ────────────────────────────────────────────────────
const RINA_ACTIONS = [
  { label: "Draft FAQ",           icon: FileText,        link: "/app/fixes" },
  { label: "Update Metadata",     icon: Pencil,          link: "/app/fixes" },
  { label: "Create Blog Post",    icon: FileText,        link: "/app/fixes" },
  { label: "Send to Wix",         icon: Send,            link: "/app/integrations" },
  { label: "Schedule Social Post",icon: CalendarDays,    link: "/app/integrations" },
  { label: "Verify Change",       icon: CheckCircle2,    link: "/app/fixes" },
];

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: "recommended", label: "Recommended", sub: "priorities identified", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50", filter: ["recommended"] },
  { key: "drafted",     label: "Drafted",     sub: "In progress",           icon: Pencil,    color: "text-violet-600", bg: "bg-violet-50", filter: ["drafted", "needs_input"] },
  { key: "approved",    label: "Approved",    sub: "Ready to publish",      icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50", filter: ["approved", "ready_for_review"] },
  { key: "published",   label: "Published",   sub: "Live across channels",  icon: CloudUpload, color: "text-blue-600", bg: "bg-blue-50", filter: ["scheduled", "published"] },
  { key: "verified",    label: "Verified",    sub: "Tracking impact",       icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", filter: ["verified"] },
];

// ─── Header ───────────────────────────────────────────────────────────────────
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
        <h1 className="font-display text-2xl font-bold text-slate-800 leading-tight">
          Rina's Weekly Visibility Meeting
        </h1>
        {businessName && (
          <div className="text-sm text-slate-500 mt-0.5">{businessName}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          {weekLabel}
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onRefresh}
            disabled={isBusy}
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyMeeting() {
  const { businessId, current, hasNone, isLoading: bizLoading } = useCurrentBusiness();
  const [, navigate] = useLocation();

  const snap = trpc.snapshot.get.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );
  const briefing = trpc.briefing.latest.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );
  const leadSignals = trpc.leads.summary.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );
  const fixes = trpc.fixes.list.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );

  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      snap.refetch();
      briefing.refetch();
      toast.success("Scan complete — refreshing your meeting.");
    },
    onError: () => toast.error("Scan failed. Please try again."),
  });
  const generateBriefing = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      briefing.refetch();
      toast.success("Briefing generated!");
    },
    onError: () => toast.error("Could not generate briefing."),
  });

  const isScanning = runScan.isPending;
  const isGenerating = generateBriefing.isPending;
  const isBusy = isScanning || isGenerating;

  const weekLabel = useMemo(() => {
    const d = snap.data?.weekStartDate ? new Date(snap.data.weekStartDate) : new Date();
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const fmt = (dt: Date) =>
      dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `Week of ${fmt(d)} – ${fmt(end)}, ${d.getFullYear()}`;
  }, [snap.data?.weekStartDate]);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const all = fixes.data ?? [];
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: all.filter((f) => stage.filter.includes(f.status)).length,
    }));
  }, [fixes.data]);

  // Grade data from snapshot
  const s = snap.data;
  const gradeMap: Record<string, Grade> = {
    showing_up:          s?.showingUp,
    being_understood:    s?.beingUnderstood,
    trusted:             s?.trust,
    recommendation_ready: s?.recommendationReady,
    fix_priority:        null, // uses fix count instead
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <div className="space-y-6 py-2">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ─── No business ────────────────────────────────────────────────────────
  if (hasNone) {
    return (
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
        <Button onClick={() => navigate("/onboarding")} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Sparkles className="mr-2 h-4 w-4" /> Start the interview
        </Button>
      </div>
    );
  }

  // ─── No briefing yet ────────────────────────────────────────────────────
  if (!briefing.data && !briefing.isLoading) {
    return (
      <div className="space-y-6 py-2">
        <WeeklyHeader weekLabel={weekLabel} businessName={current?.name} />
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-display text-xl text-slate-800 mb-2">Your first meeting is almost ready.</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            {s && s.openFindings > 0
              ? `I found ${s.openFindings} signal${s.openFindings !== 1 ? "s" : ""} on your first scan. Let me write your briefing.`
              : "I need to scan your website before I can write your briefing."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {s && s.openFindings > 0 ? (
              <Button
                onClick={() => generateBriefing.mutate({ businessId: current!.id })}
                disabled={isBusy}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Write my briefing
              </Button>
            ) : (
              <Button
                onClick={() => runScan.mutate({ businessId: current!.id })}
                disabled={isBusy}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Scan my website
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Full meeting ────────────────────────────────────────────────────────
  const activeFixCount = s?.activeFixCount ?? 0;
  const ls = leadSignals.data;

  return (
    <div className="space-y-6 py-2">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <WeeklyHeader
        weekLabel={weekLabel}
        businessName={current?.name}
        onRefresh={() => current && runScan.mutate({ businessId: current.id })}
        isBusy={isBusy}
      />

      {/* ── Big headline ────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-3xl font-bold text-violet-700 leading-tight flex items-center gap-2 flex-wrap">
          How are we doing with AI visibility this week?
          <span className="text-amber-400 text-2xl">✦</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Your AI visibility snapshot, insights, and actions — so we keep getting better.
        </p>
      </div>

      {/* ── 5 Question cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUESTIONS.map((q) => {
          const Icon = q.icon;
          const grade = gradeMap[q.key];
          const interp =
            q.key === "fix_priority"
              ? `${activeFixCount} high-impact fix${activeFixCount !== 1 ? "es" : ""} identified`
              : (INTERP[q.key]?.[grade ?? "not_yet_visible"] ?? "");

          return (
            <Link
              key={q.key}
              href={q.link}
              className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 hover:border-violet-200 hover:shadow-sm transition-all duration-150 cursor-pointer"
            >
              {/* Number badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="h-6 w-6 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {q.num}
                </div>
              </div>

              {/* Icon */}
              <div className={`h-10 w-10 rounded-xl ${q.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${q.iconColor}`} />
              </div>

              {/* Question */}
              <div className="font-semibold text-slate-800 text-sm leading-snug mb-3 flex-1">
                {q.question}
              </div>

              {/* Grade badge */}
              <div className="mb-2">
                {q.key === "fix_priority" ? (
                  <DraftReadyBadge />
                ) : (
                  <GradeBadge grade={grade} />
                )}
              </div>

              {/* Rina interpretation */}
              <div className="text-[11px] text-slate-400 leading-relaxed mb-3 min-h-[2.5rem]">
                {interp}
              </div>

              {/* Chevron */}
              <div className="flex justify-end">
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom two panels ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* AI Lead Signals */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-violet-600" />
            <h3 className="font-semibold text-slate-800 text-sm">AI Lead Signals</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">Where your leads are coming from.</p>

          <div className="space-y-3">
            {/* Confirmed */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="flex-1 text-sm text-slate-700">Confirmed AI-assisted leads</span>
              <span className="font-bold text-emerald-600 text-sm">{ls?.confirmedAi ?? 0}</span>
            </div>
            {/* Likely */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="flex-1 text-sm text-slate-700">Likely visibility-influenced leads</span>
              <span className="font-bold text-amber-600 text-sm">{ls?.likelyAi ?? 0}</span>
            </div>
            {/* Unknown */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <span className="flex-1 text-sm text-slate-700">Unknown source</span>
              <span className="font-bold text-slate-600 text-sm">{ls?.unknown ?? 0}</span>
            </div>
            {/* Divider + Total */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500 font-medium">Total</span>
              <span className="font-bold text-slate-800 text-base">{ls?.total ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Rina Can Help */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Rina Can Help</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">Take action, update content, and integrate — faster.</p>

          <div className="grid grid-cols-2 gap-2">
            {RINA_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.link}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-left hover:border-violet-200 hover:bg-violet-50/40 transition-colors"
                >
                  <Icon className="h-4 w-4 text-slate-500 group-hover:text-violet-600 shrink-0 transition-colors" />
                  <span className="text-xs font-medium text-slate-700 group-hover:text-violet-700 transition-colors">
                    {action.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400 ml-auto shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5-Stage Pipeline ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {pipelineCounts.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <Link
                  href={`/app/fixes?status=${stage.filter[0]}`}
                  className={`group flex flex-col items-center gap-1 rounded-xl border border-slate-100 ${stage.bg} px-4 py-3 hover:border-violet-200 transition-colors text-center min-w-[90px]`}
                >
                  <Icon className={`h-4 w-4 ${stage.color}`} />
                  <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                  <span className="text-[10px] text-slate-400">{stage.count} {stage.sub}</span>
                </Link>
                {idx < pipelineCounts.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                )}
              </div>
            );
          })}
          <div className="ml-auto">
            <Link href="/app/fixes">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 px-4 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                View Full Action Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
