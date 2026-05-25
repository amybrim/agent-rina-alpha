import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FIX_STATUS_LABEL, FIX_STATUS_TONE, FixStatus } from "@/lib/rina";
import { ArrowLeft, CheckCircle2, FileEdit, Info, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const ALLOWED_NEXT: Record<FixStatus, FixStatus[]> = {
  found: ["recommended"],
  recommended: ["drafted", "needs_input", "deferred", "rejected"],
  needs_input: ["drafted", "deferred", "rejected"],
  drafted: ["ready_for_review", "needs_input"],
  ready_for_review: ["approved", "rejected"],
  approved: ["scheduled", "published"],
  scheduled: ["published"],
  published: ["verified", "failed"],
  failed: ["drafted"],
  verified: [],
  deferred: ["recommended"],
  rejected: [],
};

export default function FixDetail() {
  const [match, params] = useRoute("/app/fixes/:id");
  const id = match ? Number(params?.id) : null;
  const fixQuery = trpc.fixes.get.useQuery({ fixId: id! }, { enabled: !!id });
  const decisionHistoryQuery = trpc.fixes.decisionHistory.useQuery(
    { fixId: id! },
    { enabled: !!id }
  );
  const latestAsset = trpc.assets.getLatest.useQuery(
    { fixId: id! },
    { enabled: !!id }
  );
  const utils = trpc.useUtils();

  const [draftEdit, setDraftEdit] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (latestAsset.data?.content) {
      setDraftEdit(latestAsset.data.content);
    } else {
      setDraftEdit("");
    }
  }, [latestAsset.data?.content]);

  const draftMut = trpc.assets.draft.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ fixId: id! });
      utils.fixes.list.invalidate();
      toast.success("Rina drafted the asset.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const updateDraftMut = trpc.assets.updateContent.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ fixId: id! });
      utils.assets.getLatest.invalidate({ fixId: id! });
      toast.success("Draft updated.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const transitionMut = trpc.fixes.transition.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ fixId: id! });
      utils.fixes.list.invalidate();
      toast.success("Status updated.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  if (!id) return <RinaLayout><div>Not found.</div></RinaLayout>;

  const data = fixQuery.data;
  if (!data) {
    return (
      <RinaLayout>
        <div className="text-muted-foreground">Loading…</div>
      </RinaLayout>
    );
  }
  const fix = data;
  const status = fix.status as FixStatus;
  const allowedNext = ALLOWED_NEXT[status] ?? [];
  const decisionHistory = decisionHistoryQuery.data ?? [];

  return (
    <RinaLayout>
      <Link
        href="/app/fixes"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to fix queue
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="capitalize">{fix.impactLevel} impact</Badge>
            <span className={`text-[11px] uppercase tracking-widest rounded-full px-2.5 py-0.5 font-semibold ${FIX_STATUS_TONE[status]}`}>
              {FIX_STATUS_LABEL[status]}
            </span>
          </div>
          <h1 className="font-display text-3xl text-slate-800 leading-tight">{fix.issue}</h1>
          <div className="flex items-start gap-2 mt-2 max-w-2xl">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-500">{fix.recommendation}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-primary" />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Rina Draft Studio</span>
                </div>
                {!latestAsset.data && (
                  <Button onClick={() => draftMut.mutate({ fixId: fix.id })} disabled={draftMut.isPending}>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    {draftMut.isPending ? "Drafting…" : "Generate draft"}
                  </Button>
                )}
                {latestAsset.data && (
                  <Button
                    variant="outline"
                    className="bg-background"
                    onClick={() => draftMut.mutate({ fixId: fix.id })}
                    disabled={draftMut.isPending}
                  >
                    {draftMut.isPending ? "Regenerating…" : "Regenerate"}
                  </Button>
                )}
              </div>
              {latestAsset.data ? (
                <>
                  <Textarea
                    value={draftEdit}
                    onChange={(e) => setDraftEdit(e.target.value)}
                    rows={16}
                    className="font-mono text-xs leading-relaxed bg-slate-50"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-400">
                      Edit freely — changes only save when you click "Save edits"
                    </span>
                    <Button
                      variant="outline"
                      className="bg-white"
                      disabled={draftEdit === (latestAsset.data?.content ?? "") || updateDraftMut.isPending}
                      onClick={() => latestAsset.data && updateDraftMut.mutate({ assetId: latestAsset.data.id, content: draftEdit })}
                    >
                      Save edits
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-5">
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Impact:</span> {fix.impactLevel}
                    {fix.targetPlatform && (
                      <> · <span className="font-medium text-slate-800">Platform:</span> {fix.targetPlatform}</>
                    )}
                  </div>
                  <div className="mt-3 text-sm text-slate-500">
                    Click "Generate draft" and I'll write ready-to-paste content for this fix. You can edit it before approving.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Owner notes</div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add a note before approving, publishing, or verifying."
              />
              <div className="text-xs text-muted-foreground mt-2">
                Notes are recorded with the next status change.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Move to next status</div>
              {allowedNext.length === 0 ? (
                <div className="text-sm flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Verified — no further actions.
                </div>
              ) : (
                <div className="space-y-2">
                  {allowedNext.map((next) => (
                    <Button
                      key={next}
                      className="w-full justify-between"
                      variant={next === "approved" || next === "published" || next === "verified" ? "default" : "outline"}
                      onClick={() =>
                        transitionMut.mutate({
                          fixId: fix.id,
                          newStatus: next,
                          notes: notes || undefined,
                        })
                      }
                      disabled={transitionMut.isPending}
                    >
                      <span>Move to {FIX_STATUS_LABEL[next]}</span>
                      <span className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${FIX_STATUS_TONE[next]}`}>
                        {next}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
              {status === "drafted" && !latestAsset.data && (
                <div className="text-xs text-destructive mt-2">A draft is required before approval.</div>
              )}
            </CardContent>
          </Card>

          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">History</div>
              <div className="space-y-3">
                {decisionHistory.length === 0 && <div className="text-sm text-muted-foreground">No history yet.</div>}
                {decisionHistory.map((h) => (
                  <div key={h.id} className="text-sm border-l-2 border-primary/30 pl-3">
                    <div className="font-medium capitalize">
                      {h.decisionType}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                    </div>
                    {h.notes && <div className="text-xs mt-1 text-foreground/80">{h.notes}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RinaLayout>
  );
}
