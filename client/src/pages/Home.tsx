import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { RINA_HERO_IMAGE } from "@/lib/rina";
import { ArrowRight, CalendarCheck, ClipboardList, Compass, Gauge } from "lucide-react";
import { Link } from "wouter";

const PILLARS = [
  {
    icon: Compass,
    title: "She finds where you're invisible",
    body: "Rina scans your site through the eyes of AI crawlers and surfaces the gaps between what you offer and what AI can actually see.",
  },
  {
    icon: Gauge,
    title: "She reads your visibility honestly",
    body: "Rina grades five dimensions of AI visibility — showing up, being understood, trust, recommendation-readiness, and GEO readiness — with a confidence label on every finding.",
  },
  {
    icon: ClipboardList,
    title: "She drafts the fix",
    body: "From metadata to schema to FAQ blocks, Rina hands you ready-to-paste content. You stay in charge of every approval.",
  },
  {
    icon: CalendarCheck,
    title: "She's always watching.",
    body: "Rina doesn't wait for a meeting. She's always monitoring what AI systems know about your business and tells you the moment something changes.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? "/app" : getLoginUrl("/app");

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl tracking-tight">Rina</span>
            <Badge variant="secondary" className="rounded-full px-2.5 py-0 text-[10px] uppercase tracking-widest">
              AI Visibility Partner
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
            >
              Pricing
            </Link>
            <Button asChild>
              <a href={ctaHref}>
                {isAuthenticated ? "Let Rina read your site →" : "Sign in"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8e4f8 0%, #dde8f8 40%, #e4ecf8 100%)' }}>
        <div className="container relative flex flex-col lg:flex-row items-center gap-0 py-16 lg:py-24">
          {/* Rina character — full height, standing beside the copy */}
          <div className="hidden lg:flex flex-col justify-end items-center shrink-0 w-[320px] self-end">
            <img
              src={RINA_HERO_IMAGE}
              alt="Rina"
              className="object-contain drop-shadow-[0_30px_40px_rgba(100,60,200,0.22)]"
              style={{ width: '100%', height: 'auto', minHeight: '400px', maxWidth: '320px', marginBottom: '-4px' }}
            />
          </div>
          {/* Copy */}
          <div className="flex-1 lg:pl-12">
            <Badge variant="outline" className="mb-6 rounded-full bg-white/80">
              Human-led intelligence. AI as signal interpreter.
            </Badge>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-slate-800">
              Meet <span className="rina-gradient-text">Rina</span>.<br />
              Your AI visibility partner.
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              Rina works alongside you each week to make sure AI search engines can find you, understand you, and
              recommend you. She finds the gaps, drafts the fixes, and waits for your approval before anything ships.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white" asChild>
                <a href={ctaHref}>
                  {isAuthenticated ? "Continue with Rina" : "Let Rina read your site →"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/80" asChild>
                <Link href="/pricing">See subscription tiers</Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
              <span>Subscription-based</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>Owner stays in charge</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>12-step fix workflow</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-4xl">How Rina works alongside you</h2>
            <p className="mt-3 text-muted-foreground">
              She does not replace your team. She amplifies them, and reports to you each week with the discipline of a
              senior advisor.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} className="rina-card">
                  <CardContent className="p-7">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-xl mb-2">{p.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{p.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Briefing teaser */}
      <section className="py-20">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-4xl mb-4">What Rina tells you when you walk in.</h2>
            <p className="text-muted-foreground mb-6">
              Every week, Rina answers the same five questions in plain language so you always know where your business
              stands in the eyes of AI.
            </p>
            <ol className="space-y-3 text-sm">
              {["Are we showing up?", "Are we being understood?", "Are we trusted?", "Are we recommendation-ready?", "What should we fix next?"].map(
                (q, i) => (
                  <li key={q} className="flex items-start gap-3">
                    <span className="mt-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="font-medium">{q}</span>
                  </li>
                )
              )}
            </ol>
            <Button size="lg" className="mt-8" asChild>
              <a href={ctaHref}>
                {isAuthenticated ? "Open your briefing" : "Get started"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>
          <Card className="rina-card">
            <CardContent className="p-8">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Briefing preview</div>
              <h3 className="font-display text-2xl mt-1">Week of May 24</h3>
              <div className="mt-6 space-y-4">
                <Snippet label="Are we showing up?" body="Crawlers reach the homepage cleanly, but three core service pages return thin content." />
                <Snippet label="Are we understood?" body="Schema is missing. AI is guessing what you do based on H1 alone." />
                <Snippet label="What's next?" body="Approve Rina's drafted Organization schema and FAQ block this week." />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© Rina · Insightfulrina · Built for human-led intelligence.</span>
          <span>Subscription-based. Owner stays in charge.</span>
        </div>
      </footer>
    </div>
  );
}

function Snippet({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-4">
      <div className="text-xs font-medium text-primary mb-1">{label}</div>
      <div className="text-sm text-foreground/90">{body}</div>
    </div>
  );
}
