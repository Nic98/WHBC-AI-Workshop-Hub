CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity_created` ON `audit_logs` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `invite_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`code_salt` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_daily_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_project_daily_metrics_project_day` ON `project_daily_metrics` (`project_id`,`day`);--> statement-breakpoint
CREATE INDEX `idx_project_daily_metrics_day` ON `project_daily_metrics` (`day`);--> statement-breakpoint
CREATE TABLE `submission_rate_limits` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`window_started_at` integer NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_submission_rate_limits_blocked` ON `submission_rate_limits` (`blocked_until`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_code` text NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`creator_type` text NOT NULL,
	`creator_display_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`grade_id` text DEFAULT '' NOT NULL,
	`creator_role` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`categories_json` text DEFAULT '[]' NOT NULL,
	`technologies_json` text DEFAULT '[]' NOT NULL,
	`source_type` text NOT NULL,
	`external_url` text,
	`cover_alt` text NOT NULL,
	`test_instructions` text DEFAULT '' NOT NULL,
	`revision_reference` text,
	`original_filename` text,
	`manifest_json` text DEFAULT '[]' NOT NULL,
	`total_bytes` integer DEFAULT 0 NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`cover_key` text,
	`upload_token_hash` text,
	`upload_expires_at` integer,
	`rights_confirmed` integer DEFAULT false NOT NULL,
	`review_checklist_json` text DEFAULT '[]' NOT NULL,
	`notification_state` text DEFAULT 'pending' NOT NULL,
	`notification_error` text,
	`project_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`purge_after` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submissions_reference` ON `submissions` (`reference_code`);--> statement-breakpoint
CREATE INDEX `idx_submissions_status_created` ON `submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_submissions_purge_after` ON `submissions` (`purge_after`);--> statement-breakpoint
CREATE INDEX `idx_submissions_project` ON `submissions` (`project_id`);--> statement-breakpoint
ALTER TABLE `projects` ADD `source_submission_id` text;