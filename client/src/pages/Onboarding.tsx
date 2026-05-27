/**
 * Onboarding — URL-first 4-screen flow
 *
 * Screen 1: One URL field. "Give me your website URL and I'll take it from there."
 * Screen 2: Rina is working. Loading messages in sequence.
 * Screen 3: Rina's first brief. LLM-generated from real scan data.
 * Screen 4: First fix offered immediately.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { RINA_HERO_IMAGE } from "@/lib/rina";
import { ArrowRight, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Loading messages ─────────────────────────────────────────────────────────
const LOADING_MESSAGES = [
  "Reading your homepage...",
  "Checking what AI crawlers can find...",
  "Looking for your proof signals...",
  "Checking your schema and metadata...",
  "Almost ready...",
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "url" | "loading" | "brief" | "fix";

interface ScanState {
  businessId: number;
  businessName: string;
  brief: string;
  topFix: {
    id: number;
    issue: string;
    recommendation: string;
    impactLevel: string;
  } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("url");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tRPC mutations
  const createBusiness = trpc.business.create.useMutation();
  const runScan = trpc.scanner.run.useMutation();
  const firstBrief = trpc.rina.firstBrief.useMutation();

  // Cycle loading messages
  useEffect(() => {
    if (screen === "loading") {
      setLoadingMsgIdx(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
      }, 1800);
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [screen]);

  // ── Submit URL ──────────────────────────────────────────────────────────────
  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");

    let normalized = url.trim();
    if (!normalized) { setUrlError("Please enter your website URL."); return; }
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    try { new URL(normalized); } catch {
      setUrlError("That doesn't look like a valid URL. Try https://yoursite.com");
      return;
    }

    setScreen("loading");

    try {
      // Extract a placeholder name from the domain
      const domain = new URL(normalized).hostname.replace(/^www\./, "");
      const placeholderName = domain.split(".")[0]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Step 1: Create business
      const biz = await createBusiness.mutateAsync({
        name: placeholderName,
        url: normalized,
      });

      // Step 2: Run scan (fire and forget — we'll poll for results)
      await runScan.mutateAsync({ businessId: biz.id });

      // Step 3: Generate first brief from scan data
      const briefResult = await firstBrief.mutateAsync({ businessId: biz.id });

      setScanState({
        businessId: biz.id,
        businessName: briefResult.businessName,
        brief: briefResult.brief,
        topFix: briefResult.topFix as ScanState["topFix"],
      });

      setScreen("brief");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
      setScreen("url");
    }
  }

  // ── Proceed to first fix ────────────────────────────────────────────────────
  function handleShowFix() {
    if (scanState?.topFix) {
      setScreen("fix");
    } else {
      // No fix available — go straight to app
      finishOnboarding();
    }
  }

  // ── Finish onboarding ───────────────────────────────────────────────────────
  async function finishOnboarding() {
    if (scanState?.businessId) {
      try {
        await trpc.business.completeOnboarding.useMutation();
      } catch { /* ignore */ }
    }
    navigate("/app");
  }

  if (!user) return null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EEEAF6] flex items-center justify-center p-4">
      {/* Screen 1: URL input */}
      {screen === "url" && (
        <div className="w-full max-w-2xl">
          <div className="flex items-start gap-8">
            {/* Rina illustration */}
            <div className="hidden md:block flex-shrink-0 w-56 self-end">
              <img
                src={RINA_HERO_IMAGE}
                alt="Rina"
                className="w-full object-contain drop-shadow-lg"
                style={{ minHeight: '400px', height: 'auto' }}
              />
            </div>

            {/* Card */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">R</span>
                  </div>
                  <span className="text-sm font-medium text-violet-600">Insightfulrina</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 leading-snug">
                  Give me your website URL<br />
                  <span className="text-violet-600">and I'll take it from there.</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  I'll read your site, check what AI systems can find, and tell you exactly where you stand.
                </p>
              </div>

              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="https://yoursite.com"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                    className="h-12 text-base rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-400"
                    autoFocus
                  />
                  {urlError && (
                    <p className="mt-1.5 text-sm text-rose-600">{urlError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-base font-semibold"
                  disabled={createBusiness.isPending || runScan.isPending}
                >
                  Let Rina in <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <p className="mt-4 text-xs text-slate-400 text-center">
                No credit card. No setup. Rina reads your site and tells you what she finds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen 2: Loading */}
      {screen === "loading" && (
        <div className="w-full max-w-lg text-center">
          <div className="flex flex-col items-center gap-6">
            {/* Rina illustration */}
            <img
              src={RINA_HERO_IMAGE}
              alt="Rina working"
              className="object-contain drop-shadow-lg"
              style={{ width: '200px', minHeight: '400px', height: 'auto' }}
            />

            <div className="bg-white rounded-2xl shadow-lg px-8 py-6 w-full">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                <span className="font-semibold text-slate-800">Rina is reading your site</span>
              </div>

              {/* Message sequence */}
              <div className="space-y-2">
                {LOADING_MESSAGES.map((msg, i) => (
                  <div
                    key={msg}
                    className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                      i < loadingMsgIdx
                        ? "text-emerald-600"
                        : i === loadingMsgIdx
                        ? "text-violet-700 font-medium"
                        : "text-slate-300"
                    }`}
                  >
                    {i < loadingMsgIdx ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : i === loadingMsgIdx ? (
                      <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-slate-200 flex-shrink-0" />
                    )}
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Rina's first brief */}
      {screen === "brief" && scanState && (
        <div className="w-full max-w-3xl">
          <div className="flex items-start gap-6">
            {/* Rina illustration */}
            <div className="hidden md:block flex-shrink-0 w-56 self-end">
              <img
                src={RINA_HERO_IMAGE}
                alt="Rina"
                className="w-full object-contain drop-shadow-lg"
                style={{ minHeight: '400px', height: 'auto' }}
              />
            </div>

            {/* Brief card */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R</span>
                </div>
                <span className="text-sm font-medium text-violet-600">Rina's first read</span>
              </div>

              {/* Brief text — Rina's voice */}
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap mb-6">
                {scanState.brief}
              </div>

              {/* Correction section */}
              <details className="mb-6 border border-slate-100 rounded-xl">
                <summary className="px-4 py-3 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800 select-none">
                  Correct anything I got wrong
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-3">
                  <p className="text-xs text-slate-400 mb-2">
                    I inferred these from your site. Update anything that's off.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Business name</label>
                      <Input
                        defaultValue={scanState.businessName}
                        className="h-8 text-sm rounded-lg"
                        onChange={(e) => setScanState((s) => s ? { ...s, businessName: e.target.value } : s)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Industry</label>
                      <Input placeholder="e.g. Professional Services" className="h-8 text-sm rounded-lg" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Primary audience</label>
                      <Input placeholder="e.g. Small business owners" className="h-8 text-sm rounded-lg" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Location / service area</label>
                      <Input placeholder="e.g. Chicago, IL" className="h-8 text-sm rounded-lg" />
                    </div>
                  </div>
                </div>
              </details>

              <Button
                onClick={handleShowFix}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold"
              >
                This looks right — show me what to fix first
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Screen 4: First fix */}
      {screen === "fix" && scanState?.topFix && (
        <div className="w-full max-w-2xl">
          <div className="flex items-start gap-6">
            {/* Rina illustration */}
            <div className="hidden md:block flex-shrink-0 w-56 self-end">
              <img
                src={RINA_HERO_IMAGE}
                alt="Rina"
                className="w-full object-contain drop-shadow-lg"
                style={{ minHeight: '400px', height: 'auto' }}
              />
            </div>

            {/* Fix card */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R</span>
                </div>
                <span className="text-sm font-medium text-violet-600">Most important fix right now</span>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                Here is the most important thing to fix right now. I drafted it for you. Your approval takes 30 seconds.
              </p>

              {/* Fix preview */}
              <div className="border border-slate-100 rounded-xl p-4 mb-6 bg-slate-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                    {scanState.topFix.issue}
                  </h3>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    scanState.topFix.impactLevel === "high"
                      ? "bg-rose-50 text-rose-700"
                      : scanState.topFix.impactLevel === "medium"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {scanState.topFix.impactLevel} impact
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {scanState.topFix.recommendation}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={finishOnboarding}
                  className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold"
                >
                  Approve this fix <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={finishOnboarding}
                  className="h-11 px-4 rounded-xl text-slate-600 border-slate-200"
                >
                  Do this later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
