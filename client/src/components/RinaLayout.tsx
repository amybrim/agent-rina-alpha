/**
 * RinaLayout -- matches the mockup exactly:
 * - Lavender gradient background
 * - Rina illustrated character stands FULL HEIGHT on the LEFT, outside the white card, pointing right
 * - White floating card takes the rest of the width
 * - Inside the card: sidebar on left, content on right
 * - Sidebar: Insightfulrina diamond logo + name, Rina face avatar, business switcher, nav, health card, user row
 */
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
  { to: "/app",              label: "Weekly Meeting", icon: CalendarDays },
  { to: "/app/scorecard",   label: "Overview",       icon: LayoutGrid },
  { to: "/app/profile",     label: "Business",       icon: Briefcase },
  { to: "/app/briefing",    label: "Reports",        icon: FileBarChart },
  { to: "/app/fixes",       label: "Tasks",          icon: ClipboardList },
  { to: "/app/integrations",label: "Integrations",   icon: Plug },
  { to: "/app/settings",    label: "Settings",       icon: Settings },
];

/** Business switcher dropdown */
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
              onClick={() => { select(biz.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50 transition-colors"
            >
              <div className="h-5 w-5 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                {biz.name[0]?.toUpperCase() ?? "B"}
              </div>
              <span className="flex-1 text-left truncate">{biz.name}</span>
              {biz.id === current.id && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
            </button>
          ))}
          <div className="border-t border-slate-100">
            <button
              onClick={() => { setOpen(false); navigate("/onboarding"); }}
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

/** Sidebar health card -- matches mockup bottom-left panel */
function SidebarHealthCard() {
  const { businessId, current } = useCurrentBusiness();
  const { data } = trpc.snapshot.get.useQuery(
    { businessId: businessId ?? 0 },
    { enabled: !!businessId }
  );

  const grade = data?.healthGrade ?? null;
  const label =
    grade === "STRONG"   ? "Strong"    :
    grade === "IMPROVING"? "Improving" :
    grade === "AT_RISK"  ? "At Risk"   :
    grade === "NEEDS_WORK"? "Needs Work":
    "Awaiting scan";

  const dotColor =
    grade === "STRONG"    ? "bg-emerald-500" :
    grade === "IMPROVING" ? "bg-teal-500"    :
    grade === "AT_RISK"   ? "bg-amber-500"   :
    "bg-slate-300";

  return (
    <div className="mx-3 mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-[10px] text-slate-400 mb-0.5 font-medium uppercase tracking-wide">Your Business</div>
      <div className="text-xs font-semibold text-slate-700 truncate mb-2">{current?.name ?? "--"}</div>
      <div className="text-[10px] text-slate-400 mb-0.5 font-medium uppercase tracking-wide">AI Visibility Health</div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-sm font-bold text-slate-800">{label}</span>
      </div>
      {/* Mini sparkline */}
      <div className="mt-1.5 h-8 flex items-end gap-0.5">
        {[3, 5, 4, 6, 5, 7, 6, 8].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-violet-200" style={{ height: `${h * 4}px` }} />
        ))}
      </div>
    </div>
  );
}

/** Insightfulrina diamond logo mark */
function RinaLogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20" fill="none">
        <path d="M10 2 L12 8 L18 10 L12 12 L10 18 L8 12 L2 10 L8 8 Z" fill="white" />
      </svg>
    </div>
  );
}

