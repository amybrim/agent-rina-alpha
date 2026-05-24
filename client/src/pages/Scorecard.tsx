import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { SCORE_CATEGORIES, gradeForScore } from "@/lib/rina";

export default function Scorecard() {
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

  return (
    <RinaLayout>
      <div className="mb-6">
        <Badge variant="secondary" className="mb-2">Visibility Scorecard</Badge>
        <h1 className="font-display text-4xl">{current?.name ?? "Select a business"}</h1>
        <p className="text-sm text-muted-foreground">
          Eight pillars adapted from peer-reviewed AI visibility research.
        </p>
      </div>

      {!data && (
        <Card className="rina-card"><CardContent className="p-10 text-center text-muted-foreground">No score yet. Run a scan from the Command Center.</CardContent></Card>
      )}

      {data && (
        <div className="space-y-6">
          <Card className="rina-card">
            <CardContent className="p-7 flex flex-col md:flex-row md:items-end gap-6 justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Overall visibility</div>
                <div className="font-display text-7xl leading-none mt-1">{data.overall}</div>
                <div className="text-muted-foreground">Grade {data.grade ?? gradeForScore(data.overall)}</div>
              </div>
              <p className="text-sm text-foreground/80 max-w-2xl leading-relaxed">{data.narrative}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCORE_CATEGORIES.map((cat) => {
              const v = valueByKey(cat.key);
              return (
                <Card key={cat.key} className="rina-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-xl">{cat.label}</div>
                        <div className="text-sm text-muted-foreground">{cat.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-3xl">{v}</div>
                        <div className="text-xs text-muted-foreground">grade {gradeForScore(v)}</div>
                      </div>
                    </div>
                    <Progress value={v} className="mt-4 h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Score history</div>
              {history.data && history.data.length > 0 ? (
                <div className="space-y-2">
                  {history.data.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 py-2">
                      <span className="text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</span>
                      <span className="font-medium">{s.overall} <span className="text-muted-foreground">/ 100 · {s.grade}</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No history yet.</div>
              )}
            </CardContent>
          </Card>

          {latestScan.data && (
            <Card className="rina-card">
              <CardContent className="p-7">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Evidence from last scan</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(latestScan.data.startedAt).toLocaleString()} · status {latestScan.data.status}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </RinaLayout>
  );
}
