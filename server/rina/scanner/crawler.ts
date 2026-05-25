import https from "https";
import http from "http";
import { URL } from "url";
import type { AiBotAccessResult, LlmsTxtResult } from "./geoReadiness";

export interface CrawlResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  crawlable: boolean;
  robotsBlocked: boolean;
  html: string;
  contentType: string;
  error?: string;
}

export interface RobotsResult {
  allowed: boolean;
  userAgent: string;
}

// Critical AI citation bots that must be allowed for full GEO visibility
const CRITICAL_AI_BOTS = [
  "GPTBot",           // OpenAI / ChatGPT
  "OAI-SearchBot",    // OpenAI search
  "ClaudeBot",        // Anthropic / Claude
  "anthropic-ai",     // Anthropic crawler
  "PerplexityBot",    // Perplexity AI
  "Google-Extended",  // Google AI / Gemini training
  "Bingbot",          // Microsoft / Copilot
];

/**
 * Check which AI citation bots are allowed/blocked in robots.txt.
 * Returns an AiBotAccessResult with blocked/allowed lists.
 */
export async function checkAiBotAccess(baseUrl: string): Promise<AiBotAccessResult> {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const robotsTxt = await fetchText(robotsUrl).catch(() => "");

    if (!robotsTxt) {
      return {
        allCriticalAllowed: true,
        blockedBots: [],
        allowedBots: CRITICAL_AI_BOTS,
        hasRobotsTxt: false,
      };
    }

    const lines = robotsTxt.split("\n").map((l) => l.trim());
    // Build a map of bot -> disallowed paths
    const botDisallows: Record<string, string[]> = {};
    let currentAgents: string[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("user-agent:")) {
        const agent = line.split(":").slice(1).join(":").trim();
        currentAgents = [agent];
      } else if (lower.startsWith("disallow:")) {
        const path = line.split(":").slice(1).join(":").trim();
        for (const agent of currentAgents) {
          if (!botDisallows[agent]) botDisallows[agent] = [];
          botDisallows[agent].push(path);
        }
      } else if (line === "") {
        currentAgents = [];
      }
    }

    const blockedBots: string[] = [];
    const allowedBots: string[] = [];

    for (const bot of CRITICAL_AI_BOTS) {
      // Check exact match (case-insensitive) and wildcard (*)
      const botKey = Object.keys(botDisallows).find(
        (k) => k.toLowerCase() === bot.toLowerCase()
      );
      const wildcardDisallows = botDisallows["*"] ?? [];

      const botDisallowedPaths = botKey ? botDisallows[botKey] : [];
      const allDisallows = [...wildcardDisallows, ...botDisallowedPaths];

      // Bot is blocked if "/" is in disallow list or if it has an explicit full-site block
      const isBlocked = allDisallows.some((p) => p === "/");

      if (isBlocked) {
        blockedBots.push(bot);
      } else {
        allowedBots.push(bot);
      }
    }

    return {
      allCriticalAllowed: blockedBots.length === 0,
      blockedBots,
      allowedBots,
      hasRobotsTxt: true,
    };
  } catch {
    return {
      allCriticalAllowed: true,
      blockedBots: [],
      allowedBots: CRITICAL_AI_BOTS,
      hasRobotsTxt: false,
    };
  }
}

/**
 * Check for llms.txt at the root of the domain.
 * Returns presence, H1, blockquote, H2 sections, and line count.
 */
export async function checkLlmsTxt(baseUrl: string): Promise<LlmsTxtResult> {
  try {
    const url = new URL(baseUrl);
    const llmsUrl = `${url.protocol}//${url.host}/llms.txt`;
    const content = await fetchText(llmsUrl).catch(() => "");

    if (!content || content.length < 10) {
      return { present: false, hasH1: false, hasBlockquote: false, hasH2Sections: false, lineCount: 0 };
    }

    const lines = content.split("\n");
    return {
      present: true,
      hasH1: lines.some((l) => l.startsWith("# ")),
      hasBlockquote: lines.some((l) => l.startsWith("> ")),
      hasH2Sections: lines.some((l) => l.startsWith("## ")),
      lineCount: lines.length,
    };
  } catch {
    return { present: false, hasH1: false, hasBlockquote: false, hasH2Sections: false, lineCount: 0 };
  }
}

// Fetch robots.txt and check if the given path is allowed
export async function checkRobots(baseUrl: string, path = "/"): Promise<RobotsResult> {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const robotsTxt = await fetchText(robotsUrl);

    // Simple robots.txt parser — check for Disallow rules for * or Googlebot
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
    // If robots.txt is missing or unreadable, assume allowed
    return { allowed: true, userAgent: "*" };
  }
}

// Fetch a URL and return the HTML content
export async function fetchPage(url: string): Promise<CrawlResult> {
  try {
    const parsedUrl = new URL(url);
    const robotsCheck = await checkRobots(url, parsedUrl.pathname);

    const { html, statusCode, finalUrl, contentType } = await fetchHtml(url);

    return {
      url,
      finalUrl,
      statusCode,
      crawlable: statusCode >= 200 && statusCode < 400,
      robotsBlocked: !robotsCheck.allowed,
      html,
      contentType,
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
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Discover links on a page (same-domain only)
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
        // Normalize: strip hash and trailing slash
        resolved.hash = "";
        const normalized = resolved.toString().replace(/\/$/, "");
        links.add(normalized);
      }
    } catch {
      // ignore malformed URLs
    }
  }

  return Array.from(links).slice(0, 20); // cap at 20 links per page
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

function fetchHtml(url: string, redirectCount = 0): Promise<{
  html: string;
  statusCode: number;
  finalUrl: string;
  contentType: string;
}> {
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

      // Handle redirects
      if ((statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        res.resume();
        fetchHtml(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      let html = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        html += chunk;
        // Cap at 500KB to avoid memory issues
        if (html.length > 512000) res.destroy();
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
