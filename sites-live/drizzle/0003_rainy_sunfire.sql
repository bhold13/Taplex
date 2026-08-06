CREATE TABLE `promo_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`max_redemptions` integer NOT NULL,
	`redemption_count` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promo_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`profile_id` text NOT NULL,
	`redeemed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `promo_codes`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promo_redemptions_profile_unique` ON `promo_redemptions` (`profile_id`);--> statement-breakpoint
CREATE INDEX `promo_redemptions_code_idx` ON `promo_redemptions` (`code`,`redeemed_at`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `plan` text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `pro_unlocked_at` text;