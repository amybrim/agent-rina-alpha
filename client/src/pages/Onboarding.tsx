import { useAuth } from "@/_core/hooks/useAuth";
import { normalizeUrl } from "../../../server/rina/url";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { RINA_HERO_IMAGE } from "@/lib/rina";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
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

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.message("Please sign in first so Rina can save your profile.");
      window.location.href = getLoginUrl("/onboarding");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Business name is required.");
      return;
    }
    const cleanUrl = normalizeUrl(form.websiteUrl);
    if (!cleanUrl) {
      toast.error("Please enter a valid website (e.g., https://example.com).");
      return;
    }
    try {
      const { id } = await create.mutateAsync({
        name: form.name.trim(),
        websiteUrl: cleanUrl,
        businessType: form.businessType.trim() || undefined,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        goals: form.goals.trim() || undefined,
      });
      utils.businesses.list.invalidate();
      localStorage.setItem("rina.currentBusinessId", String(id));
      toast.success("Living Business Profile created. Rina is ready.");
      navigate("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create profile.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10 items-start">
          {/* Left: Rina character + intro */}
          <div className="hidden lg:flex flex-col items-center text-center sticky top-10">
            <img
              src={RINA_HERO_IMAGE}
              alt="Rina"
              className="w-72 h-auto drop-shadow-[0_24px_36px_rgba(80,40,160,0.25)]"
            />
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              <Sparkles className="h-3 w-3" /> Rina, your AI Visibility Co-Pilot
            </div>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-[260px]">
              "Tell me about your business and I'll start mapping how AI sees you
              today — and how we improve it together."
            </p>
          </div>

          {/* Right: form */}
          <div>
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <img
                src={RINA_HERO_IMAGE}
                alt="Rina"
                className="h-16 w-auto"
              />
              <div>
                <div className="text-xs font-medium text-primary uppercase tracking-widest">
                  Step 1 of 1
                </div>
                <div className="font-display text-2xl leading-tight">
                  Let's build your Living Business Profile
                </div>
              </div>
            </div>
            <div className="hidden lg:block mb-6">
              <div className="text-xs font-medium text-primary uppercase tracking-widest mb-2">
                Step 1 of 1 · Living Business Profile
              </div>
              <h1 className="font-display text-4xl rina-gradient-text leading-tight">
                Let's introduce Rina to your business.
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                This profile is the foundation Rina builds everything from — your
                scans, scores, recommendations, and weekly briefings. It only takes
                a minute.
              </p>
            </div>

            <Card className="rina-card">
              <CardContent className="p-6 sm:p-8">
                {!authLoading && !isAuthenticated && (
                  <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-3">
                    <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      Sign in first so Rina can save your profile to your account.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white"
                      onClick={() => {
                        window.location.href = getLoginUrl("/onboarding");
                      }}
                    >
                      Sign in
                    </Button>
                  </div>
                )}
                <form onSubmit={onSubmit} className="space-y-5">
                  <Field id="name" label="Business name" required>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={set("name")}
                      placeholder="e.g., Brimm & Co."
                      autoComplete="organization"
                    />
                  </Field>
                  <Field
                    id="websiteUrl"
                    label="Website URL"
                    required
                    hint="We'll add https:// if you forget it."
                  >
                    <Input
                      id="websiteUrl"
                      value={form.websiteUrl}
                      onChange={set("websiteUrl")}
                      placeholder="example.com"
                      autoComplete="url"
                      inputMode="url"
                    />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field id="businessType" label="Business type">
                      <Input
                        id="businessType"
                        value={form.businessType}
                        onChange={set("businessType")}
                        placeholder="Boutique studio, consultancy, retail…"
                      />
                    </Field>
                    <Field id="location" label="Primary location">
                      <Input
                        id="location"
                        value={form.location}
                        onChange={set("location")}
                        placeholder="City, region or 'remote'"
                      />
                    </Field>
                  </div>
                  <Field id="description" label="What you do, in plain words">
                    <Textarea
                      id="description"
                      rows={3}
                      value={form.description}
                      onChange={set("description")}
                      placeholder="A short, owner-voice description Rina can reference everywhere."
                    />
                  </Field>
                  <Field id="goals" label="What success looks like this quarter">
                    <Textarea
                      id="goals"
                      rows={3}
                      value={form.goals}
                      onChange={set("goals")}
                      placeholder="More inbound calls, AI citations, qualified leads…"
                    />
                  </Field>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={create.isPending || authLoading}
                    >
                      {create.isPending ? "Saving…" : "Create profile & continue"}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
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
