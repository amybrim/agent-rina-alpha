/**
 * WeeklyMeeting — the primary page.
 * This is where the owner meets Rina each week.
 *
 * Structure:
 * 1. Rina's Read — narrative paragraph from the briefing
 * 2. Five questions — each with a grade pill and Rina's answer
 * 3. Top actions — what Rina recommends doing this week
 * 4. Fix pipeline rail — 5-stage status summary
 *
 * No scores. No /100. No dashboards.
 * If it looks like a dashboard, it's wrong.
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GradePill, ConfidenceLabel } from "@/components/ConfidenceLabel";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Grade from the briefing schema
type Grade = "clear" | "partial" | "not_yet_visible" | null | undefined;

// ─── Five questions ───────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    key: "showingUpGrade" as const,
    question: "Are we showing up?",
    description:
      "Are you appearing in AI-generated answers when someone searches for what you do?",
  },
  {
    key: "beingUnderstoodGrade" as const,
    question: "Are we being understood?",
    description:
      "When AI mentions you, does it describe your services, location, and audience accurately?",
  },
  {
    key: "trustGrade" as const,
    question: "Are we trusted?",
    description:
      "Does AI present you as credible? Are your reviews, credentials, and proof signals visible?",
  },
  {
    key: "recommendationReadyGrade" as const,
    question: "Are we recommendation-ready?",
    description:
      "Would AI recommend you when someone asks for a provider in your category?",
  },
  {
    key: "geoReadinessGrade" as const,
    question: "What should we fix next?",
    description:
      "Based on what I found, what is the highest-impact change you can make this week?",
  },
];

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { label: "Found", statuses: ["found"] },
  { label: "Recommended", statuses: ["recommended", "needs_input"] },
  { label: "Draft ready", statuses: ["drafted", "ready_for_review"] },
  { label: "Approved", statuses: ["approved", "scheduled"] },
  { label: "Live", statuses: ["published", "verified"] },
];

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

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const isScanning = runScan.isPending;
  const isGenerating = generateBriefing.isPending;
  const isBusy = isScanning || isGenerating;

  // ─── Pipeline counts ────────────────────────────────────────────────────
  const fixList = fixes.data ?? [];
  const pipelineCounts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: fixList.filter((f) => stage.statuses.includes(f.status)).length,
  }));

  // ─── Loading state ───────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <div className="space-y-6 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ─── No business yet ─────────────────────────────────────────────────────
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
          Before Rina can run your weekly meeting, she needs to understand what
          you do and who you serve.
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

  const b = briefing.data;
  const snap = snapshot.data;

  // ─── No briefing yet ─────────────────────────────────────────────────────
  if (!b && !briefing.isLoading) {
    return (
      <div className="space-y-6 py-2">
        <Header firstName={firstName} businessName={current?.name} />
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
                onClick={() =>
                  generateBriefing.mutate({ businessId: current!.id })
                }
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

  // ─── Full meeting ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 py-2">
      <Header
        firstName={firstName}
        businessName={current?.name}
        weekDate={b?.weekStartDate}
        onRefresh={() => {
          if (current) runScan.mutate({ businessId: current.id });
        }}
        isBusy={isBusy}
      />

      {/* ── Rina's Read ─────────────────────────────────────────────── */}
      {b?.rinaRead && (
        <section>
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
            Rina's read
          </div>
          <div className="rounded-2xl bg-violet-50 border border-violet-100 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center text-white font-display text-sm shrink-0 mt-0.5">
                R
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{b.rinaRead}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Five questions ───────────────────────────────────────────── */}
      <section>
        <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
          Five questions
        </div>
        <div className="space-y-3">
          {QUESTIONS.map((q) => {
            const grade = b
              ? (b[q.key as keyof typeof b] as Grade)
              : undefined;
            return (
              <QuestionRow
                key={q.key}
                question={q.question}
                description={q.description}
                grade={grade}
                confidence={snap?.confidence}
              />
            );
          })}
        </div>
      </section>

      {/* ── Top actions ──────────────────────────────────────────────── */}
      {b?.topActions && Array.isArray(b.topActions) && b.topActions.length > 0 && (
        <section>
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
            This week's actions
          </div>
          <div className="space-y-2">
            {(b.topActions as Array<{ fixId: number | null; action: string; why: string }>).map(
              (a, i) => (
                <button
                  key={i}
                  onClick={() => a.fixId != null && navigate(`/app/fixes/${a.fixId}`)}
                  disabled={a.fixId == null}
                  className="w-full flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left hover:border-violet-200 hover:bg-violet-50/50 transition-colors group disabled:opacity-60 disabled:cursor-default"
                >
                  <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 leading-snug">
                      {a.action}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {a.why}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
                </button>
              )
            )}
          </div>
        </section>
      )}

      {/* ── Fix pipeline rail ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium">
            Fix pipeline
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/fixes")}
            className="text-xs text-slate-500 hover:text-violet-600 h-6 px-2"
          >
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {pipelineCounts.map((stage, i) => (
            <button
              key={stage.label}
              onClick={() => navigate("/app/fixes")}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 hover:border-violet-200 hover:bg-violet-50/50 transition-colors"
            >
              <div
                className={`text-2xl font-display font-bold ${
                  stage.count > 0 ? "text-violet-600" : "text-slate-300"
                }`}
              >
                {stage.count}
              </div>
              <div className="text-[10px] text-slate-500 text-center leading-tight">
                {stage.label}
              </div>
              {/* Progress dot */}
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  stage.count > 0 ? "bg-violet-400" : "bg-slate-200"
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* ── Lead Signals ─────────────────────────────────────────────── */}
      <section>
        <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
          At a glance
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open findings", value: snap?.openFindings ?? "—", hint: "Issues Rina has identified on your site" },
            { label: "Critical findings", value: snap?.criticalFindings ?? "—", hint: "High-priority gaps that affect AI visibility" },
            { label: "Active fixes", value: snap?.activeFixCount ?? "—", hint: "Fixes currently in progress or awaiting approval" },
            { label: "Completed fixes", value: snap?.completedFixCount ?? "—", hint: "Fixes verified live on your site" },
          ].map((sig) => (
            <div
              key={sig.label}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <div className="text-2xl font-display font-bold text-slate-800 leading-none mb-1">
                {sig.value}
              </div>
              <div className="text-xs font-medium text-slate-600">{sig.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{sig.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rina Can Help ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-violet-100 bg-violet-50 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center text-white font-display text-xs shrink-0">
            R
          </div>
          <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
            Rina can help right now
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Run a new scan",
              description: "Re-check your site for new gaps or improvements.",
              action: () => current && runScan.mutate({ businessId: current.id }),
              busy: isScanning,
            },
            {
              label: "Generate briefing",
              description: "Get Rina's written read on where you stand this week.",
              action: () => current && generateBriefing.mutate({ businessId: current.id }),
              busy: isGenerating,
            },
            {
              label: "Review fix queue",
              description: "See what's waiting for your approval before it ships.",
              action: () => navigate("/app/fixes"),
              busy: false,
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              disabled={item.busy || isBusy}
              className="text-left rounded-xl border border-violet-200 bg-white px-4 py-3.5 hover:border-violet-400 hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-sm font-semibold text-slate-800 mb-1">{item.label}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{item.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Refresh / scan controls ──────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
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
          onClick={() =>
            current && generateBriefing.mutate({ businessId: current.id })
          }
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
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function Header({
  firstName,
  businessName,
  weekDate,
  onRefresh,
  isBusy,
}: {
  firstName: string;
  businessName?: string;
  weekDate?: Date | null;
  onRefresh?: () => void;
  isBusy?: boolean;
}) {
  const weekLabel = weekDate
    ? `Week of ${new Date(weekDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })}`
    : null;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">
          {weekLabel ?? "Weekly meeting"}
        </div>
        <h1 className="font-display text-3xl text-slate-800 leading-tight">
          Good to see you, {firstName}.
        </h1>
        {businessName && (
          <p className="text-sm text-slate-500 mt-1">
            Here is where{" "}
            <span className="font-medium text-slate-700">{businessName}</span>{" "}
            stands this week.
          </p>
        )}
      </div>
    </div>
  );
}

function QuestionRow({
  question,
  description,
  grade,
  confidence,
}: {
  question: string;
  description: string;
  grade: Grade;
  confidence?: "verified" | "detected" | "inferred";
}) {
  const confLevel =
    confidence === "verified"
      ? "confirmed"
      : confidence === "inferred"
      ? "inferred"
      : "estimated";

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
      {/* Grade icon */}
      <div className="shrink-0 mt-0.5">
        {grade === "clear" ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : grade === "partial" ? (
          <Clock className="h-5 w-5 text-amber-500" />
        ) : (
          <XCircle className="h-5 w-5 text-rose-400" />
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">{question}</span>
          <GradePill grade={grade} />
          {grade && (
            <ConfidenceLabel level={confLevel} />
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
