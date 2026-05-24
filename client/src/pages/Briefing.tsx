import RinaLayout from "@/components/RinaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { RINA_HERO_IMAGE } from "@/lib/rina";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const QUESTIONS = [
  { key: "showingUp", label: "Are we showing up?", number: 1 },
  { key: "understood", label: "Are we being understood?", number: 2 },
  { key: "recommendable", label: "Are we trusted?", number: 3 },
  { key: "whatChanged", label: "Are we recommendation-ready?", number: 4 },
  { key: "whatsNext", label: "What should we fix next?", number: 5 },
] as const;

export default function Briefing() {
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();
  const briefing = trpc.briefings.latest.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const list = trpc.briefings.listByBusiness.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );
  const utils = trpc.useUtils();
  const generate = trpc.briefings.generate.useMutation({
    onSuccess: () => {
      utils.briefings.latest.invalidate();
      utils.briefings.listByBusiness.invalidate();
      toast.success("Weekly briefing ready.");
    },
    onError: (err) => toast.error(err.message),
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
              Week of {new Date(data.weekOf).toLocaleDateString()} · overall score {data.overallScore}/100
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

      {!data && (
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
          {QUESTIONS.map((q) => (
            <Card key={q.key} className="rina-card">
              <CardContent className="p-7">
                <div className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-display text-lg shrink-0 shadow-sm">
                    {q.number}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-xl text-slate-800">{q.label}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                      {data[q.key as keyof typeof data] as string}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {list.data && list.data.length > 1 && (
        <Card className="rina-card mt-8">
          <CardContent className="p-7">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
              Past briefings
            </div>
            <div className="space-y-2 text-sm">
              {list.data.slice(1).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border-b border-slate-50 last:border-0 py-2"
                >
                  <span className="text-slate-500">
                    Week of {new Date(b.weekOf).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-slate-700">{b.overallScore} / 100</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </RinaLayout>
  );
}
