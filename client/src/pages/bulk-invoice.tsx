import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "@/components/invoice/file-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";

interface BulkProcessingResult {
  batchId: string;
  totalInvoices: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  status: 'processing' | 'completed' | 'failed';
  results: Array<{
    invoiceNumber: string;
    status: 'success' | 'failed' | 'processing';
    invoiceId?: number;
    irn?: string;
    error?: string;
  }>;
}

export default function BulkInvoice() {
  const [formData, setFormData] = useState({
    tenantId: "",
    format: "json",
    priority: "normal",
    strictValidation: true,
    autoCorrect: false,
    asyncProcessing: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<BulkProcessingResult | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  // Fetch tenants for dropdown
  const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: ["/api/tenants"],
    enabled: isAuthenticated,
  });

  // Handle authentication errors for tenants query
  useEffect(() => {
    if (tenantsError && isUnauthorizedError(tenantsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [tenantsError, toast]);

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/invoices/bulk", data);
    },
    onSuccess: (result: BulkProcessingResult) => {
      toast({
        title: "Success",
        description: `Bulk submission started with ${result.totalInvoices} invoices`,
      });
      setProcessingResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantId) {
      toast({
        title: "Validation Error",
        description: "Please select a tenant",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Validation Error", 
        description: "Please select a bulk invoice file",
        variant: "destructive",
      });
      return;
    }

    const submitData = new FormData();
    submitData.append("bulkInvoices", selectedFile);
    submitData.append("tenantId", formData.tenantId);
    submitData.append("format", formData.format);
    submitData.append("priority", formData.priority);
    submitData.append("strictValidation", formData.strictValidation.toString());
    submitData.append("autoCorrect", formData.autoCorrect.toString());
    submitData.append("asyncProcessing", formData.asyncProcessing.toString());

    setProcessingResult(null);
    submitMutation.mutate(submitData);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setProcessingResult(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bulk Invoice Submission</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Upload and process multiple invoices in a single batch
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Submit Multiple Invoices
          </CardTitle>
          <Badge variant="outline">API Endpoint: POST /api/invoices/bulk</Badge>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tenant">Tenant</Label>
                  <Select value={formData.tenantId} onValueChange={(value) => setFormData({...formData, tenantId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={tenantsLoading ? "Loading tenants..." : "Select tenant..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants && Array.isArray(tenants) && tenants.map((tenant: any) => (
                        <SelectItem key={tenant.id} value={tenant.id.toString()}>
                          {tenant.name} (TIN: {tenant.tin})
                        </SelectItem>
                      ))}
                      {!tenantsLoading && (!tenants || !Array.isArray(tenants) || tenants.length === 0) && (
                        <SelectItem value="no-tenants" disabled>
                          No tenants available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Bulk File Format</Label>
                  <RadioGroup 
                    value={formData.format} 
                    onValueChange={(value) => setFormData({...formData, format: value})}
                    className="flex flex-row space-x-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="xml" id="xml" />
                      <Label htmlFor="xml">Multiple UBL 3.0 XML</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="json" id="json" />
                      <Label htmlFor="json">JSON Array</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.format === 'json' 
                      ? "Upload a JSON file containing an array of invoice objects"
                      : "Upload a file containing multiple XML invoice documents"
                    }
                  </p>
                </div>

                <div>
                  <Label>Bulk Invoice File</Label>
                  <FileUpload 
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                    accept={formData.format === 'json' ? '.json' : '.xml,.txt'}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Each invoice will be processed individually with the same settings
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Validation Options</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="strict"
                        checked={formData.strictValidation}
                        onCheckedChange={(checked) => setFormData({...formData, strictValidation: checked as boolean})}
                      />
                      <Label htmlFor="strict">Strict FIRS validation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="auto-correct"
                        checked={formData.autoCorrect}
                        onCheckedChange={(checked) => setFormData({...formData, autoCorrect: checked as boolean})}
                      />
                      <Label htmlFor="auto-correct">Auto-correct minor formatting issues</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="async"
                        checked={formData.asyncProcessing}
                        onCheckedChange={(checked) => setFormData({...formData, asyncProcessing: checked as boolean})}
                      />
                      <Label htmlFor="async">Process asynchronously (recommended for large batches)</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Submit Bulk Invoices
                  </Button>
                  
                  {processingResult && (
                    <Button 
                      type="button" 
                      variant="outline"
                      className="w-full"
                      onClick={handleReset}
                    >
                      Reset Form
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Processing Results */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bulk Processing Results
              <Badge variant={processingResult.status === 'completed' ? 'default' : 'secondary'}>
                {processingResult.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{processingResult.totalInvoices}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processingResult.successCount}</div>
                <div className="text-sm text-gray-500">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{processingResult.failureCount}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{processingResult.processedCount}</div>
                <div className="text-sm text-gray-500">Processed</div>
              </div>
            </div>

            {processingResult.status === 'processing' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing progress</span>
                  <span>{processingResult.processedCount} / {processingResult.totalInvoices}</span>
                </div>
                <Progress 
                  value={(processingResult.processedCount / processingResult.totalInvoices) * 100} 
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Individual Results:</h4>
              <div className="max-h-60 overflow-auto space-y-1">
                {processingResult.results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-mono text-sm">{result.invoiceNumber}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.status === 'success' && result.irn && (
                        <span className="text-green-600">IRN: {result.irn}</span>
                      )}
                      {result.status === 'failed' && result.error && (
                        <span className="text-red-600">{result.error}</span>
                      )}
                      {result.status === 'processing' && (
                        <span className="text-blue-600">Processing...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}