ALTER TABLE `profile_links` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_links` ADD `price_label` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_links` ADD `duration_minutes` integer;