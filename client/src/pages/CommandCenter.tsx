/**
 * CommandCenter — the main dashboard.
 * Matches the mockup: header, Rina speech bubble, 4 metric tiles,
 * fix queue cards, GEO readiness panel, connected integrations strip.
 *
 * No numerical scores. No /100. Grades only.
 */
import { Button } from "@/components/ui/button";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FIX_STATUS_LABEL } from "@/lib/rina";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// ─── Grade display helpers ────────────────────────────────────────────────────
const HEALTH_GRADE_LABEL: Record<string, string> = {
  STRONG: "Strong",
  IMPROVING: "Improving",
  AT_RISK: "At Risk",
  NEEDS_WORK: "Needs Work",
};

const HEALTH_GRADE_COLOR: Record<string, string> = {
  STRONG: "text-emerald-600",
  IMPROVING: "text-violet-600",
  AT_RISK: "text-amber-600",
  NEEDS_WORK: "text-rose-600",
};

const HEALTH_GRADE_BG: Record<string, string> = {
  STRONG: "bg-emerald-50 border-emerald-100",
  IMPROVING: "bg-violet-50 border-violet-100",
  AT_RISK: "bg-amber-50 border-amber-100",
  NEEDS_WORK: "bg-rose-50 border-rose-100",
};

const GRADE_BAR_COLOR: Record<string, string> = {
  clear: "bg-violet-600",
  partial: "bg-amber-400",
  not_yet_visible: "bg-rose-300",
};

const GRADE_DOT_COLOR: Record<string, string> = {
  clear: "bg-emerald-500",
  partial: "bg-amber-400",
  not_yet_visible: "bg-rose-400",
};

const GRADE_BAR_WIDTH: Record<string, string> = {
  clear: "w-full",
  partial: "w-3/5",
  not_yet_visible: "w-1/4",
};

// ─── Fix status badge ─────────────────────────────────────────────────────────
const FIX_STATUS_BADGE: Record<string, string> = {
  recommended: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  drafted: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  needs_input: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  ready_for_review: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  default: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
};

// ─── Integration platform labels ─────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  wix: "WiX",
  shopify: "Shopify",
  wordpress: "WordPress",
  ga4: "GA4",
  search_console: "Search Console",
  gbp: "Google Business",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  gmail: "Gmail",
  crm: "CRM",
};

