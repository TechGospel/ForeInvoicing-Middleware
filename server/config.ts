/**
 * Application configuration module
 * Centralizes environment variable handling with type safety and validation
 */

export interface AppConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  host: string;
  
  // Database Configuration
  databaseUrl: string;
  dbPoolSize: number;
  dbConnectionTimeout: number;
  
  // Security Configuration
  jwtSecret: string;
  sessionSecret: string;
  corsOrigins: string[];
  trustedProxies: string[];
  
  // FIRS API Configuration
  firsApiUrl: string;
  firsApiKey: string | null;
  firsTimeout: number;
  firsRetryAttempts: number;
  enableFirsSubmission: boolean;
  
  // File Upload Configuration
  maxFileSize: number;
  uploadPath: string;
  uploadDir: string;
  
  // Validation Configuration
  strictValidation: boolean;
  enableTinValidation: boolean;
  enableDetailedErrors: boolean;
  
  // Rate Limiting Configuration
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // Logging Configuration
  logLevel: string;
  enableRequestLogging: boolean;
  enableDebugMode: boolean;
  
  // Email Configuration
  smtp: {
    host: string;
    port: number;
    user: string | null;
    password: string | null;
    from: string;
  };
  
  // Audit and Compliance
  auditLogRetentionDays: number;
  enableAuditLogging: boolean;
  
  // Multi-tenant Configuration
  defaultTenantId: number;
  enableTenantIsolation: boolean;
  
  // Backup Configuration
  backupEnabled: boolean;
  backupRetentionDays: number;
  backupSchedule: string;
  
  // Health Check Configuration
  healthCheckInterval: number;
}

/**
 * Validates required environment variables
 */
function validateRequiredEnvVars(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Required in production only
  if (nodeEnv === 'production') {
    const required = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SESSION_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables for production: ${missing.join(', ')}`);
    }
  }
  
  // Validate JWT_SECRET length if provided
  const jwtSecret = process.env.JWT_SECRET || generateDefaultSecret('jwt');
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
  }
  
  // Validate SESSION_SECRET length if provided
  const sessionSecret = process.env.SESSION_SECRET || generateDefaultSecret('session');
  if (sessionSecret && sessionSecret.length < 32) {
    console.warn('⚠️  SESSION_SECRET should be at least 32 characters long for security');
  }
}

/**
 * Generates a default secret for development
 */
function generateDefaultSecret(type: string): string {
  return `development-${type}-secret-change-this-in-production-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Parses comma-separated string into array
 */
function parseStringArray(value: string | undefined, defaultValue: string[] = []): string[] {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Parses boolean environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parses integer environment variable
 */
function parseInteger(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Creates and validates application configuration
 */
function createConfig(): AppConfig {
  // Validate required environment variables first
  validateRequiredEnvVars();
  
  return {
    // Server Configuration
    port: parseInteger(process.env.PORT, 5000),
    nodeEnv: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    
    // Database Configuration
    databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/firs_db',
    dbPoolSize: parseInteger(process.env.DB_POOL_SIZE, 10),
    dbConnectionTimeout: parseInteger(process.env.DB_CONNECTION_TIMEOUT, 5000),
    
    // Security Configuration
    jwtSecret: process.env.JWT_SECRET || generateDefaultSecret('jwt'),
    sessionSecret: process.env.SESSION_SECRET || generateDefaultSecret('session'),
    corsOrigins: parseStringArray(process.env.ALLOWED_ORIGINS, ['http://localhost:5000']),
    trustedProxies: parseStringArray(process.env.TRUSTED_PROXIES, ['127.0.0.1']),
    
    // FIRS API Configuration
    firsApiUrl: process.env.FIRS_API_URL || 'https://einvoice.firs.gov.ng/api/v1',
    firsApiKey: process.env.FIRS_API_KEY || null,
    firsTimeout: parseInteger(process.env.FIRS_TIMEOUT, 30000),
    firsRetryAttempts: parseInteger(process.env.FIRS_RETRY_ATTEMPTS, 3),
    enableFirsSubmission: parseBoolean(process.env.ENABLE_FIRS_SUBMISSION, false),
    
    // File Upload Configuration
    maxFileSize: parseInteger(process.env.MAX_FILE_SIZE, 10485760), // 10MB default
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    
    // Validation Configuration
    strictValidation: parseBoolean(process.env.STRICT_VALIDATION, true),
    enableTinValidation: parseBoolean(process.env.ENABLE_TIN_VALIDATION, true),
    enableDetailedErrors: parseBoolean(process.env.ENABLE_DETAILED_ERRORS, true),
    
    // Rate Limiting Configuration
    rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 900000), // 15 minutes
    rateLimitMaxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    
    // Logging Configuration
    logLevel: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: parseBoolean(process.env.ENABLE_REQUEST_LOGGING, true),
    enableDebugMode: parseBoolean(process.env.ENABLE_DEBUG_MODE, false),
    
    // Email Configuration
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInteger(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || null,
      password: process.env.SMTP_PASS || null,
      from: process.env.EMAIL_FROM || 'noreply@firs-invoice.local'
    },
    
    // Audit and Compliance
    auditLogRetentionDays: parseInteger(process.env.AUDIT_LOG_RETENTION_DAYS, 365),
    enableAuditLogging: parseBoolean(process.env.ENABLE_AUDIT_LOGGING, true),
    
    // Multi-tenant Configuration
    defaultTenantId: parseInteger(process.env.DEFAULT_TENANT_ID, 1),
    enableTenantIsolation: parseBoolean(process.env.ENABLE_TENANT_ISOLATION, true),
    
    // Backup Configuration
    backupEnabled: parseBoolean(process.env.BACKUP_ENABLED, true),
    backupRetentionDays: parseInteger(process.env.BACKUP_RETENTION_DAYS, 30),
    backupSchedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    
    // Health Check Configuration
    healthCheckInterval: parseInteger(process.env.HEALTH_CHECK_INTERVAL, 30000)
  };
}

// Export the configuration instance
export const config = createConfig();

// Export configuration validation function for testing
export { validateRequiredEnvVars };

// Development helper: log configuration (excluding sensitive data)
if (config.enableDebugMode && config.nodeEnv === 'development') {
  console.log('📋 Application Configuration:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  FIRS API URL: ${config.firsApiUrl}`);
  console.log(`  FIRS Submission: ${config.enableFirsSubmission ? 'Enabled' : 'Disabled'}`);
  console.log(`  Strict Validation: ${config.strictValidation ? 'Enabled' : 'Disabled'}`);
  console.log(`  TIN Validation: ${config.enableTinValidation ? 'Enabled' : 'Disabled'}`);
  console.log(`  Audit Logging: ${config.enableAuditLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`  Tenant Isolation: ${config.enableTenantIsolation ? 'Enabled' : 'Disabled'}`);
}