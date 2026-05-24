import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { RINA_AVATAR_IMAGE } from "@/lib/rina";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const create = trpc.businesses.create.useMutation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    businessType: "",
    location: "",
    description: "",
    goals: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.websiteUrl.trim()) {
      toast.error("Business name and website are required.");
      return;
    }
    try {
      const url = new URL(form.websiteUrl).toString();
      const { id } = await create.mutateAsync({
        name: form.name.trim(),
        websiteUrl: url,
        businessType: form.businessType || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        goals: form.goals || undefined,
      });
      utils.businesses.list.invalidate();
      toast.success("Living Business Profile created. Rina will scan next.");
      navigate(`/app?bid=${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create profile.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <img src={RINA_AVATAR_IMAGE} alt="Rina" className="h-12 w-12 rounded-full object-cover" />
          <div>
            <div className="font-display text-2xl">Let's build your Living Business Profile</div>
            <div className="text-sm text-muted-foreground">
              Rina uses this to scan your site and frame everything she finds.
            </div>
          </div>
        </div>

        <Card className="rina-card">
          <CardContent className="p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <Field id="name" label="Business name" required>
                <Input id="name" value={form.name} onChange={set("name")} placeholder="e.g., Brimm & Co." />
              </Field>
              <Field id="websiteUrl" label="Website URL" required hint="Include https://">
                <Input id="websiteUrl" value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://example.com" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field id="businessType" label="Business type">
                  <Input id="businessType" value={form.businessType} onChange={set("businessType")} placeholder="Boutique studio, consultancy, retail…" />
                </Field>
                <Field id="location" label="Primary location">
                  <Input id="location" value={form.location} onChange={set("location")} placeholder="City, region or 'remote'" />
                </Field>
              </div>
              <Field id="description" label="What you do, in plain words">
                <Textarea id="description" rows={3} value={form.description} onChange={set("description")} placeholder="A short, owner-voice description Rina can reference everywhere." />
              </Field>
              <Field id="goals" label="What success looks like this quarter">
                <Textarea id="goals" rows={3} value={form.goals} onChange={set("goals")} placeholder="More inbound calls, AI citations, qualified leads…" />
              </Field>
              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" disabled={create.isPending}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {create.isPending ? "Saving…" : "Create profile & continue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
