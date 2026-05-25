ALTER TABLE `users` ADD `login_method` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `last_signed_in` timestamp DEFAULT (now());