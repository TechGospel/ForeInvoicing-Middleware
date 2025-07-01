export interface InvoiceSubmissionRequest {
  tenantId: number;
  format: 'xml' | 'json';
  invoiceData: any;
  priority?: 'normal' | 'high' | 'urgent';
  strictValidation?: boolean;
  autoCorrect?: boolean;
  asyncProcessing?: boolean;
}

export interface InvoiceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FirsSubmissionResult {
  success: boolean;
  irn?: string;
  qrCode?: string;
  error?: string;
  responseTime?: number;
}

export interface DashboardMetrics {
  totalInvoices: number;
  successRate: number;
  activeTenants: number;
  avgResponseTime: number;
  totalGrowth: number;
  successGrowth: number;
  tenantGrowth: number;
  responseImprovement: number;
}

export interface RecentActivity {
  id: number;
  invoiceId: string;
  tenant: string;
  amount: string;
  status: string;
  timestamp: string;
}

export interface SystemStatus {
  firsApi: 'operational' | 'degraded' | 'offline';
  database: 'healthy' | 'warning' | 'error';
  redisQueue: 'normal' | 'high_load' | 'offline';
  validationService: 'online' | 'offline';
}
