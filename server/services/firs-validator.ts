import xml2js from 'xml2js';
import { firsInvoiceSchema, type FirsInvoice, INVOICE_TYPE_CODES, PAYMENT_MEANS_CODES } from '@shared/firs-schema';
import { ZodError } from 'zod';

export interface FirsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData?: FirsInvoice;
  validationDetails?: {
    fieldErrors: Record<string, string[]>;
    businessRuleViolations: string[];
    complianceIssues: string[];
  };
}

export interface LegacyInvoiceData {
  supplier?: {
    tin: string;
    name: string;
    address?: string;
    email?: string;
    telephone?: string;
  };
  buyer?: {
    tin: string;
    name: string;
    address?: string;
    email?: string;
    telephone?: string;
  };
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  lineItems?: Array<{
    id?: string;
    description: string;
    name?: string;
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
  businessId?: string;
  invoiceTypeCode?: string;
  note?: string;
}

export class FirsInvoiceValidator {
  private tinRegex = /^\d{8}-\d{4}$/; // Nigerian TIN format

  /**
   * Validates invoice data against FIRS UBL standards
   */
  async validateFirsCompliant(data: any, format: string = 'json'): Promise<FirsValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldErrors: Record<string, string[]> = {};
    const businessRuleViolations: string[] = [];
    const complianceIssues: string[] = [];

    try {
      let parsedData: any;
      
      // Parse based on format
      if (format === 'xml') {
        parsedData = await this.parseXMLToFirsFormat(data);
      } else if (format === 'json') {
        // Check if it's already in FIRS format or legacy format
        if (this.isFirsFormat(data)) {
          parsedData = data;
        } else {
          parsedData = this.convertLegacyToFirsFormat(data);
        }
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      // Validate against FIRS schema
      const result = firsInvoiceSchema.safeParse(parsedData);
      
      if (!result.success) {
        this.processZodErrors(result.error, fieldErrors, errors);
      }

      // Additional business rule validations
      if (result.success || parsedData) {
        const dataToValidate = result.success ? result.data : parsedData;
        this.validateBusinessRules(dataToValidate, businessRuleViolations, warnings);
        this.validateComplianceRequirements(dataToValidate, complianceIssues, warnings);
      }

      const isValid = errors.length === 0 && businessRuleViolations.length === 0 && complianceIssues.length === 0;

      return {
        isValid,
        errors: [...errors, ...businessRuleViolations, ...complianceIssues],
        warnings,
        normalizedData: result.success ? result.data : undefined,
        validationDetails: {
          fieldErrors,
          businessRuleViolations,
          complianceIssues
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        validationDetails: {
          fieldErrors,
          businessRuleViolations,
          complianceIssues
        }
      };
    }
  }

  /**
   * Checks if the data is already in FIRS format
   */
  private isFirsFormat(data: any): boolean {
    return (
      data &&
      typeof data.business_id === 'string' &&
      typeof data.irn === 'string' &&
      typeof data.accounting_supplier_party === 'object' &&
      Array.isArray(data.invoice_line)
    );
  }

  /**
   * Converts legacy invoice format to FIRS format
   */
  private convertLegacyToFirsFormat(legacyData: LegacyInvoiceData): Partial<FirsInvoice> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Generate business_id and IRN if not provided
    const businessId = legacyData.businessId || this.generateBusinessId();
    const irn = legacyData.invoiceNumber || this.generateIRN();

    return {
      business_id: businessId,
      irn: irn,
      issue_date: legacyData.invoiceDate || currentDate,
      due_date: legacyData.dueDate,
      invoice_type_code: legacyData.invoiceTypeCode || '381', // Default to Credit Note
      document_currency_code: legacyData.currency || 'NGN',
      tax_currency_code: legacyData.currency || 'NGN',
      note: legacyData.note,
      
      accounting_supplier_party: {
        party_name: legacyData.supplier?.name || '',
        tin: legacyData.supplier?.tin || '',
        email: legacyData.supplier?.email || '',
        telephone: legacyData.supplier?.telephone,
        business_description: 'Invoice supplier',
        postal_address: {
          street_name: legacyData.supplier?.address || '',
          city_name: 'Lagos', // Default city
          country: 'NG'
        }
      },

      accounting_customer_party: legacyData.buyer ? {
        party_name: legacyData.buyer.name || '',
        tin: legacyData.buyer.tin || '',
        email: legacyData.buyer.email || '',
        telephone: legacyData.buyer.telephone,
        business_description: 'Invoice customer',
        postal_address: {
          street_name: legacyData.buyer.address || '',
          city_name: 'Lagos', // Default city
          country: 'NG'
        }
      } : undefined,

      invoice_line: legacyData.lineItems?.map((item, index) => ({
        id: item.id || `line-${index + 1}`,
        invoiced_quantity: item.quantity,
        line_extension_amount: item.totalPrice,
        item: {
          description: item.description,
          name: item.name || item.description
        },
        price: {
          price_amount: item.unitPrice,
          base_quantity: 1
        }
      })) || [],

      tax_total: [{
        tax_amount: legacyData.total?.vatTotal || 0,
        tax_subtotal: [{
          taxable_amount: legacyData.total?.subtotal || 0,
          tax_amount: legacyData.total?.vatTotal || 0,
          tax_category: {
            id: 'VAT',
            percent: legacyData.lineItems?.[0]?.vatRate || 7.5
          }
        }]
      }],

      legal_monetary_total: {
        line_extension_amount: legacyData.total?.subtotal || 0,
        tax_exclusive_amount: legacyData.total?.subtotal || 0,
        tax_inclusive_amount: legacyData.total?.amount || 0,
        payable_amount: legacyData.total?.amount || 0
      }
    };
  }

