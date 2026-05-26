/**
 * WeeklyMeeting — pixel-faithful rebuild of the mockup.
 *
 * Mockup layout (inside the white card, content area):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Rina's Weekly Visibility Meeting          Week of … ▼  ⟳       │
 * │  How are we doing with AI visibility this week? ✦               │
 * │  Your AI visibility snapshot, insights, and actions…            │
 * │                                                                  │
 * │  [1 Eye]  [2 Chat]  [3 Shield]  [4 Star]  [5 Wrench]           │
 * │  Are we   Are we    Are we      Are we     What should           │
 * │  showing  being     trusted?    rec-ready? we fix next?          │
 * │  up?      understood?                                            │
 * │  Improving Needs Proof  Watch   Improving  Draft Ready           │
 * │  Visibility up…  Add clearer…  Add 2-3…   Strong…  3 fixes…    │
 * │  >         >         >          >          >                     │
 * │                                                                  │
 * │  [AI Lead Signals]          [Rina Can Help]                     │
 * │  ✓ Confirmed  2             Draft FAQ  >  Update Metadata >     │
 * │  ⚡ Likely    5             Create Blog>  Send to Wix    >     │
 * │  ? Unknown    8             Schedule   >  Verify Change  >     │
 * │  Total       15                                                  │
 * │                                                                  │
 * │  💡Recommended→✏️Drafted→✅Approved→☁️Published→🛡Verified  [View Full Action Plan →] │
 * └──────────────────────────────────────────────────────────────────┘
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

// ─── Grade badge ──────────────────────────────────────────────────────────────
type Grade = "clear" | "partial" | "not_yet_visible" | null | undefined;

function GradeBadge({ grade }: { grade: Grade }) {
  if (!grade)
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400">
        —
      </span>
    );

  const cfg: Record<string, { label: string; cls: string }> = {
    clear: {
      label: "Improving",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-300",
    },
    partial: {
      label: "~ Needs Proof",
      cls: "bg-amber-50 text-amber-700 border-amber-300",
    },
    not_yet_visible: {
      label: "Watch",
      cls: "bg-slate-50 text-slate-600 border-slate-300",
    },
  };

  const { label, cls } = cfg[grade] ?? cfg.not_yet_visible;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function DraftReadyBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
      Draft Ready
    </span>
  );
}

// ─── Rina interpretation copy ─────────────────────────────────────────────────
const INTERP: Record<string, Record<string, string>> = {
  showing_up: {
    clear: "Visibility up 12% vs last week",
    partial: "Showing up in some searches",
    not_yet_visible: "Not yet appearing in AI results",
  },
  being_understood: {
    clear: "AI describes you accurately",
    partial: "Add clearer answers and examples",
    not_yet_visible: "AI can't interpret your offer yet",
  },
  trusted: {
    clear: "Strong signals — keep building",
    partial: "Add 2–3 proof points",
    not_yet_visible: "Trust signals not yet detected",
  },
  recommendation_ready: {
    clear: "Strong signals — keep building",
    partial: "Almost recommendation-ready",
    not_yet_visible: "Not yet in recommendation pool",
  },
};

// ─── 5 question cards ─────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    num: 1,
    key: "showing_up",
    question: "Are we showing up?",
    Icon: Eye,
    iconCls: "text-violet-500",
    iconBg: "bg-violet-50",
    link: "/app/scorecard",
  },
  {
    num: 2,
    key: "being_understood",
    question: "Are we being understood?",
    Icon: MessageSquareText,
    iconCls: "text-pink-500",
    iconBg: "bg-pink-50",
    link: "/app/scorecard",
  },
  {
    num: 3,
    key: "trusted",
    question: "Are we trusted?",
    Icon: ShieldCheck,
    iconCls: "text-violet-500",
    iconBg: "bg-violet-50",
    link: "/app/scorecard",
  },
  {
    num: 4,
    key: "recommendation_ready",
    question: "Are we recommendation-ready?",
    Icon: Star,
    iconCls: "text-amber-400",
    iconBg: "bg-amber-50",
    link: "/app/scorecard",
  },
  {
    num: 5,
    key: "fix_priority",
    question: "What should we fix next?",
    Icon: Wrench,
    iconCls: "text-violet-500",
    iconBg: "bg-violet-50",
    link: "/app/fixes",
  },
];

// ─── Rina Can Help actions ────────────────────────────────────────────────────
const RINA_ACTIONS = [
  { label: "Draft FAQ",            Icon: FileText,     link: "/app/fixes",        iconCls: "text-violet-500", iconBg: "bg-violet-50" },
  { label: "Update Metadata",      Icon: Pencil,       link: "/app/fixes",        iconCls: "text-pink-500",   iconBg: "bg-pink-50" },
  { label: "Create Blog Post",     Icon: FileText,     link: "/app/fixes",        iconCls: "text-teal-500",   iconBg: "bg-teal-50" },
  { label: "Send to Wix",          Icon: Send,         link: "/app/integrations", iconCls: "text-blue-500",   iconBg: "bg-blue-50",  wix: true },
  { label: "Schedule Social Post", Icon: CalendarDays, link: "/app/integrations", iconCls: "text-amber-500",  iconBg: "bg-amber-50" },
  { label: "Verify Change",        Icon: ShieldCheck,  link: "/app/fixes",        iconCls: "text-emerald-500",iconBg: "bg-emerald-50" },
];

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE = [
  { key: "recommended", label: "Recommended", sub: "priorities identified", Icon: Lightbulb,   color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   filter: ["recommended"] },
  { key: "drafted",     label: "Drafted",     sub: "In progress",           Icon: Pencil,       color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200",  filter: ["drafted", "needs_input"] },
  { key: "approved",    label: "Approved",    sub: "Ready to publish",      Icon: CheckCircle2, color: "text-teal-600",    bg: "bg-teal-50",    border: "border-teal-200",    filter: ["approved", "ready_for_review"] },
  { key: "published",   label: "Published",   sub: "Live across channels",  Icon: CloudUpload,  color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    filter: ["scheduled", "published"] },
  { key: "verified",    label: "Verified",    sub: "Tracking impact",       Icon: ShieldCheck,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", filter: ["verified"] },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  const pipelineCounts = useMemo(() => {
    const all = fixes.data ?? [];
    return PIPELINE.map((stage) => ({
      ...stage,
      count: all.filter((f) => stage.filter.includes(f.status)).length,
    }));
  }, [fixes.data]);

  const s = snap.data;
  const gradeMap: Record<string, Grade> = {
    showing_up:           s?.showingUp,
    being_understood:     s?.beingUnderstood,
    trusted:              s?.trust,
    recommendation_ready: s?.recommendationReady,
    fix_priority:         null,
  };
  const activeFixCount = s?.activeFixCount ?? 0;
  const ls = leadSignals.data;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <div className="space-y-5 py-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── No business ──────────────────────────────────────────────────────────────
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
        <Button
          onClick={() => navigate("/onboarding")}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Start the interview
        </Button>
      </div>
    );
  }

  // ── No briefing yet ──────────────────────────────────────────────────────────
  if (!briefing.data && !briefing.isLoading) {
    return (
      <div className="space-y-6 py-2">
        {/* Header */}
        <MeetingHeader weekLabel={weekLabel} businessName={current?.name} />
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-display text-xl text-slate-800 mb-2">
            Your first meeting is almost ready.
          </h3>
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
    );
  }

  // ── Full meeting ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 py-2">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <MeetingHeader
        weekLabel={weekLabel}
        businessName={current?.name}
        onRefresh={() => current && runScan.mutate({ businessId: current.id })}
        isBusy={isBusy}
      />

      {/* ── Big violet question ─────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-[28px] font-bold text-violet-700 leading-tight flex items-center gap-2 flex-wrap">
          How are we doing with AI visibility this week?{" "}
          <span className="text-amber-400 text-2xl leading-none">✦</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1.5">
          Your AI visibility snapshot, insights, and actions—so we keep getting better.
        </p>
      </div>

      {/* ── 5 Question cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUESTIONS.map((q) => {
          const { Icon } = q;
          const grade = gradeMap[q.key];
          const interp =
            q.key === "fix_priority"
              ? `${activeFixCount} high-impact fix${activeFixCount !== 1 ? "es" : ""} identified`
              : (INTERP[q.key]?.[grade ?? "not_yet_visible"] ?? "");

          return (
            <Link
              key={q.key}
              href={q.link}
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 hover:border-violet-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              style={{ minHeight: "220px" }}
            >
              {/* Number badge — top left */}
              <div
                className="h-6 w-6 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mb-3"
              >
                {q.num}
              </div>

              {/* Icon — large, centered */}
              <div
                className={`h-12 w-12 rounded-xl ${q.iconBg} flex items-center justify-center mb-3`}
              >
                <Icon className={`h-6 w-6 ${q.iconCls}`} />
              </div>

              {/* Question text */}
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
              <div className="text-[11px] text-slate-400 leading-relaxed mb-3">
                {interp}
              </div>

              {/* Chevron — bottom right */}
              <div className="flex justify-end">
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom panels: AI Lead Signals + Rina Can Help ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* AI Lead Signals */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm leading-tight">AI Lead Signals</h3>
              <p className="text-[11px] text-slate-400">Where your leads are coming from.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Confirmed */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="flex-1 text-sm text-slate-700">Confirmed AI-assisted leads</span>
              <span className="font-bold text-emerald-600 text-sm tabular-nums">
                {ls?.confirmedAi ?? 0}
              </span>
            </div>
            {/* Likely */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="flex-1 text-sm text-slate-700">Likely visibility-influenced leads</span>
              <span className="font-bold text-amber-600 text-sm tabular-nums">
                {ls?.likelyAi ?? 0}
              </span>
            </div>
            {/* Unknown */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <span className="flex-1 text-sm text-slate-700">Unknown source</span>
              <span className="font-bold text-slate-600 text-sm tabular-nums">
                {ls?.unknown ?? 0}
              </span>
            </div>
            {/* Total */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500 font-medium">Total</span>
              <span className="font-bold text-slate-800 text-base tabular-nums">
                {ls?.total ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Rina Can Help */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm leading-tight">Rina Can Help</h3>
              <p className="text-[11px] text-slate-400">Take action, update content, and integrate—faster.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {RINA_ACTIONS.map((action) => {
              const { Icon } = action;
              return (
                <Link
                  key={action.label}
                  href={action.link}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 hover:border-violet-200 hover:bg-violet-50/50 transition-colors"
                >
                  {action.wix ? (
                    /* WiX wordmark pill */
                    <span className="text-[11px] font-black text-blue-700 bg-blue-100 rounded px-1.5 py-0.5 shrink-0 leading-none">
                      WiX
                    </span>
                  ) : (
                    <div className={`h-6 w-6 rounded-lg ${action.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${action.iconCls}`} />
                    </div>
                  )}
                  <span className="flex-1 text-xs font-medium text-slate-700 group-hover:text-violet-700 transition-colors">
                    {action.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400 shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5-Stage Pipeline ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-1 flex-wrap">
          {pipelineCounts.map((stage, idx) => {
            const { Icon } = stage;
            return (
              <div key={stage.key} className="flex items-center gap-1">
                <Link
                  href={`/app/fixes?status=${stage.filter[0]}`}
                  className={`group flex items-center gap-2.5 rounded-xl border ${stage.border} ${stage.bg} px-3.5 py-2.5 hover:opacity-80 transition-opacity`}
                >
                  <div className={`h-7 w-7 rounded-lg bg-white/70 flex items-center justify-center shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${stage.color}`} />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${stage.color} leading-tight`}>
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {stage.count} {stage.sub}
                    </div>
                  </div>
                </Link>
                {idx < pipelineCounts.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0 mx-0.5" />
                )}
              </div>
            );
          })}

          {/* View Full Action Plan CTA */}
          <div className="ml-auto shrink-0">
            <Link href="/app/fixes">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 px-4 gap-1.5 rounded-xl">
                <Sparkles className="h-3.5 w-3.5" />
                View Full Action Plan
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Header sub-component ─────────────────────────────────────────────────────
function MeetingHeader({
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
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 font-medium">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          {weekLabel}
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl"
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
