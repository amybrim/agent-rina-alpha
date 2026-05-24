import RinaLayout from "@/components/RinaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentBusiness } from "@/hooks/useCurrentBusiness";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function BusinessProfile() {
  const [, navigate] = useLocation();
  const { current, selectedId } = useCurrentBusiness();
  const utils = trpc.useUtils();
  const update = trpc.businesses.update.useMutation({
    onSuccess: () => {
      utils.businesses.list.invalidate();
      utils.businesses.get.invalidate();
      toast.success("Profile updated.");
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Badge variant="secondary" className="mb-2">Living Business Profile</Badge>
          <h1 className="font-display text-4xl">{current?.name ?? "Select a business"}</h1>
          <p className="text-sm text-muted-foreground">
            Rina uses this profile as the foundation for every scan, score, and draft.
          </p>
        </div>
        <Button variant="outline" className="bg-background" onClick={() => navigate("/onboarding")}>
          Add another business
        </Button>
      </div>

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
                <Input id="websiteUrl" value={form.websiteUrl} onChange={set("websiteUrl")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessType">Business type</Label>
                <Input id="businessType" value={form.businessType} onChange={set("businessType")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Primary location</Label>
                <Input id="location" value={form.location} onChange={set("location")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={set("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goals">Goals this quarter</Label>
              <Textarea id="goals" rows={3} value={form.goals} onChange={set("goals")} />
            </div>
            <div className="flex justify-end">
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