  /**
   * Parse XML to FIRS format
   */
  private async parseXMLToFirsFormat(xmlData: string): Promise<Partial<FirsInvoice>> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(xmlData);
    
    // Extract UBL invoice data and convert to FIRS format
    const invoice = parsed.Invoice || parsed['ubl:Invoice'] || parsed;
    
    return {
      business_id: this.extractXMLValue(invoice, 'BusinessID') || this.generateBusinessId(),
      irn: this.extractXMLValue(invoice, 'ID') || this.generateIRN(),
      issue_date: this.extractXMLValue(invoice, 'IssueDate'),
      due_date: this.extractXMLValue(invoice, 'DueDate'),
      invoice_type_code: this.extractXMLValue(invoice, 'InvoiceTypeCode') || '381',
      document_currency_code: this.extractXMLValue(invoice, 'DocumentCurrencyCode') || 'NGN',
      tax_currency_code: this.extractXMLValue(invoice, 'TaxCurrencyCode') || 'NGN',
      
      accounting_supplier_party: this.extractPartyFromXML(invoice, 'AccountingSupplierParty'),
      accounting_customer_party: this.extractPartyFromXML(invoice, 'AccountingCustomerParty'),
      
      invoice_line: this.extractInvoiceLinesFromXML(invoice),
      tax_total: this.extractTaxTotalFromXML(invoice),
      legal_monetary_total: this.extractLegalMonetaryTotalFromXML(invoice)
    };
  }

