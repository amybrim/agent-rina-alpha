/**
 * Rina Website Visibility Scanner
 *
 * Fetch-based hybrid crawler that extracts the structural and semantic signals
 * AI search engines use to understand a business. Designed to run inside the
 * Cloud Run handler timeout (no Puppeteer dependency for MVP — pure fetch +
 * lightweight HTML parsing keeps cold starts fast and the deploy footprint
 * Node-only).
 *
 * Returns a normalized findings payload that feeds the scoring engine and the
 * Evidence Store.
 */

export type ScannerFindings = {
  url: string;
  fetchedAt: number;
  status: number | null;
  finalUrl: string | null;
  // Page semantics
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonical: string | null;
  language: string | null;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  headingHierarchyValid: boolean;
  // Content signals
  wordCount: number;
  visibleTextSample: string;
  hasFAQ: boolean;
  hasAboutSection: boolean;
  hasContactInfo: boolean;
  // Links and structure
  internalLinkCount: number;
  externalLinkCount: number;
  internalLinks: string[];
  externalLinks: string[];
  sameAsLinks: string[];
  // Schema / structured data
  schemaTypes: string[];
  schemaBlocks: unknown[];
  hasOrganizationSchema: boolean;
  hasLocalBusinessSchema: boolean;
  hasFAQSchema: boolean;
  hasServiceSchema: boolean;
  // Crawlability
  robotsTxt: string | null;
  robotsAllowsAi: boolean;
  sitemapUrl: string | null;
  sitemapPresent: boolean;
  llmsTxtPresent: boolean;
  // CMS / tech detection
  cmsDetected: string | null;
  generatorTag: string | null;
  // OpenGraph and Twitter
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  // Errors
  errors: string[];
};

const USER_AGENT =
  "RinaVisibilityBot/1.0 (+https://insightfulrina.com/rina-bot) Mozilla/5.0";

const FETCH_TIMEOUT_MS = 15000;

