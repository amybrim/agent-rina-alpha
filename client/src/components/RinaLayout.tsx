import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { RINA_AVATAR_IMAGE, RINA_HERO_IMAGE } from "@/lib/rina";
import { trpc } from "@/lib/trpc";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  LayoutGrid,
  LogOut,
  Plug,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { ReactNode, useState } from "react";
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
  const { data } = trpc.snapshot.get.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );

  const grade = data?.healthGrade ?? null;
  const status =
    grade === null
      ? "Awaiting first scan"
      : grade === "STRONG"
        ? "Strong"
        : grade === "IMPROVING"
          ? "Improving"
          : grade === "AT_RISK"
            ? "At Risk"
            : "Needs Work";

  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        AI Visibility Health
      </div>
      <div className="mt-1">
        <span className="font-display text-2xl text-slate-800 leading-none">
          {status}
        </span>
      </div>
      {data?.rinaRead && (
        <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{data.rinaRead}</div>
      )}
    </div>
  );
}

/** Business switcher dropdown — shown above the nav */
function BusinessSwitcher() {
  const { businesses, current, select } = useCurrentBusiness();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  if (!current) return null;

  return (
    <div className="relative px-3 py-2 border-b border-slate-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <div className="h-6 w-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-[11px] font-bold shrink-0">
          {current.name[0]?.toUpperCase() ?? "B"}
        </div>
        <span className="flex-1 text-left font-medium truncate text-sm">{current.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {businesses.map((biz) => (
            <button
              key={biz.id}
              onClick={() => {
                select(biz.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50 transition-colors"
            >
              <div className="h-5 w-5 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                {biz.name[0]?.toUpperCase() ?? "B"}
              </div>
              <span className="flex-1 text-left truncate">{biz.name}</span>
              {biz.id === current.id && (
                <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />
              )}
            </button>
          ))}
          <div className="border-t border-slate-100">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/onboarding");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-violet-600 hover:bg-violet-50 transition-colors font-medium"
            >
              <div className="h-5 w-5 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                <Plus className="h-3 w-3" />
              </div>
              Add a business
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RinaLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #e8e4f8 0%, #dde8f8 40%, #e4ecf8 100%)",
        }}
      >
        <div className="text-slate-500 text-sm">Loading Rina…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            "linear-gradient(135deg, #e8e4f8 0%, #dde8f8 40%, #e4ecf8 100%)",
        }}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <img
            src={RINA_HERO_IMAGE}
            alt="Rina"
            className="h-40 w-auto object-contain mx-auto mb-4"
          />
          <h2 className="font-display text-3xl mb-2 text-slate-800">
            Sign in to meet Rina
          </h2>
          <p className="text-slate-500 mb-6 text-sm">
            Rina works alongside you to keep your business visible, understood,
            and recommendable across AI search.
          </p>
          <Button
            size="lg"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => (window.location.href = getLoginUrl(location))}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Continue with Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    /* Page: lavender/periwinkle gradient — matches mockup background */
    <div
      className="min-h-screen flex items-stretch"
      style={{
        background:
          "linear-gradient(135deg, #e8e4f8 0%, #dde8f8 40%, #e4ecf8 100%)",
      }}
    >
      {/* Rina character — full-height, standing outside the card, pointing in */}
      <div className="hidden xl:flex flex-col justify-end items-center w-[220px] shrink-0 pl-4 pb-0 pointer-events-none select-none">
        <img
          src={RINA_HERO_IMAGE}
          alt="Rina"
          className="w-full max-w-[210px] h-auto object-contain drop-shadow-[0_30px_40px_rgba(100,60,200,0.22)]"
          style={{ marginBottom: "-4px" }}
        />
      </div>

      {/* Main floating white card */}
      <div className="flex-1 flex min-w-0 m-4 xl:ml-0 bg-white rounded-3xl shadow-[0_8px_60px_-20px_rgba(80,40,160,0.22)] overflow-hidden">
        {/* Internal sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-100">
          {/* Brand mark */}
          <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100">
            <img
              src={RINA_AVATAR_IMAGE}
              alt="Rina"
              className="h-10 w-10 rounded-xl object-cover shadow"
            />
            <div>
              <div className="font-display text-lg text-slate-800 leading-tight">
                Agent Rina
              </div>
              <div className="text-[11px] text-slate-400">
                AI Visibility CoPilot
              </div>
            </div>
          </div>

          {/* Business switcher */}
          <BusinessSwitcher />

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                location === item.to ||
                (item.to !== "/app" && location.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                    active
                      ? "bg-violet-50 text-violet-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom: health card + user */}
          <div className="p-4 space-y-3 border-t border-slate-100">
            <HealthCard />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
                  {(user?.name ?? "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-700 truncate">
                  {user?.name ?? "Owner"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email ?? ""}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={() => logout()}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-6 md:px-8 py-7 max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