  /**
   * Process Zod validation errors
   */
  private processZodErrors(error: ZodError, fieldErrors: Record<string, string[]>, errors: string[]): void {
    error.errors.forEach(err => {
      const field = err.path.join('.');
      const message = `${field}: ${err.message}`;
      
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(err.message);
      errors.push(message);
    });
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(data: any, violations: string[], warnings: string[]): void {
    // Invoice Type Code validation
    if (data.invoice_type_code && !INVOICE_TYPE_CODES[data.invoice_type_code as keyof typeof INVOICE_TYPE_CODES]) {
      violations.push(`Invalid invoice type code: ${data.invoice_type_code}. Must be one of: ${Object.keys(INVOICE_TYPE_CODES).join(', ')}`);
    }

    // Payment means validation
    if (data.payment_means) {
      data.payment_means.forEach((pm: any, index: number) => {
        if (!PAYMENT_MEANS_CODES[pm.payment_means_code as keyof typeof PAYMENT_MEANS_CODES]) {
          violations.push(`Invalid payment means code at index ${index}: ${pm.payment_means_code}`);
        }
      });
    }

    // TIN validation for Nigerian format
    if (data.accounting_supplier_party?.tin && !this.validateTIN(data.accounting_supplier_party.tin)) {
      violations.push(`Invalid supplier TIN format: ${data.accounting_supplier_party.tin}. Expected format: 12345678-1234`);
    }

    if (data.accounting_customer_party?.tin && !this.validateTIN(data.accounting_customer_party.tin)) {
      violations.push(`Invalid customer TIN format: ${data.accounting_customer_party.tin}. Expected format: 12345678-1234`);
    }

    // Business logic validations
    if (data.invoice_line && data.invoice_line.length > 1000) {
      warnings.push('Invoice contains more than 1000 line items. Consider splitting into multiple invoices.');
    }

    // Currency consistency check
    if (data.document_currency_code !== data.tax_currency_code) {
      warnings.push('Document currency and tax currency are different. Ensure this is intentional.');
    }
  }

  /**
   * Validate compliance requirements
   */
  private validateComplianceRequirements(data: any, issues: string[], warnings: string[]): void {
    // Mandatory email for supplier
    if (!data.accounting_supplier_party?.email) {
      issues.push('Supplier email is mandatory for FIRS compliance');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.accounting_supplier_party?.email && !emailRegex.test(data.accounting_supplier_party.email)) {
      issues.push('Supplier email format is invalid');
    }

    // Phone number format validation
    if (data.accounting_supplier_party?.telephone && !data.accounting_supplier_party.telephone.startsWith('+')) {
      issues.push('Supplier telephone must include country code (start with +)');
    }

    // Required address fields
    if (!data.accounting_supplier_party?.postal_address?.street_name) {
      issues.push('Supplier street address is required');
    }

    if (!data.accounting_supplier_party?.postal_address?.city_name) {
      issues.push('Supplier city is required');
    }

    // Invoice line validation
    if (data.invoice_line) {
      data.invoice_line.forEach((line: any, index: number) => {
        if (!line.item?.description || line.item.description.trim().length < 3) {
          issues.push(`Line ${index + 1}: Item description must be at least 3 characters`);
        }

        if (line.invoiced_quantity <= 0) {
          issues.push(`Line ${index + 1}: Quantity must be positive`);
        }

        if (line.price?.price_amount <= 0) {
          issues.push(`Line ${index + 1}: Price must be positive`);
        }
      });
    }

    // Tax validation
    if (data.tax_total && data.tax_total.length === 0) {
      warnings.push('No tax information provided. Ensure tax exemption is properly documented.');
    }
  }

  /**
   * Helper methods
   */
  private validateTIN(tin: string): boolean {
    return this.tinRegex.test(tin);
  }

  private generateBusinessId(): string {
    return 'BIZ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private generateIRN(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `INV-${date}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  private extractXMLValue(obj: any, path: string): string | undefined {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key] || current[`ubl:${key}`] || current[`cbc:${key}`];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : current?._text || current?._;
  }

  private extractPartyFromXML(invoice: any, partyType: string): any {
    const party = invoice[partyType] || invoice[`cac:${partyType}`];
    if (!party) return undefined;

    const partyInfo = party.Party || party['cac:Party'];
    if (!partyInfo) return undefined;

    return {
      party_name: this.extractXMLValue(partyInfo, 'PartyName.Name') || '',
      tin: this.extractXMLValue(partyInfo, 'PartyTaxScheme.CompanyID') || '',
      email: this.extractXMLValue(partyInfo, 'Contact.ElectronicMail') || '',
      telephone: this.extractXMLValue(partyInfo, 'Contact.Telephone'),
      business_description: this.extractXMLValue(partyInfo, 'PartyName.Name') || '',
      postal_address: {
        street_name: this.extractXMLValue(partyInfo, 'PostalAddress.StreetName') || '',
        city_name: this.extractXMLValue(partyInfo, 'PostalAddress.CityName') || '',
        postal_zone: this.extractXMLValue(partyInfo, 'PostalAddress.PostalZone'),
        country: this.extractXMLValue(partyInfo, 'PostalAddress.Country.IdentificationCode') || 'NG'
      }
    };
  }

  private extractInvoiceLinesFromXML(invoice: any): any[] {
    const lines = invoice.InvoiceLine || invoice['cac:InvoiceLine'];
    if (!lines) return [];

    const lineArray = Array.isArray(lines) ? lines : [lines];
    
    return lineArray.map((line, index) => ({
      id: this.extractXMLValue(line, 'ID') || `line-${index + 1}`,
      invoiced_quantity: parseFloat(this.extractXMLValue(line, 'InvoicedQuantity') || '0'),
      line_extension_amount: parseFloat(this.extractXMLValue(line, 'LineExtensionAmount') || '0'),
      item: {
        description: this.extractXMLValue(line, 'Item.Description') || '',
        name: this.extractXMLValue(line, 'Item.Name') || ''
      },
      price: {
        price_amount: parseFloat(this.extractXMLValue(line, 'Price.PriceAmount') || '0'),
        base_quantity: parseFloat(this.extractXMLValue(line, 'Price.BaseQuantity') || '1')
      }
    }));
  }

  private extractTaxTotalFromXML(invoice: any): any[] {
    const taxTotal = invoice.TaxTotal || invoice['cac:TaxTotal'];
    if (!taxTotal) return [];

    return [{
      tax_amount: parseFloat(this.extractXMLValue(taxTotal, 'TaxAmount') || '0'),
      tax_subtotal: [{
        taxable_amount: parseFloat(this.extractXMLValue(taxTotal, 'TaxSubtotal.TaxableAmount') || '0'),
        tax_amount: parseFloat(this.extractXMLValue(taxTotal, 'TaxSubtotal.TaxAmount') || '0'),
        tax_category: {
          id: this.extractXMLValue(taxTotal, 'TaxSubtotal.TaxCategory.ID') || 'VAT',
          percent: parseFloat(this.extractXMLValue(taxTotal, 'TaxSubtotal.TaxCategory.Percent') || '7.5')
        }
      }]
    }];
  }

  private extractLegalMonetaryTotalFromXML(invoice: any): any {
    const monetary = invoice.LegalMonetaryTotal || invoice['cac:LegalMonetaryTotal'];
    if (!monetary) return {};

    return {
      line_extension_amount: parseFloat(this.extractXMLValue(monetary, 'LineExtensionAmount') || '0'),
      tax_exclusive_amount: parseFloat(this.extractXMLValue(monetary, 'TaxExclusiveAmount') || '0'),
      tax_inclusive_amount: parseFloat(this.extractXMLValue(monetary, 'TaxInclusiveAmount') || '0'),
      payable_amount: parseFloat(this.extractXMLValue(monetary, 'PayableAmount') || '0')
    };
  }
}