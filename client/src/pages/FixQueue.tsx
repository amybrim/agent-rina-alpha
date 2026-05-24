import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { FIX_STATUS_LABEL, FIX_STATUS_ORDER, FIX_STATUS_TONE, FixStatus } from "@/lib/rina";
import { Link } from "wouter";

export default function FixQueue() {
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

  return (
    <RinaLayout>
      <div className="mb-6">
        <Badge variant="secondary" className="mb-2">Fix Queue</Badge>
        <h1 className="font-display text-4xl">{current?.name ?? "Select a business"}</h1>
        <p className="text-sm text-muted-foreground">
          Workflow: Recommended → Drafted → Approved → Published → Verified.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {FIX_STATUS_ORDER.map((status) => (
          <div key={status}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${FIX_STATUS_TONE[status]}`}>
                {FIX_STATUS_LABEL[status]}
              </span>
              <span className="text-xs text-muted-foreground">{byStatus[status].length}</span>
            </div>
            <div className="space-y-3">
              {byStatus[status].length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                  Nothing here yet.
                </div>
              )}
              {byStatus[status].map((f) => (
                <Link key={f.id} href={`/app/fixes/${f.id}`} className="block">
                  <Card className="rina-card hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="font-medium leading-snug">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{f.rationale}</div>
                      <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-2">
                        <span className="capitalize">{f.category}</span>
                        <span>·</span>
                        <span>+{f.impactPoints} pts</span>
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
