# Firestore Schema

All documents include `id`, `created_at`, and `updated_at` where useful. Server-owned collections should be written through the FastAPI backend or trusted admin workflows.

## users

- `uid`
- `email`
- `display_name`
- `roles`
- `status`
- `last_login_at`

## profiles

- `owner_uid`
- `username`
- `display_name`
- `business_name`
- `profession`
- `industry`
- `biography`
- `profile_photo_url`
- `cover_banner_url`
- `skills`
- `services_offered`
- `services_needed`
- `goals`
- `experience`
- `education`
- `certifications`
- `website`
- `portfolio`
- `phone`
- `email`
- `social_links`
- `business_hours`
- `appointment_links`
- `languages`
- `interests`
- `causes`
- `location`
- `privacy`
- `verification_status`
- `achievements`
- `rating_average`
- `review_count`
- `custom_links`
- `qr_code_url`
- `nfc_card_id`

## businesses

- `owner_uid`
- `name`
- `industry`
- `employees`
- `team_members`
- `locations`
- `services`
- `appointments`
- `business_hours`
- `portfolio`
- `reviews`
- `contact_information`
- `analytics`
- `verification_status`

## connections

- `requester_uid`
- `target_profile_id`
- `target_owner_uid`
- `status`
- `message`
- `created_at`
- `updated_at`

## messages

- `sender_uid`
- `recipient_uid`
- `body`
- `inquiry_type`
- `read_at`
- `report_status`
- `created_at`

## community_posts

- `author_uid`
- `post_type`
- `body`
- `media_urls`
- `tags`
- `visibility`
- `ranking_context`

## marketplace

- `seller_uid`
- `listing_type`
- `title`
- `description`
- `price_cents`
- `currency`
- `is_active`

## events

- `host_uid`
- `title`
- `description`
- `starts_at`
- `ends_at`
- `location`
- `virtual_url`
- `tags`

## reviews and ratings

- `author_uid`
- `target_profile_id`
- `target_business_id`
- `rating`
- `body`
- `verification_context`

## notifications

- `recipient_uid`
- `notification_type`
- `title`
- `body`
- `read_at`
- `resource_ref`

## subscriptions and payments

- `owner_uid`
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan`
- `status`
- `invoice_url`
- `receipt_url`
- `amount_cents`
- `currency`

## analytics

- `owner_uid`
- `profile_views`
- `nfc_taps`
- `qr_scans`
- `connection_requests`
- `marketplace_leads`
- `event_joins`
- `recommendation_accepts`

## nfc_tags

- `tag_id`
- `owner_uid`
- `profile_id`
- `chip_type`
- `status`
- `qr_backup_url`
- `transfer_history`

## qr_codes

- `owner_uid`
- `profile_id`
- `short_url`
- `scan_count`
- `last_scanned_at`

## recommendation_graph

- `profession`
- `complementary_professions`
- `confidence`
- `created_by`
- `updated_at`
