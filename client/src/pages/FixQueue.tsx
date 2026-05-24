import RinaLayout from "@/components/RinaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FIX_STATUS_LABEL, FIX_STATUS_ORDER, FIX_STATUS_TONE, FixStatus } from "@/lib/rina";
import { ClipboardList } from "lucide-react";
import { Link } from "wouter";

const STATUS_DESCRIPTIONS: Record<FixStatus, string> = {
  recommended: "Rina identified these — review and approve when ready",
  drafted: "Draft content is ready for your review",
  approved: "You've approved these — ready to publish",
  published: "Live — Rina is watching for impact",
  verified: "Confirmed improvement in visibility",
};

export default function FixQueue() {
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();
  const fixes = trpc.fixes.listByBusiness.useQuery(
    { businessId: selectedId! },
    { enabled: !!selectedId }
  );

  const byStatus: Record<FixStatus, NonNullable<typeof fixes.data>> = {
    recommended: [],
    drafted: [],
    approved: [],
    published: [],
    verified: [],
  };
  (fixes.data ?? []).forEach((f) => {
    const s = f.status as FixStatus;
    if (byStatus[s]) byStatus[s].push(f);
  });

  const totalActive = (fixes.data ?? []).filter(
    (f) => f.status === "recommended" || f.status === "drafted"
  ).length;

  return (
    <RinaLayout>
      {/* Rina-voice header */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Fix Queue
        </div>
        <h1 className="font-display text-3xl text-slate-800">
          {current ? (
            <>
              {firstName},{" "}
              {totalActive > 0
                ? `I have ${totalActive} fix${totalActive === 1 ? "" : "es"} waiting for your attention.`
                : "your queue is clear — nothing urgent right now."}
            </>
          ) : (
            "Select a business to view your fix queue."
          )}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Every fix moves through five stages: Recommended → Drafted → Approved → Published → Verified.
          You stay in control at every step.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {FIX_STATUS_ORDER.map((status) => (
          <div key={status}>
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] uppercase tracking-widest rounded-full px-2.5 py-1 font-semibold ${FIX_STATUS_TONE[status]}`}
                >
                  {FIX_STATUS_LABEL[status]}
                </span>
                <span className="text-xs text-slate-400 font-medium">{byStatus[status].length}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                {STATUS_DESCRIPTIONS[status]}
              </div>
            </div>
            <div className="space-y-3">
              {byStatus[status].length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400 text-center">
                  Nothing here yet.
                </div>
              )}
              {byStatus[status].map((f) => (
                <Link key={f.id} href={`/app/fixes/${f.id}`} className="block">
                  <Card className="rina-card hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="font-medium leading-snug text-slate-800 text-sm">{f.title}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-3">{f.rationale}</div>
                      <div className="text-[11px] text-slate-400 mt-3 flex items-center gap-2">
                        <span className="capitalize">{f.category}</span>
                        <span>·</span>
                        <span className="text-violet-500 font-medium">+{f.impactPoints} pts</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </RinaLayout>
  );
}
