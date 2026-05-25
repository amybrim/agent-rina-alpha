import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SCORE_CATEGORIES } from "@/lib/rina";
import { RefreshCw, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-600",
  B: "text-teal-600",
  C: "text-amber-600",
  D: "text-orange-600",
  F: "text-rose-600",
};

function gradeColor(g: string | null | undefined) {
  return g ? (GRADE_COLOR[g] ?? "text-slate-400") : "text-slate-400";
}

export default function Scorecard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();

  const snapshot = trpc.snapshot.get.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const briefingHistory = trpc.briefing.history.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const utils = trpc.useUtils();
  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      utils.snapshot.get.invalidate();
      utils.briefing.history.invalidate();
      toast.success("Rina finished a fresh scan.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const s = snapshot.data;

  // Map SCORE_CATEGORIES to snapshot grade fields
  const gradeByCategory = (key: string): string | null => {
    if (!s) return null;
    switch (key) {
      case "showing_up": return s.showingUp;
      case "being_understood": return s.beingUnderstood;
      case "trusted": return s.trust;
      case "recommendation_ready": return s.recommendationReady;
      case "fix_priority": return s.geoReadiness;
      default: return null;
    }
  };

  return (
    <div>
      {/* Rina-voice header */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          AI Visibility Overview
        </div>
        <h1 className="font-display text-3xl text-slate-800">
          {current ? (
            <>
              {firstName}, here's how{" "}
              <span className="text-violet-600">{current.name}</span> is showing up.
            </>
          ) : (
            "Select a business to see your overview."
          )}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Five questions that tell you everything about your AI visibility — graded,
          not scored. Grades reflect Rina's confidence in what she found.
        </p>
      </div>

      {!s && !snapshot.isLoading && (
        <Card className="rina-card">
          <CardContent className="p-10 text-center">
            <p className="text-slate-500 mb-4">
              No visibility data yet. Run a scan from the Weekly Meeting and I'll
              grade your visibility across all five dimensions.
            </p>
            {current && (
              <Button
                onClick={() =>
                  runScan.mutate({
                    businessId: current.id,
                  })
                }
                disabled={runScan.isPending}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {runScan.isPending ? "Scanning…" : "Run my first scan"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {s && (
        <div className="space-y-6">
          {/* Overall health hero */}
          <Card className="rina-card">
            <CardContent className="p-7 flex flex-col md:flex-row md:items-end gap-6 justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                  Overall visibility health
                </div>
                <div className={`font-display text-7xl leading-none ${gradeColor(s.healthGrade)}`}>
                  {s.healthGrade ?? "—"}
                </div>
                <div className="text-slate-500 mt-1">
                  {s.healthGrade === "STRONG"
                    ? "Strong"
                    : s.healthGrade === "IMPROVING"
                      ? "Improving"
                      : s.healthGrade === "AT_RISK"
                        ? "At Risk"
                        : s.healthGrade
                          ? "Needs Work"
                          : "Awaiting scan"}
                </div>
              </div>
              <div className="flex-1 max-w-2xl">
                {s.rinaRead && (
                  <p className="text-sm text-slate-700 leading-relaxed">{s.rinaRead}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() =>
                      runScan.mutate({
                        businessId: current!.id,
                      })
                    }
                    disabled={runScan.isPending}
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${runScan.isPending ? "animate-spin" : ""}`} />
                    {runScan.isPending ? "Scanning…" : "Run a fresh scan"}
                  </Button>
                  <Button size="sm" onClick={() => navigate("/app/fixes")}>
                    View fix queue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Five question grade cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCORE_CATEGORIES.map((cat) => {
              const grade = gradeByCategory(cat.key);
              return (
                <Card key={cat.key} className="rina-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-display text-base text-slate-800 leading-tight">
                          {cat.question}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{cat.description}</div>
                      </div>
                      <div className={`font-display text-4xl leading-none shrink-0 ${gradeColor(grade)}`}>
                        {grade ?? "—"}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {grade
                        ? grade === "A" || grade === "B"
                          ? "Performing well"
                          : grade === "C"
                            ? "Room to improve"
                            : "Needs attention"
                        : "Run a scan to grade this dimension"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Findings summary */}
          {(s.openFindings > 0 || s.criticalFindings > 0) && (
            <Card className="rina-card">
              <CardContent className="p-6 flex flex-wrap gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                    Open findings
                  </div>
                  <div className="font-display text-3xl text-slate-800">{s.openFindings}</div>
                </div>
                {s.criticalFindings > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                      Critical
                    </div>
                    <div className="font-display text-3xl text-rose-600">{s.criticalFindings}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                    Active fixes
                  </div>
                  <div className="font-display text-3xl text-violet-600">{s.activeFixCount}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                    Completed fixes
                  </div>
                  <div className="font-display text-3xl text-emerald-600">{s.completedFixCount}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Briefing history */}
          {briefingHistory.data && briefingHistory.data.length > 0 && (
            <Card className="rina-card">
              <CardContent className="p-7">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                  Briefing history
                </div>
                <div className="space-y-2">
                  {briefingHistory.data.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 py-2"
                    >
                      <span className="text-slate-500">
                        Week of {new Date(b.weekStartDate).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {b.showingUpGrade && (
                          <Badge variant="outline" className={gradeColor(b.showingUpGrade)}>
                            {b.showingUpGrade}
                          </Badge>
                        )}
                        <span className="text-slate-400 text-xs">
                          {b.fixesCompleted} fixed · {b.fixesInProgress} in progress
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
