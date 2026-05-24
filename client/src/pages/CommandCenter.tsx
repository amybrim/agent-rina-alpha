import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { FIX_STATUS_LABEL, FIX_STATUS_TONE, RINA_AVATAR_IMAGE, gradeForScore } from "@/lib/rina";
import { ArrowRight, CalendarCheck, ClipboardList, Gauge, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const { businesses, current, selectedId, select, isLoading, hasNone } = useCurrentBusiness();

  const score = trpc.scores.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const fixes = trpc.fixes.listByBusiness.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const briefing = trpc.briefings.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );

  const utils = trpc.useUtils();
  const runScan = trpc.scans.runNow.useMutation({
    onSuccess: () => {
      utils.scores.latest.invalidate();
      utils.fixes.listByBusiness.invalidate();
      toast.success("Rina finished a fresh scan.");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateBriefing = trpc.briefings.generate.useMutation({
    onSuccess: () => {
      utils.briefings.latest.invalidate();
      toast.success("Weekly briefing ready.");
      navigate("/app/briefing");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <RinaLayout>
      {isLoading && <div className="text-muted-foreground">Loading…</div>}

      {!isLoading && hasNone && (
        <Card className="rina-card">
          <CardContent className="p-10 text-center">
            <img src={RINA_AVATAR_IMAGE} alt="Rina" className="h-20 w-20 rounded-full object-cover mx-auto mb-4" />
            <h2 className="font-display text-3xl mb-2">Welcome. Let's begin with your business.</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Rina builds her work around your Living Business Profile. It only takes a minute, and it's the foundation
              for every scan, score, and recommendation.
            </p>
            <Button size="lg" onClick={() => navigate("/onboarding")}>
              Start onboarding <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && current && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Badge variant="secondary" className="mb-2">Command Center</Badge>
              <h1 className="font-display text-4xl">Hello. Here's where {current.name} stands today.</h1>
              <div className="text-muted-foreground text-sm mt-1">
                Living Business Profile · {current.businessType ?? "Type not set"} · {current.location ?? "Location not set"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {businesses.length > 1 && (
                <Select value={String(selectedId)} onValueChange={(v) => select(Number(v))}>
                  <SelectTrigger className="w-[220px] bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={() => runScan.mutate({ businessId: current.id })} disabled={runScan.isPending}>
                <RefreshCw className={`mr-1.5 h-4 w-4 ${runScan.isPending ? "animate-spin" : ""}`} />
                {runScan.isPending ? "Scanning…" : "Run new scan"}
              </Button>
            </div>
          </div>

          {/* Top grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="rina-card lg:col-span-2">
              <CardContent className="p-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-widest">Visibility scorecard</span>
                  </div>
                  <Link href="/app/scorecard">
                    <a className="text-xs text-primary hover:underline">View full scorecard</a>
                  </Link>
                </div>
                {score.data ? (
                  <>
                    <div className="flex items-end gap-4">
                      <div className="font-display text-7xl leading-none">{score.data.overall}</div>
                      <div className="text-3xl font-display text-muted-foreground mb-1">
                        / 100 · grade {score.data.grade ?? gradeForScore(score.data.overall)}
                      </div>
                    </div>
                    {score.data.narrative && (
                      <p className="mt-4 text-sm text-foreground/80 max-w-2xl leading-relaxed">
                        {score.data.narrative}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                      <Pillar label="Crawlability" value={score.data.crawlability} />
                      <Pillar label="Structure" value={score.data.structure} />
                      <Pillar label="Schema" value={score.data.schemaScore} />
                      <Pillar label="Citability" value={score.data.citability} />
                      <Pillar label="Authority" value={score.data.authority} />
                      <Pillar label="Freshness" value={score.data.freshness} />
                      <Pillar label="Clarity" value={score.data.clarity} />
                      <Pillar label="Conversion" value={score.data.conversion} />
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    No scan yet. Run your first scan to generate a scorecard.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rina-card">
              <CardContent className="p-7">
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <CalendarCheck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">Weekly briefing</span>
                </div>
                {briefing.data ? (
                  <>
                    <div className="text-sm font-medium">
                      Week of {new Date(briefing.data.weekOf).toLocaleDateString()}
                    </div>
                    <p className="mt-3 text-sm text-foreground/80 line-clamp-5 leading-relaxed">
                      {briefing.data.whatsNext}
                    </p>
                    <Button variant="outline" className="mt-4 w-full bg-background" asChild>
                      <Link href="/app/briefing"><a>Open briefing <ArrowRight className="ml-1 h-4 w-4" /></a></Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      No briefing yet this week. After your latest scan, generate Rina's weekly briefing.
                    </p>
                    <Button
                      className="w-full"
                      disabled={!score.data || generateBriefing.isPending}
                      onClick={() => generateBriefing.mutate({ businessId: current.id })}
                    >
                      {generateBriefing.isPending ? "Drafting…" : "Generate this week's briefing"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fix queue summary */}
          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">Fix queue</span>
                </div>
                <Link href="/app/fixes"><a className="text-xs text-primary hover:underline">Open fix queue</a></Link>
              </div>
              {fixes.data && fixes.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fixes.data.slice(0, 6).map((f) => (
                    <Link key={f.id} href={`/app/fixes/${f.id}`}>
                      <a className="block rounded-xl border border-border/60 p-4 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="font-medium leading-snug">{f.title}</div>
                          <span className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${FIX_STATUS_TONE[f.status as keyof typeof FIX_STATUS_TONE]}`}>
                            {FIX_STATUS_LABEL[f.status as keyof typeof FIX_STATUS_LABEL]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{f.rationale}</div>
                        <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-3">
                          <span>+{f.impactPoints} pts potential</span>
                          <span>·</span>
                          <span className="capitalize">{f.category}</span>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No fixes yet. Run a scan to let Rina build your queue.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </RinaLayout>
  );
}

function Pillar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-0.5">{value}</div>
      <Progress value={value} className="mt-2 h-1.5" />
    </div>
  );
}
