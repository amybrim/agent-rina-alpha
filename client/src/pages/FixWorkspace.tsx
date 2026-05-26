/**
 * FixWorkspace — where a single fix item lives.
 * This is not a form. It's a workspace.
 *
 * Left column: fix context (issue, recommendation, confidence, history)
 * Right column: asset drafting studio (generate, edit, approve, publish)
 *
 * State machine controls are surfaced as primary actions — not buried in dropdowns.
 * Rina speaks. The owner decides.
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceLabel, GradePill } from "@/components/ConfidenceLabel";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type FixStatus =
  | "found"
  | "recommended"
  | "drafted"
  | "needs_input"
  | "ready_for_review"
  | "approved"
  | "scheduled"
  | "published"
  | "verified"
  | "deferred"
  | "rejected"
  | "failed";

type ImpactLevel = "high" | "medium" | "low";
type Difficulty = "easy" | "medium" | "hard";

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium effort",
  hard: "Complex",
};

const STATUS_LABEL: Record<FixStatus, string> = {
  found: "Found",
  recommended: "Recommended",
  drafted: "Draft ready",
  needs_input: "Needs your input",
  ready_for_review: "Ready for review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  verified: "Verified",
  deferred: "Deferred",
  rejected: "Rejected",
  failed: "Failed",
};

// What actions are available from each status
const NEXT_ACTIONS: Partial<
  Record<FixStatus, Array<{ label: string; to: FixStatus; variant: "primary" | "ghost" | "danger" }>>
> = {
  recommended: [
    { label: "Draft this fix", to: "drafted", variant: "primary" },
    { label: "Defer", to: "deferred", variant: "ghost" },
    { label: "Reject", to: "rejected", variant: "danger" },
  ],
  needs_input: [
    { label: "Mark as drafted", to: "drafted", variant: "primary" },
    { label: "Defer", to: "deferred", variant: "ghost" },
  ],
  drafted: [
    { label: "Submit for review", to: "ready_for_review", variant: "primary" },
    { label: "Needs more input", to: "needs_input", variant: "ghost" },
  ],
  ready_for_review: [
    { label: "Approve", to: "approved", variant: "primary" },
    { label: "Reject", to: "rejected", variant: "danger" },
  ],
  approved: [
    { label: "Mark as published", to: "published", variant: "primary" },
    { label: "Schedule", to: "scheduled", variant: "ghost" },
  ],
  scheduled: [
    { label: "Mark as published", to: "published", variant: "primary" },
  ],
  published: [
    { label: "Mark as verified", to: "verified", variant: "primary" },
    { label: "Mark as failed", to: "failed", variant: "danger" },
  ],
  failed: [
    { label: "Re-draft", to: "drafted", variant: "primary" },
  ],
  deferred: [
    { label: "Bring back to recommended", to: "recommended", variant: "ghost" },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function FixWorkspace() {
  useAuth({ redirectOnUnauthenticated: true });
  const { current } = useCurrentBusiness();
  const params = useParams<{ id: string }>();
  const fixId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<FixStatus | null>(null);

  const utils = trpc.useUtils();

  const fixQuery = trpc.fixes.get.useQuery(
    { fixId },
    { enabled: !!fixId }
  );

  const latestAsset = trpc.assets.getLatest.useQuery(
    { fixId },
    { enabled: !!fixId }
  );

  const decisionHistory = trpc.fixes.decisionHistory.useQuery(
    { fixId },
    { enabled: !!fixId }
  );

  const draftMutation = trpc.assets.draft.useMutation({
    onSuccess: () => {
      utils.assets.getLatest.invalidate({ fixId });
      utils.fixes.get.invalidate({ fixId });
      toast.success("Draft ready.");
      // Auto-transition from recommended → drafted when draft is generated
      if (fix?.status === "recommended") {
        transitionMutation.mutate({ fixId, newStatus: "drafted", notes: undefined });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const updateContent = trpc.assets.updateContent.useMutation({
    onSuccess: () => {
      utils.assets.getLatest.invalidate({ fixId });
      setEditedContent(null);
      toast.success("Content saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const transitionMutation = trpc.fixes.transition.useMutation({
    onSuccess: () => {
      utils.fixes.get.invalidate({ fixId });
      utils.fixes.decisionHistory.invalidate({ fixId });
      if (current) utils.fixes.list.invalidate({ businessId: current.id });
      setShowNotesFor(null);
      setTransitionNotes("");
      toast.success("Status updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const fix = fixQuery.data;
  const asset = latestAsset.data;
  const history = decisionHistory.data ?? [];

  // Map DB confidence values to ConfidenceLabel component levels
  function mapConfidence(dbValue: string | null | undefined): "confirmed" | "inferred" | "estimated" | "unknown" {
    if (dbValue === "detected") return "confirmed";
    if (dbValue === "inferred") return "inferred";
    if (dbValue === "likely") return "estimated";
    return "unknown";
  }

  // Human-readable finding type labels
  function humanFindingType(raw: string | null | undefined): string {
    if (!raw) return "Finding";
    return raw
      .replace(/_gap$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (fixQuery.isLoading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!fix) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Fix not found.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/fixes")}
          className="mt-3"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to queue
        </Button>
      </div>
    );
  }

  const status = fix.status as FixStatus;
  const nextActions = NEXT_ACTIONS[status] ?? [];
  const displayContent =
    editedContent !== null ? editedContent : asset?.content ?? "";

  function handleTransition(toStatus: FixStatus) {
    if (["rejected", "deferred", "failed"].includes(toStatus)) {
      setShowNotesFor(toStatus);
      return;
    }
    transitionMutation.mutate({
      fixId,
      newStatus: toStatus,
      notes: undefined,
    });
  }

  function handleTransitionWithNotes() {
    if (!showNotesFor) return;
    transitionMutation.mutate({
      fixId,
      newStatus: showNotesFor,
      notes: transitionNotes || undefined,
    });
  }

  function handleSaveContent() {
    if (!asset || editedContent === null) return;
    updateContent.mutate({ assetId: asset.id, content: editedContent });
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(displayContent);
    toast.success("Copied to clipboard.");
  }

  // ─── Layout ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 py-2">
      {/* Back nav */}
      <button
        onClick={() => navigate("/app/fixes")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Fix queue
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <StatusIcon status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {STATUS_LABEL[status]}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">
              {IMPACT_LABEL[fix.impactLevel as ImpactLevel] ?? fix.impactLevel}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">
              {DIFFICULTY_LABEL[fix.difficulty as Difficulty] ?? fix.difficulty}
            </span>
          </div>
          <h1 className="font-display text-2xl text-slate-800 leading-snug">
            {fix.issue}
          </h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: context ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Rina's recommendation */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-lg bg-violet-600 flex items-center justify-center text-white font-display text-xs shrink-0">
                R
              </div>
              <span className="text-xs font-medium text-violet-700 uppercase tracking-wide">
                Rina's recommendation
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {fix.recommendation}
            </p>
          </div>

          {/* Source finding — confidence and evidence */}
          {fix.sourceFinding && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {humanFindingType(fix.sourceFinding.findingType)}
                </span>
                <ConfidenceLabel level={mapConfidence(fix.sourceFinding.confidence)} size="xs" />
              </div>
              {fix.sourceFinding.businessMeaning && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {fix.sourceFinding.businessMeaning}
                </p>
              )}
              {fix.sourceFinding.evidence && (
                <p className="text-xs text-slate-400 italic leading-relaxed">
                  Source: {fix.sourceFinding.evidence}
                </p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
            {fix.targetPlatform && (
              <MetaRow label="Target" value={fix.targetPlatform} />
            )}
            {fix.owner && <MetaRow label="Owner" value={fix.owner} />}
            {fix.dueDate && (
              <MetaRow
                label="Due"
                value={new Date(fix.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
            )}
            {fix.verificationMethod && (
              <MetaRow label="Verification" value={fix.verificationMethod} />
            )}
          </div>

          {/* Decision history */}
          {history.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-2">
                Decision history
              </div>
              <div className="space-y-2">
                {history.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-700 capitalize">
                        {d.decisionType?.replace(/_/g, " ")}
                      </span>
                      {d.notes && (
                        <p className="text-slate-500 mt-0.5 leading-relaxed">
                          {d.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-400 shrink-0">
                      {new Date(d.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: asset drafting studio ──────────────────────────── */}
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium">
            Draft studio
          </div>

          {/* No asset yet */}
          {!asset && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <Sparkles className="h-8 w-8 text-violet-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">
                Rina hasn't drafted this fix yet.
              </p>
              <Button
                onClick={() => draftMutation.mutate({ fixId })}
                disabled={draftMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {draftMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate draft
              </Button>
            </div>
          )}

          {/* Asset exists */}
          {asset && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    {asset.assetType.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">v{asset.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyContent}
                    className="h-7 px-2 text-xs text-slate-500"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => draftMutation.mutate({ fixId })}
                    disabled={draftMutation.isPending}
                    className="h-7 px-2 text-xs text-slate-500"
                  >
                    {draftMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>

              <Textarea
                value={displayContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={12}
                className="font-mono text-xs resize-none bg-white border-slate-200 focus:border-violet-300 focus:ring-violet-200"
                placeholder="Draft content will appear here…"
              />

              {editedContent !== null && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveContent}
                    disabled={updateContent.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs"
                  >
                    {updateContent.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Save edits
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditedContent(null)}
                    className="h-8 text-xs text-slate-500"
                  >
                    Discard
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* State machine actions */}
          {nextActions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-2">
                Next step
              </div>

              {/* Notes input for destructive transitions */}
              {showNotesFor && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs text-amber-700 font-medium">
                    Add a note (optional) before{" "}
                    {STATUS_LABEL[showNotesFor].toLowerCase()}:
                  </p>
                  <Textarea
                    value={transitionNotes}
                    onChange={(e) => setTransitionNotes(e.target.value)}
                    rows={2}
                    className="text-xs bg-white border-amber-200"
                    placeholder="Why are you making this change?"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleTransitionWithNotes}
                      disabled={transitionMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
                    >
                      {transitionMutation.isPending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNotesFor(null);
                        setTransitionNotes("");
                      }}
                      className="h-7 text-xs text-slate-500"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!showNotesFor && (
                <div className="flex flex-wrap gap-2">
                  {nextActions.map((action) => (
                    <Button
                      key={action.to}
                      size="sm"
                      onClick={() => handleTransition(action.to)}
                      disabled={transitionMutation.isPending}
                      className={cn(
                        "h-8 text-xs",
                        action.variant === "primary" &&
                          "bg-violet-600 hover:bg-violet-700 text-white",
                        action.variant === "ghost" &&
                          "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
                        action.variant === "danger" &&
                          "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                      )}
                    >
                      {transitionMutation.isPending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      {action.variant === "primary" && (
                        <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {action.variant === "danger" && (
                        <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Terminal states */}
          {(status === "verified" || status === "rejected") && (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium",
                status === "verified"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              )}
            >
              {status === "verified" ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  This fix has been verified live.
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  This fix was rejected.
                  {fix.rejectedReason && (
                    <span className="text-slate-400 font-normal">
                      {" "}
                      — {fix.rejectedReason}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: FixStatus }) {
  const cls = "h-6 w-6 shrink-0 mt-1";
  if (status === "verified")
    return <CheckCircle2 className={cn(cls, "text-emerald-500")} />;
  if (status === "rejected" || status === "failed")
    return <XCircle className={cn(cls, "text-rose-400")} />;
  if (status === "approved" || status === "published")
    return <CheckCircle2 className={cn(cls, "text-violet-500")} />;
  return <Clock className={cn(cls, "text-amber-500")} />;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="text-slate-400 w-24 shrink-0 text-xs font-medium uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="flex-1 text-slate-700 text-sm">{value}</span>
    </div>
  );
}