// ─── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId, isLoading, hasNone } = useCurrentBusiness();

  const snapshot = trpc.snapshot.get.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const fixes = trpc.fixes.list.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const briefing = trpc.briefing.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const integrations = trpc.integrations.list.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );

  const utils = trpc.useUtils();
  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      utils.snapshot.get.invalidate();
      utils.fixes.list.invalidate();
      toast.success("Scan complete — visibility data refreshed.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const generateBriefing = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      utils.briefing.latest.invalidate();
      toast.success("Weekly briefing ready.");
      navigate("/app/briefing");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  // Top fixes for the queue panel (max 3, prioritize recommended/drafted)
  const topFixes = useMemo(() => {
    const all = fixes.data ?? [];
    const priority = all.filter((f) =>
      ["recommended", "drafted", "needs_input", "ready_for_review"].includes(f.status)
    );
    return priority.slice(0, 3);
  }, [fixes.data]);

  // Active fix count
  const activeFixCount = useMemo(() => {
    return (fixes.data ?? []).filter((f) =>
      ["recommended", "drafted", "needs_input", "ready_for_review", "approved"].includes(f.status)
    ).length;
  }, [fixes.data]);

  // Connected integrations
  const connectedIntegrations = useMemo(() => {
    return (integrations.data ?? []).filter((i) => i.connectionStatus === "connected");
  }, [integrations.data]);

  const snap = snapshot.data;
  const healthGrade = snap?.healthGrade ?? null;
  const healthLabel = healthGrade ? (HEALTH_GRADE_LABEL[healthGrade] ?? healthGrade) : "Not yet scanned";
  const healthColor = healthGrade ? (HEALTH_GRADE_COLOR[healthGrade] ?? "text-slate-500") : "text-slate-400";
  const healthBg = healthGrade ? (HEALTH_GRADE_BG[healthGrade] ?? "bg-slate-50 border-slate-100") : "bg-slate-50 border-slate-100";

  // ─── No business ─────────────────────────────────────────────────────────
  if (!isLoading && hasNone) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl text-slate-800 mb-2">
            Let's introduce Rina to your business.
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            Rina needs to understand what you do and who you serve before she can run your Command Center.
          </p>
          <Button
            onClick={() => navigate("/onboarding")}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" /> Start the interview
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-slate-800 leading-tight">
              Agent Rina Command Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor. Fix. Publish. Verify. Grow your AI visibility.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
              onClick={() => toast.info("Notifications coming soon.")}
            >
              <Bell className="h-4 w-4 text-slate-500" />
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <span className="text-amber-500">✦</span>
              {getGreeting()}, {firstName}!
            </div>
          </div>
        </div>

        {/* ── Rina speech bubble ────────────────────────────────────────── */}
        {(snap?.rinaRead || !snap) && (
          <div className="relative rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 pl-12">
            <div className="absolute left-4 top-4 h-6 w-6 rounded-lg bg-violet-600 flex items-center justify-center text-white font-display text-xs shrink-0">
              ✦
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {snap?.rinaRead
                ? snap.rinaRead
                : snap
                  ? `I've completed a scan for ${current?.name ?? "your business"}. ${activeFixCount > 0 ? `I drafted ${activeFixCount} visibility fix${activeFixCount !== 1 ? "es" : ""} for review.` : "Nothing urgent in the queue right now."}`
                  : `I haven't scanned ${current?.name ?? "your business"} yet. Hit "Run scan" and I'll get started.`}
            </p>
          </div>
        )}

        {/* ── 4 metric tiles ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* AI Visibility Health */}
          <div className={`rounded-2xl border p-5 ${healthBg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                AI Visibility Health
              </div>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className={`font-display text-2xl font-bold leading-none mb-1 ${healthColor}`}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : healthLabel}
            </div>
            {healthGrade && (
              <div className="text-xs text-slate-500 mt-2">
                {healthGrade === "STRONG"
                  ? "Excellent AI presence"
                  : healthGrade === "IMPROVING"
                    ? "Positive momentum"
                    : healthGrade === "AT_RISK"
                      ? "Needs attention"
                      : "Significant gaps found"}
              </div>
            )}
          </div>

          {/* Active Fixes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Active Fixes
              </div>
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="font-display text-2xl font-bold leading-none text-slate-800 mb-1">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (snap?.activeFixCount ?? "—")}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {snap?.activeFixCount
                ? `${snap.activeFixCount} in progress`
                : "Run a scan to surface fixes"}
            </div>
          </div>

          {/* Last Scan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Last Scan
              </div>
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="font-display text-2xl font-bold leading-none text-slate-800 mb-1">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : snap?.weekStartDate ? (
                new Date(snap.weekStartDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              ) : (
                "Never"
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-6 px-0 text-xs text-violet-600 hover:text-violet-700 hover:bg-transparent"
              onClick={() => current && runScan.mutate({ businessId: current.id })}
              disabled={runScan.isPending}
            >
              {runScan.isPending ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Scanning…</>
              ) : (
                <><RefreshCw className="mr-1 h-3 w-3" />Run new scan</>
              )}
            </Button>
          </div>

          {/* Next Briefing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Weekly Briefing
              </div>
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="font-display text-2xl font-bold leading-none text-slate-800 mb-1">
              {briefing.data ? "Ready" : "Pending"}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-6 px-0 text-xs text-violet-600 hover:text-violet-700 hover:bg-transparent"
              onClick={() => {
                if (briefing.data) navigate("/app/briefing");
                else if (snap) generateBriefing.mutate({ businessId: current!.id });
                else toast.message("Run a scan first to unlock briefings.");
              }}
              disabled={generateBriefing.isPending}
            >
              {generateBriefing.isPending ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Drafting…</>
              ) : briefing.data ? (
                <><ArrowRight className="mr-1 h-3 w-3" />View briefing</>
              ) : (
                <><Sparkles className="mr-1 h-3 w-3" />Generate briefing</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Fix Queue + GEO Readiness ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

          {/* Fix Queue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base text-slate-800">
                    This Week's Fix Queue
                  </h2>
                  {activeFixCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-violet-600 text-white text-[10px] font-bold px-1.5">
                      {activeFixCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-impact fixes to improve your AI visibility.
                </p>
              </div>
            </div>

            {fixes.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : topFixes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">Queue is clear</p>
                <p className="text-xs text-slate-400 mt-1">
                  {snap
                    ? "No pending fixes — run a new scan to check for updates."
                    : "Run a scan to surface high-impact fixes."}
                </p>
                <Button
                  size="sm"
                  className="mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => current && runScan.mutate({ businessId: current.id })}
                  disabled={runScan.isPending}
                >
                  {runScan.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Run scan
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {topFixes.map((fix) => {
                  const statusLabel = FIX_STATUS_LABEL[fix.status as keyof typeof FIX_STATUS_LABEL] ?? fix.status;
                  const badgeClass = FIX_STATUS_BADGE[fix.status] ?? FIX_STATUS_BADGE.default;
                  return (
                    <Link
                      key={fix.id}
                      href={`/app/fixes/${fix.id}`}
                      className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 hover:border-violet-200 hover:bg-violet-50/40 transition-all duration-150"
                    >
                      <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 group-hover:border-violet-200 transition-colors">
                        <Zap className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate leading-tight">
                          {fix.issue}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0 ${badgeClass}`}>
                        {statusLabel}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-400 transition-colors shrink-0" />
                    </Link>
                  );
                })}
                <Link
                  href="/app/fixes"
                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium mt-2 transition-colors"
                >
                  View all fixes <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* GEO Readiness panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base text-slate-800">GEO Readiness</h2>
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {snap?.geoCategories && snap.geoCategories.length > 0 ? (
                <div className="space-y-3">
                  {snap.geoCategories.map((cat) => (
                    <div key={cat.findingType} className="flex items-center gap-3">
                      <div className="text-xs text-slate-600 w-32 shrink-0 leading-tight">
                        {cat.label}
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${GRADE_BAR_COLOR[cat.grade] ?? "bg-slate-300"} ${GRADE_BAR_WIDTH[cat.grade] ?? "w-1/4"}`}
                        />
                      </div>
                      <div
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${GRADE_DOT_COLOR[cat.grade] ?? "bg-slate-300"}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {["Clear Offers", "Structured Data", "Proof Signals", "Answer Readiness"].map((label) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="text-xs text-slate-400 w-32 shrink-0">{label}</div>
                      <div className="flex-1 h-2 rounded-full bg-slate-100" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200 shrink-0" />
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-2">Run a scan to populate GEO readiness.</p>
                </div>
              )}
            </div>

            {/* Pro Tip card */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500 text-base">✦</span>
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pro Tip</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Businesses with complete GEO readiness are 3.4× more likely to be recommended by AI.
              </p>
              <button
                onClick={() => navigate("/app/scorecard")}
                className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
              >
                See how it works <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Connected Integrations ────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base text-slate-800">Connected Integrations</h2>
            <Link
              href="/app/integrations"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              Manage Integrations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {integrations.isLoading ? (
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : connectedIntegrations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {connectedIntegrations.map((intg) => (
                <div
                  key={intg.id}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">
                    {PLATFORM_LABELS[intg.platform] ?? intg.platform}
                  </span>
                </div>
              ))}
              {(integrations.data ?? [])
                .filter((i) => i.connectionStatus !== "connected")
                .slice(0, 4)
                .map((intg) => (
                  <div
                    key={intg.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="text-xs font-medium text-slate-400">
                      {PLATFORM_LABELS[intg.platform] ?? intg.platform}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">
                No integrations connected yet.
              </p>
              <Link
                href="/app/integrations"
                className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
              >
                Connect now <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
