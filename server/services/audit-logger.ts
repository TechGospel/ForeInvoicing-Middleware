import { InsertAuditLog } from "@shared/schema";

interface IStorage {
  createAuditLog(log: InsertAuditLog): Promise<any>;
}

export class AuditLogger {
  constructor(private storage: IStorage) {}
  
  async log(logData: Omit<InsertAuditLog, 'timestamp'>): Promise<void> {
    try {
      await this.storage.createAuditLog({
        ...logData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
      // Don't throw - audit logging should not break the main flow
    }
  }
  
  async logInvoiceSubmission(
    tenantId: number,
    userId: number | null,
    invoiceId: number,
    metadata: any
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      invoiceId,
      action: "submit",
      level: "info",
      message: "Invoice submitted for processing",
      metadata
    });
  }
  
  async logValidationError(
    tenantId: number,
    userId: number | null,
    invoiceId: number | null,
    errors: string[]
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      invoiceId,
      action: "validate",
      level: "error",
      message: "Invoice validation failed",
      metadata: { errors }
    });
  }
  
  async logFirsSubmission(
    tenantId: number,
    invoiceId: number,
    irn: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      invoiceId,
      action: success ? "success" : "error",
      level: success ? "info" : "error",
      message: success ? "Invoice successfully submitted to FIRS" : "FIRS submission failed",
      metadata: success ? { irn } : { error }
    });
  }
  
  async logUserAction(
    tenantId: number,
    userId: number,
    action: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      level: "info",
      message,
      metadata
    });
  }
}
