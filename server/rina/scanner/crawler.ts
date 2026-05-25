/**
 * crawler.ts — Rina Scanner Network Layer
 *
 * Data integrity rules enforced here:
 *
 * Rule 1: Every page fetch is validated before analysis proceeds.
 *   - HTTP status must be 2xx
 *   - Content-Type must be text/html
 *   - Visible text must be ≥ 500 characters (not an error page or empty shell)
 *   - If the page appears to be JavaScript-rendered (thin HTML, no <h1>, no <p>),
 *     crawlResult.jsRendered = true is set so downstream code can mark findings
 *     as confidence:inferred rather than confidence:detected.
 *
 * Rule 1 (prerender): This crawler uses a plain HTTP fetch. It does NOT execute
 *   JavaScript. For JS-heavy sites (React, Next.js, Wix, Squarespace), the
 *   fetched HTML will be a thin shell. When jsRendered = true, the scan workflow
 *   must NOT claim detected confidence on content-analysis findings — those
 *   findings must be labeled inferred with evidence noting the limitation.
 *
 * Rule 3: Schema and metadata parsing are delegated to schemaParser.ts and
 *   metadataParser.ts which use node-html-parser (not regex).
 */

import http from "http";
import https from "https";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CrawlResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  crawlable: boolean;
  robotsBlocked: boolean;
  html: string;
  contentType: string;
  /** True if the page appears to be a JavaScript-rendered SPA shell.
   *  When true, content-analysis findings must use confidence:inferred. */
  jsRendered: boolean;
  /** True if the page passed all content validation checks (status 2xx,
   *  content-type html, visible text ≥ 500 chars, not an error page). */
  contentValidated: boolean;
  /** Human-readable reason if contentValidated = false */
  contentValidationReason?: string;
  error?: string;
}

export interface RobotsResult {
  allowed: boolean;
  userAgent: string;
}

export interface AiBotAccessResult {
  /** True if all critical citation bots are allowed (or robots.txt is absent) */
  allCriticalAllowed: boolean;
  blockedBots: string[];
  allowedBots: string[];
  hasRobotsTxt: boolean;
}

export interface LlmsTxtResult {
  present: boolean;
  hasH1: boolean;
  hasBlockquote: boolean;
  hasH2Sections: boolean;
  lineCount: number;
}

// ─────────────────────────────────────────────
// Content validation
// ─────────────────────────────────────────────

/** Minimum visible-text character count to consider a page real content */
const MIN_VISIBLE_TEXT_CHARS = 500;

/** Patterns that indicate an error page rather than real content */
const ERROR_PAGE_PATTERNS = [
  /404\s*(not found|page not found|error)/i,
  /403\s*(forbidden|access denied)/i,
  /500\s*(internal server error)/i,
  /503\s*(service unavailable)/i,
  /<title>[^<]*(404|403|500|503|not found|error|forbidden)[^<]*<\/title>/i,
];

/** Strip HTML tags and return visible text */
function extractVisibleText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validate that fetched HTML represents real page content.
 * Returns { valid, reason, jsRendered }.
 */
function validateContent(html: string, statusCode: number, contentType: string): {
  valid: boolean;
  reason?: string;
  jsRendered: boolean;
} {
  // Must be a successful response
  if (statusCode < 200 || statusCode >= 400) {
    return { valid: false, reason: `HTTP ${statusCode}`, jsRendered: false };
  }

  // Must be HTML
  if (contentType && !contentType.includes("text/html")) {
    return { valid: false, reason: `Non-HTML content type: ${contentType}`, jsRendered: false };
  }

  // Must have some HTML
  if (!html || html.length < 100) {
    return { valid: false, reason: "Empty or near-empty response body", jsRendered: false };
  }

  // Check for error page patterns
  for (const pattern of ERROR_PAGE_PATTERNS) {
    if (pattern.test(html.slice(0, 2000))) {
      return { valid: false, reason: "Page appears to be an error page", jsRendered: false };
    }
  }

  // Extract visible text
  const visibleText = extractVisibleText(html);

  // Detect JavaScript-rendered SPA shell:
  // - Very little visible text despite having HTML
  // - No <h1> tag
  // - No <p> tags with content
  // - Has <div id="root"> or <div id="app"> (React/Vue/Angular mount points)
  const hasSpaMount = /<div[^>]+id=["'](root|app|__next|__nuxt)["']/i.test(html);
  const hasH1 = /<h1[^>]*>[^<]{3,}/i.test(html);
  const hasParagraphs = (html.match(/<p[^>]*>[^<]{20,}/gi) ?? []).length >= 2;
  const isJsRendered = hasSpaMount && (!hasH1 || !hasParagraphs || visibleText.length < MIN_VISIBLE_TEXT_CHARS);

  // Minimum content check
  if (visibleText.length < MIN_VISIBLE_TEXT_CHARS) {
    if (isJsRendered) {
      // JS-rendered pages are technically crawlable but content is not readable
      return {
        valid: false,
        reason: `JavaScript-rendered page — visible text is only ${visibleText.length} characters. Rina cannot analyze content that requires JavaScript execution.`,
        jsRendered: true,
      };
    }
    return {
      valid: false,
      reason: `Page has only ${visibleText.length} visible characters — insufficient content for analysis`,
      jsRendered: false,
    };
  }

  return { valid: true, jsRendered: isJsRendered };
}

// ─────────────────────────────────────────────
// AI bot access check
// ─────────────────────────────────────────────

/** Critical AI citation bots that must be allowed for AI visibility */
const CRITICAL_AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Bingbot",
];

