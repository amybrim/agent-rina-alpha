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
  hasContactInfo: boolean;
  hasPhoneNumber: boolean;
  hasAddress: boolean;
}

function extractMeta(html: string, name: string): string | null {
  // Matches both name= and property= meta tags
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function extractAllTags(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, "gi");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text) results.push(text);
  }
  return results;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMetadata(html: string): PageMetadata {
  const title = extractTag(html, "title");
  const metaDescription = extractMeta(html, "description");
  const ogTitle = extractMeta(html, "og:title");
  const ogDescription = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");

  // Canonical URL
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const canonicalUrl = canonicalMatch?.[1] ?? null;

  // Headings
  const h1 = extractAllTags(html, "h1");
  const h2 = extractAllTags(html, "h2");
  const h3 = extractAllTags(html, "h3");

  // Word count from visible text
  const visibleText = stripHtml(html);
  const wordCount = visibleText.split(/\s+/).filter(Boolean).length;

  // Contact signals
  const hasPhoneNumber = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(html);
  const hasAddress =
    /\b(street|avenue|blvd|drive|road|lane|suite|floor|st\.|ave\.|rd\.)\b/i.test(html) ||
    /\b[A-Z]{2}\s+\d{5}\b/.test(html); // state + zip
  const hasContactInfo = hasPhoneNumber || hasAddress || /contact|get in touch|reach us/i.test(html);

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
