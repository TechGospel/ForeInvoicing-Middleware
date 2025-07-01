// @ts-nocheck
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertInvoiceSchema, insertAuditLogSchema } from "@shared/schema";
import { authMiddleware } from "./middleware/auth";
import { InvoiceValidator } from "./services/invoice-validator";
import { FirsAdapter } from "./services/firs-adapter";
import { AuditLogger } from "./services/audit-logger";
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
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Dashboard metrics (temporarily bypassing auth for demo)
  app.get("/api/dashboard/metrics", async (req: AuthRequest, res) => {
    try {
      const tenantId = 1; // Demo tenant
      const metrics = await storage.getDashboardMetrics(tenantId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Recent activity (temporarily bypassing auth for demo)
  app.get("/api/dashboard/activity", async (req: AuthRequest, res) => {
    try {
      const tenantId = 1; // Demo tenant
      const activity = await storage.getRecentActivity(tenantId);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // System status (temporarily bypassing auth for demo)
  app.get("/api/system/status", async (req, res) => {
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
  app.get("/api/tenants", async (req, res) => {
    try {
      // For demo, return all tenants
      const tenants = await db.select().from(require('../shared/schema').tenants);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.put("/api/tenants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await db.update(require('../shared/schema').tenants)
        .set({ ...updates, updatedAt: new Date() })
        .where(require('drizzle-orm').eq(require('../shared/schema').tenants.id, parseInt(id)));
      
      res.json({ message: "Tenant updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.post("/api/tenants/:id/regenerate-key", async (req, res) => {
    try {
      const { id } = req.params;
      const newApiKey = AuthService.generateApiKey();
      
      await db.update(require('../shared/schema').tenants)
        .set({ apiKey: newApiKey, updatedAt: new Date() })
        .where(require('drizzle-orm').eq(require('../shared/schema').tenants.id, parseInt(id)));
      
      res.json({ message: "API key regenerated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate API key" });
    }
  });

  app.get("/api/tenants/:id/users", async (req, res) => {
    try {
      const { id } = req.params;
      const users = await db.select()
        .from(require('../shared/schema').users)
        .where(require('drizzle-orm').eq(require('../shared/schema').users.tenantId, parseInt(id)));
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = req.body;
      const hashedPassword = await AuthService.hashPassword(userData.password);
      
      const [user] = await db.insert(require('../shared/schema').users)
        .values({
          ...userData,
          password: hashedPassword
        })
        .returning();
      
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
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
