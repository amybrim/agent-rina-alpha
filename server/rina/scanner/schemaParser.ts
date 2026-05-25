/**
 * schemaParser.ts — Rina Scanner Schema Extraction
 *
 * Data integrity rules enforced here:
 *
 * Rule 3: Uses node-html-parser (a proper HTML parser) to extract
 *   <script type="application/ld+json"> blocks. No regex is used to
 *   parse HTML structure. The raw JSON-LD text is stored verbatim so
 *   it can be audited.
 *
 * Rule 5: All schema findings are confidence:detected — the schema
 *   was either present in the fetched HTML or it was not. There is
 *   no inference here.
 */

import { parse } from "node-html-parser";

export interface SchemaResult {
  present: boolean;
  valid: boolean;
  types: string[];
  hasFAQ: boolean;
  hasLocalBusiness: boolean;
  hasOrganization: boolean;
  hasService: boolean;
  hasProduct: boolean;
  hasBreadcrumb: boolean;
  hasReview: boolean;
  /** Raw JSON-LD text of the first block found — stored for audit purposes */
  raw: string | null;
  /** All raw JSON-LD blocks found on the page — stored for full audit */
  allRaw: string[];
  errors: string[];
}

/**
 * Parse all JSON-LD schema blocks from HTML using a proper HTML parser.
 * Rule 3: No regex used to extract HTML structure.
 * Rule 5: Returns detected confidence — this is a direct read of the HTML.
 */
export function parseSchema(html: string): SchemaResult {
  const result: SchemaResult = {
    present: false,
    valid: false,
    types: [],
    hasFAQ: false,
    hasLocalBusiness: false,
    hasOrganization: false,
    hasService: false,
    hasProduct: false,
    hasBreadcrumb: false,
    hasReview: false,
    raw: null,
    allRaw: [],
    errors: [],
  };

  if (!html) return result;

  // Use node-html-parser to find all <script type="application/ld+json"> elements
  let root;
  try {
    root = parse(html, {
      lowerCaseTagName: false,
      comment: false,
      blockTextElements: {
        script: true,
        noscript: false,
        style: false,
        pre: false,
      },
    });
  } catch (err) {
    result.errors.push(`HTML parse error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Select all script elements with type="application/ld+json"
  const scriptElements = root.querySelectorAll('script[type="application/ld+json"]');

  if (scriptElements.length === 0) {
    // Check for microdata as fallback — detect via attribute presence
    const microdataElements = root.querySelectorAll("[itemtype]");
    const hasMicrodata = microdataElements.some((el) =>
      (el.getAttribute("itemtype") ?? "").includes("schema.org"),
    );
    if (hasMicrodata) {
      result.present = true;
      result.valid = true;
      result.types = ["microdata (unstructured)"];
    }
    return result;
  }

  result.present = true;

  for (const scriptEl of scriptElements) {
    // node-html-parser exposes rawText for script elements when blockTextElements.script = true
    const rawText = (scriptEl.rawText ?? scriptEl.text ?? "").trim();
    if (!rawText) continue;

    result.allRaw.push(rawText);
    if (!result.raw) result.raw = rawText; // Store first block as the primary sample

    try {
      const parsed = JSON.parse(rawText);
      const schemas = Array.isArray(parsed) ? parsed : [parsed];

      for (const schema of schemas) {
        const type = schema["@type"];
        if (!type) continue;

        const typeStr = Array.isArray(type) ? type.join(", ") : String(type);
        result.types.push(typeStr);

        const typeLower = typeStr.toLowerCase();
        if (typeLower.includes("faqpage")) result.hasFAQ = true;
        if (
          typeLower.includes("localbusiness") ||
          typeLower.includes("restaurant") ||
          typeLower.includes("store") ||
          typeLower.includes("medicalorganization")
        ) {
          result.hasLocalBusiness = true;
        }
        if (typeLower.includes("organization") || typeLower.includes("corporation")) {
          result.hasOrganization = true;
        }
        if (typeLower.includes("service")) result.hasService = true;
        if (typeLower.includes("product")) result.hasProduct = true;
        if (typeLower.includes("breadcrumb")) result.hasBreadcrumb = true;
        if (typeLower.includes("review") || typeLower.includes("aggregaterating")) {
          result.hasReview = true;
        }
      }

      result.valid = true;
    } catch (err) {
      result.errors.push(
        `JSON-LD parse error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}
