import { type FirsInvoice } from '@shared/firs-schema';

interface FirsResponse {
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

interface FirsSubmissionData extends FirsInvoice {
  // FIRS submission data is now fully compliant with UBL standards
}

export class FirsAdapter {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  
  constructor() {
    this.baseUrl = process.env.FIRS_API_URL || "https://api.firs.gov.ng/mbs";
    this.apiKey = process.env.FIRS_API_KEY || "mock-api-key";
  }
  
  async submitInvoice(invoiceData: FirsSubmissionData): Promise<FirsResponse> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.makeRequest(invoiceData, attempt);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  private async makeRequest(invoiceData: FirsSubmissionData, attempt: number): Promise<FirsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      // Transform data to FIRS format
      const firsPayload = this.transformToFirsFormat(invoiceData);
      
      const response = await fetch(`${this.baseUrl}/submit-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Request-ID': `${Date.now()}-${attempt}`,
        },
        body: JSON.stringify(firsPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FIRS API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      
      // Validate response structure
      if (!result.irn || !result.qrCode) {
        throw new Error("Invalid FIRS response: missing IRN or QR code");
      }
      
      return {
        irn: result.irn,
        qrCode: result.qrCode,
        status: result.status || 'success',
        message: result.message
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`FIRS API timeout after ${this.timeout}ms (attempt ${attempt})`);
      }
      
      // Check if it's a network error that we should retry
      if (this.isRetryableError(error)) {
        throw new Error(`FIRS API network error (attempt ${attempt}): ${error.message}`);
      }
      
      throw error;
    }
  }
  
  private transformToFirsFormat(invoiceData: FirsSubmissionData): any {
    return {
      version: "1.0",
      invoiceTypeCode: "01", // Standard invoice
      supplier: {
        tin: invoiceData.supplier.tin,
        legalName: invoiceData.supplier.name,
        address: invoiceData.supplier.address || ""
      },
      customer: {
        tin: invoiceData.buyer.tin,
        legalName: invoiceData.buyer.name,
        address: invoiceData.buyer.address || ""
      },
      invoiceNumber: invoiceData.invoiceNumber,
      issueDate: new Date().toISOString().split('T')[0],
      currency: "NGN",
      lineItems: invoiceData.lineItems.map((item, index) => ({
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.totalPrice,
        taxRate: (item.vatRate || 0.075) * 100,
        taxAmount: item.totalPrice * (item.vatRate || 0.075)
      })),
      totals: {
        subtotal: invoiceData.total.subtotal,
        totalTax: invoiceData.total.vatTotal,
        grandTotal: invoiceData.total.amount
      }
    };
  }
  
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /ECONNRESET/,
      /ENOTFOUND/,
      /ECONNREFUSED/
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async getInvoiceStatus(irn: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(`${this.baseUrl}/invoice-status/${irn}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`FIRS API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