/**
 * Fetch robots.txt and check whether critical AI citation bots are allowed.
 * Rule 1: This fetches the actual robots.txt — result is confidence:detected.
 */
export async function checkAiBotAccess(baseUrl: string): Promise<AiBotAccessResult> {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const { content, statusCode } = await fetchTextWithStatus(robotsUrl).catch(() => ({
      content: "",
      statusCode: 0,
    }));

    if (statusCode !== 200 || !content) {
      // No robots.txt — all bots allowed by default
      return {
        allCriticalAllowed: true,
        blockedBots: [],
        allowedBots: [...CRITICAL_AI_BOTS],
        hasRobotsTxt: false,
      };
    }

    // Parse robots.txt into per-agent rules
    const lines = content.split("\n").map((l) => l.trim());
    // Map: agentName (lowercase) → disallowedPaths[]
    const agentRules: Map<string, string[]> = new Map();
    let currentAgents: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const directive = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (directive === "user-agent") {
        currentAgents = [value.toLowerCase()];
        if (!agentRules.has(value.toLowerCase())) {
          agentRules.set(value.toLowerCase(), []);
        }
      } else if (directive === "disallow" && currentAgents.length > 0) {
        for (const agent of currentAgents) {
          const existing = agentRules.get(agent) ?? [];
          existing.push(value);
          agentRules.set(agent, existing);
        }
      }
    }

    /**
     * Check if a specific bot is blocked.
     * A bot is blocked if:
     * - It has a specific Disallow: / rule, OR
     * - The wildcard (*) has a Disallow: / rule AND the bot has no explicit Allow: /
     */
    const isBotBlocked = (botName: string): boolean => {
      const botKey = botName.toLowerCase();
      const botRules = agentRules.get(botKey);
      const wildcardRules = agentRules.get("*") ?? [];

      // Check bot-specific rules first
      if (botRules !== undefined) {
        return botRules.some((path) => path === "/" || path === "");
      }

      // Fall back to wildcard rules
      return wildcardRules.some((path) => path === "/" || path === "");
    }

    const blockedBots = CRITICAL_AI_BOTS.filter((bot) => isBotBlocked(bot));
    const allowedBots = CRITICAL_AI_BOTS.filter((bot) => !isBotBlocked(bot));

    return {
      allCriticalAllowed: blockedBots.length === 0,
      blockedBots,
      allowedBots,
      hasRobotsTxt: true,
    };
  } catch {
    // Network error — assume allowed (cannot confirm blocked)
    return {
      allCriticalAllowed: true,
      blockedBots: [],
      allowedBots: [...CRITICAL_AI_BOTS],
      hasRobotsTxt: false,
    };
  }
}

// ─────────────────────────────────────────────
// llms.txt check
// ─────────────────────────────────────────────

/**
 * Check for llms.txt at the root of the domain.
 * Rule 1: Fetches the actual file — result is confidence:detected.
 * A 404 or HTML error page response is treated as absent.
 */
