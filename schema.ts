import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original users table kept for reference
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Agent table to store agent information
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(), // e.g. "GPT-4", "Claude", "Replit"
  name: text("name").notNull(),
  type: text("type").notNull(), // e.g. "editor", "reviewer"
  status: text("status").notNull().default("active"), // "active" or "inactive"
  metadata: jsonb("metadata"), // Additional agent-specific metadata (including permissions, model)
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Change requests table
export const changes = pgTable("changes", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.agentId, { onDelete: 'cascade' }), // Matches agents.agentId
  filePath: text("file_path").notNull(),
  diffContent: text("diff_content").notNull(), // Unified diff format
  originalContent: text("original_content"), // Original file content
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  metadata: jsonb("metadata"), // Additional information about the change
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Locks table
export const locks = pgTable("locks", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull().unique(),
  pattern: text("pattern"), // Optional regex pattern
  createdAt: timestamp("created_at").defaultNow(),
});

// Rate limiter logs
export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.agentId, { onDelete: 'cascade' }),
  requestCount: integer("request_count").notNull().default(0),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  isBlocked: boolean("is_blocked").notNull().default(false),
  limit: integer("limit").notNull().default(1000),
});

// File fingerprints
export const fingerprints = pgTable("fingerprints", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull().unique(),
  hash: text("hash").notNull(),
  lastModified: timestamp("last_modified").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true });
export const insertChangeSchema = createInsertSchema(changes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLockSchema = createInsertSchema(locks).omit({ id: true, createdAt: true });
export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({ id: true });
export const insertFingerprintSchema = createInsertSchema(fingerprints).omit({ id: true });

// Types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Change = typeof changes.$inferSelect;
export type InsertChange = z.infer<typeof insertChangeSchema>;

export type Lock = typeof locks.$inferSelect;
export type InsertLock = z.infer<typeof insertLockSchema>;

export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;

export type Fingerprint = typeof fingerprints.$inferSelect;
export type InsertFingerprint = z.infer<typeof insertFingerprintSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
