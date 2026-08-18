CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`idle_expires_at` integer NOT NULL,
	`absolute_expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_sessions_token` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `class_options` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_class_options_label` ON `class_options` (`label`);--> statement-breakpoint
CREATE TABLE `grade_options` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_grade_options_label` ON `grade_options` (`label`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`window_started_at` integer NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_login_attempts_blocked` ON `login_attempts` (`blocked_until`);--> statement-breakpoint
CREATE TABLE `project_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`state` text DEFAULT 'staging' NOT NULL,
	`entry_path` text DEFAULT 'index.html' NOT NULL,
	`original_filename` text,
	`total_bytes` integer DEFAULT 0 NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`manifest_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_project_versions_project` ON `project_versions` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`student_name` text NOT NULL,
	`grade_id` text NOT NULL,
	`class_id` text NOT NULL,
	`category` text NOT NULL,
	`technologies_json` text DEFAULT '[]' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`external_url` text,
	`embed_mode` text DEFAULT 'embedded' NOT NULL,
	`cover_key` text,
	`cover_alt` text NOT NULL,
	`draft_version_id` text,
	`current_version_id` text,
	`previous_version_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_slug` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_projects_public_order` ON `projects` (`status`,`featured`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_projects_category_status` ON `projects` (`category`,`status`);
--> statement-breakpoint
PRAGMA optimize;