export async function checkLlmsTxt(baseUrl: string): Promise<LlmsTxtResult> {
  const absent: LlmsTxtResult = {
    present: false,
    hasH1: false,
    hasBlockquote: false,
    hasH2Sections: false,
    lineCount: 0,
  };
  try {
    const url = new URL(baseUrl);
    const llmsUrl = `${url.protocol}//${url.host}/llms.txt`;

    const { content, statusCode } = await fetchTextWithStatus(llmsUrl).catch(() => ({
      content: "",
      statusCode: 0,
    }));

    // Only treat as present if server returned 200 OK with real content
    if (statusCode !== 200 || !content || content.length < 10) {
      return absent;
    }

    // Reject HTML error pages served at /llms.txt
    const isHtml = /<(!DOCTYPE|html|head|body)/i.test(content.slice(0, 200));
    if (isHtml) return absent;

    const lines = content.split("\n");
    return {
      present: true,
      hasH1: lines.some((l) => l.startsWith("# ")),
      hasBlockquote: lines.some((l) => l.startsWith("> ")),
      hasH2Sections: lines.some((l) => l.startsWith("## ")),
      lineCount: lines.length,
    };
  } catch {
    return absent;
  }
}

// ─────────────────────────────────────────────
// robots.txt crawlability check
// ─────────────────────────────────────────────

export async function checkRobots(baseUrl: string, path = "/"): Promise<RobotsResult> {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const robotsTxt = await fetchText(robotsUrl);
    const lines = robotsTxt.split("\n").map((l) => l.trim());
    let inRelevantBlock = false;
    let blocked = false;
    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        const agent = line.split(":")[1].trim().toLowerCase();
        inRelevantBlock = agent === "*" || agent === "googlebot" || agent === "gptbot";
      }
      if (inRelevantBlock && line.toLowerCase().startsWith("disallow:")) {
        const disallowedPath = line.split(":")[1].trim();
        if (disallowedPath === "/" || (disallowedPath && path.startsWith(disallowedPath))) {
          blocked = true;
        }
      }
    }
    return { allowed: !blocked, userAgent: "*" };
  } catch {
    return { allowed: true, userAgent: "*" };
  }
}

// ─────────────────────────────────────────────
// Main page fetch
// ─────────────────────────────────────────────

/**
 * Fetch a URL and return the HTML content with full content validation.
 * Rule 1: Validates status, content-type, visible text length, and JS-render detection.
 * If contentValidated = false, the scan workflow must skip analysis or label
 * all findings as confidence:unknown.
 */
export async function fetchPage(url: string): Promise<CrawlResult> {
  try {
    const parsedUrl = new URL(url);
    const robotsCheck = await checkRobots(url, parsedUrl.pathname);
    const { html, statusCode, finalUrl, contentType } = await fetchHtml(url);

    const { valid, reason, jsRendered } = validateContent(html, statusCode, contentType);

    return {
      url,
      finalUrl,
      statusCode,
      crawlable: statusCode >= 200 && statusCode < 400,
      robotsBlocked: !robotsCheck.allowed,
      html,
      contentType,
      jsRendered,
      contentValidated: valid,
      contentValidationReason: reason,
    };
  } catch (err: unknown) {
    return {
      url,
      finalUrl: url,
      statusCode: 0,
      crawlable: false,
      robotsBlocked: false,
      html: "",
      contentType: "",
      jsRendered: false,
      contentValidated: false,
      contentValidationReason: err instanceof Error ? err.message : String(err),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────
// Link extraction
// ─────────────────────────────────────────────

export function extractSameDomainLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === base.hostname) {
        resolved.hash = "";
        const normalized = resolved.toString().replace(/\/$/, "");
        links.add(normalized);
      }
    } catch {
      // ignore malformed URLs
    }
  }
  return Array.from(links).slice(0, 20);
}

// ─────────────────────────────────────────────
// Internal HTTP helpers
// ─────────────────────────────────────────────

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 8000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/** Fetch text and return the HTTP status code alongside the body */
function fetchTextWithStatus(url: string): Promise<{ content: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 8000 }, (res) => {
      const statusCode = res.statusCode ?? 0;
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ content: data, statusCode }));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function fetchHtml(
  url: string,
  redirectCount = 0,
): Promise<{ html: string; statusCode: number; finalUrl: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects"));
      return;
    }

    const lib = url.startsWith("https") ? https : http;
    const options = {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InsightfulRinaBot/1.0; +https://insightfulrina.com/bot)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    };

    const req = lib.get(url, options, (res) => {
      const statusCode = res.statusCode ?? 0;
      const contentType = res.headers["content-type"] ?? "";

      if (
        (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) &&
        res.headers.location
      ) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        res.resume();
        fetchHtml(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      let html = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        html += chunk;
        if (html.length > 512000) res.destroy(); // cap at 500KB
      });
      res.on("end", () => resolve({ html, statusCode, finalUrl: url, contentType }));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}
