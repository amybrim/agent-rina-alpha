import RinaLayout from "@/components/RinaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { RINA_HERO_IMAGE } from "@/lib/rina";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  Eye,
  FileText,
  HelpCircle,
  Lightbulb,
  MessageSquareText,
  Pencil,
  Plug,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type ToneKey = "improving" | "watch" | "needs_proof" | "draft_ready" | "neutral";

const TONE_STYLES: Record<ToneKey, string> = {
  improving: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  watch: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  needs_proof: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  draft_ready: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  neutral: "bg-secondary text-secondary-foreground ring-1 ring-border/60",
};

function StatusPill({
  tone,
  label,
}: {
  tone: ToneKey;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[tone]}`}
    >
      {tone === "improving" && <ArrowRight className="h-3 w-3 rotate-[-45deg]" />}
      {label}
    </span>
  );
}

function QuestionTile({
  number,
  icon: Icon,
  question,
  tone,
  toneLabel,
  caption,
  onClick,
}: {
  number: number;
  icon: typeof Eye;
  question: string;
  tone: ToneKey;
  toneLabel: string;
  caption: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rina-card hover:shadow-[0_8px_36px_-16px_rgba(80,40,160,0.32)] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99] p-5 flex flex-col items-center text-center"
    >
      <div className="text-[11px] font-semibold text-primary/80 mb-2">
        {String(number).padStart(2, "0")}
      </div>
      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-display text-base leading-snug mb-2 text-foreground">
        {question}
      </div>
      <StatusPill tone={tone} label={toneLabel} />
      <div className="text-xs text-muted-foreground mt-3 line-clamp-2">
        {caption}
      </div>
      <div className="mt-3 text-primary/60 group-hover:text-primary transition-colors">
        <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
}

const PIPELINE = [
  { key: "recommended", label: "Recommended", icon: Lightbulb, hint: "priorities identified" },
  { key: "drafted", label: "Drafted", icon: Pencil, hint: "in progress" },
  { key: "approved", label: "Approved", icon: CheckCircle2, hint: "ready to publish" },
  { key: "published", label: "Published", icon: CloudUpload, hint: "live across channels" },
  { key: "verified", label: "Verified", icon: ShieldCheck, hint: "tracking impact" },
] as const;

const RINA_ACTIONS = [
  { label: "Draft FAQ", icon: MessageSquareText, hint: "Answer top customer questions" },
  { label: "Update Metadata", icon: FileText, hint: "Refine titles and descriptions" },
  { label: "Create Blog Post", icon: Pencil, hint: "Publish a fresh signal" },
  { label: "Send to Wix", icon: Send, hint: "Push approved fixes" },
  { label: "Schedule Social Post", icon: CalendarDays, hint: "Reinforce visibility" },
  { label: "Verify Change", icon: ShieldCheck, hint: "Confirm fixes landed" },
] as const;

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { businesses, current, selectedId, select, isLoading, hasNone } =
    useCurrentBusiness();

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

  const utils = trpc.useUtils();
  const runScan = trpc.scanner.run.useMutation({
    onSuccess: () => {
      utils.snapshot.get.invalidate();
      utils.fixes.list.invalidate();
      toast.success("Rina finished a fresh scan.");
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

  // Derive pipeline counts from actual fix queue
  const counts = useMemo(() => {
    const c = { recommended: 0, drafted: 0, approved: 0, published: 0, verified: 0 } as Record<
      string,
      number
    >;
    (fixes.data ?? []).forEach((f) => {
      if (c[f.status] !== undefined) c[f.status]++;
    });
    return c;
  }, [fixes.data]);

  // Derive question tile tones from snapshot grades
  const tone = useMemo(() => {
    const s = snapshot.data;
    const gradeToTone = (g: string | null | undefined): ToneKey => {
      if (!g) return "neutral";
      if (g === "A" || g === "B") return "improving";
      if (g === "C") return "watch";
      return "needs_proof";
    };
    const drafted = (fixes.data ?? []).some((f: { status: string }) => f.status === "drafted");
    return {
      showingUp: { tone: gradeToTone(s?.showingUp), label: s?.showingUp ?? "—" },
      understood: { tone: gradeToTone(s?.beingUnderstood), label: s?.beingUnderstood ?? "—" },
      trusted: { tone: gradeToTone(s?.trust), label: s?.trust ?? "—" },
      recRdy: { tone: gradeToTone(s?.recommendationReady), label: s?.recommendationReady ?? "—" },
      drafts: drafted
        ? { tone: "draft_ready" as ToneKey, label: "Draft Ready" }
        : counts.recommended > 0
          ? { tone: "watch" as ToneKey, label: "Watch" }
          : { tone: "neutral" as ToneKey, label: "All clear" },
    };
  }, [snapshot.data, fixes.data, counts.recommended]);

  return (
    <RinaLayout>
      {isLoading && (
        <div className="text-muted-foreground py-20 text-center">Loading…</div>
      )}

      {!isLoading && hasNone && (
        <Card className="rina-card max-w-2xl mx-auto">
          <CardContent className="p-10 text-center">
            <div className="mb-4 flex justify-center">
              <img
                src={RINA_HERO_IMAGE}
                alt="Rina"
                className="h-40 w-auto object-contain"
              />
            </div>
            <h2 className="font-display text-3xl mb-2">
              Welcome. Let's start with your business.
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Rina builds her work around your Living Business Profile. It only
              takes a minute and it's the foundation for every scan, score, and
              recommendation.
            </p>
            <Button size="lg" onClick={() => navigate("/onboarding")}>
              Start onboarding <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && current && (
        <div className="relative">
          <div className="space-y-6">
            {/* RINA SPEAKS — the agent greeting, not a dashboard header */}
            <div className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-6 items-end">
              <img
                src={RINA_HERO_IMAGE}
                alt="Rina"
                className="hidden md:block w-full max-w-[200px] h-auto object-contain drop-shadow-[0_20px_30px_rgba(80,40,160,0.18)] -mb-4"
              />
              <div className="relative rounded-3xl bg-white border border-border/60 shadow-[0_20px_60px_-30px_rgba(80,40,160,0.35)] px-6 py-5 md:px-8 md:py-7">
                <div className="absolute -left-2 bottom-8 hidden md:block h-4 w-4 rotate-45 bg-white border-l border-b border-border/60" />
                <div className="flex items-center gap-2 text-xs font-medium text-primary/80 uppercase tracking-widest mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Rina, your AI visibility partner
                </div>
                <h1 className="font-display text-2xl md:text-3xl leading-snug text-foreground">
                  Hi {firstName} — here's where we stand for {current.name} the week of{" "}
                  {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}.
                </h1>
                <p className="text-muted-foreground mt-3 max-w-2xl">
                                    {snapshot.data
                    ? `${snapshot.data.rinaRead ?? `Your visibility grade is ${snapshot.data.healthGrade}.`} ${
                        counts.recommended + counts.drafted > 0
                          ? `I've lined up ${counts.recommended + counts.drafted} fixes for you to review when you're ready.`
                          : "Nothing urgent in the queue — we're holding steady."
                      }`
                    : `I haven't run a scan for ${current.name} yet. Hit "Run new scan" when you're ready and I'll get started.`}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => runScan.mutate({ businessId: current.id })}
                    disabled={runScan.isPending}
                    size="sm"
                  >
                    <RefreshCw className={`mr-1.5 h-4 w-4 ${runScan.isPending ? "animate-spin" : ""}`} />
                    {runScan.isPending ? "Scanning…" : snapshot.data ? "Run a fresh scan" : "Run my first scan"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white"
                    onClick={() => {
                      if (briefing.data) navigate("/app/briefing");
                      else if (snapshot.data) generateBriefing.mutate({ businessId: current.id });
                      else toast.message("Run your first scan to unlock the weekly briefing.");
                    }}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {briefing.data ? "Open the briefing" : generateBriefing.isPending ? "Drafting…" : "Draft this week's briefing"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Compact context strip (replaces the old dashboard header) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-1">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{current.name}</span>
                {current.businessType ? <> · {current.businessType}</> : null}
                {current.location ? <> · {current.location}</> : null}
              </div>
              <div className="flex items-center gap-2">
                {businesses.length > 1 && (
                  <Select
                    value={String(selectedId)}
                    onValueChange={(v) => select(Number(v))}
                  >
                    <SelectTrigger className="w-[200px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="rounded-full bg-white border border-border/60 px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Week of{" "}
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
            </div>

            {/* Five numbered question tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <QuestionTile
                number={1}
                icon={Eye}
                question="Are we showing up?"
                tone={tone.showingUp.tone}
                toneLabel={tone.showingUp.label}
                    caption={
                  snapshot.data?.showingUp
                    ? `Visibility grade: ${snapshot.data.showingUp}`
                    : "Run a scan to measure visibility"
                }
                onClick={() => navigate("/app/scorecard")}
              />
              <QuestionTile
                number={2}
                icon={MessageSquareText}
                question="Are we being understood?"
                tone={tone.understood.tone}
                toneLabel={tone.understood.label}
                    caption={
                  snapshot.data?.beingUnderstood
                    ? `Understanding grade: ${snapshot.data.beingUnderstood}`
                    : "Schema + clarity not yet measured"
                }
                onClick={() => navigate("/app/scorecard")}
              />
              <QuestionTile
                number={3}
                icon={ShieldCheck}
                question="Are we trusted?"
                tone={tone.trusted.tone}
                toneLabel={tone.trusted.label}
                    caption={
                  snapshot.data?.trust
                    ? `Trust grade: ${snapshot.data.trust}`
                    : "Authority not yet measured"
                }
                onClick={() => navigate("/app/scorecard")}
              />
              <QuestionTile
                number={4}
                icon={Star}
                question="Are we recommendation-ready?"
                tone={tone.recRdy.tone}
                toneLabel={tone.recRdy.label}
                    caption={
                  snapshot.data?.recommendationReady
                    ? `Recommendation grade: ${snapshot.data.recommendationReady}`
                    : "Citability not yet measured"
                }
                onClick={() => navigate("/app/scorecard")}
              />
              <QuestionTile
                number={5}
                icon={Wrench}
                question="What should we fix next?"
                tone={tone.drafts.tone}
                toneLabel={tone.drafts.label}
                caption={
                  counts.recommended + counts.drafted > 0
                    ? `${counts.recommended + counts.drafted} fixes waiting in queue`
                    : "Run a scan to surface high-impact fixes"
                }
                onClick={() => navigate("/app/fixes")}
              />
            </div>

            {/* AI Lead Signals + Rina Can Help */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="rina-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-display text-lg leading-tight">
                        AI Lead Signals
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Where your leads are coming from
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <SignalRow
                    icon={CheckCircle2}
                    iconClass="text-emerald-600 bg-emerald-50"
                    label="Confirmed AI-assisted leads"
                    value="—"
                    note="Connect lead source to track"
                  />
                  <SignalRow
                    icon={CircleAlert}
                    iconClass="text-amber-600 bg-amber-50"
                    label="Likely visibility-influenced leads"
                    value="—"
                    note="Inferred from referrer + intent"
                  />
                  <SignalRow
                    icon={HelpCircle}
                    iconClass="text-muted-foreground bg-secondary"
                    label="Unknown source"
                    value="—"
                    note="Will improve with connectors"
                  />
                  <div className="border-t border-border/50 mt-3 pt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total tracked</span>
                    <span className="font-display text-xl">—</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full bg-white"
                    onClick={() =>
                      toast.info("Lead source connectors coming soon.")
                    }
                  >
                    <Plug className="mr-1.5 h-3.5 w-3.5" /> Connect lead sources
                  </Button>
                </CardContent>
              </Card>

              <Card className="rina-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-display text-lg leading-tight">
                        Rina Can Help
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Take action, update content, and integrate — faster.
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RINA_ACTIONS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.label}
                          onClick={() => navigate("/app/fixes")}
                          className="group flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3 text-left hover:border-primary/30 hover:bg-primary/[0.03] transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium leading-tight">
                              {a.label}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {a.hint}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 5-Stage Pipeline Rail */}
            <Card className="rina-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                    Fix pipeline
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (briefing.data) {
                        navigate("/app/briefing");
                      } else if (snapshot.data) {
                        generateBriefing.mutate({ businessId: current.id });
                      } else {
                        toast.message("Run your first scan to unlock briefings.");
                      }
                    }}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {briefing.data
                      ? "View Full Action Plan"
                      : generateBriefing.isPending
                        ? "Drafting…"
                        : "Generate Action Plan"}
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {PIPELINE.map((p, i) => {
                    const Icon = p.icon;
                    const count = counts[p.key] ?? 0;
                    return (
                      <div key={p.key} className="relative">
                        <Link href="/app/fixes" className="block group">
                          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-3 py-3 hover:border-primary/30 transition-colors">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium leading-tight">
                                {p.label}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {count > 0
                                  ? `${count} ${count === 1 ? "fix" : "fixes"}`
                                  : p.hint}
                              </div>
                            </div>
                          </div>
                        </Link>
                        {i < PIPELINE.length - 1 && (
                          <ArrowRight className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 z-10" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </RinaLayout>
  );
}

function SignalRow({
  icon: Icon,
  iconClass,
  label,
  value,
  note,
}: {
  icon: typeof CheckCircle2;
  iconClass: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{note}</div>
      </div>
      <div className="font-display text-xl text-foreground">{value}</div>
    </div>
  );
}

function tone80Label(v: number) {
  if (v >= 80) return "Improving";
  if (v >= 65) return "Watch";
  return "Needs Proof";
}
