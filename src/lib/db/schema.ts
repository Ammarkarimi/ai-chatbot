import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  vector,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const EMBEDDING_DIMENSIONS = 768;

export const planEnum = pgEnum("plan", ["free", "pro", "business"]);
export const providerEnum = pgEnum("provider", ["groq", "gemini"]);
export const docStatusEnum = pgEnum("doc_status", ["uploading", "processing", "ready", "error"]);
export const tokenTypeEnum = pgEnum("email_token_type", ["verify_email", "reset_password"]);
export const roleEnum = pgEnum("message_role", ["user", "assistant"]);
export const positionEnum = pgEnum("widget_position", ["right", "left"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  // Sessions issued before this moment are rejected (set on password reset).
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bots = pgTable(
  "bots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Extra instructions from the customer (tone, persona, rules).
    instructions: text("instructions").notNull().default(""),
    welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help you today?"),
    primaryColor: text("primary_color").notNull().default("#4f46e5"),
    position: positionEnum("position").notNull().default("right"),
    provider: providerEnum("provider").notNull().default("gemini"),
    // Empty string means "use the platform default for the provider".
    model: text("model").notNull().default(""),
    temperature: real("temperature").notNull().default(0.3),
    // Websites allowed to embed the bot, e.g. ["example.com", "*.shop.io"]. Empty = any site.
    allowedDomains: text("allowed_domains").array().notNull().default(sql`'{}'::text[]`),
    // Max questions one visitor may ask per day.
    visitorDailyLimit: integer("visitor_daily_limit").notNull().default(50),
    // Optional customer-supplied keys, AES-256-GCM encrypted.
    geminiApiKeyEnc: text("gemini_api_key_enc"),
    groqApiKeyEnc: text("groq_api_key_enc"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bots_user_idx").on(t.userId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    // Object key while a direct-to-storage upload is pending processing.
    storageKey: text("storage_key"),
    charCount: integer("char_count").notNull().default(0),
    chunkCount: integer("chunk_count").notNull().default(0),
    status: docStatusEnum("status").notNull().default("processing"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_bot_idx").on(t.botId)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (t) => [
    index("chunks_bot_idx").on(t.botId),
    index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    // Anonymous id stored in the visitor's browser.
    visitorId: text("visitor_id").notNull(),
    source: text("source").notNull().default("widget"), // "widget" | "playground"
    pageUrl: text("page_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_bot_idx").on(t.botId, t.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    // Denormalized so usage/analytics queries don't need a join.
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
    index("messages_user_created_idx").on(t.userId, t.createdAt),
    index("messages_bot_created_idx").on(t.botId, t.createdAt),
  ],
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: tokenTypeEnum("type").notNull(),
    // sha256 of the token; the raw token only ever exists in the email link.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_tokens_user_idx").on(t.userId, t.type)],
);

// Fixed-window counters for rate limiting (shared across serverless instances).
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_expires_idx").on(t.expiresAt)],
);

export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
