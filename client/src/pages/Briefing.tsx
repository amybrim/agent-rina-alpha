import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { RINA_AVATAR_IMAGE } from "@/lib/rina";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const QUESTIONS = [
  { key: "showingUp", label: "Are we showing up?" },
  { key: "understood", label: "Are we understood?" },
  { key: "recommendable", label: "Are we recommendable?" },
  { key: "whatChanged", label: "What changed?" },
  { key: "whatsNext", label: "What's next?" },
] as const;

export default function Briefing() {
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Badge variant="secondary" className="mb-2">Weekly Visibility Briefing</Badge>
          <h1 className="font-display text-4xl">{current?.name ?? "Select a business"}</h1>
          {data && (
            <div className="text-sm text-muted-foreground mt-1">
              Week of {new Date(data.weekOf).toLocaleDateString()} · score {data.overallScore}/100
            </div>
          )}
        </div>
        <Button
          onClick={() => selectedId && generate.mutate({ businessId: selectedId })}
          disabled={!selectedId || generate.isPending}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {generate.isPending ? "Drafting…" : "Generate this week's briefing"}
        </Button>
      </div>

      {!data && (
        <Card className="rina-card">
          <CardContent className="p-10 text-center">
            <img src={RINA_AVATAR_IMAGE} alt="Rina" className="h-16 w-16 rounded-full object-cover mx-auto mb-4" />
            <p className="text-muted-foreground">
              No briefing yet. Run a scan, then ask Rina to generate this week's briefing.
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-5">
          {QUESTIONS.map((q, i) => (
            <Card key={q.key} className="rina-card">
              <CardContent className="p-7">
                <div className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-lg shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-2xl">{q.label}</div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
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
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Past briefings</div>
            <div className="space-y-2 text-sm">
              {list.data.slice(1).map((b) => (
                <div key={b.id} className="flex items-center justify-between border-b border-border/60 last:border-0 py-2">
                  <span className="text-muted-foreground">
                    Week of {new Date(b.weekOf).toLocaleDateString()}
                  </span>
                  <span className="font-medium">{b.overallScore} / 100</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </RinaLayout>
  );
}
