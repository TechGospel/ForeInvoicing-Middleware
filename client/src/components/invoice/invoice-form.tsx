import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "./file-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

export function InvoiceForm() {
  const [formData, setFormData] = useState({
    tenantId: "",
    format: "json",
    priority: "normal",
    strictValidation: true,
    autoCorrect: false,
    asyncProcessing: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch tenants for dropdown
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/invoices", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      setSelectedFile(null);
    },
    onError: (error: any) => {
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
        description: "Please select an invoice file",
        variant: "destructive",
      });
      return;
    }

    const submitData = new FormData();
    submitData.append("invoice", selectedFile);
    submitData.append("tenantId", formData.tenantId);
    submitData.append("format", formData.format);
    submitData.append("priority", formData.priority);
    submitData.append("strictValidation", formData.strictValidation.toString());
    submitData.append("autoCorrect", formData.autoCorrect.toString());
    submitData.append("asyncProcessing", formData.asyncProcessing.toString());

    submitMutation.mutate(submitData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Submit New Invoice</CardTitle>
        <Badge variant="outline">API Endpoint: POST /api/invoices</Badge>
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
                <Label>Invoice Format</Label>
                <RadioGroup 
                  value={formData.format} 
                  onValueChange={(value) => setFormData({...formData, format: value})}
                  className="flex flex-row space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="xml" id="xml" />
                    <Label htmlFor="xml">UBL 3.0 XML</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json">JSON</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Invoice File</Label>
                <FileUpload 
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                  accept=".xml,.json"
                />
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
                    <Label htmlFor="async">Process asynchronously</Label>
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

              <div className="pt-4">
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
                  Submit Invoice
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
