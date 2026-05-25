import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  CreditCard,
  Lock,
  LogOut,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  agency: "Agency",
};

const TIER_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700",
  growth: "bg-indigo-50 text-indigo-700",
  pro: "bg-violet-50 text-violet-700",
  agency: "bg-amber-50 text-amber-700",
};

export default function Settings() {
  const { user, logout } = useAuth();
  const meQuery = trpc.auth.me.useQuery();
  const tier = (meQuery.data?.subscriptionTier ?? "starter") as string;

  return (
    <div>
      <div className="max-w-2xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="font-display text-3xl text-slate-800">Settings</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your account, subscription, and preferences.
          </p>
        </div>

        {/* Profile card */}
        <Card className="rina-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-violet-100 text-violet-700 text-xl font-semibold">
                  {(user?.name ?? "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-lg leading-tight">
                  {user?.name ?? "Owner"}
                </div>
                <div className="text-slate-500 text-sm mt-0.5">
                  {user?.email ?? ""}
                </div>
              </div>
              <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${TIER_COLORS[tier] ?? TIER_COLORS.starter}`}>
                {TIER_LABELS[tier] ?? "Starter"}
              </Badge>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 flex-1">
                Your profile is managed through Manus OAuth. Name and email are set by your Manus account.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="rina-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-lg text-slate-800">Subscription</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Your current plan and billing details.
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">
                  {TIER_LABELS[tier] ?? "Starter"} plan
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tier === "starter"
                    ? "Free tier — 1 business, 3 scans/month"
                    : tier === "growth"
                      ? "3 businesses, 12 scans/month, draft studio"
                      : tier === "pro"
                        ? "10 businesses, unlimited scans, full draft studio"
                        : "Unlimited businesses, white-label, API access"}
                </div>
              </div>
              <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${TIER_COLORS[tier] ?? TIER_COLORS.starter}`}>
                {TIER_LABELS[tier] ?? "Starter"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full bg-white"
              onClick={() => toast.info("Stripe billing activation coming soon. Amy will enable this step.")}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Upgrade plan
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rina-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-lg text-slate-800">Notifications</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Control when and how Rina reaches out.
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Weekly briefing ready", hint: "Rina notifies you when your weekly meeting is prepared" },
                { label: "New fix drafted", hint: "When Rina drafts a new fix for your review" },
                { label: "Scan complete", hint: "After each visibility scan finishes" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.hint}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-xs"
                    onClick={() => toast.info("Notification preferences coming soon.")}
                  >
                    Configure
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="rina-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-lg text-slate-800">Security</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Authentication is handled by Manus OAuth.
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-sm text-emerald-700">
                Your account is secured through Manus OAuth. No password is stored by Rina.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign out */}
        <div className="pt-2">
          <Button
            variant="outline"
            className="bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
