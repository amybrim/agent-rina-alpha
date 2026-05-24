import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Check } from "lucide-react";
import { Link } from "wouter";

const TIERS = [
  {
    key: "starter",
    label: "Starter",
    price: "$49",
    cadence: "/ month",
    blurb: "For one business getting AI-ready.",
    features: [
      "1 business profile",
      "Monthly scan cadence",
      "8-pillar visibility scorecard",
      "Up to 10 active fixes",
      "Owner approval workflow",
    ],
  },
  {
    key: "growth",
    label: "Growth",
    price: "$149",
    cadence: "/ month",
    blurb: "For owners who want weekly briefings.",
    features: [
      "1 business profile",
      "Weekly scan cadence",
      "Weekly Visibility Briefing",
      "Up to 30 active fixes",
      "Rina Draft Studio (full)",
      "Email digest",
    ],
    featured: true,
  },
  {
    key: "pro",
    label: "Pro",
    price: "$349",
    cadence: "/ month",
    blurb: "For brands and multi-location operators.",
    features: [
      "Up to 3 business profiles",
      "Twice-weekly scans",
      "Priority briefings",
      "Unlimited fixes",
      "Schema + FAQ + Org asset packs",
      "Notifications on changes",
    ],
  },
  {
    key: "agency",
    label: "Agency",
    price: "$899",
    cadence: "/ month",
    blurb: "For agencies running visibility for clients.",
    features: [
      "Up to 15 business profiles",
      "On-demand scans anytime",
      "Branded weekly briefings",
      "Bulk fix approval",
      "Team seats coming next",
    ],
  },
] as const;

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const cta = (tier: string) => (isAuthenticated ? `/app?tier=${tier}` : getLoginUrl(`/app?tier=${tier}`));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="font-display text-2xl tracking-tight">Rina</Link>
          <Button variant="outline" className="bg-background" asChild>
            <a href={isAuthenticated ? "/app" : getLoginUrl("/app")}>
              {isAuthenticated ? "Open Command Center" : "Sign in"}
            </a>
          </Button>
        </div>
      </header>

      <section className="container py-16">
        <div className="max-w-2xl mb-10">
          <Badge variant="secondary" className="mb-3">Subscription</Badge>
          <h1 className="font-display text-5xl">Pricing built for working with Rina, not just reading reports.</h1>
          <p className="mt-3 text-muted-foreground">
            Every tier includes Rina's intelligence loop. Higher tiers unlock more businesses, more frequent scans, and
            agency-ready workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((t) => (
            <Card
              key={t.key}
              className={`rina-card relative ${"featured" in t && t.featured ? "ring-2 ring-primary" : ""}`}
            >
              {"featured" in t && t.featured && (
                <div className="absolute -top-3 left-6">
                  <Badge>Most popular</Badge>
                </div>
              )}
              <CardContent className="p-7 flex flex-col h-full">
                <div className="font-display text-2xl">{t.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t.blurb}</div>
                <div className="mt-5 flex items-end gap-1">
                  <div className="font-display text-5xl leading-none">{t.price}</div>
                  <div className="text-muted-foreground mb-1">{t.cadence}</div>
                </div>
                <ul className="mt-6 space-y-2 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <a href={cta(t.key)}>Choose {t.label}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Stripe payment activation is in progress. New subscribers begin on the Starter tier until billing is live.
        </p>
      </section>
    </div>
  );
}
