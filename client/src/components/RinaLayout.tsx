import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { RINA_AVATAR_IMAGE } from "@/lib/rina";
import {
  CalendarCheck,
  ClipboardList,
  Compass,
  Gauge,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const NAV: Array<{ to: string; label: string; icon: typeof Compass }> = [
  { to: "/app", label: "Command Center", icon: Compass },
  { to: "/app/scorecard", label: "Visibility Scorecard", icon: Gauge },
  { to: "/app/fixes", label: "Fix Queue", icon: ClipboardList },
  { to: "/app/briefing", label: "Weekly Briefing", icon: CalendarCheck },
  { to: "/app/profile", label: "Business Profile", icon: Settings },
];

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="rina-card p-10 max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <img src={RINA_AVATAR_IMAGE} alt="Rina" className="h-20 w-20 rounded-full object-cover" />
          </div>
          <h2 className="font-display text-3xl mb-2">Sign in to meet Rina</h2>
          <p className="text-muted-foreground mb-6">
            Rina works alongside you to keep your business visible, understood, and recommendable across AI search.
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
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-72 shrink-0 border-r border-border/60 bg-sidebar text-sidebar-foreground flex-col">
        <div className="px-6 py-7 flex items-center gap-3 border-b border-sidebar-border/70">
          <img src={RINA_AVATAR_IMAGE} alt="Rina" className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20" />
          <div>
            <div className="font-display text-xl leading-tight">Rina</div>
            <div className="text-xs text-muted-foreground">AI Visibility Partner</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location === item.to || (item.to !== "/app" && location.startsWith(item.to));
            return (
              <Link key={item.to} href={item.to}>
                <a
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border/70">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={undefined} />
              <AvatarFallback>{(user?.name ?? "U")[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name ?? "Owner"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full bg-background" onClick={() => logout()}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="container py-10">{children}</div>
      </main>
    </div>
  );
}
