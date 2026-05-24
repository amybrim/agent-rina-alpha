CREATE TABLE `briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`weekOf` timestamp NOT NULL,
	`showingUp` text NOT NULL,
	`understood` text NOT NULL,
	`recommendable` text NOT NULL,
	`whatChanged` text NOT NULL,
	`whatsNext` text NOT NULL,
	`overallScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `briefings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`websiteUrl` varchar(512) NOT NULL,
	`businessType` varchar(128),
	`location` varchar(256),
	`description` text,
	`goals` text,
	`profileStatus` enum('draft','active') NOT NULL DEFAULT 'draft',
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fixId` int NOT NULL,
	`fromStatus` varchar(32),
	`toStatus` varchar(32) NOT NULL,
	`actorUserId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fixHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`category` enum('crawlability','structure','schema','citability','authority','freshness','clarity','conversion') NOT NULL,
	`title` varchar(256) NOT NULL,
	`rationale` text NOT NULL,
	`assetType` varchar(64) NOT NULL,
	`draftContent` text,
	`targetLocation` varchar(512),
	`priority` int NOT NULL DEFAULT 3,
	`impactPoints` int NOT NULL DEFAULT 0,
	`status` enum('recommended','drafted','approved','published','verified') NOT NULL DEFAULT 'recommended',
	`ownerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`status` enum('queued','running','complete','failed') NOT NULL DEFAULT 'queued',
	`findings` json,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`scanId` int NOT NULL,
	`crawlability` int NOT NULL,
	`structure` int NOT NULL,
	`schemaScore` int NOT NULL,
	`citability` int NOT NULL,
	`authority` int NOT NULL,
	`freshness` int NOT NULL,
	`clarity` int NOT NULL,
	`conversion` int NOT NULL,
	`overall` int NOT NULL,
	`grade` varchar(4) NOT NULL,
	`narrative` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('starter','growth','pro','agency') DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` varchar(32);