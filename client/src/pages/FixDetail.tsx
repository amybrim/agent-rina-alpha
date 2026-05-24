import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FIX_STATUS_LABEL, FIX_STATUS_TONE, FixStatus } from "@/lib/rina";
import { ArrowLeft, CheckCircle2, FileEdit, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const ALLOWED_NEXT: Record<FixStatus, FixStatus[]> = {
  recommended: ["drafted"],
  drafted: ["approved", "recommended"],
  approved: ["published", "drafted"],
  published: ["verified", "approved"],
  verified: [],
};

export default function FixDetail() {
  const [match, params] = useRoute("/app/fixes/:id");
  const id = match ? Number(params?.id) : null;
  const fixQuery = trpc.fixes.get.useQuery({ id: id! }, { enabled: !!id });
  const utils = trpc.useUtils();

  const [draftEdit, setDraftEdit] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (fixQuery.data?.fix.draftContent) {
      setDraftEdit(fixQuery.data.fix.draftContent);
    } else {
      setDraftEdit("");
    }
  }, [fixQuery.data?.fix.draftContent]);

  const draftMut = trpc.fixes.draft.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ id: id! });
      utils.fixes.listByBusiness.invalidate();
      toast.success("Rina drafted the asset.");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateDraftMut = trpc.fixes.updateDraft.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ id: id! });
      toast.success("Draft updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const transitionMut = trpc.fixes.transition.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ id: id! });
      utils.fixes.listByBusiness.invalidate();
      toast.success("Status updated.");
    },
    onError: (err) => toast.error(err.message),
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
  const { fix, history } = data;
  const status = fix.status as FixStatus;
  const allowedNext = ALLOWED_NEXT[status] ?? [];

  return (
    <RinaLayout>
      <Link
        href="/app/fixes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to fix queue
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Badge variant="secondary" className="mb-2 capitalize">{fix.category}</Badge>
          <h1 className="font-display text-4xl leading-tight">{fix.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{fix.rationale}</p>
        </div>
        <span className={`text-[11px] uppercase tracking-widest rounded-full px-3 py-1 ${FIX_STATUS_TONE[status]}`}>
          {FIX_STATUS_LABEL[status]}
        </span>
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
                {!fix.draftContent && (
                  <Button onClick={() => draftMut.mutate({ fixId: fix.id })} disabled={draftMut.isPending}>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    {draftMut.isPending ? "Drafting…" : "Generate draft"}
                  </Button>
                )}
                {fix.draftContent && (
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
              {fix.draftContent ? (
                <>
                  <Textarea
                    value={draftEdit}
                    onChange={(e) => setDraftEdit(e.target.value)}
                    rows={16}
                    className="font-mono text-xs leading-relaxed"
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="outline"
                      className="bg-background"
                      disabled={draftEdit === fix.draftContent || updateDraftMut.isPending}
                      onClick={() => updateDraftMut.mutate({ fixId: fix.id, draftContent: draftEdit })}
                    >
                      Save edits
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Asset type: <span className="font-medium text-foreground">{fix.assetType}</span>
                  {fix.targetLocation && <> · Target: <span className="font-medium text-foreground">{fix.targetLocation}</span></>}
                  <div className="mt-2">Click "Generate draft" to have Rina write ready-to-paste content.</div>
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
                          toStatus: next,
                          ownerNotes: notes || undefined,
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
              {status === "drafted" && !fix.draftContent && (
                <div className="text-xs text-destructive mt-2">A draft is required before approval.</div>
              )}
            </CardContent>
          </Card>

          <Card className="rina-card">
            <CardContent className="p-7">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">History</div>
              <div className="space-y-3">
                {history.length === 0 && <div className="text-sm text-muted-foreground">No history yet.</div>}
                {history.map((h) => (
                  <div key={h.id} className="text-sm border-l-2 border-primary/30 pl-3">
                    <div className="font-medium">
                      {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Created · ${h.toStatus}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                    </div>
                    {h.note && <div className="text-xs mt-1 text-foreground/80">{h.note}</div>}
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
