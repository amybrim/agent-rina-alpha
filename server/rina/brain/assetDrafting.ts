import { eq } from "drizzle-orm";
import { db } from "../../db";
import { generatedAssets, fixItems, visibilityFindings } from "../../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";
import { invokeLLM } from "../../_core/llm";
import {
  buildFAQPrompt,
  buildMetadataPrompt,
  buildSchemaPrompt,
  buildHomepageCopyPrompt,
  buildServicePagePrompt,
  buildBlogPostPrompt,
  buildSocialPostPrompt,
  buildGBPDescriptionPrompt,
  buildEmailPrompt,
} from "../prompts/assetPrompts";
import { getBusinessById } from "./businessProfile";

type AssetType = InferSelectModel<typeof generatedAssets>["assetType"];
type GeneratedAsset = InferSelectModel<typeof generatedAssets>;

// Map fix item target platforms / issue types to asset types
function inferAssetType(fix: InferSelectModel<typeof fixItems>): AssetType {
  const issue = fix.issue.toLowerCase();
  const platform = (fix.targetPlatform ?? "").toLowerCase();

  if (issue.includes("faq") || issue.includes("question")) return "faq";
  if (issue.includes("meta") || issue.includes("title tag") || issue.includes("description")) return "metadata";
  if (issue.includes("schema") || issue.includes("structured data") || issue.includes("json-ld")) return "schema";
  if (issue.includes("homepage") || issue.includes("hero")) return "homepage_copy";
  if (issue.includes("service page") || issue.includes("service-page")) return "service_page";
  if (issue.includes("blog")) return "blog_post";
  if (platform.includes("linkedin") || platform.includes("instagram") || issue.includes("social")) return "social_post";
  if (platform.includes("gbp") || issue.includes("google business")) return "gbp_description";
  if (issue.includes("email")) return "email";
  return "homepage_copy"; // fallback
}

export async function draftAssetForFix(
  fixId: number,
  assetTypeOverride?: AssetType
): Promise<GeneratedAsset> {
  // Load fix
  const [fix] = await db.select().from(fixItems).where(eq(fixItems.id, fixId)).limit(1);
  if (!fix) throw new Error(`Fix item ${fixId} not found`);

  // Load business
  const business = await getBusinessById(fix.businessId);
  if (!business) throw new Error(`Business ${fix.businessId} not found`);

  // Load finding if linked
  let finding: InferSelectModel<typeof visibilityFindings> | null = null;
  if (fix.findingId) {
    const [f] = await db
      .select()
      .from(visibilityFindings)
      .where(eq(visibilityFindings.id, fix.findingId))
      .limit(1);
    finding = f ?? null;
  }

  // Build a synthetic finding if none exists
  const effectiveFinding = finding ?? {
    id: 0,
    businessId: fix.businessId,
    pageRecordId: null,
    findingType: "manual",
    source: "manual",
    severity: fix.impactLevel as "high" | "medium" | "low",
    businessMeaning: fix.issue,
    evidence: fix.recommendation,
    confidence: "inferred" as const,
    dateFound: new Date(),
    status: "open" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const assetType = assetTypeOverride ?? inferAssetType(fix);

  // Build prompt based on asset type
  let prompt: string;
  switch (assetType) {
    case "faq":
      prompt = buildFAQPrompt(business, effectiveFinding);
      break;
    case "metadata":
      prompt = buildMetadataPrompt(business, effectiveFinding);
      break;
    case "schema":
      prompt = buildSchemaPrompt(business, effectiveFinding);
      break;
    case "homepage_copy":
      prompt = buildHomepageCopyPrompt(business, effectiveFinding);
      break;
    case "service_page":
      prompt = buildServicePagePrompt(business, effectiveFinding);
      break;
    case "blog_post":
      prompt = buildBlogPostPrompt(business, effectiveFinding);
      break;
    case "social_post":
      prompt = buildSocialPostPrompt(business, effectiveFinding,
        (fix.targetPlatform ?? "").includes("instagram") ? "instagram" : "linkedin");
      break;
    case "gbp_description":
      prompt = buildGBPDescriptionPrompt(business, effectiveFinding);
      break;
    case "email":
      prompt = buildEmailPrompt(business, effectiveFinding);
      break;
    default:
      prompt = buildHomepageCopyPrompt(business, effectiveFinding);
  }

  // Call LLM
  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const rawContent = response.choices?.[0]?.message?.content ?? "";
  const content: string = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

  // Get next version number for this fix
  const existingAssets = await db
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.fixItemId, fixId));
  const nextVersion = existingAssets.length + 1;

  // Save to DB
  const [result] = await db
    .insert(generatedAssets)
    .values({
      businessId: fix.businessId,
      fixItemId: fixId,
      assetType,
      version: nextVersion,
      content,
      targetPlatform: fix.targetPlatform ?? null,
      status: "draft",
      sourceFindingId: fix.findingId ?? null,
    })
    .$returningId();

  const [asset] = await db
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.id, result.id))
    .limit(1);

  return asset;
}

export async function getLatestAssetForFix(fixId: number): Promise<GeneratedAsset | null> {
  const assets = await db
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.fixItemId, fixId));

  if (assets.length === 0) return null;
  return assets.sort((a, b) => b.version - a.version)[0];
}

export async function getAssetVersionHistory(fixId: number): Promise<GeneratedAsset[]> {
  const assets = await db
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.fixItemId, fixId));
  return assets.sort((a, b) => b.version - a.version);
}

export async function updateAssetContent(
  assetId: number,
  content: string
): Promise<GeneratedAsset> {
  await db
    .update(generatedAssets)
    .set({ content, status: "draft" })
    .where(eq(generatedAssets.id, assetId));

  const [asset] = await db
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.id, assetId))
    .limit(1);
  return asset;
}