export default function RinaLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();

  /* Loading */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ede9f8 0%, #dde8f8 50%, #e4ecf8 100%)" }}>
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RinaLogoMark size={32} />
          Loading Rina...
        </div>
      </div>
    );
  }

  /* Sign-in screen */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #ede9f8 0%, #dde8f8 50%, #e4ecf8 100%)" }}>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl w-full flex">
          {/* Left: illustrated Rina standing full height */}
          <div
            className="hidden sm:flex w-64 shrink-0 items-end justify-center relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #ede9f8 0%, #dde8f8 100%)", minHeight: "480px" }}
          >
            <img
              src={RINA_HERO_IMAGE}
              alt="Rina"
              className="object-contain"
              style={{ width: '100%', height: 'auto', minHeight: '420px', marginBottom: '-2px' }}
            />
          </div>
          {/* Right: sign-in content */}
          <div className="flex-1 p-10 flex flex-col justify-center">
            <div className="flex items-center gap-2.5 mb-6">
              <RinaLogoMark size={36} />
              <div>
                <div className="font-display text-base font-bold text-slate-800 leading-tight">Insightfulrina</div>
                <div className="text-[11px] text-slate-400">AI Visibility Platform</div>
              </div>
            </div>
            <h2 className="font-display text-3xl text-slate-800 mb-2 leading-tight">
              Meet Rina.<br />
              <span className="text-violet-600">Your AI visibility partner.</span>
            </h2>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              Human-led intelligence. AI as signal interpreter. Rina works alongside you each week to keep your business visible, understood, and recommendable.
            </p>
            <Button
              size="lg"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              onClick={() => (window.location.href = getLoginUrl(location))}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Start with Rina
            </Button>
            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
              <span>Subscription-based</span>
              <span className="text-slate-200">|</span>
              <span>Owner stays in charge</span>
              <span className="text-slate-200">|</span>
              <span>12-step fix workflow</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Authenticated layout */
  return (
    <div
      className="min-h-screen flex items-stretch"
      style={{ background: "linear-gradient(135deg, #ede9f8 0%, #dde8f8 50%, #e4ecf8 100%)" }}
    >
      {/* Rina character -- FULL HEIGHT on the LEFT, outside the white card, pointing right */}
      <div className="hidden lg:flex flex-col justify-end items-center w-[200px] xl:w-[240px] shrink-0 pl-3 pb-0 pointer-events-none select-none">
        <img
          src={RINA_HERO_IMAGE}
          alt="Rina"
          className="object-contain"
          style={{
            width: '100%',
            height: 'auto',
            minHeight: '400px',
            maxWidth: '240px',
            marginBottom: '-4px',
            filter: "drop-shadow(0 20px 40px rgba(100,60,200,0.15))",
          }}
        />
      </div>

      {/* Main floating white card */}
      <div className="flex-1 flex min-w-0 m-4 ml-0 bg-white rounded-3xl shadow-[0_8px_60px_-20px_rgba(80,40,160,0.22)] overflow-hidden">

        {/* Sidebar */}
        <aside className="hidden md:flex w-56 xl:w-60 shrink-0 flex-col border-r border-slate-100">

          {/* Brand header: Insightfulrina diamond logo */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
            <RinaLogoMark size={36} />
            <div>
              <div className="font-display text-[14px] font-bold text-slate-800 leading-tight">Insightfulrina</div>
              <div className="text-[10px] text-slate-400 leading-tight">AI Visibility Platform</div>
            </div>
          </div>

          {/* Rina face avatar row */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-violet-200 shrink-0 bg-violet-50">
              <img
                src={RINA_AVATAR_IMAGE}
                alt="Rina"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'top center', transform: 'scale(1.4)', transformOrigin: 'top center' }}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Agent Rina</div>
              <div className="text-[10px] text-slate-400">AI Visibility CoPilot</div>
            </div>
          </div>

          {/* Business switcher */}
          <BusinessSwitcher />

          {/* Nav links */}
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

          {/* Bottom: health card */}
          <SidebarHealthCard />

          {/* Need help? row */}
          <div className="mx-3 mb-2">
            <Link
              href="/app/scorecard"
              className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 hover:bg-violet-100 transition-colors"
            >
              <div className="h-6 w-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-violet-700">Need help?</div>
                <div className="text-[10px] text-violet-500 truncate">Ask Agent Rina</div>
              </div>
            </Link>
          </div>

          {/* User row */}
          <div className="px-4 pb-4 flex items-center gap-2 border-t border-slate-100 pt-3">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
                {(user?.name ?? "U")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-700 truncate">{user?.name ?? "Owner"}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email ?? ""}</div>
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
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-6 md:px-8 py-7 max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
