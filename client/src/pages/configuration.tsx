import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Clock, AlertTriangle, Save, RotateCcw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const configSchema = z.object({
  validationRules: z.array(z.string()),
  autoCorrect: z.boolean(),
  strictValidation: z.boolean(),
  asyncProcessing: z.boolean(),
  retryAttempts: z.number().min(1).max(5),
  timeoutSeconds: z.number().min(10).max(300),
  firsApiUrl: z.string().url("Please enter a valid URL"),
  firsApiKey: z.string().min(1, "API key is required"),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  maxFileSize: z.number().min(1).max(100), // MB
  allowedFormats: z.array(z.string()),
});

type ConfigForm = z.infer<typeof configSchema>;

const validationRuleOptions = [
  { value: "strict_tin", label: "Strict TIN Format" },
  { value: "vat_required", label: "VAT Required" },
  { value: "line_items_required", label: "Line Items Required" },
  { value: "due_date_validation", label: "Due Date Validation" },
  { value: "currency_validation", label: "Currency Validation" },
];

const formatOptions = [
  { value: "xml", label: "XML (UBL 3.0)" },
  { value: "json", label: "JSON" },
  { value: "pdf", label: "PDF" },
];

export default function Configuration() {
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current configuration
  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ["/api/configuration"],
  });

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      validationRules: [],
      autoCorrect: false,
      strictValidation: true,
      asyncProcessing: false,
      retryAttempts: 3,
      timeoutSeconds: 30,
      firsApiUrl: "",
      firsApiKey: "",
      webhookUrl: "",
      maxFileSize: 10,
      allowedFormats: ["xml", "json"],
    },
  });

  // Watch for changes
  const watchedValues = form.watch();
  useState(() => {
    const subscription = form.watch(() => setHasChanges(true));
    return () => subscription.unsubscribe();
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: ConfigForm) => {
      return await apiRequest("/api/configuration", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "System configuration has been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Test FIRS connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/configuration/test-firs", "POST", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection successful",
        description: data.message || "FIRS API connection is working properly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Unable to connect to FIRS API",
        variant: "destructive",
      });
    },
  });

  // Reset to defaults mutation
  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/configuration/reset", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Configuration reset",
        description: "Configuration has been reset to default values.",
      });
      refetch();
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset configuration",
        variant: "destructive",
      });
    },
  });

  // Load config data into form when available
  useState(() => {
    if (config && !hasChanges) {
      form.reset(config);
    }
  }, [config]);

  const onSubmit = (data: ConfigForm) => {
    updateConfigMutation.mutate(data);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all configuration to defaults?")) {
      resetConfigMutation.mutate();
    }
  };

  const toggleValidationRule = (rule: string) => {
    const currentRules = form.getValues("validationRules");
    const newRules = currentRules.includes(rule)
      ? currentRules.filter(r => r !== rule)
      : [...currentRules, rule];
    form.setValue("validationRules", newRules);
    setHasChanges(true);
  };

  const toggleFormat = (format: string) => {
    const currentFormats = form.getValues("allowedFormats");
    const newFormats = currentFormats.includes(format)
      ? currentFormats.filter(f => f !== format)
      : [...currentFormats, format];
    form.setValue("allowedFormats", newFormats);
    setHasChanges(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading configuration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure invoice processing and FIRS integration settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetConfigMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          {hasChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Unsaved changes
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="validation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="firs">FIRS Integration</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Validation Settings */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Validation Rules
                </CardTitle>
                <CardDescription>
                  Configure invoice validation requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {validationRuleOptions.map((rule) => (
                    <div
                      key={rule.value}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <Label className="font-medium">{rule.label}</Label>
                      </div>
                      <Switch
                        checked={form.watch("validationRules").includes(rule.value)}
                        onCheckedChange={() => toggleValidationRule(rule.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Auto Correction</Label>
                      <p className="text-sm text-gray-500">
                        Automatically fix minor validation errors
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("autoCorrect")}
                      onCheckedChange={(checked) => {
                        form.setValue("autoCorrect", checked);
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Strict Validation</Label>
                      <p className="text-sm text-gray-500">
                        Reject invoices with any validation warnings
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("strictValidation")}
                      onCheckedChange={(checked) => {
                        form.setValue("strictValidation", checked);
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Allowed File Formats</Label>
                  <div className="flex gap-2">
                    {formatOptions.map((format) => (
                      <Button
                        key={format.value}
                        type="button"
                        variant={
                          form.watch("allowedFormats").includes(format.value)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleFormat(format.value)}
                      >
                        {format.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    min="1"
                    max="100"
                    {...form.register("maxFileSize", { valueAsNumber: true })}
                    onChange={(e) => {
                      form.setValue("maxFileSize", parseInt(e.target.value));
                      setHasChanges(true);
                    }}
                  />
                  {form.formState.errors.maxFileSize && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.maxFileSize.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FIRS Integration */}
          <TabsContent value="firs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  FIRS API Configuration
                </CardTitle>
                <CardDescription>
                  Configure connection to the FIRS MBS system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firsApiUrl">FIRS API URL</Label>
                  <Input
                    id="firsApiUrl"
                    type="url"
                    placeholder="https://api.firs.gov.ng/mbs/v1"
                    {...form.register("firsApiUrl")}
                    onChange={(e) => {
                      form.setValue("firsApiUrl", e.target.value);
                      setHasChanges(true);
                    }}
                  />
                  {form.formState.errors.firsApiUrl && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.firsApiUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firsApiKey">FIRS API Key</Label>
                  <Input
                    id="firsApiKey"
                    type="password"
                    placeholder="Enter your FIRS API key"
                    {...form.register("firsApiKey")}
                    onChange={(e) => {
                      form.setValue("firsApiKey", e.target.value);
                      setHasChanges(true);
                    }}
                  />
                  {form.formState.errors.firsApiKey && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.firsApiKey.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://your-app.com/webhook"
                    {...form.register("webhookUrl")}
                    onChange={(e) => {
                      form.setValue("webhookUrl", e.target.value);
                      setHasChanges(true);
                    }}
                  />
                  <p className="text-sm text-gray-500">
                    Receive notifications when invoice processing completes
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Settings */}
          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Configuration
                </CardTitle>
                <CardDescription>
                  Configure invoice processing behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Async Processing</Label>
                    <p className="text-sm text-gray-500">
                      Process invoices in the background for better performance
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("asyncProcessing")}
                    onCheckedChange={(checked) => {
                      form.setValue("asyncProcessing", checked);
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retryAttempts">Retry Attempts</Label>
                    <Select
                      value={form.watch("retryAttempts").toString()}
                      onValueChange={(value) => {
                        form.setValue("retryAttempts", parseInt(value));
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeoutSeconds">Timeout (seconds)</Label>
                    <Input
                      id="timeoutSeconds"
                      type="number"
                      min="10"
                      max="300"
                      {...form.register("timeoutSeconds", { valueAsNumber: true })}
                      onChange={(e) => {
                        form.setValue("timeoutSeconds", parseInt(e.target.value));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security and audit settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                        Security Notice
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        All API keys and sensitive configuration data are encrypted at rest.
                        Audit logs track all configuration changes with user attribution.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <Label className="font-medium">Audit Logging</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Comprehensive audit trail enabled
                    </p>
                    <Badge variant="default" className="mt-2">
                      Active
                    </Badge>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <Label className="font-medium">Data Encryption</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      AES-256 encryption for sensitive data
                    </p>
                    <Badge variant="default" className="mt-2">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button
            type="submit"
            disabled={updateConfigMutation.isPending || !hasChanges}
            className="min-w-[120px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}