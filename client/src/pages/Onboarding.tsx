/**
 * Onboarding — 5-step interview
 * Step 1: Business basics (name, URL, category, location)
 * Step 2: Offers and audiences
 * Step 3: Proof and trust signals
 * Step 4: Brand voice and goals
 * Step 5: Confirmation — Rina summarises, user confirms, first scan triggers
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mic2,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormState {
  // Step 1
  name: string;
  url: string;
  industry: string;
  location: string;
  // Step 2
  primaryServices: string;
  targetAudience: string;
  problemSolved: string;
  // Step 3
  reviewPlatforms: string;
  proofSignals: string;
  yearsInBusiness: string;
  // Step 4
  brandVoice: string;
  goals: string;
  knownCompetitors: string;
}

const EMPTY: FormState = {
  name: "",
  url: "",
  industry: "",
  location: "",
  primaryServices: "",
  targetAudience: "",
  problemSolved: "",
  reviewPlatforms: "",
  proofSignals: "",
  yearsInBusiness: "",
  brandVoice: "",
  goals: "",
  knownCompetitors: "",
};

const STEPS = [
  { icon: Building2, label: "Your business" },
  { icon: Target, label: "Offers & audience" },
  { icon: Shield, label: "Proof & trust" },
  { icon: Mic2, label: "Voice & goals" },
  { icon: CheckCircle2, label: "Confirm" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [scanning, setScanning] = useState(false);

  const utils = trpc.useUtils();

  const createBusiness = trpc.business.create.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const runScan = trpc.scanner.run.useMutation({
    onError: (e) => toast.error("Scan failed: " + e.message),
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 0) return form.name.trim().length > 0 && form.url.trim().length > 0;
    if (step === 1) return form.primaryServices.trim().length > 0;
    return true;
  }

  async function handleConfirm() {
    setScanning(true);
    try {
      let url = form.url.trim();
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      // Build audience string from interview answers
      const audience = [form.targetAudience, form.problemSolved]
        .filter(Boolean)
        .join(" — ");

      const biz = await createBusiness.mutateAsync({
        name: form.name.trim(),
        url,
        industry: form.industry.trim() || undefined,
        businessType: form.location.trim() || undefined,
        audience: audience || undefined,
        brandVoice: form.brandVoice.trim() || undefined,
        goals: form.goals.trim() || undefined,
      });

      // Trigger first scan — non-blocking
      runScan.mutate({ businessId: biz.id });

      await utils.business.list.invalidate();
      localStorage.setItem("rina.currentBusinessId", String(biz.id));
      navigate("/app");
    } catch {
      setScanning(false);
    }
  }

  // ─── Step renderers ──────────────────────────────────────────────────────
  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <Heading
              title={`Hi ${firstName} — let's start with the basics.`}
              sub="I need to understand your business before I can scan it."
            />
            <Field label="Business name *">
              <Input
                placeholder="e.g. Sunbeam Services"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Website URL *">
              <Input
                placeholder="e.g. sunbeamservices.com"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
              />
            </Field>
            <Field label="Industry or category">
              <Input
                placeholder="e.g. Home services, Legal, Healthcare"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
              />
            </Field>
            <Field label="Primary service area or location">
              <Input
                placeholder="e.g. Austin, TX or Greater Boston Area"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <Heading
              title="What do you do, and for whom?"
              sub="This is what I'll use to assess whether AI systems describe you accurately."
            />
            <Field label="What are your primary services or products? *">
              <Textarea
                placeholder="e.g. Residential and commercial HVAC installation, repair, and maintenance"
                rows={3}
                value={form.primaryServices}
                onChange={(e) => set("primaryServices", e.target.value)}
              />
            </Field>
            <Field label="Who do you most want to reach?">
              <Textarea
                placeholder="e.g. Homeowners in Austin who need same-day HVAC repair"
                rows={2}
                value={form.targetAudience}
                onChange={(e) => set("targetAudience", e.target.value)}
              />
            </Field>
            <Field label="What problem do you solve for them?">
              <Textarea
                placeholder="e.g. We get their system running again the same day, with upfront pricing and no surprises"
                rows={2}
                value={form.problemSolved}
                onChange={(e) => set("problemSolved", e.target.value)}
              />
            </Field>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <Heading
              title="Help me understand your credibility."
              sub="Proof signals are one of the strongest factors in AI recommendation readiness."
            />
            <Field label="Where are your reviews?">
              <Input
                placeholder="e.g. Google (4.8★, 312 reviews), Yelp, Houzz"
                value={form.reviewPlatforms}
                onChange={(e) => set("reviewPlatforms", e.target.value)}
              />
            </Field>
            <Field label="Any press, awards, credentials, or case studies?">
              <Textarea
                placeholder="e.g. BBB Accredited, NATE Certified, featured in Austin Business Journal"
                rows={3}
                value={form.proofSignals}
                onChange={(e) => set("proofSignals", e.target.value)}
              />
            </Field>
            <Field label="How long have you been in business?">
              <Input
                type="number"
                placeholder="Years"
                min={0}
                max={200}
                value={form.yearsInBusiness}
                onChange={(e) => set("yearsInBusiness", e.target.value)}
                className="max-w-[120px]"
              />
            </Field>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <Heading
              title="How do you want to sound?"
              sub="I'll use this to match your voice when I draft content for your approval."
            />
            <Field label="How would you describe your tone?">
              <Input
                placeholder="e.g. Warm and direct — we're local, not corporate"
                value={form.brandVoice}
                onChange={(e) => set("brandVoice", e.target.value)}
              />
            </Field>
            <Field label="What is your biggest visibility goal right now?">
              <Textarea
                placeholder="e.g. Show up when someone in Austin asks ChatGPT for HVAC repair"
                rows={2}
                value={form.goals}
                onChange={(e) => set("goals", e.target.value)}
              />
            </Field>
            <Field label="Any competitors you are aware of?">
              <Input
                placeholder="e.g. CoolBreeze HVAC, Austin Air Pros"
                value={form.knownCompetitors}
                onChange={(e) => set("knownCompetitors", e.target.value)}
              />
            </Field>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <Heading
              title="Here is what I understand about your business."
              sub="Before I scan, confirm this is correct. You can edit any field."
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-200 text-sm">
              <SummaryRow label="Business" value={form.name} onEdit={() => setStep(0)} />
              <SummaryRow label="Website" value={form.url} onEdit={() => setStep(0)} />
              {form.industry && (
                <SummaryRow label="Industry" value={form.industry} onEdit={() => setStep(0)} />
              )}
              {form.location && (
                <SummaryRow label="Location" value={form.location} onEdit={() => setStep(0)} />
              )}
              <SummaryRow
                label="Primary services"
                value={form.primaryServices}
                onEdit={() => setStep(1)}
              />
              {form.targetAudience && (
                <SummaryRow
                  label="Target audience"
                  value={form.targetAudience}
                  onEdit={() => setStep(1)}
                />
              )}
              {form.problemSolved && (
                <SummaryRow
                  label="Problem solved"
                  value={form.problemSolved}
                  onEdit={() => setStep(1)}
                />
              )}
              {form.reviewPlatforms && (
                <SummaryRow
                  label="Reviews"
                  value={form.reviewPlatforms}
                  onEdit={() => setStep(2)}
                />
              )}
              {form.proofSignals && (
                <SummaryRow
                  label="Proof signals"
                  value={form.proofSignals}
                  onEdit={() => setStep(2)}
                />
              )}
              {form.yearsInBusiness && (
                <SummaryRow
                  label="Years in business"
                  value={`${form.yearsInBusiness} years`}
                  onEdit={() => setStep(2)}
                />
              )}
              {form.brandVoice && (
                <SummaryRow
                  label="Tone"
                  value={form.brandVoice}
                  onEdit={() => setStep(3)}
                />
              )}
              {form.goals && (
                <SummaryRow
                  label="Visibility goal"
                  value={form.goals}
                  onEdit={() => setStep(3)}
                />
              )}
            </div>
            <p className="text-sm text-slate-500">
              Once you confirm, I'll run my first scan of{" "}
              <span className="font-medium text-slate-700">{form.url || "your website"}</span>.
              This takes about 30 seconds. Your Weekly Meeting will be ready when it's done.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  // ─── Layout ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #e8e4f8 0%, #dde8f8 40%, #e4ecf8 100%)",
      }}
    >
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={i}
                  onClick={() => i < step && setStep(i)}
                  disabled={i >= step}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-opacity",
                    i > step && "opacity-30",
                    i < step && "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center transition-all",
                      done
                        ? "bg-violet-600 text-white shadow-md"
                        : active
                        ? "bg-white border-2 border-violet-600 text-violet-600 shadow-md"
                        : "bg-white/60 border border-slate-200 text-slate-400"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium hidden sm:block",
                      active ? "text-violet-700" : "text-slate-400"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-1 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center text-white font-display text-base shadow">
              R
            </div>
            <span className="text-sm font-medium text-slate-500">Agent Rina</span>
          </div>

          {renderStep()}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="text-slate-500"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={scanning || createBusiness.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white min-w-[160px]"
              >
                {scanning || createBusiness.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting scan…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Confirm &amp; scan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-2xl text-slate-800 leading-tight">{title}</h2>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-slate-400 w-32 shrink-0 text-xs font-medium uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="flex-1 text-slate-700 text-sm leading-relaxed">{value}</span>
      <button
        onClick={onEdit}
        className="text-violet-600 text-xs font-medium hover:underline shrink-0"
      >
        Edit
      </button>
    </div>
  );
}
