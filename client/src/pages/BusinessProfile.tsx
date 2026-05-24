import RinaLayout from "@/components/RinaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Briefcase, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function BusinessProfile() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const { current, selectedId } = useCurrentBusiness();
  const utils = trpc.useUtils();
  const update = trpc.businesses.update.useMutation({
    onSuccess: () => {
      utils.businesses.list.invalidate();
      utils.businesses.get.invalidate();
      toast.success("Profile updated. I'll use this in my next scan.");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    businessType: "",
    location: "",
    description: "",
    goals: "",
  });

  useEffect(() => {
    if (current) {
      setForm({
        name: current.name ?? "",
        websiteUrl: current.websiteUrl ?? "",
        businessType: current.businessType ?? "",
        location: current.location ?? "",
        description: current.description ?? "",
        goals: current.goals ?? "",
      });
    }
  }, [current]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const onSave = () => {
    if (!selectedId) return;
    update.mutate({
      id: selectedId,
      patch: {
        name: form.name,
        websiteUrl: form.websiteUrl,
        businessType: form.businessType || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        goals: form.goals || undefined,
      },
    });
  };

  return (
    <RinaLayout>
      {/* Rina-voice header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Living Business Profile
          </div>
          <h1 className="font-display text-3xl text-slate-800">
            {current ? (
              <>
                {firstName}, this is the foundation I build on.
              </>
            ) : (
              "Select a business to view its profile."
            )}
          </h1>
          <p className="text-slate-500 mt-1 text-sm max-w-xl">
            Every scan, score, and draft I produce is grounded in this profile. Keep it accurate and I'll keep
            getting sharper.
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-white shrink-0"
          onClick={() => navigate("/onboarding")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add another business
        </Button>
      </div>

      {!current && (
        <Card className="rina-card">
          <CardContent className="p-10 text-center text-slate-500">
            No business selected. Go to the Weekly Meeting to select or add one.
          </CardContent>
        </Card>
      )}

      {current && (
        <Card className="rina-card">
          <CardContent className="p-7 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Business name</Label>
                <Input id="name" value={form.name} onChange={set("name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input id="websiteUrl" value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://yourbusiness.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessType">Business type</Label>
                <Input id="businessType" value={form.businessType} onChange={set("businessType")} placeholder="e.g. Boutique law firm, SaaS startup…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Primary location</Label>
                <Input id="location" value={form.location} onChange={set("location")} placeholder="e.g. Austin, TX" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-slate-400 font-normal text-xs ml-1">
                  — How would you describe your business to a new customer?
                </span>
              </Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={set("description")}
                placeholder="We help small businesses in the Southwest manage their HR compliance…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goals">
                Goals this quarter{" "}
                <span className="text-slate-400 font-normal text-xs ml-1">
                  — What are you trying to achieve? I'll align my recommendations to these.
                </span>
              </Label>
              <Textarea
                id="goals"
                rows={3}
                value={form.goals}
                onChange={set("goals")}
                placeholder="Increase organic leads from AI search by 30%. Launch a new service page for employment law…"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Changes take effect on the next scan
              </div>
              <Button onClick={onSave} disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </RinaLayout>
  );
}
