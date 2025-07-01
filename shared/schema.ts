import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tin: varchar("tin", { length: 15 }).notNull().unique(),
  email: text("email").notNull(),
  apiKey: text("api_key").notNull().unique(),
  isActive: boolean("is_active").default(true),
  config: jsonb("config"), // tenant-specific validation rules and settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  role: text("role").notNull().default("user"), // admin, user
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  invoiceNumber: text("invoice_number").notNull(),
  supplierTin: varchar("supplier_tin", { length: 15 }).notNull(),
  buyerTin: varchar("buyer_tin", { length: 15 }).notNull(),
  totalAmount: text("total_amount").notNull(), // stored as string to avoid precision issues
  currency: varchar("currency", { length: 3 }).default("NGN"),
  status: text("status").notNull().default("pending"), // pending, validating, validated, submitted, success, failed
  originalFormat: text("original_format").notNull(), // xml, json
  originalData: jsonb("original_data").notNull(),
  normalizedData: jsonb("normalized_data"), // UBL 3.0 XML as JSON
  firsIrn: text("firs_irn"), // Invoice Reference Number from FIRS
  firsQrCode: text("firs_qr_code"),
  firsResponse: jsonb("firs_response"),
  validationErrors: jsonb("validation_errors"),
  retryCount: integer("retry_count").default(0),
  priority: text("priority").default("normal"), // normal, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // submit, validate, retry, success, error
  level: text("level").notNull(), // info, warning, error
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // additional context data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  invoices: many(invoices),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  auditLogs: many(auditLogs),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  invoice: one(invoices, {
    fields: [auditLogs.invoiceId],
    references: [invoices.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  apiKey: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
