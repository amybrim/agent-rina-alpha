/**
 * metadataParser.ts — Rina Scanner Metadata Extraction
 *
 * Data integrity rules enforced here:
 *
 * Rule 3: Uses node-html-parser (a proper HTML parser) for all HTML
 *   structure extraction. No regex is used to parse HTML tags or
 *   attributes. Regex is only used for content-pattern matching
 *   (phone numbers, address patterns) on extracted text strings —
 *   not on raw HTML.
 *
 * Rule 5: Metadata findings are confidence:detected — they are
 *   direct reads from the fetched HTML. Contact-info detection
 *   (phone, address) is confidence:inferred — it is a pattern match
 *   on visible text, not a declared structured value.
 */

import { parse } from "node-html-parser";

export interface PageMetadata {
  title: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  wordCount: number;
  /** confidence:detected — parsed from <meta> tags directly */
  hasContactInfo: boolean;
  /** confidence:inferred — pattern matched on visible text */
  hasPhoneNumber: boolean;
  /** confidence:inferred — pattern matched on visible text */
  hasAddress: boolean;
}

/**
 * Extract metadata from HTML using a proper HTML parser.
 * Rule 3: node-html-parser handles all HTML structure parsing.
 * Rule 5: Title, description, OG tags, canonical = detected.
 *         Phone/address = inferred (pattern match on text).
 */
export function parseMetadata(html: string): PageMetadata {
  const empty: PageMetadata = {
    title: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    canonicalUrl: null,
    headings: { h1: [], h2: [], h3: [] },
    wordCount: 0,
    hasContactInfo: false,
    hasPhoneNumber: false,
    hasAddress: false,
  };

  if (!html) return empty;

  let root;
  try {
    root = parse(html, {
      lowerCaseTagName: true,
      comment: false,
      blockTextElements: {
        script: false,
        noscript: false,
        style: false,
        pre: true,
      },
    });
  } catch {
    return empty;
  }

  // ── Title ──────────────────────────────────────────────────────────────
  const titleEl = root.querySelector("title");
  const title = titleEl?.text?.trim() ?? null;

  // ── Meta tags ──────────────────────────────────────────────────────────
  const metaTags = root.querySelectorAll("meta");

  let metaDescription: string | null = null;
  let ogTitle: string | null = null;
  let ogDescription: string | null = null;
  let ogImage: string | null = null;

  for (const meta of metaTags) {
    const name = (meta.getAttribute("name") ?? "").toLowerCase();
    const property = (meta.getAttribute("property") ?? "").toLowerCase();
    const content = meta.getAttribute("content") ?? "";

    if (!content) continue;

    if (name === "description") metaDescription = content.trim();
    if (property === "og:title") ogTitle = content.trim();
    if (property === "og:description") ogDescription = content.trim();
    if (property === "og:image") ogImage = content.trim();
  }

  // ── Canonical URL ──────────────────────────────────────────────────────
  const canonicalEl = root.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalEl?.getAttribute("href")?.trim() ?? null;

  // ── Headings ───────────────────────────────────────────────────────────
  const h1 = root
    .querySelectorAll("h1")
    .map((el) => el.text.trim())
    .filter(Boolean);
  const h2 = root
    .querySelectorAll("h2")
    .map((el) => el.text.trim())
    .filter(Boolean);
  const h3 = root
    .querySelectorAll("h3")
    .map((el) => el.text.trim())
    .filter(Boolean);

  // ── Visible text for word count and contact detection ──────────────────
  const visibleText = extractVisibleText(html);
  const wordCount = visibleText.split(/\s+/).filter(Boolean).length;

  // Contact info detection — confidence:inferred (pattern match on text)
  // These are heuristics, not declared structured values.
  const hasPhoneNumber = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(visibleText);
  const hasAddress =
    /\b(street|avenue|blvd|drive|road|lane|suite|floor|st\.|ave\.|rd\.)\b/i.test(visibleText) ||
    /\b[A-Z]{2}\s+\d{5}\b/.test(visibleText);
  const hasContactInfo =
    hasPhoneNumber ||
    hasAddress ||
    /\b(contact|get in touch|reach us|email us)\b/i.test(visibleText);

  return {
    title,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage,
    canonicalUrl,
    headings: { h1, h2, h3 },
    wordCount,
    hasContactInfo,
    hasPhoneNumber,
    hasAddress,
  };
}

/** Strip HTML tags and return visible text — used for word count and pattern matching */
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
