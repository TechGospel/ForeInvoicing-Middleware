import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Code, Copy, ChevronDown, ChevronRight, Book, Key, Zap, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  responses?: { status: number; description: string; example?: string }[];
}

const endpoints: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Authenticate user and receive access token",
    auth: false,
    requestBody: `{
  "username": "admin",
  "password": "password123"
}`,
    responses: [
      {
        status: 200,
        description: "Authentication successful",
        example: `{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}`
      },
      {
        status: 401,
        description: "Invalid credentials",
        example: `{
  "message": "Invalid credentials"
}`
      }
    ]
  },
  {
    method: "POST",
    path: "/api/auth/register",
    description: "Register new tenant and admin user",
    auth: false,
    requestBody: `{
  "username": "newuser",
  "email": "user@company.com",
  "password": "securepass123",
  "companyName": "Your Company Ltd",
  "tin": "12345678-0001"
}`,
    responses: [
      {
        status: 201,
        description: "Account created successfully",
        example: `{
  "message": "Account created successfully",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@company.com",
    "tenantId": 2,
    "role": "admin"
  }
}`
      }
    ]
  },
  {
    method: "POST",
    path: "/api/invoices",
    description: "Submit invoice for processing",
    auth: true,
    parameters: [
      { name: "invoice", type: "file", required: true, description: "Invoice file (XML/JSON)" },
      { name: "priority", type: "string", required: false, description: "Processing priority (normal, high, urgent)" },
      { name: "strictValidation", type: "boolean", required: false, description: "Enable strict validation mode" }
    ],
    responses: [
      {
        status: 200,
        description: "Invoice processed successfully",
        example: `{
  "success": true,
  "invoiceId": 123,
  "irn": "IRN-2024-001523-ABCD",
  "qrCode": "QR-CODE-DATA-HERE",
  "status": "success"
}`
      },
      {
        status: 400,
        description: "Validation failed",
        example: `{
  "success": false,
  "errors": [
    "Invalid TIN format",
    "Missing VAT details"
  ]
}`
      }
    ]
  },
  {
    method: "GET",
    path: "/api/invoices",
    description: "Retrieve tenant invoices",
    auth: true,
    parameters: [
      { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
      { name: "limit", type: "number", required: false, description: "Items per page (default: 20)" },
      { name: "status", type: "string", required: false, description: "Filter by status" }
    ],
    responses: [
      {
        status: 200,
        description: "List of invoices",
        example: `[
  {
    "id": 123,
    "invoiceNumber": "INV-2024-001523",
    "totalAmount": "1250000.00",
    "currency": "NGN",
    "status": "success",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]`
      }
    ]
  },
  {
    method: "GET",
    path: "/api/dashboard/metrics",
    description: "Get dashboard metrics",
    auth: true,
    responses: [
      {
        status: 200,
        description: "Dashboard metrics",
        example: `{
  "totalInvoices": 1542,
  "successRate": 94.7,
  "activeTenants": 23,
  "avgResponseTime": 1.2
}`
      }
    ]
  },
  {
    method: "GET",
    path: "/api/audit-logs",
    description: "Retrieve audit logs",
    auth: true,
    parameters: [
      { name: "page", type: "number", required: false, description: "Page number" },
      { name: "limit", type: "number", required: false, description: "Items per page" },
      { name: "action", type: "string", required: false, description: "Filter by action type" }
    ],
    responses: [
      {
        status: 200,
        description: "List of audit logs",
        example: `[
  {
    "id": 1,
    "action": "submit",
    "message": "Invoice submitted successfully",
    "timestamp": "2024-01-15T10:30:00Z",
    "level": "info"
  }
]`
      }
    ]
  }
];

const codeExamples = {
  curl: {
    login: `curl -X POST https://your-api-domain.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "admin",
    "password": "password123"
  }'`,
    submitInvoice: `curl -X POST https://your-api-domain.com/api/invoices \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "invoice=@invoice.xml" \\
  -F "priority=high"`,
    getInvoices: `curl -X GET "https://your-api-domain.com/api/invoices?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
  },
  javascript: {
    login: `const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123'
  })
});

const data = await response.json();
console.log(data.token);`,
    submitInvoice: `const formData = new FormData();
formData.append('invoice', file);
formData.append('priority', 'high');

const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`
  },
  body: formData
});

const result = await response.json();`,
    getInvoices: `const response = await fetch('/api/invoices?page=1&limit=10', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});

const invoices = await response.json();`
  },
  python: {
    login: `import requests

response = requests.post('https://your-api-domain.com/api/auth/login', 
  json={
    'username': 'admin',
    'password': 'password123'
  }
)

token = response.json()['token']`,
    submitInvoice: `import requests

files = {'invoice': open('invoice.xml', 'rb')}
data = {'priority': 'high'}
headers = {'Authorization': f'Bearer {token}'}

response = requests.post('https://your-api-domain.com/api/invoices',
  files=files, 
  data=data, 
  headers=headers
)

result = response.json()`,
    getInvoices: `import requests

headers = {'Authorization': f'Bearer {token}'}
params = {'page': 1, 'limit': 10}

response = requests.get('https://your-api-domain.com/api/invoices',
  headers=headers, 
  params=params
)

invoices = response.json()`
  }
};

