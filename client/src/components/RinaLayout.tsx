import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { RINA_AVATAR_IMAGE } from "@/lib/rina";
import { trpc } from "@/lib/trpc";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  LayoutGrid,
  LogOut,
  Plug,
  Settings,
  Sparkles,
} from "lucide-react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const NAV: Array<{ to: string; label: string; icon: typeof LayoutGrid }> = [
  { to: "/app", label: "Weekly Meeting", icon: CalendarDays },
  { to: "/app/scorecard", label: "Overview", icon: LayoutGrid },
  { to: "/app/profile", label: "Business", icon: Briefcase },
  { to: "/app/briefing", label: "Reports", icon: FileBarChart },
  { to: "/app/fixes", label: "Tasks", icon: ClipboardList },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function HealthCard() {
  const { businessId } = useCurrentBusiness();
  const { data } = trpc.scores.history.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );
  const latest = data?.[0];
  const score = latest ? Math.round(latest.overall) : null;
  const status =
    score === null
      ? "Awaiting first scan"
      : score >= 80
        ? "Strong"
        : score >= 65
          ? "Steady"
          : "At Risk";

  // Build mini sparkline points
  const points = (data ?? [])
    .slice()
    .reverse()
    .map((s) => Math.round(s.overall));
  const max = Math.max(100, ...points);
  const min = Math.min(0, ...points);
  const range = Math.max(1, max - min);
  const w = 120;
  const h = 32;
  const path = points
    .map((p, i) => {
      const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-sidebar-border/70 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        AI Visibility Health
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-3xl text-foreground leading-none">
          {score ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{status}</div>
      {points.length >= 2 && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mt-2 w-full h-8"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export default function RinaLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading Rina…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/40 via-background to-primary/5 px-4">
        <div className="rina-card p-10 max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <img
              src={RINA_AVATAR_IMAGE}
              alt="Rina"
              className="h-32 w-auto object-contain"
            />
          </div>
          <h2 className="font-display text-3xl mb-2">Sign in to meet Rina</h2>
          <p className="text-muted-foreground mb-6">
            Rina works alongside you to keep your business visible, understood,
            and recommendable across AI search.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => (window.location.href = getLoginUrl(location))}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Continue with Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-secondary/30 via-background to-primary/5">
      <aside className="hidden md:flex w-72 shrink-0 flex-col bg-white/70 backdrop-blur-md border-r border-border/60">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-border/50">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-display text-xl shadow-md">
            R
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl leading-tight">Rina</div>
            <div className="text-xs text-muted-foreground">
              AI Visibility CoPilot
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              location === item.to ||
              (item.to !== "/app" && location.startsWith(item.to));
            return (
              <Link key={item.to} href={item.to}>
                <a
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/75 hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 space-y-3 border-t border-border/50">
          <HealthCard />
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/15 text-primary text-xs">
                {(user?.name ?? "U")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {user?.name ?? "Owner"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email ?? ""}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => logout()}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="px-6 md:px-10 py-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
