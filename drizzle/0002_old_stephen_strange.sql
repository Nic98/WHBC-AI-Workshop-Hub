ALTER TABLE `projects` ADD `creator_type` text DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `creator_role` text;