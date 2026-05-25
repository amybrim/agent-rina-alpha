import { relations } from "drizzle-orm";
import {
  audienceProfiles,
  businesses,
  fixItems,
  generatedAssets,
  integrationConnections,
  leadSignalRecords,
  offerProfiles,
  promptTestResults,
  userDecisionRecords,
  users,
  visibilityBriefings,
  visibilityFindings,
  websitePageRecords,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
  decisions: many(userDecisionRecords),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, { fields: [businesses.userId], references: [users.id] }),
  offerProfiles: many(offerProfiles),
  audienceProfiles: many(audienceProfiles),
  pageRecords: many(websitePageRecords),
  findings: many(visibilityFindings),
  fixItems: many(fixItems),
  generatedAssets: many(generatedAssets),
  integrations: many(integrationConnections),
  briefings: many(visibilityBriefings),
  leadSignals: many(leadSignalRecords),
  promptTests: many(promptTestResults),
  decisions: many(userDecisionRecords),
}));

export const offerProfilesRelations = relations(offerProfiles, ({ one }) => ({
  business: one(businesses, { fields: [offerProfiles.businessId], references: [businesses.id] }),
}));

export const audienceProfilesRelations = relations(audienceProfiles, ({ one }) => ({
  business: one(businesses, { fields: [audienceProfiles.businessId], references: [businesses.id] }),
}));

export const websitePageRecordsRelations = relations(websitePageRecords, ({ one, many }) => ({
  business: one(businesses, { fields: [websitePageRecords.businessId], references: [businesses.id] }),
  findings: many(visibilityFindings),
}));

export const visibilityFindingsRelations = relations(visibilityFindings, ({ one, many }) => ({
  business: one(businesses, { fields: [visibilityFindings.businessId], references: [businesses.id] }),
  pageRecord: one(websitePageRecords, { fields: [visibilityFindings.pageRecordId], references: [websitePageRecords.id] }),
  fixItems: many(fixItems),
}));

export const fixItemsRelations = relations(fixItems, ({ one, many }) => ({
  business: one(businesses, { fields: [fixItems.businessId], references: [businesses.id] }),
  finding: one(visibilityFindings, { fields: [fixItems.findingId], references: [visibilityFindings.id] }),
  assets: many(generatedAssets),
  decisions: many(userDecisionRecords),
}));

export const generatedAssetsRelations = relations(generatedAssets, ({ one }) => ({
  business: one(businesses, { fields: [generatedAssets.businessId], references: [businesses.id] }),
  fixItem: one(fixItems, { fields: [generatedAssets.fixItemId], references: [fixItems.id] }),
  approver: one(users, { fields: [generatedAssets.approverUserId], references: [users.id] }),
}));

export const integrationConnectionsRelations = relations(integrationConnections, ({ one }) => ({
  business: one(businesses, { fields: [integrationConnections.businessId], references: [businesses.id] }),
}));

export const visibilityBriefingsRelations = relations(visibilityBriefings, ({ one }) => ({
  business: one(businesses, { fields: [visibilityBriefings.businessId], references: [businesses.id] }),
}));

export const leadSignalRecordsRelations = relations(leadSignalRecords, ({ one }) => ({
  business: one(businesses, { fields: [leadSignalRecords.businessId], references: [businesses.id] }),
}));

export const promptTestResultsRelations = relations(promptTestResults, ({ one }) => ({
  business: one(businesses, { fields: [promptTestResults.businessId], references: [businesses.id] }),
}));

export const userDecisionRecordsRelations = relations(userDecisionRecords, ({ one }) => ({
  business: one(businesses, { fields: [userDecisionRecords.businessId], references: [businesses.id] }),
  user: one(users, { fields: [userDecisionRecords.userId], references: [users.id] }),
}));
