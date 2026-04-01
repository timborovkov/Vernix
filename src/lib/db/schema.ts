import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  boolean,
  unique,
  numeric,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro"]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "pending",
  "joining",
  "active",
  "processing",
  "completed",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  image: text("image"),
  // Billing
  plan: planEnum("plan").default("free").notNull(),
  polarCustomerId: text("polar_customer_id"),
  polarSubscriptionId: text("polar_subscription_id"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  lastUpgradeReminderSentAt: timestamp("last_upgrade_reminder_sent_at", {
    withTimezone: true,
  }),
  lastRetentionEmailSentAt: timestamp("last_retention_email_sent_at", {
    withTimezone: true,
  }),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  timezone: text("timezone"), // IANA timezone e.g. "America/New_York", null = browser auto
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.provider, table.providerAccountId)]
);

export type Account = typeof accounts.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").notNull(),
  joinLink: text("join_link").notNull(),
  status: meetingStatusEnum("status").default("pending").notNull(),
  qdrantCollectionName: text("qdrant_collection_name").notNull(),
  participants: jsonb("participants").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

export const documentStatusEnum = pgEnum("document_status", [
  "processing",
  "ready",
  "failed",
]);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  meetingId: uuid("meeting_id").references(() => meetings.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  s3Key: text("s3_key").notNull(),
  status: documentStatusEnum("status").default("processing").notNull(),
  chunkCount: integer("chunk_count").default(0).notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export const taskStatusEnum = pgEnum("task_status", ["open", "completed"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  assignee: text("assignee"),
  autoExtracted: boolean("auto_extracted").default(false).notNull(),
  sourceText: text("source_text"), // transcript snippet that triggered the task
  sourceTimestampMs: integer("source_timestamp_ms"), // ms from meeting start
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: taskStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Task = typeof tasks.$inferSelect;

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;

export const mcpServers = pgTable("mcp_servers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  apiKey: text("api_key"), // legacy — use authHeaderValue instead
  authType: text("auth_type").default("none").notNull(), // none | bearer | header | basic | oauth | url_key
  authHeaderName: text("auth_header_name"), // for 'header' mode (e.g. "X-API-Key")
  authHeaderValue: text("auth_header_value"), // for 'bearer', 'header', and 'url_key' modes
  authKeyParam: text("auth_key_param"), // for 'url_key' mode: URL query param name (e.g. "exaApiKey")
  authUsername: text("auth_username"), // for 'basic' mode
  authPassword: text("auth_password"), // for 'basic' mode
  catalogIntegrationId: text("catalog_integration_id"), // links to catalog id (e.g. "slack")
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type McpServer = typeof mcpServers.$inferSelect;

// ---------------------------------------------------------------------------
// OAuth tokens for MCP servers
// ---------------------------------------------------------------------------

export const mcpOauthTokens = pgTable("mcp_oauth_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  mcpServerId: uuid("mcp_server_id")
    .references(() => mcpServers.id, { onDelete: "cascade" })
    .notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  clientIdIssuedAt: timestamp("client_id_issued_at", { withTimezone: true }),
  clientSecretExpiresAt: timestamp("client_secret_expires_at", {
    withTimezone: true,
  }),
  codeVerifier: text("code_verifier"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type McpOauthToken = typeof mcpOauthTokens.$inferSelect;

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

export const usageEventTypeEnum = pgEnum("usage_event_type", [
  "voice_meeting",
  "silent_meeting",
  "rag_query",
  "api_request",
  "doc_upload",
]);

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  meetingId: uuid("meeting_id").references(() => meetings.id, {
    onDelete: "set null",
  }),
  type: usageEventTypeEnum("type").notNull(),
  /** Duration in minutes (for meetings) or count (for queries/requests) */
  quantity: numeric("quantity", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  /** Cost in EUR for this event */
  costEur: numeric("cost_eur", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  polarSyncedAt: timestamp("polar_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UsageEvent = typeof usageEvents.$inferSelect;
