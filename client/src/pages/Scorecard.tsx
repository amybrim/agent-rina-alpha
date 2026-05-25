/**
 * Visibility Overview — what Rina sees about your business right now.
 * No scores. No /100. Grade labels only (clear / partial / not_yet_visible).
 * Confidence labels on every dimension.
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceLabel, GradePill, type ConfidenceLevel } from "@/components/ConfidenceLabel";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const DIMENSIONS = [
  {
    key: "showingUp" as const,
    label: "Are we showing up?",
    description: "Can AI crawlers reach your site, index your pages, and find your core content?",
  },
  {
    key: "beingUnderstood" as const,
    label: "Are we being understood?",
    description: "Is your business type, service, and audience clear enough for AI to summarize you accurately?",
  },
  {
    key: "trust" as const,
    label: "Are we trusted?",
    description: "Do you have the proof signals — reviews, credentials, case studies — that AI uses to verify claims?",
  },
  {
    key: "recommendationReady" as const,
    label: "Are we recommendation-ready?",
    description: "When someone asks AI for a recommendation in your category, is your business a plausible answer?",
  },
  {
    key: "geoReadiness" as const,
    label: "GEO readiness",
    description: "Do you have the structured data, FAQ blocks, and entity signals that AI-optimized search requires?",
  },
];

const HEALTH_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  STRONG: { label: "Strong", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  IMPROVING: { label: "Improving", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  AT_RISK: { label: "At risk", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  NEEDS_WORK: { label: "Needs work", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

// Map server confidence values to ConfidenceLabel's accepted values
function mapConfidence(c: string | null | undefined): ConfidenceLevel {
  if (c === "verified" || c === "confirmed") return "confirmed";
  if (c === "detected") return "estimated";
  if (c === "inferred") return "inferred";
  return "unknown";
}

export default function Scorecard() {
  useAuth({ redirectOnUnauthenticated: true });
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();

  const snapshot = trpc.snapshot.get.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const utils = trpc.useUtils();

  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      if (current) utils.snapshot.get.invalidate({ businessId: current.id });
      toast.success("Rina finished a fresh scan.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const s = snapshot.data;
  const health = s?.healthGrade ? HEALTH_LABEL[s.healthGrade] : null;

  if (snapshot.isLoading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-800">
            {firstName}'s visibility overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            What Rina sees about {current?.name ?? "your business"} right now.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => current && runScan.mutate({ businessId: current.id })}
          disabled={runScan.isPending}
          className="bg-white shrink-0"
        >
          {runScan.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Run scan
        </Button>
      </div>

      {/* Health grade */}
      {s && health && (
        <div
          className={`rounded-2xl border px-6 py-5 flex items-center justify-between ${health.bg}`}
        >
          <div>
            <div className="text-xs uppercase tracking-widest font-medium text-slate-500 mb-1">
              Overall health
            </div>
            <div className={`text-3xl font-display font-bold ${health.color}`}>
              {health.label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Confidence</div>
            <ConfidenceLabel level={mapConfidence(s.confidence)} />
          </div>
        </div>
      )}

      {/* No data state */}
      {!s && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm text-slate-500 mb-4">
            Rina hasn't scanned {current?.name ?? "your site"} yet.
          </p>
          <Button
            onClick={() => current && runScan.mutate({ businessId: current.id })}
            disabled={runScan.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {runScan.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Run first scan
          </Button>
        </div>
      )}

      {/* Five dimensions */}
      {s && (
        <section>
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
            Five dimensions
          </div>
          <div className="space-y-3">
            {DIMENSIONS.map((d) => {
              const grade = s[d.key] as string | null | undefined;
              return (
                <div
                  key={d.key}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{d.label}</span>
                      <GradePill grade={grade as "clear" | "partial" | "not_yet_visible" | null} />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{d.description}</p>
                  </div>
                  <ConfidenceLabel
                    level={mapConfidence(s.confidence)}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats row */}
      {s && (
        <section>
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
            Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Open findings", value: s.openFindings },
              { label: "Critical findings", value: s.criticalFindings },
              { label: "Active fixes", value: s.activeFixCount },
              { label: "Completed fixes", value: s.completedFixCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
              >
                <div className="text-2xl font-display font-bold text-slate-800 leading-none mb-1">
                  {stat.value ?? "—"}
                </div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
