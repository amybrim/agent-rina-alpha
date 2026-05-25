CREATE TABLE `audience_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`audience_type` varchar(128) NOT NULL,
	`needs` json,
	`buying_questions` json,
	`objections` json,
	`search_intent` text,
	`recommendation_scenarios` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audience_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(512) NOT NULL,
	`industry` varchar(128),
	`business_type` varchar(128),
	`audience` text,
	`offers` json,
	`location` json,
	`differentiators` json,
	`proof` json,
	`brand_voice` varchar(128),
	`goals` text,
	`competitors` json,
	`onboarding_complete` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fix_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`finding_id` int,
	`issue` text NOT NULL,
	`recommendation` text NOT NULL,
	`impact_level` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`status` enum('found','recommended','drafted','needs_input','ready_for_review','approved','scheduled','published','verified','deferred','rejected','failed') NOT NULL DEFAULT 'found',
	`owner` varchar(128),
	`target_platform` varchar(128),
	`due_date` timestamp,
	`verification_method` text,
	`verification_result` text,
	`rejected_reason` text,
	`deferred_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fix_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`fix_item_id` int,
	`asset_type` enum('faq','metadata','schema','homepage_copy','service_page','blog_post','social_post','gbp_description','email') NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`content` text NOT NULL,
	`target_url` varchar(512),
	`target_platform` varchar(128),
	`status` enum('draft','approved','published','verified','rejected') NOT NULL DEFAULT 'draft',
	`approver_user_id` varchar(128),
	`approved_at` timestamp,
	`published_at` timestamp,
	`verified_at` timestamp,
	`source_finding_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generated_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`platform` enum('wix','shopify','wordpress','ga4','search_console','gbp','linkedin','instagram','gmail','crm') NOT NULL,
	`account_identifier` varchar(255),
	`permission_level` enum('no_access','read_only','draft_only','approval_required','verify_only','admin_restricted') NOT NULL DEFAULT 'no_access',
	`last_synced_at` timestamp,
	`connection_status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`error_message` text,
	`capabilities` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_signal_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`attribution` enum('confirmed_ai','likely_ai','visibility_influenced','unknown') NOT NULL DEFAULT 'unknown',
	`source` varchar(255),
	`landing_page_url` varchar(512),
	`form_response` json,
	`crm_record_id` varchar(128),
	`confidence` enum('verified','likely','unknown') NOT NULL DEFAULT 'unknown',
	`revenue_amount` decimal(10,2),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_signal_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`audience` text,
	`problem_solved` text,
	`proof` json,
	`location_relevance` text,
	`revenue_priority` int DEFAULT 0,
	`related_page_urls` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offer_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_test_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`prompt_text` text NOT NULL,
	`platform` enum('chatgpt','perplexity','gemini','claude','copilot') NOT NULL,
	`business_mentioned` boolean NOT NULL DEFAULT false,
	`position_in_response` int,
	`competitors_mentioned` json,
	`summary_accuracy` enum('accurate','partial','inaccurate','not_mentioned'),
	`source_citations` json,
	`raw_response` text,
	`tested_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prompt_test_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_decision_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`decision_type` enum('approved','rejected','deferred','edited','overridden') NOT NULL,
	`entity_type` enum('fix_item','generated_asset','recommendation') NOT NULL,
	`entity_id` int NOT NULL,
	`notes` text,
	`future_preference` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_decision_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`avatar_url` text,
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	`subscription_tier` enum('starter','growth','pro','agency') DEFAULT 'starter',
	`subscription_status` varchar(64),
	`stripe_customer_id` varchar(128),
	`stripe_subscription_id` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visibility_briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`week_start_date` timestamp NOT NULL,
	`week_end_date` timestamp NOT NULL,
	`showing_up_grade` enum('clear','partial','not_yet_visible'),
	`being_understood_grade` enum('clear','partial','not_yet_visible'),
	`trust_grade` enum('clear','partial','not_yet_visible'),
	`recommendation_ready_grade` enum('clear','partial','not_yet_visible'),
	`geo_readiness_grade` enum('clear','partial','not_yet_visible'),
	`rina_read` text,
	`fixes_completed` int DEFAULT 0,
	`fixes_in_progress` int DEFAULT 0,
	`top_actions` json,
	`lead_signal_summary` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visibility_briefings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visibility_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`page_record_id` int,
	`finding_type` varchar(128) NOT NULL,
	`source` varchar(128) NOT NULL,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`business_meaning` text NOT NULL,
	`evidence` text,
	`confidence` enum('verified','confirmed_by_user','detected','inferred','likely','unknown') NOT NULL DEFAULT 'detected',
	`date_found` timestamp NOT NULL DEFAULT (now()),
	`status` enum('open','addressed','deferred','rejected') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visibility_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_page_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_id` int NOT NULL,
	`url` varchar(512) NOT NULL,
	`page_type` varchar(64),
	`title` text,
	`meta_description` text,
	`headings` json,
	`schema_present` json,
	`content_summary` text,
	`clarity_score` enum('CLEAR','PARTIAL','NOT_YET_VISIBLE'),
	`proof_score` enum('CLEAR','PARTIAL','NOT_YET_VISIBLE'),
	`crawlable` boolean DEFAULT true,
	`last_scanned_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `website_page_records_id` PRIMARY KEY(`id`)
);
