import { z } from 'zod';

// FIRS Invoice Schema - Based on Official FIRS UBL Standards
// https://einvoice.firs.gov.ng/docs/system-integrator/invoice-schema

// Address Schema
export const postalAddressSchema = z.object({
  street_name: z.string().min(1, "Street name is required"),
  city_name: z.string().min(1, "City name is required"),
  postal_zone: z.string().optional(),
  lga: z.string().optional(),
  state: z.string().optional(),
  country: z.string().length(2, "Country must be 2-letter ISO code").default("NG")
});

// Party Schema (reusable for supplier, customer, etc.)
export const partySchema = z.object({
  party_name: z.string().min(1, "Party name is required"),
  tin: z.string()
    .regex(/^\d{8}-\d{4}$/, "TIN must be in format: 12345678-1234")
    .min(1, "TIN is required"),
  email: z.string()
    .email("Invalid email format")
    .min(1, "Email is required"),
  telephone: z.string()
    .regex(/^\+\d{10,15}$/, "Telephone must start with + and contain 10-15 digits")
    .optional(),
  business_description: z.string().optional(),
  postal_address: postalAddressSchema
});

// Document Reference Schema
export const documentReferenceSchema = z.object({
  irn: z.string().min(1, "IRN is required"),
  issue_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
});

// Invoice Delivery Period Schema
export const invoiceDeliveryPeriodSchema = z.object({
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
});

// Payment Means Schema
export const paymentMeansSchema = z.object({
  payment_means_code: z.number()
    .int("Payment means code must be an integer")
    .min(1, "Payment means code must be positive"),
  payment_due_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment due date must be in YYYY-MM-DD format")
});

// Allowance Charge Schema
export const allowanceChargeSchema = z.object({
  charge_indicator: z.boolean(),
  amount: z.number()
    .min(0, "Amount must be non-negative")
    .multipleOf(0.01, "Amount must have at most 2 decimal places")
});

// Tax Category Schema
export const taxCategorySchema = z.object({
  id: z.string().min(1, "Tax category ID is required"),
  percent: z.number()
    .min(0, "Tax percent must be non-negative")
    .max(100, "Tax percent cannot exceed 100%")
});

// Tax Subtotal Schema
export const taxSubtotalSchema = z.object({
  taxable_amount: z.number()
    .min(0, "Taxable amount must be non-negative")
    .multipleOf(0.01, "Taxable amount must have at most 2 decimal places"),
  tax_amount: z.number()
    .min(0, "Tax amount must be non-negative")
    .multipleOf(0.01, "Tax amount must have at most 2 decimal places"),
  tax_category: taxCategorySchema
});

// Tax Total Schema
export const taxTotalSchema = z.object({
  tax_amount: z.number()
    .min(0, "Tax amount must be non-negative")
    .multipleOf(0.01, "Tax amount must have at most 2 decimal places"),
  tax_subtotal: z.array(taxSubtotalSchema)
    .min(1, "At least one tax subtotal is required")
});

// Legal Monetary Total Schema
export const legalMonetaryTotalSchema = z.object({
  line_extension_amount: z.number()
    .min(0, "Line extension amount must be non-negative")
    .multipleOf(0.01, "Line extension amount must have at most 2 decimal places"),
  tax_exclusive_amount: z.number()
    .min(0, "Tax exclusive amount must be non-negative")
    .multipleOf(0.01, "Tax exclusive amount must have at most 2 decimal places"),
  tax_inclusive_amount: z.number()
    .min(0, "Tax inclusive amount must be non-negative")
    .multipleOf(0.01, "Tax inclusive amount must have at most 2 decimal places"),
  payable_amount: z.number()
    .min(0, "Payable amount must be non-negative")
    .multipleOf(0.01, "Payable amount must have at most 2 decimal places")
});

// Invoice Line Item Schema
export const invoiceLineSchema = z.object({
  id: z.string().min(1, "Line ID is required"),
  invoiced_quantity: z.number()
    .min(0, "Invoiced quantity must be non-negative"),
  line_extension_amount: z.number()
    .min(0, "Line extension amount must be non-negative")
    .multipleOf(0.01, "Line extension amount must have at most 2 decimal places"),
  item: z.object({
    description: z.string().min(1, "Item description is required"),
    name: z.string().min(1, "Item name is required"),
    sellers_item_identification: z.string().optional(),
    buyers_item_identification: z.string().optional(),
    standard_item_identification: z.string().optional(),
    classified_tax_category: z.array(taxCategorySchema).optional()
  }),
  price: z.object({
    price_amount: z.number()
      .min(0, "Price amount must be non-negative")
      .multipleOf(0.01, "Price amount must have at most 2 decimal places"),
    base_quantity: z.number()
      .min(0.01, "Base quantity must be positive")
      .optional()
  }),
  allowance_charge: z.array(allowanceChargeSchema).optional()
});

