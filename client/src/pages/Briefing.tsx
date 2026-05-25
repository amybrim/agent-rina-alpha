import RinaLayout from "@/components/RinaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { RINA_HERO_IMAGE } from "@/lib/rina";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

// Maps the new briefing shape to the five questions
const QUESTIONS = [
  {
    key: "showingUpGrade",
    narrativeKey: "rinaRead",
    label: "Are we showing up?",
    number: 1,
    description: "Crawlability, indexability, and AI discovery signals.",
  },
  {
    key: "beingUnderstoodGrade",
    narrativeKey: null,
    label: "Are we being understood?",
    number: 2,
    description: "Schema markup, metadata clarity, and structured content.",
  },
  {
    key: "trustGrade",
    narrativeKey: null,
    label: "Are we trusted?",
    number: 3,
    description: "Authority signals, proof points, and credibility markers.",
  },
  {
    key: "recommendationReadyGrade",
    narrativeKey: null,
    label: "Are we recommendation-ready?",
    number: 4,
    description: "Citability, conversion copy, and offer clarity.",
  },
  {
    key: "geoReadinessGrade",
    narrativeKey: "topActions",
    label: "What should we fix next?",
    number: 5,
    description: "GEO readiness and the highest-impact actions for this week.",
  },
] as const;

const GRADE_COLOR: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-teal-50 text-teal-700 border-teal-200",
  C: "bg-amber-50 text-amber-800 border-amber-200",
  D: "bg-orange-50 text-orange-700 border-orange-200",
  F: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function Briefing() {
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();

  const briefing = trpc.briefing.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const history = trpc.briefing.history.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const utils = trpc.useUtils();
  const generate = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      utils.briefing.latest.invalidate();
      utils.briefing.history.invalidate();
      toast.success("Weekly briefing ready.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const data = briefing.data;

  return (
    <RinaLayout>
      {/* Rina-voice header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Weekly Visibility Briefing
          </div>
          <h1 className="font-display text-3xl text-slate-800">
            {current ? (
              <>
                {firstName}, here's your briefing for{" "}
                <span className="text-violet-600">{current.name}</span>.
              </>
            ) : (
              "Select a business to view your briefing."
            )}
          </h1>
          {data && (
            <div className="text-sm text-slate-400 mt-1">
              Week of {new Date(data.weekStartDate).toLocaleDateString()} ·{" "}
              {data.fixesCompleted} fixed · {data.fixesInProgress} in progress
            </div>
          )}
        </div>
        <Button
          onClick={() => selectedId && generate.mutate({ businessId: selectedId })}
          disabled={!selectedId || generate.isPending}
          className="shrink-0"
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {generate.isPending ? "Drafting…" : "Generate this week's briefing"}
        </Button>
      </div>

      {!data && !briefing.isLoading && (
        <Card className="rina-card">
          <CardContent className="p-10 text-center">
            <img
              src={RINA_HERO_IMAGE}
              alt="Rina"
              className="h-32 w-auto object-contain mx-auto mb-4 drop-shadow-[0_10px_20px_rgba(100,60,200,0.15)]"
            />
            <h2 className="font-display text-2xl text-slate-800 mb-2">
              Your weekly briefing isn't ready yet.
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Run a scan first, then ask me to generate this week's briefing. I'll answer all five
              questions in plain language so you always know where you stand.
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          {QUESTIONS.map((q) => {
            const grade = data[q.key as keyof typeof data] as string | null;
            const narrative =
              q.key === "geoReadinessGrade"
                ? Array.isArray(data.topActions)
                  ? (data.topActions as Array<{ why: string }>).map((a) => a.why).join("\n")
                  : null
                : q.key === "showingUpGrade"
                  ? data.rinaRead
                  : null;

            return (
              <Card key={q.key} className="rina-card">
                <CardContent className="p-7">
                  <div className="flex items-start gap-4">
                    <div className="h-9 w-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-display text-lg shrink-0 shadow-sm">
                      {q.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="font-display text-xl text-slate-800">{q.label}</div>
                        {grade && (
                          <Badge
                            variant="outline"
                            className={`font-display text-base px-2.5 py-0.5 ${GRADE_COLOR[grade] ?? ""}`}
                          >
                            {grade}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{q.description}</p>
                      {narrative && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                          {narrative}
                        </p>
                      )}
                      {!grade && (
                        <p className="mt-2 text-sm text-slate-400 italic">
                          Not yet graded — run a scan to populate this dimension.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {history.data && history.data.length > 1 && (
        <Card className="rina-card mt-8">
          <CardContent className="p-7">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
              Past briefings
            </div>
            <div className="space-y-2 text-sm">
              {history.data.slice(1).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border-b border-slate-50 last:border-0 py-2"
                >
                  <span className="text-slate-500">
                    Week of {new Date(b.weekStartDate).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {b.showingUpGrade && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${GRADE_COLOR[b.showingUpGrade] ?? ""}`}
                      >
                        {b.showingUpGrade}
                      </Badge>
                    )}
                    <span className="text-slate-400 text-xs">
                      {b.fixesCompleted} fixed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </RinaLayout>
  );
}
