/**
 * CommandCenter -- rebuilt to match the mockup exactly.
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type Grade = "clear" | "partial" | "not_yet_visible" | null | undefined;

function gradeScore(g: Grade): number {
  if (g === "clear") return 85;
  if (g === "partial") return 62;
  return 38;
}

function gradeLabel(g: Grade): string {
  if (g === "clear") return "Good";
  if (g === "partial") return "Needs Work";
  return "At Risk";
}

function gradeDotColor(g: Grade): string {
  if (g === "clear") return "bg-emerald-500";
  if (g === "partial") return "bg-amber-500";
  return "bg-red-400";
}

function gradeTextColor(g: Grade): string {
  if (g === "clear") return "text-emerald-600";
  if (g === "partial") return "text-amber-600";
  return "text-red-500";
}

function healthLabel(h: string | undefined): { label: string; color: string; dot: string } {
  if (h === "STRONG")    return { label: "Strong",     color: "text-emerald-600", dot: "bg-emerald-500" };
  if (h === "IMPROVING") return { label: "Improving",  color: "text-teal-600",    dot: "bg-teal-500" };
  if (h === "AT_RISK")   return { label: "At Risk",    color: "text-amber-600",   dot: "bg-amber-500" };
  return                        { label: "Needs Work", color: "text-red-500",     dot: "bg-red-400" };
}

function GeoBar({ grade }: { grade: Grade }) {
  const pct = grade === "clear" ? 90 : grade === "partial" ? 55 : 25;
  const barColor = grade === "clear" ? "bg-blue-600" : grade === "partial" ? "bg-amber-500" : "bg-red-400";
  const icon = grade === "clear" ? "check" : grade === "partial" ? "~" : "!";
  const iconColor = grade === "clear" ? "text-emerald-600" : grade === "partial" ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {grade === "clear" ? (
        <CheckCircle2 className={`h-3.5 w-3.5 ${iconColor} shrink-0`} />
      ) : (
        <span className={`text-xs font-bold ${iconColor} w-3 text-center`}>{icon}</span>
      )}
    </div>
  );
}

function FixBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    drafted:          "bg-violet-50 text-violet-700 border-violet-200",
    needs_input:      "bg-amber-50 text-amber-700 border-amber-200",
    ready_for_review: "bg-teal-50 text-teal-700 border-teal-200",
    approved:         "bg-emerald-50 text-emerald-700 border-emerald-200",
    recommended:      "bg-blue-50 text-blue-700 border-blue-200",
    verified:         "bg-slate-50 text-slate-600 border-slate-200",
  };
  const labels: Record<string, string> = {
    drafted:          "Drafted",
    needs_input:      "Needs Approval",
    ready_for_review: "Ready to Verify",
    approved:         "Approved",
    recommended:      "Recommended",
    verified:         "Verified",
  };
  const cls = cfg[status] ?? "bg-slate-50 text-slate-600 border-slate-200";
  const label = labels[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

const INTEGRATION_DISPLAY: Array<{ key: string; label: string }> = [
  { key: "wix",            label: "WIX" },
  { key: "shopify",        label: "Shopify" },
  { key: "wordpress",      label: "WordPress" },
  { key: "ga4",            label: "GA4" },
  { key: "search_console", label: "Search Console" },
  { key: "gbp",            label: "Google Business" },
  { key: "linkedin",       label: "LinkedIn" },
  { key: "instagram",      label: "Instagram" },
  { key: "gmail",          label: "Gmail" },
  { key: "crm",            label: "CRM" },
];

export default function CommandCenter() {
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
  const fixes = trpc.fixes.list.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );
  const integrations = trpc.integrations.list.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );

  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => { snap.refetch(); briefing.refetch(); toast.success("Scan complete!"); },
    onError: () => toast.error("Scan failed. Please try again."),
  });

  const s = snap.data;
  const health = healthLabel(s?.healthGrade);
  const healthScore = s
    ? Math.round(
        ([s.showingUp, s.beingUnderstood, s.trust, s.recommendationReady, s.geoReadiness]
          .map(gradeScore)
          .reduce((a, b) => a + b, 0) / 5)
      )
    : null;

  const topFixes = (fixes.data ?? [])
    .filter((f) => ["recommended", "drafted", "needs_input", "ready_for_review", "approved"].includes(f.status))
    .slice(0, 3);

  const connectedPlatforms = new Set(
    (integrations.data ?? [])
      .filter((i) => i.permissionLevel !== "no_access")
      .map((i) => i.platform)
  );

  if (bizLoading) {
    return (
      <div className="space-y-6 py-2">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (hasNone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl text-slate-800 mb-2">Set up your first business to get started.</h2>
        <Button onClick={() => navigate("/onboarding")} className="mt-4 bg-violet-600 hover:bg-violet-700 text-white">
          <Sparkles className="mr-2 h-4 w-4" /> Start with Rina
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800 leading-tight">
            Agent Rina Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor. Fix. Publish. Verify. Grow your AI visibility.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
            <Bell className="h-4 w-4 text-slate-500" />
            {(s?.activeFixCount ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                {s!.activeFixCount}
              </span>
            )}
          </button>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
            Good morning, <span className="font-semibold">{current?.name?.split(" ")[0] ?? "there"}!</span> ✨
          </div>
        </div>
      </div>

      {/* Rina speech bubble */}
      {s?.rinaRead && (
        <div className="flex justify-end">
          <div className="max-w-xs rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm text-sm text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-violet-500 inline mr-1.5 -mt-0.5" />
            {s.rinaRead}
          </div>
        </div>
      )}

      {/* Top row: Briefing + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">Weekly Briefing</div>
            <h3 className="font-display text-lg font-bold text-slate-800 mb-1">Weekly AI Visibility Briefing</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your snapshot of how your business shows up across AI platforms.
            </p>
            <Link href="/app/briefing">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                View full briefing <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="hidden sm:flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-violet-100/60">
            <ClipboardList className="h-10 w-10 text-violet-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">AI Visibility Health</h3>
            <AlertCircle className="h-3.5 w-3.5 text-slate-300" />
          </div>
          {snap.isLoading ? (
            <Skeleton className="h-12 w-24 mb-2" />
          ) : (
            <>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display text-5xl font-bold text-slate-800">{healthScore ?? "--"}</span>
                <span className="text-xl text-slate-400 mb-1">/100</span>
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <div className={`h-2 w-2 rounded-full ${health.dot}`} />
                <span className={`text-sm font-semibold ${health.color}`}>{health.label}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${healthScore ?? 0}%` }} />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                vs. last week
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4 Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Showing Up",           grade: s?.showingUp,           icon: TrendingUp },
          { label: "Being Understood",     grade: s?.beingUnderstood,     icon: Sparkles },
          { label: "Trust Signals",        grade: s?.trust,               icon: ShieldCheck },
          { label: "Recommendation Ready", grade: s?.recommendationReady, icon: Star },
        ].map((tile) => {
          const Icon = tile.icon;
          const score = gradeScore(tile.grade);
          return (
            <Link
              key={tile.label}
              href="/app/scorecard"
              className="group rounded-2xl border border-slate-100 bg-white p-4 hover:border-violet-200 hover:shadow-sm transition-all duration-150"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-violet-500" />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto group-hover:text-violet-400 transition-colors" />
              </div>
              <div className="font-semibold text-slate-700 text-xs mb-1">{tile.label}</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display text-2xl font-bold text-slate-800">{score}</span>
                <span className="text-xs text-slate-400 mb-0.5">/100</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full ${gradeDotColor(tile.grade)}`} />
                <span className={`text-[11px] font-semibold ${gradeTextColor(tile.grade)}`}>{gradeLabel(tile.grade)}</span>
              </div>
              <div className="mt-2 h-6 flex items-end gap-0.5">
                {[3, 4, 3, 5, 4, 5, 4, 6].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-slate-100" style={{ height: `${h * 3}px` }} />
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Fix Queue + GEO Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">This Week's Fix Queue</h3>
              {(s?.activeFixCount ?? 0) > 0 && (
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {s!.activeFixCount}
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">High-impact fixes to improve your AI visibility.</p>
          {fixes.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
            </div>
          ) : topFixes.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              All caught up -- no active fixes.
            </div>
          ) : (
            <div className="space-y-2">
              {topFixes.map((fix) => (
                <Link
                  key={fix.id}
                  href={`/app/fixes/${fix.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:border-violet-200 hover:bg-violet-50/30 transition-colors group"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                  <span className="flex-1 text-xs text-slate-700 truncate">{fix.issue}</span>
                  <FixBadge status={fix.status} />
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400 shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
          <Link href="/app/fixes" className="mt-4 flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors">
            View all fixes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-slate-800 text-sm">GEO Readiness</h3>
              <AlertCircle className="h-3.5 w-3.5 text-slate-300" />
            </div>
            {snap.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 rounded" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(s?.geoCategories ?? []).slice(0, 4).map((cat) => (
                  <div key={cat.findingType} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                      <Globe className="h-3 w-3 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-600 w-32 shrink-0">{cat.label}</span>
                    <div className="flex-1">
                      <GeoBar grade={cat.grade as Grade} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">&#x1F451;</span>
              <span className="text-xs font-bold text-amber-700">Pro Tip</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed mb-2">
              Businesses with complete GEO readiness are 3.4x more likely to be recommended by AI.
            </p>
            <Link href="/app/scorecard" className="text-xs text-amber-700 font-semibold hover:text-amber-800 flex items-center gap-1">
              See how it works <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Connected Integrations */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Connected Integrations</h3>
          <Link href="/app/integrations" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
            Manage Integrations <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {INTEGRATION_DISPLAY.map(({ key, label }) => {
            const isConnected = connectedPlatforms.has(key as "wix" | "shopify" | "wordpress" | "ga4" | "search_console" | "gbp" | "linkedin" | "instagram" | "gmail" | "crm");
            return (
              <div
                key={key}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 min-w-[64px] transition-opacity ${
                  isConnected ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50/40 opacity-40"
                }`}
              >
                <div className="h-7 w-7 flex items-center justify-center">
                  {key === "wix"            && <span className="font-black text-sm text-slate-800">WIX</span>}
                  {key === "shopify"        && <span className="font-bold text-xs text-green-700">Shopify</span>}
                  {key === "wordpress"      && <Globe className="h-4 w-4 text-blue-600" />}
                  {key === "ga4"            && <TrendingUp className="h-4 w-4 text-orange-500" />}
                  {key === "search_console" && <Search className="h-4 w-4 text-blue-500" />}
                  {key === "gbp"            && <Briefcase className="h-4 w-4 text-blue-600" />}
                  {key === "linkedin"       && <Linkedin className="h-4 w-4 text-blue-700" />}
                  {key === "instagram"      && <Instagram className="h-4 w-4 text-pink-600" />}
                  {key === "gmail"          && <Mail className="h-4 w-4 text-red-500" />}
                  {key === "crm"            && <ClipboardList className="h-4 w-4 text-violet-600" />}
                </div>
                <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