async function safeFetch(
  url: string,
  init?: RequestInit
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(init?.headers ?? {}),
      },
      redirect: "follow",
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function attr(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

function allMatches(html: string, regex: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  while ((m = r.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function extractMeta(html: string, key: string, attrName: "name" | "property"): string | null {
  const re = new RegExp(
    `<meta[^>]+${attrName}=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return m[1].trim();
  // Try attribute order reversed
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attrName}=["']${key}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? m2[1].trim() : null;
}

function extractAllOpenGraph(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta[^>]+property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

function extractAllTwitter(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta[^>]+name=["']twitter:([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const raw = m[1].trim();
      const parsed = JSON.parse(raw);
      blocks.push(parsed);
    } catch {
      // skip malformed
    }
  }
  return blocks;
}

function collectSchemaTypes(blocks: unknown[]): string[] {
  const types = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const t = obj["@type"];
      if (typeof t === "string") types.add(t);
      if (Array.isArray(t)) t.forEach((v) => typeof v === "string" && types.add(v));
      if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(visit);
    }
  };
  blocks.forEach(visit);
  return Array.from(types);
}

function detectCMS(html: string, generator: string | null): string | null {
  if (generator) {
    const g = generator.toLowerCase();
    if (g.includes("wordpress")) return "WordPress";
    if (g.includes("wix")) return "Wix";
    if (g.includes("squarespace")) return "Squarespace";
    if (g.includes("shopify")) return "Shopify";
    if (g.includes("webflow")) return "Webflow";
    if (g.includes("ghost")) return "Ghost";
    if (g.includes("drupal")) return "Drupal";
    if (g.includes("joomla")) return "Joomla";
    return generator;
  }
  if (/wp-content|wp-includes/i.test(html)) return "WordPress";
  if (/cdn\.shopify\.com|shopify\.com\/s\//i.test(html)) return "Shopify";
  if (/static\.wixstatic\.com|wix\.com/i.test(html)) return "Wix";
  if (/squarespace-cdn\.com|static1\.squarespace\.com/i.test(html)) return "Squarespace";
  if (/webflow\.com|assets\.website-files\.com/i.test(html)) return "Webflow";
  if (/ghost\.io/i.test(html)) return "Ghost";
  return null;
}

function aiBotsAllowed(robotsTxt: string | null): boolean {
  if (!robotsTxt) return true;
  const aiBots = [
    "GPTBot",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "anthropic-ai",
    "ChatGPT-User",
    "OAI-SearchBot",
  ];
  // Conservative: if any AI bot has a Disallow: / under its agent block, return false.
  const lines = robotsTxt.split(/\r?\n/);
  let currentAgents: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey?.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      currentAgents = [value];
    } else if (key === "disallow" && value === "/") {
      if (
        currentAgents.some(
          (a) => a === "*" || aiBots.some((bot) => a.toLowerCase() === bot.toLowerCase())
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

export async function scanWebsite(rawUrl: string): Promise<ScannerFindings> {
  const url = normalizeUrl(rawUrl);
  const origin = getOrigin(url);
  const errors: string[] = [];

  const findings: ScannerFindings = {
    url,
    fetchedAt: Date.now(),
    status: null,
    finalUrl: null,
    title: null,
    metaDescription: null,
    metaKeywords: null,
    canonical: null,
    language: null,
    h1Tags: [],
    h2Tags: [],
    h3Tags: [],
    headingHierarchyValid: false,
    wordCount: 0,
    visibleTextSample: "",
    hasFAQ: false,
    hasAboutSection: false,
    hasContactInfo: false,
    internalLinkCount: 0,
    externalLinkCount: 0,
    internalLinks: [],
    externalLinks: [],
    sameAsLinks: [],
    schemaTypes: [],
    schemaBlocks: [],
    hasOrganizationSchema: false,
    hasLocalBusinessSchema: false,
    hasFAQSchema: false,
    hasServiceSchema: false,
    robotsTxt: null,
    robotsAllowsAi: true,
    sitemapUrl: null,
    sitemapPresent: false,
    llmsTxtPresent: false,
    cmsDetected: null,
    generatorTag: null,
    openGraph: {},
    twitterCard: {},
    errors,
  };

  // 1. Fetch the homepage
  const res = await safeFetch(url);
  if (!res) {
    errors.push("Homepage fetch failed or timed out.");
    return findings;
  }
  findings.status = res.status;
  findings.finalUrl = res.url;
  if (!res.ok) {
    errors.push(`Homepage returned status ${res.status}.`);
    return findings;
  }
  const html = await res.text();

  // 2. Title, meta, canonical, language
  findings.title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+/g, " ").trim() ?? null;
  if (findings.title) findings.title = decodeEntities(findings.title);

  findings.metaDescription = extractMeta(html, "description", "name");
  findings.metaKeywords = extractMeta(html, "keywords", "name");
  findings.canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  findings.language =
    attr(html, /<html[^>]+lang=["']([^"']+)["']/i) ??
    extractMeta(html, "language", "name");

  findings.generatorTag = extractMeta(html, "generator", "name");

  // 3. Headings
  findings.h1Tags = allMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((s) =>
    stripTags(s).slice(0, 200)
  );
  findings.h2Tags = allMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map((s) =>
    stripTags(s).slice(0, 200)
  );
  findings.h3Tags = allMatches(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map((s) =>
    stripTags(s).slice(0, 200)
  );
  findings.headingHierarchyValid =
    findings.h1Tags.length === 1 && findings.h2Tags.length > 0;

  // 4. Visible text + word count
  const visible = stripTags(html);
  findings.visibleTextSample = visible.slice(0, 4000);
  findings.wordCount = visible ? visible.split(/\s+/).length : 0;
  findings.hasFAQ = /\bfrequently asked questions\b|\bFAQ\b/i.test(visible);
  findings.hasAboutSection = /\babout (us|me|our)\b/i.test(visible);
  findings.hasContactInfo =
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(visible) ||
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(visible);

  // 5. Links
  const linkRe = /<a[^>]+href=["']([^"']+)["']/gi;
  let lm: RegExpExecArray | null;
  const internal = new Set<string>();
  const external = new Set<string>();
  while ((lm = linkRe.exec(html)) !== null) {
    const href = lm[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, url).toString();
      if (origin && abs.startsWith(origin)) internal.add(abs);
      else if (/^https?:/i.test(abs)) external.add(abs);
    } catch {
      // skip
    }
  }
  findings.internalLinks = Array.from(internal).slice(0, 50);
  findings.externalLinks = Array.from(external).slice(0, 50);
  findings.internalLinkCount = internal.size;
  findings.externalLinkCount = external.size;

  // 6. Schema / JSON-LD
  const blocks = extractJsonLdBlocks(html);
  findings.schemaBlocks = blocks;
  findings.schemaTypes = collectSchemaTypes(blocks);
  findings.hasOrganizationSchema = findings.schemaTypes.some((t) =>
    /^Organization$|Corporation/i.test(t)
  );
  findings.hasLocalBusinessSchema = findings.schemaTypes.some((t) =>
    /LocalBusiness|Restaurant|Store|MedicalBusiness|ProfessionalService/i.test(t)
  );
  findings.hasFAQSchema = findings.schemaTypes.some((t) => /FAQPage|Question/i.test(t));
  findings.hasServiceSchema = findings.schemaTypes.some((t) => /^Service$|Product/i.test(t));

  // sameAs collection from schema
  const sameAs = new Set<string>();
  const visitForSameAs = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(visitForSameAs);
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const sa = obj["sameAs"];
      if (typeof sa === "string") sameAs.add(sa);
      if (Array.isArray(sa)) sa.forEach((v) => typeof v === "string" && sameAs.add(v));
      Object.values(obj).forEach(visitForSameAs);
    }
  };
  blocks.forEach(visitForSameAs);
  findings.sameAsLinks = Array.from(sameAs);

  // 7. OG / Twitter
  findings.openGraph = extractAllOpenGraph(html);
  findings.twitterCard = extractAllTwitter(html);

  // 8. CMS
  findings.cmsDetected = detectCMS(html, findings.generatorTag);

  // 9. robots.txt + sitemap + llms.txt
  if (origin) {
    const robotsRes = await safeFetch(`${origin}/robots.txt`);
    if (robotsRes && robotsRes.ok) {
      findings.robotsTxt = (await robotsRes.text()).slice(0, 8000);
    }
    findings.robotsAllowsAi = aiBotsAllowed(findings.robotsTxt);

    // sitemap discovery: prefer robots.txt declaration
    let sitemapUrl: string | null = null;
    if (findings.robotsTxt) {
      const m = findings.robotsTxt.match(/sitemap:\s*(\S+)/i);
      if (m) sitemapUrl = m[1].trim();
    }
    if (!sitemapUrl) sitemapUrl = `${origin}/sitemap.xml`;
    const sitemapRes = await safeFetch(sitemapUrl);
    if (sitemapRes && sitemapRes.ok) {
      findings.sitemapUrl = sitemapUrl;
      findings.sitemapPresent = true;
    }

    const llmsRes = await safeFetch(`${origin}/llms.txt`);
    findings.llmsTxtPresent = !!(llmsRes && llmsRes.ok);
  }

  return findings;
}
