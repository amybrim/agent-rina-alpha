import RinaLayout from "@/components/RinaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SCORE_CATEGORIES, gradeForScore } from "@/lib/rina";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Scorecard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();
  const score = trpc.scores.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const history = trpc.scores.history.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const latestScan = trpc.scans.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const utils = trpc.useUtils();
  const runScan = trpc.scans.runNow.useMutation({
    onSuccess: () => {
      utils.scores.latest.invalidate();
      utils.scores.history.invalidate();
      toast.success("Rina finished a fresh scan.");
    },
    onError: (err) => toast.error(err.message),
  });

  const data = score.data;
  const valueByKey = (key: string): number => {
    if (!data) return 0;
    switch (key) {
      case "crawlability": return data.crawlability;
      case "structure": return data.structure;
      case "schema": return data.schemaScore;
      case "citability": return data.citability;
      case "authority": return data.authority;
      case "freshness": return data.freshness;
      case "clarity": return data.clarity;
      case "conversion": return data.conversion;
      default: return 0;
    }
  };

  const gradeColor = (v: number) => {
    if (v >= 80) return "text-emerald-600";
    if (v >= 65) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <RinaLayout>
      {/* Rina-voice header */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          AI Visibility Scorecard
        </div>
        <h1 className="font-display text-3xl text-slate-800">
          {current ? (
            <>
              {firstName}, here's how <span className="text-violet-600">{current.name}</span> scores.
            </>
          ) : (
            "Select a business to see your scorecard."
          )}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Eight pillars adapted from peer-reviewed AI visibility research. Each score reflects how well AI
          crawlers and recommendation engines can find, understand, and cite your business.
        </p>
      </div>

      {!data && (
        <Card className="rina-card">
          <CardContent className="p-10 text-center">
            <p className="text-slate-500 mb-4">
              No score yet. Run a scan from the Weekly Meeting and I'll score your visibility across all eight pillars.
            </p>
            {current && (
              <Button
                onClick={() => runScan.mutate({ businessId: current.id })}
                disabled={runScan.isPending}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {runScan.isPending ? "Scanning…" : "Run my first scan"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          {/* Overall score hero */}
          <Card className="rina-card">
            <CardContent className="p-7 flex flex-col md:flex-row md:items-end gap-6 justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                  Overall visibility
                </div>
                <div className={`font-display text-7xl leading-none ${gradeColor(data.overall)}`}>
                  {Math.round(data.overall)}
                </div>
                <div className="text-slate-500 mt-1">
                  Grade {data.grade ?? gradeForScore(data.overall)} ·{" "}
                  {data.overall >= 80 ? "Strong" : data.overall >= 65 ? "Steady" : "Needs work"}
                </div>
              </div>
              <div className="flex-1 max-w-2xl">
                <p className="text-sm text-slate-700 leading-relaxed">{data.narrative}</p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => runScan.mutate({ businessId: current!.id })}
                    disabled={runScan.isPending}
                  >
                    {runScan.isPending ? "Scanning…" : "Run a fresh scan"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/app/fixes")}
                  >
                    View fix queue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8 category cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCORE_CATEGORIES.map((cat) => {
              const v = valueByKey(cat.key);
              return (
                <Card key={cat.key} className="rina-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-display text-lg text-slate-800">{cat.label}</div>
                        <div className="text-xs text-slate-500">{cat.description}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-display text-3xl leading-none ${gradeColor(v)}`}>{v}</div>
                        <div className="text-xs text-slate-400">grade {gradeForScore(v)}</div>
                      </div>
                    </div>
                    <Progress value={v} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Score history */}
          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                Score history
              </div>
              {history.data && history.data.length > 0 ? (
                <div className="space-y-2">
                  {history.data.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 py-2"
                    >
                      <span className="text-slate-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                      <span className={`font-medium ${gradeColor(s.overall)}`}>
                        {Math.round(s.overall)}{" "}
                        <span className="text-slate-400">/ 100 · {s.grade}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No history yet — run more scans to track your progress over time.</div>
              )}
            </CardContent>
          </Card>

          {/* Evidence from last scan */}
          {latestScan.data && (
            <Card className="rina-card">
              <CardContent className="p-7">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
                  Evidence from last scan
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(latestScan.data.startedAt).toLocaleString()} · status{" "}
                  <span className="font-medium text-slate-700">{latestScan.data.status}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </RinaLayout>
  );
}