// Main FIRS Invoice Schema
export const firsInvoiceSchema = z.object({
  // Mandatory fields
  business_id: z.string()
    .uuid("Business ID must be a valid UUID")
    .min(1, "Business ID is required"),
  
  irn: z.string()
    .min(1, "IRN (Invoice Reference Number) is required")
    .max(50, "IRN cannot exceed 50 characters"),
  
  issue_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format"),
  
  invoice_type_code: z.string()
    .regex(/^\d{3}$/, "Invoice type code must be a 3-digit number")
    .refine(val => ['380', '381', '383', '384', '389', '390', '393', '394', '395', '396'].includes(val), 
      "Invalid invoice type code"),
  
  document_currency_code: z.string()
    .length(3, "Currency code must be 3 letters")
    .default("NGN"),
  
  tax_currency_code: z.string()
    .length(3, "Tax currency code must be 3 letters")
    .default("NGN"),
  
  accounting_supplier_party: partySchema,
  
  tax_total: z.array(taxTotalSchema)
    .min(1, "At least one tax total is required"),
  
  legal_monetary_total: legalMonetaryTotalSchema,
  
  invoice_line: z.array(invoiceLineSchema)
    .min(1, "At least one invoice line is required"),

  // Optional fields
  due_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
    .optional(),
  
  issue_time: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Issue time must be in HH:MM:SS format")
    .optional(),
  
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIAL'])
    .default('PENDING')
    .optional(),
  
  note: z.string()
    .max(1000, "Note cannot exceed 1000 characters")
    .optional(),
  
  tax_point_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tax point date must be in YYYY-MM-DD format")
    .optional(),
  
  accounting_cost: z.string()
    .max(100, "Accounting cost cannot exceed 100 characters")
    .optional(),
  
  buyer_reference: z.string()
    .max(100, "Buyer reference cannot exceed 100 characters")
    .optional(),
  
  invoice_delivery_period: invoiceDeliveryPeriodSchema.optional(),
  
  order_reference: z.string()
    .max(100, "Order reference cannot exceed 100 characters")
    .optional(),
  
  billing_reference: z.array(documentReferenceSchema).optional(),
  
  dispatch_document_reference: documentReferenceSchema.optional(),
  
  receipt_document_reference: documentReferenceSchema.optional(),
  
  originator_document_reference: documentReferenceSchema.optional(),
  
  contract_document_reference: z.array(documentReferenceSchema).optional(),
  
  additional_document_reference: z.array(documentReferenceSchema).optional(),
  
  accounting_customer_party: partySchema.optional(),
  
  payee_party: partySchema.optional(),
  
  bill_party: partySchema.optional(),
  
  ship_party: partySchema.optional(),
  
  tax_representative_party: partySchema.optional(),
  
  actual_delivery_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Actual delivery date must be in YYYY-MM-DD format")
    .optional(),
  
  payment_means: z.array(paymentMeansSchema).optional(),
  
  payment_terms_note: z.string()
    .max(500, "Payment terms note cannot exceed 500 characters")
    .optional(),
  
  allowance_charge: z.array(allowanceChargeSchema).optional()
}).superRefine((data, ctx) => {
  // Custom validation rules
  
  // Issue date cannot be in the future
  const issueDate = new Date(data.issue_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (issueDate > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['issue_date'],
      message: "Issue date cannot be in the future"
    });
  }
  
  // Due date must be after issue date
  if (data.due_date) {
    const dueDate = new Date(data.due_date);
    if (dueDate <= issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['due_date'],
        message: "Due date must be after issue date"
      });
    }
  }
  
  // Validate delivery period
  if (data.invoice_delivery_period) {
    const startDate = new Date(data.invoice_delivery_period.start_date);
    const endDate = new Date(data.invoice_delivery_period.end_date);
    
    if (endDate <= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['invoice_delivery_period', 'end_date'],
        message: "Delivery end date must be after start date"
      });
    }
  }
  
  // Validate monetary totals consistency
  const lineTotal = data.invoice_line.reduce((sum, line) => sum + line.line_extension_amount, 0);
  const roundedLineTotal = Math.round(lineTotal * 100) / 100;
  const expectedLineExtension = Math.round(data.legal_monetary_total.line_extension_amount * 100) / 100;
  
  if (Math.abs(roundedLineTotal - expectedLineExtension) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['legal_monetary_total', 'line_extension_amount'],
      message: `Line extension amount (${expectedLineExtension}) must equal sum of line amounts (${roundedLineTotal})`
    });
  }
  
  // Validate tax calculations
  const totalTaxAmount = data.tax_total.reduce((sum, tax) => sum + tax.tax_amount, 0);
  const expectedTaxInclusive = data.legal_monetary_total.tax_exclusive_amount + totalTaxAmount;
  
  if (Math.abs(expectedTaxInclusive - data.legal_monetary_total.tax_inclusive_amount) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['legal_monetary_total', 'tax_inclusive_amount'],
      message: "Tax inclusive amount must equal tax exclusive amount plus total tax"
    });
  }
});

// Type exports
export type FirsInvoice = z.infer<typeof firsInvoiceSchema>;
export type FirsParty = z.infer<typeof partySchema>;
export type FirsInvoiceLine = z.infer<typeof invoiceLineSchema>;
export type FirsTaxTotal = z.infer<typeof taxTotalSchema>;
export type FirsLegalMonetaryTotal = z.infer<typeof legalMonetaryTotalSchema>;

// Invoice Type Codes with descriptions
export const INVOICE_TYPE_CODES = {
  '380': 'Commercial Invoice',
  '381': 'Credit Note',
  '383': 'Debit Note',
  '384': 'Corrected Invoice',
  '389': 'Self-billed Invoice',
  '390': 'Delcredere Invoice',
  '393': 'Factored Invoice',
  '394': 'Consignment Invoice',
  '395': 'Factored Credit Note',
  '396': 'Commissioned Invoice'
} as const;

// Payment Means Codes
export const PAYMENT_MEANS_CODES = {
  10: 'In Cash',
  20: 'Cheque',
  30: 'Credit Transfer',
  31: 'Debit Transfer',
  42: 'Payment to bank account',
  43: 'Credit Card',
  44: 'Debit Card',
  45: 'Bank Card',
  46: 'Electronic Fund Transfer',
  47: 'Automated Clearing House',
  48: 'Online Payment Service'
} as const;