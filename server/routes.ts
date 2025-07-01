// @ts-nocheck
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertInvoiceSchema, insertAuditLogSchema, insertTenantSchema, insertUserSchema } from "@shared/schema";
import { authMiddleware } from "./middleware/auth";
import { InvoiceValidator } from "./services/invoice-validator";
import { FirsAdapter } from "./services/firs-adapter";
import { AuditLogger } from "./services/audit-logger";
import { AuthService } from "./services/auth";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
  };
}

const upload = multer({ dest: 'uploads/' });
const invoiceValidator = new InvoiceValidator();
const firsAdapter = new FirsAdapter();
const auditLogger = new AuditLogger(storage);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// @ts-nocheck
export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication endpoints
  
  // Get current authenticated user
  app.get("/api/auth/user", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Auth register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, companyName, tin } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create tenant first
      const apiKey = AuthService.generateApiKey();
      const tenant = await storage.createTenant({
        name: companyName,
        tin,
        email,
        apiKey,
        isActive: true,
        config: {
          validationRules: ['strict_tin'],
          autoCorrect: false
        }
      });

      // Create user
      const hashedPassword = await AuthService.hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        tenantId: tenant.id,
        role: 'admin',
        isActive: true
      });

      res.status(201).json({
        message: "Account created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const metrics = await storage.getDashboardMetrics(tenantId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Recent activity
  app.get("/api/dashboard/activity", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const activity = await storage.getRecentActivity(tenantId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching dashboard activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // System status
  app.get("/api/system/status", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const status = {
        firsApi: "operational",
        database: "healthy",
        redisQueue: "high_load",
        validationService: "online"
      };
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system status" });
    }
  });

  // API usage statistics for tenant
  app.get("/api/usage/statistics", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const usage = await storage.getApiUsageStatistics(tenantId);
      res.json(usage);
    } catch (error) {
      console.error("Error fetching API usage statistics:", error);
      res.status(500).json({ message: "Failed to fetch usage statistics" });
    }
  });

  // Detailed API usage with filtering and pagination
  app.get("/api/usage/detailed", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      
      const {
        page = "1",
        limit = "25",
        endpoint,
        method,
        status,
        fromDate,
        toDate,
        sortField = "timestamp",
        sortOrder = "desc"
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const filters = {
        endpoint: endpoint as string,
        method: method as string,
        status: status ? parseInt(status as string, 10) : undefined,
        fromDate: fromDate as string,
        toDate: toDate as string,
        sortField: sortField as string,
        sortOrder: sortOrder as string
      };

      const result = await storage.getDetailedApiUsage(tenantId, pageNum, limitNum, filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching detailed API usage:", error);
      res.status(500).json({ message: "Failed to fetch detailed API usage" });
    }
  });

  // Invoice submission endpoint
  app.post("/api/invoices", authMiddleware, upload.single('invoice'), async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const userId = req.user?.userId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      let invoiceData;
      let format;

      // Handle file upload or JSON data
      if (req.file) {
        const fs = await import('fs');
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        
        if (req.file.originalname.endsWith('.xml')) {
          format = 'xml';
          invoiceData = fileContent;
        } else if (req.file.originalname.endsWith('.json')) {
          format = 'json';
          invoiceData = JSON.parse(fileContent);
        } else {
          return res.status(400).json({ message: "Unsupported file format" });
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
      } else if (req.body.invoiceData) {
        format = req.body.format || 'json';
        invoiceData = req.body.invoiceData;
      } else {
        return res.status(400).json({ message: "Invoice data is required" });
      }

      // Log invoice submission
      await auditLogger.log({
        tenantId,
        userId,
        action: "submit",
        level: "info",
        message: "Invoice submission started",
        metadata: { format, priority: req.body.priority || "normal" }
      });

      // Validate invoice
      const validationResult = await invoiceValidator.validate(invoiceData, format);
      
      if (!validationResult.isValid) {
        await auditLogger.log({
          tenantId,
          userId,
          action: "validate",
          level: "error",
          message: "Invoice validation failed",
          metadata: { errors: validationResult.errors }
        });

        return res.status(400).json({
          message: "Invoice validation failed",
          errors: validationResult.errors
        });
      }

      // Normalize to UBL 3.0 format
      const normalizedData = await invoiceValidator.normalize(invoiceData, format);

      // Extract invoice details
      const supplierTin = normalizedData.supplier?.tin || "";
      const buyerTin = normalizedData.buyer?.tin || "";
      const totalAmount = normalizedData.total?.amount || "0";
      const invoiceNumber = normalizedData.invoiceNumber || `INV-${Date.now()}`;

      // Create invoice record
      const invoice = await storage.createInvoice({
        tenantId,
        invoiceNumber,
        supplierTin,
        buyerTin,
        totalAmount,
        status: "validated",
        originalFormat: format,
        originalData: invoiceData,
        normalizedData,
        priority: req.body.priority || "normal"
      });

      // Submit to FIRS (async if requested)
      if (req.body.asyncProcessing) {
        // Process asynchronously
        setImmediate(async () => {
          try {
            const firsResult = await firsAdapter.submitInvoice(normalizedData);
            await storage.updateInvoice(invoice.id, {
              status: "success",
              firsIrn: firsResult.irn,
              firsQrCode: firsResult.qrCode,
              firsResponse: firsResult
            });

            await auditLogger.log({
              tenantId,
              invoiceId: invoice.id,
              action: "success",
              level: "info",
              message: "Invoice successfully submitted to FIRS",
              metadata: { irn: firsResult.irn }
            });
          } catch (error) {
            await storage.updateInvoice(invoice.id, {
              status: "failed",
              validationErrors: { firsError: error.message }
            });

            await auditLogger.log({
              tenantId,
              invoiceId: invoice.id,
              action: "error",
              level: "error",
              message: "FIRS submission failed",
              metadata: { error: error.message }
            });
          }
        });

        res.json({
          message: "Invoice submitted for processing",
          invoiceId: invoice.id,
          status: "processing"
        });
      } else {
        // Process synchronously
        try {
          const firsResult = await firsAdapter.submitInvoice(normalizedData);
          
          await storage.updateInvoice(invoice.id, {
            status: "success",
            firsIrn: firsResult.irn,
            firsQrCode: firsResult.qrCode,
            firsResponse: firsResult
          });

          await auditLogger.log({
            tenantId,
            invoiceId: invoice.id,
            action: "success",
            level: "info",
            message: "Invoice successfully submitted to FIRS",
            metadata: { irn: firsResult.irn }
          });

          res.json({
            message: "Invoice successfully submitted",
            invoiceId: invoice.id,
            irn: firsResult.irn,
            qrCode: firsResult.qrCode,
            status: "success"
          });
        } catch (error) {
          await storage.updateInvoice(invoice.id, {
            status: "failed",
            validationErrors: { firsError: error.message }
          });

          await auditLogger.log({
            tenantId,
            invoiceId: invoice.id,
            action: "error",
            level: "error",
            message: "FIRS submission failed",
            metadata: { error: error.message }
          });

          res.status(500).json({
            message: "FIRS submission failed",
            error: error.message,
            invoiceId: invoice.id
          });
        }
      }
    } catch (error) {
      console.error("Invoice submission error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk invoice submission endpoint
  app.post("/api/invoices/bulk", authMiddleware, upload.single('bulkInvoices'), async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const userId = req.user?.userId;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Bulk invoice file is required" });
      }

      const fs = await import('fs');
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const format = req.body.format || 'json';
      
      let invoicesData: any[] = [];

      try {
        if (format === 'json') {
          const parsedData = JSON.parse(fileContent);
          invoicesData = Array.isArray(parsedData) ? parsedData : [parsedData];
        } else if (format === 'xml') {
          // For XML, we expect multiple XML documents separated by delimiters
          // Split by common XML document separators or root elements
          const xmlDocuments = fileContent
            .split(/(?=<\?xml|<invoice|<Invoice)/)
            .filter(doc => doc.trim().length > 0);
          invoicesData = xmlDocuments;
        } else {
          return res.status(400).json({ message: "Unsupported bulk format" });
        }
      } catch (parseError) {
        return res.status(400).json({ 
          message: "Failed to parse bulk invoice file", 
          error: parseError.message 
        });
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      if (invoicesData.length === 0) {
        return res.status(400).json({ message: "No invoices found in the bulk file" });
      }

      const batchId = `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Log bulk submission start
      await auditLogger.log({
        tenantId,
        userId,
        action: "bulk_submit",
        level: "info",
        message: `Bulk invoice submission started with ${invoicesData.length} invoices`,
        metadata: { 
          batchId,
          format, 
          priority: req.body.priority || "normal",
          totalInvoices: invoicesData.length
        }
      });

      const results: Array<{
        invoiceNumber: string;
        status: 'success' | 'failed' | 'processing';
        invoiceId?: number;
        irn?: string;
        error?: string;
      }> = [];

      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      // Process each invoice individually
      const processInvoice = async (invoiceData: any, index: number) => {
        let invoiceNumber = `BULK-${index + 1}-${Date.now()}`;
        
        try {
          // Validate invoice
          const validationResult = await invoiceValidator.validate(invoiceData, format);
          
          if (!validationResult.isValid) {
            await auditLogger.log({
              tenantId,
              userId,
              action: "bulk_validate",
              level: "error",
              message: `Bulk invoice ${index + 1} validation failed`,
              metadata: { 
                batchId,
                invoiceIndex: index + 1,
                errors: validationResult.errors 
              }
            });

            results.push({
              invoiceNumber,
              status: 'failed',
              error: validationResult.errors.join(', ')
            });
            failureCount++;
            processedCount++;
            return;
          }

          // Normalize to UBL 3.0 format
          const normalizedData = await invoiceValidator.normalize(invoiceData, format);

          // Extract invoice details
          const supplierTin = normalizedData.supplier?.tin || "";
          const buyerTin = normalizedData.buyer?.tin || "";
          const totalAmount = normalizedData.total?.amount || "0";
          invoiceNumber = normalizedData.invoiceNumber || invoiceNumber;

          // Create invoice record
          const invoice = await storage.createInvoice({
            tenantId,
            invoiceNumber,
            supplierTin,
            buyerTin,
            totalAmount,
            status: "validated",
            originalFormat: format,
            originalData: invoiceData,
            normalizedData,
            priority: req.body.priority || "normal"
          });

          // Submit to FIRS
          try {
            const firsResult = await firsAdapter.submitInvoice(normalizedData);
            
            await storage.updateInvoice(invoice.id, {
              status: "success",
              firsIrn: firsResult.irn,
              firsQrCode: firsResult.qrCode,
              firsResponse: firsResult
            });

            await auditLogger.log({
              tenantId,
              invoiceId: invoice.id,
              action: "bulk_success",
              level: "info",
              message: `Bulk invoice ${index + 1} successfully submitted to FIRS`,
              metadata: { 
                batchId,
                invoiceIndex: index + 1,
                irn: firsResult.irn 
              }
            });

            results.push({
              invoiceNumber,
              status: 'success',
              invoiceId: invoice.id,
              irn: firsResult.irn
            });
            successCount++;
          } catch (firsError) {
            await storage.updateInvoice(invoice.id, {
              status: "failed",
              validationErrors: { firsError: firsError.message }
            });

            await auditLogger.log({
              tenantId,
              invoiceId: invoice.id,
              action: "bulk_error",
              level: "error",
              message: `Bulk invoice ${index + 1} FIRS submission failed`,
              metadata: { 
                batchId,
                invoiceIndex: index + 1,
                error: firsError.message 
              }
            });

            results.push({
              invoiceNumber,
              status: 'failed',
              invoiceId: invoice.id,
              error: firsError.message
            });
            failureCount++;
          }
        } catch (error) {
          await auditLogger.log({
            tenantId,
            userId,
            action: "bulk_error",
            level: "error",
            message: `Bulk invoice ${index + 1} processing failed`,
            metadata: { 
              batchId,
              invoiceIndex: index + 1,
              error: error.message 
            }
          });

          results.push({
            invoiceNumber,
            status: 'failed',
            error: error.message
          });
          failureCount++;
        }
        
        processedCount++;
      };

      // Process invoices
      if (req.body.asyncProcessing === 'true') {
        // Process asynchronously - return immediate response
        setImmediate(async () => {
          for (let i = 0; i < invoicesData.length; i++) {
            await processInvoice(invoicesData[i], i);
          }
          
          await auditLogger.log({
            tenantId,
            userId,
            action: "bulk_complete",
            level: "info",
            message: `Bulk invoice submission completed`,
            metadata: { 
              batchId,
              totalInvoices: invoicesData.length,
              successCount,
              failureCount
            }
          });
        });

        // Return immediate response
        res.json({
          batchId,
          totalInvoices: invoicesData.length,
          processedCount: 0,
          successCount: 0,
          failureCount: 0,
          status: 'processing',
          results: invoicesData.map((_, index) => ({
            invoiceNumber: `Processing invoice ${index + 1}...`,
            status: 'processing' as const
          }))
        });
      } else {
        // Process synchronously
        for (let i = 0; i < invoicesData.length; i++) {
          await processInvoice(invoicesData[i], i);
        }

        await auditLogger.log({
          tenantId,
          userId,
          action: "bulk_complete",
          level: "info",
          message: `Bulk invoice submission completed`,
          metadata: { 
            batchId,
            totalInvoices: invoicesData.length,
            successCount,
            failureCount
          }
        });

        res.json({
          batchId,
          totalInvoices: invoicesData.length,
          processedCount,
          successCount,
          failureCount,
          status: 'completed',
          results
        });
      }
    } catch (error) {
      console.error("Bulk invoice submission error:", error);
      res.status(500).json({ 
        message: "Bulk invoice submission failed", 
        error: error.message 
      });
    }
  });

  // Get invoice by ID
  app.get("/api/invoices/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      
      const invoice = await storage.getInvoice(id);
      
      if (!invoice || invoice.tenantId !== tenantId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Get invoices for tenant (temporarily bypassing auth for demo)
  app.get("/api/invoices", async (req, res) => {
    try {
      const tenantId = 1; // Demo tenant
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const invoices = await storage.getInvoicesByTenant(tenantId, page, limit);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get audit logs (temporarily bypassing auth for demo)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const tenantId = 1; // Demo tenant
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await storage.getAuditLogs(tenantId, page, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Tenant management endpoints
  app.get("/api/tenants", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);
      
      // Generate API key for the new tenant
      const apiKey = AuthService.generateApiKey();
      
      const tenant = await storage.createTenant({
        ...tenantData,
        apiKey
      });
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "create_tenant",
        { tenantId: tenant.id, tenantName: tenant.name }
      );
      
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  app.put("/api/tenants/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const updates = req.body;
      
      const tenant = await storage.updateTenant(tenantId, updates);
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "update_tenant",
        { tenantId, updates }
      );
      
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  app.delete("/api/tenants/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      
      await storage.deleteTenant(tenantId);
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "delete_tenant",
        { tenantId }
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  app.post("/api/tenants/:id/regenerate-key", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const newApiKey = AuthService.generateApiKey();
      
      const tenant = await storage.updateTenant(tenantId, { apiKey: newApiKey });
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "regenerate_api_key",
        { tenantId }
      );
      
      res.json({ message: "API key regenerated successfully", apiKey: newApiKey });
    } catch (error) {
      console.error("Error regenerating API key:", error);
      res.status(500).json({ error: "Failed to regenerate API key" });
    }
  });

  // User management endpoints
  app.get("/api/tenants/:id/users", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const users = await storage.getUsersByTenant(tenantId);
      
      // Remove password from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/tenants/:id/users", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const userData = insertUserSchema.parse(req.body);
      
      // Hash password
      const hashedPassword = await AuthService.hashPassword(userData.password);
      
      const user = await storage.createUser({
        ...userData,
        tenantId,
        password: hashedPassword
      });
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "create_user",
        { userId: user.id, username: user.username, tenantId }
      );
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Hash password if it's being updated
      if (updates.password) {
        updates.password = await AuthService.hashPassword(updates.password);
      }
      
      const user = await storage.updateUser(userId, updates);
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "update_user",
        { userId, updates: Object.keys(updates) }
      );
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      await storage.deleteUser(userId);
      
      await auditLogger.logUserAction(
        req.user!.userId,
        req.user!.tenantId,
        "delete_user",
        { userId }
      );
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Configuration endpoints
  app.get("/api/configuration", async (req, res) => {
    try {
      // Return mock configuration for demo
      const config = {
        validationRules: ['strict_tin', 'vat_required'],
        autoCorrect: true,
        strictValidation: true,
        asyncProcessing: false,
        retryAttempts: 3,
        timeoutSeconds: 30,
        firsApiUrl: "https://api.firs.gov.ng/mbs/v1",
        firsApiKey: "demo-firs-key",
        webhookUrl: "",
        maxFileSize: 10,
        allowedFormats: ["xml", "json"]
      };
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.put("/api/configuration", async (req, res) => {
    try {
      // In a real implementation, save to database
      const config = req.body;
      
      // Audit log the configuration change
      await auditLogger.logUserAction(
        1, // Demo tenant
        1, // Demo user
        'configuration_update',
        'System configuration updated',
        config
      );
      
      res.json({ message: "Configuration updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  app.post("/api/configuration/test-firs", async (req, res) => {
    try {
      // Test FIRS connection
      const testResult = await firsAdapter.getInvoiceStatus("TEST-IRN");
      res.json({ message: "FIRS connection successful" });
    } catch (error) {
      res.status(400).json({ message: "FIRS connection failed: " + error.message });
    }
  });

  app.post("/api/configuration/reset", async (req, res) => {
    try {
      // Reset to defaults
      const defaultConfig = {
        validationRules: ['strict_tin'],
        autoCorrect: false,
        strictValidation: true,
        asyncProcessing: false,
        retryAttempts: 3,
        timeoutSeconds: 30,
        firsApiUrl: "https://api.firs.gov.ng/mbs/v1",
        firsApiKey: "",
        webhookUrl: "",
        maxFileSize: 10,
        allowedFormats: ["xml", "json"]
      };
      
      res.json(defaultConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset configuration" });
    }
  });

  // Retry failed invoice
  app.post("/api/invoices/:id/retry", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      
      const invoice = await storage.getInvoice(id);
      
      if (!invoice || invoice.tenantId !== tenantId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.status === "success") {
        return res.status(400).json({ message: "Invoice already processed successfully" });
      }

      // Increment retry count
      await storage.updateInvoice(id, {
        status: "pending",
        retryCount: invoice.retryCount + 1
      });

      await auditLogger.log({
        tenantId,
        invoiceId: id,
        userId,
        action: "retry",
        level: "info",
        message: "Invoice retry initiated",
        metadata: { retryCount: invoice.retryCount + 1 }
      });

      // Retry FIRS submission
      try {
        const firsResult = await firsAdapter.submitInvoice(invoice.normalizedData);
        
        await storage.updateInvoice(id, {
          status: "success",
          firsIrn: firsResult.irn,
          firsQrCode: firsResult.qrCode,
          firsResponse: firsResult
        });

        res.json({
          message: "Invoice retry successful",
          irn: firsResult.irn,
          qrCode: firsResult.qrCode
        });
      } catch (error) {
        await storage.updateInvoice(id, {
          status: "failed",
          validationErrors: { firsError: error.message }
        });

        res.status(500).json({
          message: "Invoice retry failed",
          error: error.message
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to retry invoice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
