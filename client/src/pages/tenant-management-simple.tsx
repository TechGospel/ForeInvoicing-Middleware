import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Key, Users, Plus, Edit, Eye, EyeOff } from "lucide-react";

export default function TenantManagement() {
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});

  // Mock data for demonstration
  const tenants = [
    {
      id: 1,
      name: "ABC Corporation",
      tin: "12345678-0001",
      email: "admin@abc-corp.com",
      apiKey: "api_abc_12345678",
      isActive: true,
      createdAt: "2024-01-15"
    },
    {
      id: 2,
      name: "XYZ Limited",
      tin: "87654321-0002",
      email: "admin@xyz-ltd.com",
      apiKey: "api_xyz_87654321",
      isActive: false,
      createdAt: "2024-02-10"
    }
  ];

  const users = [
    {
      id: 1,
      username: "john_admin",
      email: "john@abc-corp.com",
      role: "admin",
      isActive: true,
      tenantId: 1
    },
    {
      id: 2,
      username: "jane_user",
      email: "jane@abc-corp.com",
      role: "user",
      isActive: true,
      tenantId: 1
    }
  ].filter(user => user.tenantId === selectedTenant?.id);

  const toggleApiKeyVisibility = (tenantId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [tenantId]: !prev[tenantId]
    }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tenant Management</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage organizations and their users
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Tenants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Tenants
            </CardTitle>
            <CardDescription>
              All registered organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenants.map((tenant: any) => (
              <div
                key={tenant.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTenant?.id === tenant.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => setSelectedTenant(tenant)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">TIN: {tenant.tin}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={tenant.isActive ? "default" : "secondary"} className="text-xs">
                        {tenant.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Created: {tenant.createdAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Key className="h-4 w-4" />
                        <span className="font-mono text-xs">
                          {showApiKey[tenant.id] ? tenant.apiKey : "•".repeat(16)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleApiKeyVisibility(tenant.id);
                        }}
                      >
                        {showApiKey[tenant.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
              {selectedTenant && (
                <span className="text-sm font-normal text-gray-500">
                  for {selectedTenant.name}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {selectedTenant ? "Manage users for selected tenant" : "Select a tenant to view users"}
            </CardDescription>
            {selectedTenant && (
              <Button size="sm" className="w-fit">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedTenant ? (
              <div className="space-y-3">
                {users.map((user: any) => (
                  <div
                    key={user.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{user.username}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                          <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No users found for this tenant
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select a tenant from the left to view and manage users
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}