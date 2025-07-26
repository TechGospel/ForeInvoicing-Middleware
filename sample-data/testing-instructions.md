# Invoice Upload Testing Guide

This directory contains sample invoice documents for testing the FIRS-compliant invoice validation and submission system.

## Test Documents Overview

### Single Invoice Tests

1. **`single-invoice.json`** - Complete FIRS-compliant invoice
   - Contains all mandatory and optional fields
   - Demonstrates complex scenarios with allowances/charges
   - Tests multi-line items with proper tax calculations
   - Supplier: TechSolutions Nigeria Ltd (TIN: 12345678-9012)
   - Total Amount: ₦663,812.50 (including VAT)

2. **`single-invoice.xml`** - UBL 3.0 XML format
   - Manufacturing/construction industry invoice
   - Tests XML parsing and conversion
   - Supplier: Industrial Manufacturing Ltd (TIN: 20202020-3030)
   - Total Amount: ₦3,574,375.00 (including VAT)

3. **`legacy-format.json`** - Legacy format for conversion testing
   - Tests automatic format conversion
   - Simple structure that gets converted to FIRS format
   - Supplier: Legacy Systems Corp (TIN: 60606060-7070)
   - Total Amount: ₦860,000.00 (including VAT)

### Bulk Invoice Tests

4. **`bulk-invoices.json`** - Multiple invoices in one batch
   - Tests batch processing capabilities
   - Contains 3 different invoice types:
     - Commercial invoice (Electronics retail)
     - Service invoice (Consulting)
     - Credit note (Fashion returns)

## Testing Scenarios

### 1. Single Invoice Upload (Web Interface)

**Test Case**: Upload single-invoice.json through web form
```bash
1. Login to the application
2. Navigate to "Submit Invoice" page
3. Upload single-invoice.json file
4. Verify validation passes
5. Check invoice appears in history
```

**Expected Result**: 
- ✅ Validation successful
- ✅ Invoice stored with status "PENDING"
- ✅ All FIRS mandatory fields validated
- ✅ TIN format validated (12345678-9012)

### 2. XML Upload Test

**Test Case**: Upload UBL 3.0 XML file
```bash
1. Upload single-invoice.xml
2. Verify XML parsing works
3. Check converted data matches FIRS schema
```

**Expected Result**:
- ✅ XML successfully parsed
- ✅ Converted to internal FIRS format
- ✅ Business ID extracted correctly

### 3. Legacy Format Conversion

**Test Case**: Test automatic format conversion
```bash
1. Upload legacy-format.json
2. Verify conversion to FIRS format
3. Check all mandatory fields populated
```

**Expected Result**:
- ✅ Legacy format detected
- ✅ Converted to FIRS schema
- ✅ supplier → accounting_supplier_party
- ✅ lineItems → invoice_line array

### 4. Bulk Processing Test

**Test Case**: Upload multiple invoices
```bash
1. Upload bulk-invoices.json
2. Verify individual processing
3. Check batch tracking
```

**Expected Result**:
- ✅ Batch ID assigned: BATCH-20240726-001
- ✅ 3 invoices processed individually
- ✅ Each invoice gets unique validation
- ✅ Credit note (381) handled correctly

### 5. API Testing (cURL Commands)

#### Single Invoice via API
```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-data/single-invoice.json
```

#### File Upload via API
```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "invoice=@sample-data/single-invoice.xml"
```

#### Bulk Upload via API
```bash
curl -X POST http://localhost:5000/api/invoices/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-data/bulk-invoices.json
```

## Validation Test Cases

### Positive Tests (Should Pass)

1. **All mandatory fields present** ✅
   - business_id, irn, issue_date, invoice_type_code
   - accounting_supplier_party with tin and email
   - tax_total and legal_monetary_total

2. **Nigerian TIN format validation** ✅
   - Format: 12345678-9012 (8 digits, hyphen, 4 digits)
   - All test documents use correct format

3. **Currency consistency** ✅
   - document_currency_code = "NGN"
   - tax_currency_code = "NGN"

4. **Tax calculations** ✅
   - VAT rate: 7.5%
   - line_extension_amount + tax_amount = payable_amount

### Negative Tests (Should Fail)

Create modified versions to test validation:

1. **Missing mandatory fields**
   - Remove `business_id` → Should fail
   - Remove `supplier.email` → Should fail

2. **Invalid TIN format**
   - Change to "1234567890" → Should fail
   - Change to "12345678/9012" → Should fail

3. **Invalid currency**
   - Change to "USD" → Should fail (must be NGN)

4. **Tax calculation errors**
   - Wrong VAT rate → Should warn
   - Inconsistent totals → Should fail

## FIRS API Integration Tests

### Mock FIRS API Response
```json
{
  "irn": "FIRS-INV-2024-001",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "status": "VALIDATED",
  "message": "Invoice validated successfully",
  "validation_timestamp": "2024-07-26T14:30:00Z"
}
```

### Error Response Testing
```json
{
  "status": "VALIDATION_FAILED",
  "message": "Validation errors found",
  "errors": [
    "Invalid TIN format for supplier",
    "Tax calculation inconsistent"
  ],
  "warnings": [
    "Missing optional buyer information"
  ]
}
```

## Performance Testing

### Load Testing with Bulk Data
1. Create batch with 100+ invoices
2. Test system handles large batches
3. Monitor processing time and memory usage
4. Verify individual validation for each invoice

### File Size Testing
1. Test large XML files (>1MB)
2. Test JSON with many line items (50+ items)
3. Verify upload limits and processing time

## Expected Database Records

After successful upload, verify database contains:

```sql
-- Invoice record
SELECT * FROM invoices WHERE invoice_number = 'INV20240726-001';

-- Audit logs
SELECT * FROM audit_logs WHERE action = 'submit' 
  AND metadata->>'format' = 'json';

-- API usage tracking
SELECT * FROM api_usage WHERE endpoint = '/api/invoices';
```

## Troubleshooting Common Issues

### Upload Failures
- Check file format (JSON/XML only)
- Verify authentication token
- Check file size limits
- Review validation error messages

### Validation Errors
- Verify TIN format: ########-####
- Check mandatory fields are present
- Ensure currency is set to "NGN"
- Validate tax calculations manually

### FIRS API Issues
- Check FIRS_API_KEY environment variable
- Verify network connectivity
- Review FIRS API status
- Check rate limiting

## Success Criteria

For each test document:
- ✅ Upload completes without errors
- ✅ Validation passes all FIRS requirements
- ✅ Invoice stored in database
- ✅ Audit log created
- ✅ API usage tracked
- ✅ FIRS submission successful (if API key configured)

## Test Environment Setup

1. Ensure development server is running: `npm run dev`
2. Database is connected and migrated
3. Authentication is working (login as admin/admin123)
4. FIRS API key is configured (optional for local testing)
5. File upload directory has write permissions

---

Use these test documents to verify the complete invoice processing pipeline from upload through FIRS validation and submission.