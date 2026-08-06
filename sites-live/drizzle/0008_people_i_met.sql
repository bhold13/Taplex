CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`connected_profile_id` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`met_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `taplex_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connected_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_owner_profile_unique` ON `connections` (`owner_user_id`,`connected_profile_id`);
--> statement-breakpoint
CREATE INDEX `connections_owner_met_idx` ON `connections` (`owner_user_id`,`met_at`);
