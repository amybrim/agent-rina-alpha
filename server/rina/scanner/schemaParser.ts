export interface SchemaResult {
  present: boolean;
  types: string[];
  valid: boolean;
  hasFAQ: boolean;
  hasLocalBusiness: boolean;
  hasOrganization: boolean;
  hasService: boolean;
  hasProduct: boolean;
  hasBreadcrumb: boolean;
  hasReview: boolean;
  raw: string | null;
  errors: string[];
}

export function parseSchema(html: string): SchemaResult {
  const result: SchemaResult = {
    present: false,
    types: [],
    valid: false,
    hasFAQ: false,
    hasLocalBusiness: false,
    hasOrganization: false,
    hasService: false,
    hasProduct: false,
    hasBreadcrumb: false,
    hasReview: false,
    raw: null,
    errors: [],
  };

  // Extract all JSON-LD blocks
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const allBlocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    allBlocks.push(match[1].trim());
  }

  if (allBlocks.length === 0) {
    // Check for microdata as fallback
    const hasMicrodata = /itemtype=["']https?:\/\/schema\.org\//i.test(html);
    if (hasMicrodata) {
      result.present = true;
      result.valid = true;
      result.types = ["microdata (unstructured)"];
    }
    return result;
  }

  result.present = true;
  result.raw = allBlocks[0]; // Store first block as sample

  for (const block of allBlocks) {
    try {
      const parsed = JSON.parse(block);
      const schemas = Array.isArray(parsed) ? parsed : [parsed];

      for (const schema of schemas) {
        const type = schema["@type"];
        if (!type) continue;

        const typeStr = Array.isArray(type) ? type.join(", ") : String(type);
        result.types.push(typeStr);

        const typeLower = typeStr.toLowerCase();
        if (typeLower.includes("faqpage")) result.hasFAQ = true;
        if (typeLower.includes("localbusiness") || typeLower.includes("restaurant") ||
            typeLower.includes("store") || typeLower.includes("medicalorganization")) {
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
      result.errors.push(`JSON-LD parse error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
