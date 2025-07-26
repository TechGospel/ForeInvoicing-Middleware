import { type FirsInvoice } from '@shared/firs-schema';
import { config } from '../config';

export interface FirsApiResponse {
  irn: string;
  qrCode: string;
  status: string;
  message?: string;
  validationReport?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface FirsSubmissionData extends FirsInvoice {
  // FIRS submission data is now fully compliant with UBL standards
}

export class FirsAdapter {
  private baseUrl: string;
  private apiKey: string | null;
  private timeout: number;
  private maxRetries: number;
  
  constructor() {
    this.baseUrl = config.firsApiUrl;
    this.apiKey = config.firsApiKey;
    this.timeout = config.firsTimeout;
    this.maxRetries = config.firsRetryAttempts;
  }
  
  /**
   * Submit invoice to FIRS using the official validation endpoint
   */
  async submitInvoice(invoiceData: FirsSubmissionData): Promise<FirsApiResponse> {
    let lastError: Error;
    
    // Pre-validate the invoice data before submission
    try {
      this.validateInvoiceData(invoiceData);
    } catch (validationError) {
      return {
        irn: '',
        qrCode: '',
        status: 'VALIDATION_FAILED',
        message: `Invoice validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`,
        validationReport: {
          isValid: false,
          errors: [validationError instanceof Error ? validationError.message : 'Unknown validation error'],
          warnings: []
        }
      };
    }
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.makeRequest(invoiceData, attempt);
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(lastError) || attempt === this.maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Make the actual API request to FIRS
   */
  private async makeRequest(invoiceData: FirsSubmissionData, attempt: number): Promise<FirsApiResponse> {
    // Check if FIRS submission is enabled and API key is available
    if (!config.enableFirsSubmission || !this.apiKey) {
      return this.createMockResponse(invoiceData);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      // Use the official FIRS validation endpoint
      const response = await fetch(`${this.baseUrl}/invoice/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Request-ID': `${Date.now()}-${attempt}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(invoiceData), // Send data in FIRS format directly
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`FIRS API error (${response.status}): ${result.message || response.statusText}`);
      }
      
      // Handle FIRS response format
      if (result.success || result.status === 'VALIDATED') {
        return {
          irn: result.irn || invoiceData.irn,
          qrCode: result.qr_code || result.qrCode || '',
          status: 'VALIDATED',
          message: result.message || 'Invoice validated successfully',
          validationReport: {
            isValid: true,
            errors: [],
            warnings: result.warnings || []
          }
        };
      } else {
        return {
          irn: '',
          qrCode: '',
          status: 'VALIDATION_FAILED',
          message: result.message || 'Invoice validation failed',
          validationReport: {
            isValid: false,
            errors: result.errors || [result.message || 'Unknown validation error'],
            warnings: result.warnings || []
          }
        };
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`FIRS API timeout after ${this.timeout}ms (attempt ${attempt})`);
      }
      
      // Check if it's a network error that we should retry
      if (this.isRetryableError(error as Error)) {
        throw new Error(`FIRS API network error (attempt ${attempt}): ${(error as Error).message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Validate invoice data before submission
   */
  private validateInvoiceData(invoiceData: FirsSubmissionData): void {
    // Essential validation before FIRS submission
    if (!invoiceData.business_id) {
      throw new Error('Business ID is required for FIRS submission');
    }
    
    if (!invoiceData.irn) {
      throw new Error('IRN (Invoice Reference Number) is required');
    }
    
    if (!invoiceData.accounting_supplier_party?.tin) {
      throw new Error('Supplier TIN is required');
    }
    
    if (!invoiceData.accounting_supplier_party?.email) {
      throw new Error('Supplier email is required for FIRS compliance');
    }
    
    if (!invoiceData.invoice_line || invoiceData.invoice_line.length === 0) {
      throw new Error('At least one invoice line is required');
    }
    
    if (!invoiceData.tax_total || invoiceData.tax_total.length === 0) {
      throw new Error('Tax information is required');
    }
    
    if (!invoiceData.legal_monetary_total) {
      throw new Error('Legal monetary total is required');
    }
    
    // Validate currency is NGN for Nigerian invoices
    if (invoiceData.document_currency_code !== 'NGN') {
      throw new Error('Document currency must be NGN for Nigerian invoices');
    }
    
    // Validate TIN format
    const tinRegex = /^\d{8}-\d{4}$/;
    if (!tinRegex.test(invoiceData.accounting_supplier_party.tin)) {
      throw new Error(`Invalid supplier TIN format: ${invoiceData.accounting_supplier_party.tin}. Expected format: 12345678-1234`);
    }
    
    if (invoiceData.accounting_customer_party?.tin && !tinRegex.test(invoiceData.accounting_customer_party.tin)) {
      throw new Error(`Invalid customer TIN format: ${invoiceData.accounting_customer_party.tin}. Expected format: 12345678-1234`);
    }
  }
  
  /**
   * Create a mock response for development/testing environments
   */
  private createMockResponse(invoiceData: FirsSubmissionData): FirsApiResponse {
    const mockIrn = invoiceData.irn || this.generateIRN();
    
    return {
      irn: mockIrn,
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      status: 'VALIDATED',
      message: 'Invoice validated successfully (MOCK RESPONSE - FIRS submission disabled)',
      validationReport: {
        isValid: true,
        errors: [],
        warnings: ['This is a mock response for development. Set ENABLE_FIRS_SUBMISSION=true and provide FIRS_API_KEY for production.']
      }
    };
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'network timeout',
      'fetch failed'
    ];
    
    return retryableErrors.some(errType => 
      error.message.toLowerCase().includes(errType.toLowerCase())
    );
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get invoice status from FIRS
   */
  async getInvoiceStatus(irn: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/invoice/status/${irn}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`FIRS API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get invoice status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate IRN if not provided
   */
  generateIRN(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `INV${date}-${random}`;
  }
  
  /**
   * Generate business ID if not provided
   */
  generateBusinessId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Validate FIRS response structure
   */
  private validateFirsResponse(response: any): boolean {
    // Basic validation of FIRS response
    return (
      typeof response === 'object' &&
      response !== null &&
      (response.success !== undefined || response.status !== undefined)
    );
  }
}