// @ts-nocheck
import { 
  users, 
  tenants, 
  invoices, 
  auditLogs,
  type User, 
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Invoice,
  type InsertInvoice,
  type AuditLog,
  type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, avg, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsersByTenant(tenantId: number): Promise<User[]>;
  
  // Tenant methods
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantByApiKey(apiKey: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant>;
  deleteTenant(id: number): Promise<void>;
  getAllTenants(): Promise<Tenant[]>;
  
  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<void>;
  getInvoicesByTenant(tenantId: number, page: number, limit: number): Promise<Invoice[]>;
  
  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: number, page: number, limit: number): Promise<AuditLog[]>;
  
  // Dashboard methods
  getDashboardMetrics(tenantId: number): Promise<any>;
  getRecentActivity(tenantId: number): Promise<any[]>;
  
  // API usage methods
  getApiUsageStatistics(tenantId: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.apiKey, apiKey));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values(insertTenant)
      .returning();
    return tenant;
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<void> {
    await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id));
  }

  async getInvoicesByTenant(tenantId: number, page: number, limit: number): Promise<Invoice[]> {
    const offset = (page - 1) * limit;
    
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getAuditLogs(tenantId: number, page: number, limit: number): Promise<AuditLog[]> {
    const offset = (page - 1) * limit;
    
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getDashboardMetrics(tenantId: number): Promise<any> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    // Get total invoices for tenant
    const [totalResult] = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));
    
    // Get successful invoices
    const [successResult] = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'success')
      ));
    
    // Get invoices from last month for growth calculation
    const [lastMonthResult] = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.createdAt, lastMonth)
      ));
    
    // Get active tenants count (simplified - just return 1 for current tenant)
    const activeTenants = 1;
    
    const totalInvoices = totalResult.count;
    const successfulInvoices = successResult.count;
    const successRate = totalInvoices > 0 ? (successfulInvoices / totalInvoices) * 100 : 0;
    const totalGrowth = lastMonthResult.count > 0 ? ((totalInvoices - lastMonthResult.count) / lastMonthResult.count) * 100 : 0;
    
    return {
      totalInvoices,
      successRate: parseFloat(successRate.toFixed(1)),
      activeTenants,
      avgResponseTime: 245, // Mock value - would calculate from actual response times
      totalGrowth: parseFloat(totalGrowth.toFixed(1)),
      successGrowth: 2.1, // Mock value
      tenantGrowth: 8.3, // Mock value
      responseImprovement: 15 // Mock value
    };
  }

  async getRecentActivity(tenantId: number): Promise<any[]> {
    const recentInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        createdAt: invoices.createdAt,
        supplierTin: invoices.supplierTin
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt))
      .limit(10);
    
    return recentInvoices.map(invoice => ({
      id: invoice.id,
      invoiceId: invoice.invoiceNumber,
      tenant: `TIN: ${invoice.supplierTin}`,
      amount: parseFloat(invoice.totalAmount).toLocaleString(),
      status: invoice.status === 'success' ? 'success' : 
               invoice.status === 'pending' || invoice.status === 'validating' ? 'processing' : 'warning',
      statusText: invoice.status === 'success' ? 'Successfully submitted to FIRS' :
                  invoice.status === 'validating' ? 'Validating invoice format' :
                  invoice.status === 'pending' ? 'Processing invoice' :
                  'Validation warning',
      timestamp: this.getRelativeTime(invoice.createdAt)
    }));
  }

  async getApiUsageStatistics(tenantId: number): Promise<any[]> {
    try {
      // Get invoice submission count for the tenant (last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const [invoiceSubmissions] = await db
        .select({ count: count() })
        .from(invoices)
        .where(and(
          eq(invoices.tenantId, tenantId),
          gte(invoices.createdAt, last24Hours)
        ));

      // Get audit logs for API calls (last 24 hours)
      const apiCallsCount = await db
        .select({ 
          action: auditLogs.action,
          count: count()
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.timestamp, last24Hours)
        ))
        .groupBy(auditLogs.action);

      // Calculate progress percentages based on total calls
      const totalCalls = invoiceSubmissions.count + apiCallsCount.reduce((sum, item) => sum + item.count, 0);
      const maxCalls = Math.max(totalCalls, 100); // Ensure we have a reasonable max for progress calculation

      // Build usage statistics
      const usageStats = [
        {
          endpoint: "POST /api/invoices",
          calls: invoiceSubmissions.count,
          progress: totalCalls > 0 ? Math.min((invoiceSubmissions.count / maxCalls) * 100, 100) : 0,
          color: "bg-primary"
        }
      ];

      // Add other endpoints based on audit logs
      apiCallsCount.forEach((item) => {
        if (item.action !== 'submit') {
          usageStats.push({
            endpoint: `API ${item.action}`,
            calls: item.count,
            progress: totalCalls > 0 ? Math.min((item.count / maxCalls) * 100, 100) : 0,
            color: item.action === 'create_tenant' ? "bg-green-500" : "bg-blue-500"
          });
        }
      });

      return usageStats;
    } catch (error) {
      console.error("Error fetching API usage statistics:", error);
      // Return empty array on error
      return [];
    }
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }
}

export const storage = new DatabaseStorage();
