CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`service_link_id` text NOT NULL,
	`service_title` text NOT NULL,
	`requested_date` text NOT NULL,
	`requested_time` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `profile_bookings_profile_date_idx` ON `profile_bookings` (`profile_id`,`requested_date`,`requested_time`);--> statement-breakpoint
CREATE INDEX `profile_bookings_status_idx` ON `profile_bookings` (`profile_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `taplex_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `taplex_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `taplex_sessions_user_idx` ON `taplex_sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `taplex_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`google_sub` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `taplex_users_email_unique` ON `taplex_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `taplex_users_google_sub_unique` ON `taplex_users` (`google_sub`);