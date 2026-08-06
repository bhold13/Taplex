CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`checkout_session_id` text NOT NULL,
	`status` text NOT NULL,
	`amount_total` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`customer_email` text,
	`cart_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_checkout_session_unique` ON `orders` (`checkout_session_id`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`inventory` integer DEFAULT 0 NOT NULL,
	`track_inventory` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`image_key` text,
	`image_alt` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`active`,`created_at`);--> statement-breakpoint
INSERT INTO `products` (`id`,`name`,`slug`,`description`,`price_cents`,`currency`,`inventory`,`track_inventory`,`active`,`image_key`,`image_alt`)
VALUES ('11111111-1111-4111-8111-111111111111','TapLex NFC Wristband','taplex-nfc-wristband','Premium wearable NFC networking with a personal TapLex profile and activation support.',4000,'usd',0,0,1,NULL,'Black and gold TapLex NFC wristband');--> statement-breakpoint
INSERT INTO `products` (`id`,`name`,`slug`,`description`,`price_cents`,`currency`,`inventory`,`track_inventory`,`active`,`image_key`,`image_alt`)
VALUES ('22222222-2222-4222-8222-222222222222','TapLex NFC Tag','taplex-nfc-tag','Tap-ready NFC tag connected to a customizable TapLex digital profile.',4000,'usd',0,0,1,NULL,'Gold TapLex NFC tag');
