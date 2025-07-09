# FIRS MBS Compliance Guide

This document outlines how the application ensures full compliance with FIRS (Federal Inland Revenue Service) e-invoicing standards and the UBL (Universal Business Language) schema requirements.

## Official FIRS Standards

The application implements the official FIRS invoice schema as defined at:
- **API Documentation**: https://einvoice.firs.gov.ng/docs/system-integrator/invoice-schema
- **Validation Endpoint**: POST base_url/api/v1/invoice/validate
- **Standards**: Universal Business Language (UBL) 3.0

## Schema Compliance

### Mandatory Fields (Required by FIRS)

1. **business_id** - Unique business identification number
2. **irn** - Invoice Reference Number (system-generated unique identifier)
3. **issue_date** - Date of invoice issuance (YYYY-MM-DD format)
4. **invoice_type_code** - 3-digit invoice type code (380, 381, 383, etc.)
5. **document_currency_code** - Currency code (NGN for Nigerian invoices)
6. **tax_currency_code** - Tax calculation currency (NGN)
7. **accounting_supplier_party** - Complete supplier information including:
   - party_name (mandatory)
   - tin (mandatory, format: 12345678-1234)
   - email (mandatory for FIRS compliance)
   - postal_address with street_name, city_name, country
8. **tax_total** - Tax information array with tax amounts and categories
9. **legal_monetary_total** - Financial totals including tax calculations
10. **invoice_line** - Array of invoice line items

### Optional Fields (Enhanced Features)

- due_date, issue_time, payment_status
- accounting_customer_party (buyer information)
- payee_party, bill_party, ship_party
- tax_representative_party
- payment_means, allowance_charge
- Various document references (billing, dispatch, receipt, etc.)

## Validation Engine

### Three-Layer Validation

1. **Schema Validation** (`shared/firs-schema.ts`)
   - Zod-based validation against official FIRS schema
   - Field type validation, format checking
   - Business rule enforcement

