import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    sourceType: text("source_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    studentName: text("student_name").notNull(),
    creatorType: text("creator_type").notNull().default("student"),
    creatorRole: text("creator_role"),
    gradeId: text("grade_id").notNull(),
    classId: text("class_id").notNull(),
    category: text("category").notNull(),
    categoriesJson: text("categories_json").notNull().default("[]"),
    technologiesJson: text("technologies_json").notNull().default("[]"),
    tagsJson: text("tags_json").notNull().default("[]"),
    status: text("status").notNull().default("draft"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    externalUrl: text("external_url"),
    embedMode: text("embed_mode").notNull().default("embedded"),
    coverKey: text("cover_key"),
    coverAlt: text("cover_alt").notNull(),
    draftVersionId: text("draft_version_id"),
    currentVersionId: text("current_version_id"),
    previousVersionId: text("previous_version_id"),
    sourceSubmissionId: text("source_submission_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => [
    uniqueIndex("idx_projects_slug").on(table.slug),
    index("idx_projects_public_order").on(table.status, table.featured, table.sortOrder),
    index("idx_projects_category_status").on(table.category, table.status),
  ],
);

export const projectVersions = sqliteTable(
  "project_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("staging"),
    entryPath: text("entry_path").notNull().default("index.html"),
    originalFilename: text("original_filename"),
    totalBytes: integer("total_bytes").notNull().default(0),
    fileCount: integer("file_count").notNull().default(0),
    manifestJson: text("manifest_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_project_versions_project").on(table.projectId, table.createdAt)],
);

export const gradeOptions = sqliteTable(
  "grade_options",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("idx_grade_options_label").on(table.label)],
);

export const classOptions = sqliteTable(
  "class_options",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("idx_class_options_label").on(table.label)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    idleExpiresAt: integer("idle_expires_at").notNull(),
    absoluteExpiresAt: integer("absolute_expires_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("idx_admin_sessions_token").on(table.tokenHash)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    keyHash: text("key_hash").primaryKey(),
    failures: integer("failures").notNull().default(0),
    windowStartedAt: integer("window_started_at").notNull(),
    blockedUntil: integer("blocked_until").notNull().default(0),
  },
  (table) => [index("idx_login_attempts_blocked").on(table.blockedUntil)],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    referenceCode: text("reference_code").notNull(),
    status: text("status").notNull().default("uploading"),
    creatorType: text("creator_type").notNull(),
    creatorDisplayName: text("creator_display_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    gradeId: text("grade_id").notNull().default(""),
    creatorRole: text("creator_role"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    categoriesJson: text("categories_json").notNull().default("[]"),
    technologiesJson: text("technologies_json").notNull().default("[]"),
    sourceType: text("source_type").notNull(),
    externalUrl: text("external_url"),
    coverAlt: text("cover_alt").notNull(),
    testInstructions: text("test_instructions").notNull().default(""),
    revisionReference: text("revision_reference"),
    originalFilename: text("original_filename"),
    manifestJson: text("manifest_json").notNull().default("[]"),
    totalBytes: integer("total_bytes").notNull().default(0),
    fileCount: integer("file_count").notNull().default(0),
    coverKey: text("cover_key"),
    uploadTokenHash: text("upload_token_hash"),
    uploadExpiresAt: integer("upload_expires_at"),
    rightsConfirmed: integer("rights_confirmed", { mode: "boolean" }).notNull().default(false),
    reviewChecklistJson: text("review_checklist_json").notNull().default("[]"),
    notificationState: text("notification_state").notNull().default("pending"),
    notificationError: text("notification_error"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
    purgeAfter: integer("purge_after"),
  },
  (table) => [
    uniqueIndex("idx_submissions_reference").on(table.referenceCode),
    index("idx_submissions_status_created").on(table.status, table.createdAt),
    index("idx_submissions_purge_after").on(table.purgeAfter),
    index("idx_submissions_project").on(table.projectId),
  ],
);

export const inviteSettings = sqliteTable("invite_settings", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").notNull(),
  codeSalt: text("code_salt").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const submissionRateLimits = sqliteTable(
  "submission_rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    failures: integer("failures").notNull().default(0),
    completed: integer("completed").notNull().default(0),
    windowStartedAt: integer("window_started_at").notNull(),
    blockedUntil: integer("blocked_until").notNull().default(0),
  },
  (table) => [index("idx_submission_rate_limits_blocked").on(table.blockedUntil)],
);

export const projectDailyMetrics = sqliteTable(
  "project_daily_metrics",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    views: integer("views").notNull().default(0),
  },
  (table) => [
    uniqueIndex("idx_project_daily_metrics_project_day").on(table.projectId, table.day),
    index("idx_project_daily_metrics_day").on(table.day),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    detailsJson: text("details_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_audit_logs_entity_created").on(table.entityType, table.entityId, table.createdAt)],
);
