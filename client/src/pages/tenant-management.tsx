import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Key, Settings, Users, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tenantSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  tin: z.string().regex(/^\d{8}-\d{4}$/, "TIN must be in format 12345678-0001"),
  email: z.string().email("Please enter a valid email address"),
  isActive: z.boolean(),
});

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]),
  isActive: z.boolean(),
});

type TenantForm = z.infer<typeof tenantSchema>;
type UserForm = z.infer<typeof userSchema>;

export default function TenantManagement() {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);

  // Mock data for demo purposes
  const mockTenants = [
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

  // Fetch tenant data
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  // Mock users for demo purposes
  const mockUsers = [
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
  ];

  // Fetch users for selected tenant
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/tenants", selectedTenant?.id, "users"],
    enabled: !!selectedTenant,
  });

  const tenantForm = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      tin: "",
      email: "",
      isActive: true,
    },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "user",
      isActive: true,
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (data: TenantForm & { id: number }) => {
      return await apiRequest(`/api/tenants/${data.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Tenant updated",
        description: "Tenant details have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsEditTenantOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserForm & { tenantId: number }) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "New user has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", selectedTenant?.id, "users"] });
      setIsCreateUserOpen(false);
      userForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Regenerate API key mutation
  const regenerateApiKeyMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/regenerate-key`, {});
    },
    onSuccess: () => {
      toast({
        title: "API Key regenerated",
        description: "A new API key has been generated for this tenant.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Regeneration failed",
        description: error.message || "Failed to regenerate API key",
        variant: "destructive",
      });
    },
  });

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    tenantForm.reset({
      name: tenant.name,
      tin: tenant.tin,
      email: tenant.email,
      isActive: tenant.isActive,
    });
    setIsEditTenantOpen(true);
  };

  const handleCreateUser = () => {
    if (!selectedTenant) {
      toast({
        title: "No tenant selected",
        description: "Please select a tenant first",
        variant: "destructive",
      });
      return;
    }
    setIsCreateUserOpen(true);
  };

  const onUpdateTenant = (data: TenantForm) => {
    if (selectedTenant) {
      updateTenantMutation.mutate({ ...data, id: selectedTenant.id });
    }
  };

  const onCreateUser = (data: UserForm) => {
    if (selectedTenant) {
      createUserMutation.mutate({ ...data, tenantId: selectedTenant.id });
    }
  };

  const toggleApiKeyVisibility = (tenantId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [tenantId]: !prev[tenantId]
    }));
  };

  if (tenantsLoading) {
    return <div className="p-6">Loading tenants...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage organizations and their users
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {(tenants || mockTenants).map((tenant: any) => (
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      TIN: {tenant.tin}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {tenant.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={tenant.isActive ? "default" : "secondary"}>
                        {tenant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTenant(tenant);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* API Key Section */}
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">API Key</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleApiKeyVisibility(tenant.id);
                        }}
                      >
                        {showApiKey[tenant.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateApiKeyMutation.mutate(tenant.id);
                        }}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <code className="text-xs block mt-1">
                    {showApiKey[tenant.id] 
                      ? tenant.apiKey 
                      : "•".repeat(32)
                    }
                  </code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Users for Selected Tenant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
              {selectedTenant && (
                <Badge variant="outline">
                  {selectedTenant.name}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedTenant 
                ? `Users for ${selectedTenant.name}`
                : "Select a tenant to view users"
              }
            </CardDescription>
            {selectedTenant && (
              <Button
                onClick={handleCreateUser}
                size="sm"
                className="self-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedTenant ? (
              usersLoading ? (
                <div>Loading users...</div>
              ) : (
                <div className="space-y-3">
                  {users?.map((user: any) => (
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
                  {(!users || users.length === 0) && (
                    <p className="text-gray-500 text-center py-4">
                      No users found for this tenant
                    </p>
                  )}
                </div>
              )
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select a tenant to view and manage users
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditTenantOpen} onOpenChange={setIsEditTenantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information and settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={tenantForm.handleSubmit(onUpdateTenant)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name</Label>
              <Input
                id="edit-name"
                {...tenantForm.register("name")}
              />
              {tenantForm.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {tenantForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tin">TIN</Label>
              <Input
                id="edit-tin"
                {...tenantForm.register("tin")}
              />
              {tenantForm.formState.errors.tin && (
                <p className="text-sm text-red-600">
                  {tenantForm.formState.errors.tin.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                {...tenantForm.register("email")}
              />
              {tenantForm.formState.errors.email && (
                <p className="text-sm text-red-600">
                  {tenantForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={tenantForm.watch("isActive")}
                onCheckedChange={(checked) => tenantForm.setValue("isActive", checked)}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTenantOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTenantMutation.isPending}
              >
                {updateTenantMutation.isPending ? "Updating..." : "Update Tenant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user to {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                {...userForm.register("username")}
              />
              {userForm.formState.errors.username && (
                <p className="text-sm text-red-600">
                  {userForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                {...userForm.register("email")}
              />
              {userForm.formState.errors.email && (
                <p className="text-sm text-red-600">
                  {userForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                {...userForm.register("password")}
              />
              {userForm.formState.errors.password && (
                <p className="text-sm text-red-600">
                  {userForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select
                value={userForm.watch("role")}
                onValueChange={(value) => userForm.setValue("role", value as "admin" | "user")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-isActive"
                checked={userForm.watch("isActive")}
                onCheckedChange={(checked) => userForm.setValue("isActive", checked)}
              />
              <Label htmlFor="create-isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}