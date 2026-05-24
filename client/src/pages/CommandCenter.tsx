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
  const { businesses, current, selectedId, select, isLoading, hasNone } =
    useCurrentBusiness();

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
      utils.scores.history.invalidate();
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

  // Derive question tile tones from category scores
  const tone = useMemo(() => {
    const s = score.data;
    const t = (val: number | undefined): ToneKey => {
      if (val === undefined) return "neutral";
      if (val >= 80) return "improving";
      if (val >= 65) return "watch";
      if (val >= 45) return "needs_proof";
      return "needs_proof";
    };
    const showingUp = s ? Math.round((s.crawlability + s.structure + s.freshness) / 3) : undefined;
    const understood = s ? Math.round((s.schemaScore + s.clarity) / 2) : undefined;
    const trusted = s ? s.authority : undefined;
    const recRdy = s ? Math.round((s.citability + s.conversion) / 2) : undefined;
    const drafted = (fixes.data ?? []).some((f) => f.status === "drafted");
    return {
      showingUp: { tone: t(showingUp), label: showingUp === undefined ? "—" : tone80Label(showingUp) },
      understood: { tone: t(understood), label: understood === undefined ? "—" : tone80Label(understood) },
      trusted: { tone: t(trusted), label: trusted === undefined ? "—" : tone80Label(trusted) },
      recRdy: { tone: t(recRdy), label: recRdy === undefined ? "—" : tone80Label(recRdy) },
      drafts: drafted
        ? { tone: "draft_ready" as ToneKey, label: "Draft Ready" }
        : counts.recommended > 0
          ? { tone: "watch" as ToneKey, label: "Watch" }
          : { tone: "neutral" as ToneKey, label: "All clear" },
      // not used in tile but exposed for narrative
      raw: { showingUp, understood, trusted, recRdy },
    };
  }, [score.data, fixes.data, counts.recommended]);

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
          {/* Floating Rina character on the left */}
          <img
            src={RINA_HERO_IMAGE}
            alt="Rina"
            className="hidden xl:block pointer-events-none select-none absolute -left-32 top-32 w-72 h-auto drop-shadow-[0_20px_30px_rgba(80,40,160,0.18)]"
          />

          <div className="space-y-6 xl:pl-44">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                  Rina's Weekly Visibility Meeting
                </div>
                <h1 className="font-display text-3xl md:text-4xl rina-gradient-text leading-tight">
                  How are we doing with AI visibility this week?
                </h1>
                <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
                  Your AI visibility snapshot, insights, and actions — so we keep
                  getting better. {current.name} ·{" "}
                  {current.businessType ?? "Type not set"} ·{" "}
                  {current.location ?? "Location not set"}
                </p>
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
                <div className="rina-card px-3 py-2 bg-white flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Week of{" "}
                  {new Date().toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <Button
                  onClick={() => runScan.mutate({ businessId: current.id })}
                  disabled={runScan.isPending}
                >
                  <RefreshCw
                    className={`mr-1.5 h-4 w-4 ${runScan.isPending ? "animate-spin" : ""}`}
                  />
                  {runScan.isPending ? "Scanning…" : "Run new scan"}
                </Button>
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
                  tone.raw.showingUp !== undefined
                    ? `Visibility signal at ${tone.raw.showingUp}/100`
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
                  tone.raw.understood !== undefined
                    ? `Schema + clarity at ${tone.raw.understood}/100`
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
                  tone.raw.trusted !== undefined
                    ? `Authority at ${tone.raw.trusted}/100`
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
                  tone.raw.recRdy !== undefined
                    ? `Citability + conversion at ${tone.raw.recRdy}/100`
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
                      } else if (score.data) {
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
                        <Link href="/app/fixes">
                          <a className="block group">
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
                          </a>
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
