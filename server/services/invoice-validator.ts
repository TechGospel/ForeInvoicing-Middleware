import { z } from "zod";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedData?: any;
}

interface InvoiceData {
  supplier?: {
    tin: string;
    name: string;
    address?: string;
  };
  buyer?: {
    tin: string;
    name: string;
    address?: string;
  };
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate?: number;
  }>;
  total?: {
    subtotal: number;
    vatTotal: number;
    amount: number;
  };
  currency?: string;
}

export class InvoiceValidator {
  private tinRegex = /^\d{8}-\d{4}$/; // Nigerian TIN format
  
  async validate(data: any, format: string): Promise<ValidationResult> {
    const errors: string[] = [];
    
    try {
      let parsedData: InvoiceData;
      
      if (format === 'xml') {
        parsedData = await this.parseXML(data);
      } else {
        parsedData = data;
      }
      
      // Validate required fields
      if (!parsedData.supplier?.tin) {
        errors.push("Supplier TIN is required");
      } else if (!this.validateTIN(parsedData.supplier.tin)) {
        errors.push("Invalid supplier TIN format. Expected format: 12345678-0001");
      }
      
      if (!parsedData.buyer?.tin) {
        errors.push("Buyer TIN is required");
      } else if (!this.validateTIN(parsedData.buyer.tin)) {
        errors.push("Invalid buyer TIN format. Expected format: 12345678-0001");
      }
      
      if (!parsedData.supplier?.name) {
        errors.push("Supplier name is required");
      }
      
      if (!parsedData.buyer?.name) {
        errors.push("Buyer name is required");
      }
      
      if (!parsedData.invoiceNumber) {
        errors.push("Invoice number is required");
      }
      
      if (!parsedData.invoiceDate) {
        errors.push("Invoice date is required");
      }
      
      if (!parsedData.lineItems || parsedData.lineItems.length === 0) {
        errors.push("At least one line item is required");
      } else {
        parsedData.lineItems.forEach((item, index) => {
          if (!item.description) {
            errors.push(`Line item ${index + 1}: Description is required`);
          }
          if (!item.quantity || item.quantity <= 0) {
            errors.push(`Line item ${index + 1}: Valid quantity is required`);
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            errors.push(`Line item ${index + 1}: Valid unit price is required`);
          }
          if (!item.totalPrice || item.totalPrice <= 0) {
            errors.push(`Line item ${index + 1}: Valid total price is required`);
          }
          
          // Validate calculation
          const expectedTotal = item.quantity * item.unitPrice;
          if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
            errors.push(`Line item ${index + 1}: Total price calculation error`);
          }
        });
      }
      
      if (!parsedData.total?.amount || parsedData.total.amount <= 0) {
        errors.push("Valid total amount is required");
      }
      
      // Validate total calculations
      if (parsedData.lineItems && parsedData.total) {
        const calculatedSubtotal = parsedData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const calculatedVat = parsedData.lineItems.reduce((sum, item) => {
          const vatRate = item.vatRate || 0.075; // Default 7.5% VAT
          return sum + (item.totalPrice * vatRate);
        }, 0);
        const calculatedTotal = calculatedSubtotal + calculatedVat;
        
        if (Math.abs(calculatedTotal - parsedData.total.amount) > 0.01) {
          errors.push("Invoice total calculation error");
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        normalizedData: parsedData
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }
  
  async normalize(data: any, format: string): Promise<InvoiceData> {
    if (format === 'xml') {
      return await this.parseXML(data);
    }
    return data;
  }
  
  private validateTIN(tin: string): boolean {
    return this.tinRegex.test(tin);
  }
  
  private async parseXML(xmlData: string): Promise<InvoiceData> {
    // This is a simplified XML parser for UBL 3.0
    // In production, you would use a proper XML parser like xml2js
    try {
      const xml2js = await import('xml2js');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);
      
      // Extract data from UBL structure
      const invoice = result.Invoice || result;
      
      return {
        supplier: {
          tin: this.extractXMLValue(invoice, 'AccountingSupplierParty.Party.PartyTaxScheme.CompanyID'),
          name: this.extractXMLValue(invoice, 'AccountingSupplierParty.Party.PartyName.Name'),
          address: this.extractXMLValue(invoice, 'AccountingSupplierParty.Party.PostalAddress')
        },
        buyer: {
          tin: this.extractXMLValue(invoice, 'AccountingCustomerParty.Party.PartyTaxScheme.CompanyID'),
          name: this.extractXMLValue(invoice, 'AccountingCustomerParty.Party.PartyName.Name'),
          address: this.extractXMLValue(invoice, 'AccountingCustomerParty.Party.PostalAddress')
        },
        invoiceNumber: this.extractXMLValue(invoice, 'ID'),
        invoiceDate: this.extractXMLValue(invoice, 'IssueDate'),
        dueDate: this.extractXMLValue(invoice, 'DueDate'),
        lineItems: this.extractLineItems(invoice),
        total: this.extractTotals(invoice),
        currency: this.extractXMLValue(invoice, 'DocumentCurrencyCode') || 'NGN'
      };
    } catch (error) {
      throw new Error(`XML parsing failed: ${error.message}`);
    }
  }
  
  private extractXMLValue(obj: any, path: string): string {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && current[key]) {
        current = current[key];
      } else {
        return '';
      }
    }
    
    // Handle arrays and objects
    if (Array.isArray(current)) {
      return current[0] || '';
    }
    
    if (typeof current === 'object' && current._) {
      return current._;
    }
    
    return current || '';
  }
  
  private extractLineItems(invoice: any): any[] {
    const lines = invoice.InvoiceLine || [];
    const lineArray = Array.isArray(lines) ? lines : [lines];
    
    return lineArray.map(line => ({
      description: this.extractXMLValue(line, 'Item.Name'),
      quantity: parseFloat(this.extractXMLValue(line, 'InvoicedQuantity')) || 0,
      unitPrice: parseFloat(this.extractXMLValue(line, 'Price.PriceAmount')) || 0,
      totalPrice: parseFloat(this.extractXMLValue(line, 'LineExtensionAmount')) || 0,
      vatRate: parseFloat(this.extractXMLValue(line, 'TaxTotal.TaxSubtotal.TaxCategory.Percent')) / 100 || 0.075
    }));
  }
  
  private extractTotals(invoice: any): any {
    return {
      subtotal: parseFloat(this.extractXMLValue(invoice, 'LegalMonetaryTotal.LineExtensionAmount')) || 0,
      vatTotal: parseFloat(this.extractXMLValue(invoice, 'TaxTotal.TaxAmount')) || 0,
      amount: parseFloat(this.extractXMLValue(invoice, 'LegalMonetaryTotal.PayableAmount')) || 0
    };
  }
}
