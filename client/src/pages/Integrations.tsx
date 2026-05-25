import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Globe,
  LayoutGrid,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";

type ConnectorStatus = "available" | "coming_soon" | "connected";

interface Connector {
  icon: typeof Globe;
  name: string;
  description: string;
  status: ConnectorStatus;
  category: string;
}

const CONNECTORS: Connector[] = [
  {
    icon: Globe,
    name: "Website (Live Scan)",
    description: "Rina crawls your site directly. No plugin needed — just your URL.",
    status: "connected",
    category: "Visibility",
  },
  {
    icon: MapPin,
    name: "Google Business Profile",
    description: "Sync your GBP description, categories, and hours so Rina can score local AI visibility.",
    status: "coming_soon",
    category: "Visibility",
  },
  {
    icon: LayoutGrid,
    name: "Wix",
    description: "Push approved metadata and schema fixes directly to your Wix site.",
    status: "coming_soon",
    category: "Publishing",
  },
  {
    icon: Link2,
    name: "WordPress",
    description: "Deploy Rina-drafted content and schema to WordPress via the REST API.",
    status: "coming_soon",
    category: "Publishing",
  },
  {
    icon: Star,
    name: "Google Search Console",
    description: "Pull click and impression data to measure AI-influenced organic performance.",
    status: "coming_soon",
    category: "Analytics",
  },
  {
    icon: MessageSquare,
    name: "Slack",
    description: "Receive your weekly Rina briefing as a Slack message to your team channel.",
    status: "coming_soon",
    category: "Notifications",
  },
  {
    icon: Mail,
    name: "Email digest",
    description: "Get your weekly visibility briefing delivered to your inbox every Monday.",
    status: "coming_soon",
    category: "Notifications",
  },
  {
    icon: Sparkles,
    name: "Lead source tracking",
    description: "Connect your CRM or form tool so Rina can attribute AI-influenced leads.",
    status: "coming_soon",
    category: "Analytics",
  },
];

const STATUS_STYLES: Record<ConnectorStatus, string> = {
  connected: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  available: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  coming_soon: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<ConnectorStatus, string> = {
  connected: "Active",
  available: "Connect",
  coming_soon: "Coming soon",
};

export default function Integrations() {
  const categories = Array.from(new Set(CONNECTORS.map((c) => c.category)));

  return (
    <div>
      <div className="max-w-3xl space-y-8">
        {/* Page header */}
        <div>
          <h1 className="font-display text-3xl text-slate-800">Integrations</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-xl">
            Connect Rina to the tools you already use. The more signals she has, the more precise her
            recommendations become.
          </p>
        </div>

        {/* Rina note */}
        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5 flex items-start gap-4">
          <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-violet-800 text-sm">From Rina</div>
            <p className="text-violet-700 text-sm mt-1 leading-relaxed">
              Right now I scan your website directly — no connector needed. The integrations below will
              let me push approved fixes to your CMS, pull analytics data, and notify your team
              automatically. I'll let you know as each one becomes available.
            </p>
          </div>
        </div>

        {/* Connector groups */}
        {categories.map((cat) => {
          const items = CONNECTORS.filter((c) => c.category === cat);
          return (
            <div key={cat}>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                {cat}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Card key={c.name} className="rina-card">
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-sm">{c.name}</span>
                            <Badge
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[c.status]}`}
                            >
                              {STATUS_LABELS[c.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {c.description}
                          </p>
                          {c.status !== "coming_soon" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 bg-white text-xs h-7"
                              onClick={() =>
                                c.status === "connected"
                                  ? toast.info(`${c.name} is already active.`)
                                  : toast.info(`${c.name} connector coming soon.`)
                              }
                            >
                              {c.status === "connected" ? "Manage" : "Connect"}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
