CREATE TABLE `profile_gallery_items` (
  `id` text PRIMARY KEY NOT NULL,
  `profile_id` text NOT NULL,
  `image_key` text NOT NULL,
  `caption` text DEFAULT '' NOT NULL,
  `alt_text` text DEFAULT '' NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `profile_gallery_profile_order_idx` ON `profile_gallery_items` (`profile_id`,`sort_order`);