2. **Business Rules Validation** (`server/services/firs-validator.ts`)
   - Nigerian TIN format validation (########-####)
   - Currency consistency checks
   - Date logic validation
   - Monetary calculation verification

3. **Compliance Validation**
   - FIRS-specific requirements
   - UBL 3.0 standard compliance
   - Tax calculation accuracy
   - Required field completeness

### Error Handling

The validator provides detailed error reporting:
```json
{
  "isValid": false,
  "errors": ["Field-specific error messages"],
  "warnings": ["Non-critical issues"],
  "validationDetails": {
    "fieldErrors": {"field_name": ["specific errors"]},
    "businessRuleViolations": ["rule violations"],
    "complianceIssues": ["FIRS compliance problems"]
  }
}
```

## Data Format Support

### Input Formats
- **JSON**: Native FIRS format or legacy invoice format
- **XML**: UBL 3.0 XML with automatic parsing
- **File Upload**: XML/JSON files via multipart form data

### Format Conversion
The system automatically converts legacy invoice formats to FIRS-compliant format:
```javascript
Legacy Format → FIRS UBL Format
{
  supplier: {name, tin, email} → accounting_supplier_party
  buyer: {name, tin, email} → accounting_customer_party
  lineItems: [...] → invoice_line
  total: {amount, tax} → legal_monetary_total + tax_total
}
```

## FIRS API Integration

### Official Validation Endpoint
- **URL**: `https://einvoice.firs.gov.ng/api/v1/invoice/validate`
- **Method**: POST
- **Authentication**: Bearer token
- **Content-Type**: application/json

### Response Handling
```json
{
  "irn": "Generated IRN",
  "qr_code": "QR code for invoice",
  "status": "VALIDATED|VALIDATION_FAILED",
  "message": "Status message",
  "errors": ["Validation errors if any"],
  "warnings": ["Non-critical warnings"]
}
```

### Retry Logic
- Maximum 3 retry attempts
- Exponential backoff (1s, 2s, 4s)
- Network error detection and retry
- Timeout handling (30 seconds)

## Invoice Type Codes (Official FIRS Codes)

```
380 - Commercial Invoice
381 - Credit Note
383 - Debit Note
384 - Corrected Invoice
389 - Self-billed Invoice
390 - Delcredere Invoice
393 - Factored Invoice
394 - Consignment Invoice
395 - Factored Credit Note
396 - Commissioned Invoice
```

## Payment Means Codes

```
10 - In Cash           43 - Credit Card
20 - Cheque           44 - Debit Card
30 - Credit Transfer   45 - Bank Card
31 - Debit Transfer    46 - Electronic Fund Transfer
42 - Payment to bank   47 - Automated Clearing House
```

## Tax Categories

### Nigerian Tax Types
- **VAT**: Value Added Tax (7.5% standard rate)
- **LOCAL_SALES_TAX**: Local government sales tax
- **EXCISE**: Excise duty on specific goods
- **WITHHOLDING**: Withholding tax

## Implementation Files

### Core Schema Files
- `shared/firs-schema.ts` - Official FIRS schema definitions
- `server/services/firs-validator.ts` - FIRS-compliant validation engine
- `server/services/firs-adapter-v2.ts` - FIRS API integration

### Updated Components
- `server/routes.ts` - Invoice submission with FIRS validation
- `client/src/components/invoice/invoice-form.tsx` - FIRS-aware form
- `client/src/pages/submit-invoice.tsx` - Enhanced validation display

## Testing FIRS Compliance

### Validation Test
```bash
# Test invoice validation
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceData": {
      "business_id": "test-business-id",
      "irn": "INV20240701-TEST001",
      "issue_date": "2024-07-01",
      "invoice_type_code": "381",
      "document_currency_code": "NGN",
      "tax_currency_code": "NGN",
      "accounting_supplier_party": {
        "party_name": "Test Supplier Ltd",
        "tin": "12345678-1234",
        "email": "supplier@test.com",
        "postal_address": {
          "street_name": "123 Test Street",
          "city_name": "Lagos",
          "country": "NG"
        }
      },
      "invoice_line": [{
        "id": "1",
        "invoiced_quantity": 1,
        "line_extension_amount": 1000,
        "item": {
          "description": "Test Item",
          "name": "Test Product"
        },
        "price": {
          "price_amount": 1000
        }
      }],
      "tax_total": [{
        "tax_amount": 75,
        "tax_subtotal": [{
          "taxable_amount": 1000,
          "tax_amount": 75,
          "tax_category": {
            "id": "VAT",
            "percent": 7.5
          }
        }]
      }],
      "legal_monetary_total": {
        "line_extension_amount": 1000,
        "tax_exclusive_amount": 1000,
        "tax_inclusive_amount": 1075,
        "payable_amount": 1075
      }
    }
  }'
```

## Best Practices

### For System Integrators

1. **Always validate locally first** before sending to FIRS
2. **Use proper TIN format**: 8 digits, hyphen, 4 digits
3. **Include mandatory email** for supplier party
4. **Ensure currency consistency** (NGN for Nigerian invoices)
5. **Validate monetary calculations** before submission
6. **Handle validation errors gracefully** with detailed messages

### For Developers

1. **Import FIRS schema types** for type safety
2. **Use the FirsInvoiceValidator** for all validations
3. **Handle async validation** properly
4. **Log validation details** for debugging
5. **Implement proper error boundaries** in UI components

## Compliance Checklist

- [ ] Business ID is valid UUID format
- [ ] IRN follows proper format and is unique
- [ ] Supplier TIN is in correct Nigerian format
- [ ] Supplier email is provided and valid
- [ ] Currency codes are set to NGN
- [ ] Tax calculations are accurate
- [ ] All mandatory fields are present
- [ ] Invoice type code is valid FIRS code
- [ ] Date formats are YYYY-MM-DD
- [ ] Line items have proper descriptions
- [ ] Monetary totals are consistent

## Troubleshooting

### Common Validation Errors

1. **"Invalid TIN format"**
   - Ensure format: 12345678-1234
   - Check for correct hyphen placement

2. **"Supplier email is mandatory"**
   - Add valid email to accounting_supplier_party
   - Verify email format

3. **"Tax calculations inconsistent"**
   - Verify tax_exclusive + tax_amount = tax_inclusive
   - Check line totals sum to legal_monetary_total

4. **"Invalid invoice type code"**
   - Use only approved FIRS codes (380, 381, 383, etc.)
   - Check official documentation for valid codes

5. **"Currency must be NGN"**
   - Set both document_currency_code and tax_currency_code to "NGN"

### FIRS API Issues

1. **Authentication errors**: Verify FIRS_API_KEY is correct
2. **Network timeouts**: Check FIRS service status
3. **Rate limiting**: Implement proper retry logic
4. **Invalid business_id**: Ensure business is registered with FIRS

## Support and Documentation

- **FIRS Official Docs**: https://einvoice.firs.gov.ng/docs/
- **UBL Standards**: http://docs.oasis-open.org/ubl/
- **Local Setup**: See LOCAL-SETUP.md
- **API Documentation**: See API-DOCS.md

---

This implementation ensures full compliance with FIRS e-invoicing requirements while maintaining backward compatibility with existing invoice formats through automatic conversion and validation.