export default function ApiDocs() {
  const { toast } = useToast();
  const [expandedEndpoints, setExpandedEndpoints] = useState<{[key: string]: boolean}>({});
  const [selectedLanguage, setSelectedLanguage] = useState("curl");

  const toggleEndpoint = (endpointKey: string) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [endpointKey]: !prev[endpointKey]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code example has been copied to your clipboard.",
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "POST": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "PUT": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "DELETE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete guide to the FIRS MBS Invoice Processing API
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          v1.0
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Learn how to integrate with the FIRS MBS Invoice Processing API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3>Base URL</h3>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  https://your-api-domain.com
                </code>

                <h3>Content Types</h3>
                <ul>
                  <li><strong>JSON:</strong> application/json</li>
                  <li><strong>Form Data:</strong> multipart/form-data (for file uploads)</li>
                </ul>

                <h3>Supported Invoice Formats</h3>
                <ul>
                  <li><strong>XML:</strong> UBL 3.0 compliant XML format</li>
                  <li><strong>JSON:</strong> Structured JSON format</li>
                  <li><strong>PDF:</strong> PDF files (with OCR processing)</li>
                </ul>

                <h3>Rate Limits</h3>
                <ul>
                  <li><strong>Authentication:</strong> 10 requests per minute</li>
                  <li><strong>Invoice Processing:</strong> 100 requests per hour</li>
                  <li><strong>Data Retrieval:</strong> 1000 requests per hour</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="h-5 w-5" />
                  Secure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  JWT-based authentication with secure API key management
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5" />
                  Fast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Average response time under 2 seconds with async processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5" />
                  Compliant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fully FIRS MBS compliant with comprehensive validation
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Authentication */}
        <TabsContent value="authentication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Methods</CardTitle>
              <CardDescription>
                How to authenticate your API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. User Authentication (JWT)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    For dashboard and user-specific operations
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                    <code className="text-sm">
                      Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. API Key Authentication</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    For server-to-server integrations
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                    <code className="text-sm">
                      X-API-Key: your-tenant-api-key
                    </code>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Token Expiration</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• JWT tokens expire after 24 hours</li>
                  <li>• API keys don't expire but can be regenerated</li>
                  <li>• Refresh tokens automatically when they expire</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints */}
        <TabsContent value="endpoints" className="space-y-4">
          {endpoints.map((endpoint, index) => {
            const endpointKey = `${endpoint.method}-${endpoint.path}`;
            const isExpanded = expandedEndpoints[endpointKey];

            return (
              <Card key={index}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleEndpoint(endpointKey)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                          {endpoint.auth && (
                            <Badge variant="outline" className="text-xs">
                              🔒 Auth Required
                            </Badge>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <CardDescription className="text-left">
                        {endpoint.description}
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="border-t space-y-4">
                      {endpoint.parameters && (
                        <div>
                          <h4 className="font-semibold mb-2">Parameters</h4>
                          <div className="space-y-2">
                            {endpoint.parameters.map((param, paramIndex) => (
                              <div key={paramIndex} className="border rounded p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {param.name}
                                  </code>
                                  <Badge variant="outline" className="text-xs">
                                    {param.type}
                                  </Badge>
                                  {param.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {param.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {endpoint.requestBody && (
                        <div>
                          <h4 className="font-semibold mb-2">Request Body</h4>
                          <div className="relative">
                            <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-sm overflow-x-auto">
                              <code>{endpoint.requestBody}</code>
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(endpoint.requestBody!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {endpoint.responses && (
                        <div>
                          <h4 className="font-semibold mb-2">Responses</h4>
                          <div className="space-y-3">
                            {endpoint.responses.map((response, responseIndex) => (
                              <div key={responseIndex} className="border rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge 
                                    className={
                                      response.status >= 200 && response.status < 300
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    }
                                  >
                                    {response.status}
                                  </Badge>
                                  <span className="text-sm">{response.description}</span>
                                </div>
                                {response.example && (
                                  <div className="relative">
                                    <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                                      <code>{response.example}</code>
                                    </pre>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => copyToClipboard(response.example!)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </TabsContent>

        {/* Code Examples */}
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code Examples
              </CardTitle>
              <CardDescription>
                Ready-to-use code examples in different programming languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex gap-2">
                  {Object.keys(codeExamples).map((lang) => (
                    <Button
                      key={lang}
                      variant={selectedLanguage === lang ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedLanguage(lang)}
                    >
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Authentication</h4>
                  <div className="relative">
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm overflow-x-auto">
                      <code>{codeExamples[selectedLanguage as keyof typeof codeExamples].login}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(codeExamples[selectedLanguage as keyof typeof codeExamples].login)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Submit Invoice</h4>
                  <div className="relative">
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm overflow-x-auto">
                      <code>{codeExamples[selectedLanguage as keyof typeof codeExamples].submitInvoice}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(codeExamples[selectedLanguage as keyof typeof codeExamples].submitInvoice)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Get Invoices</h4>
                  <div className="relative">
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm overflow-x-auto">
                      <code>{codeExamples[selectedLanguage as keyof typeof codeExamples].getInvoices}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(codeExamples[selectedLanguage as keyof typeof codeExamples].getInvoices)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}