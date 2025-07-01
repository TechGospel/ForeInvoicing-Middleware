import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Settings, Trash2, Edit, Key, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Schema for tenant creation
const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tin: z.string().regex(/^\d{8}-\d{4}$/, "TIN must be in format XXXXXXXX-XXXX"),
  email: z.string().email("Invalid email address"),
  isActive: z.boolean().default(true),
  config: z.object({
    validationRules: z.array(z.string()).default(["strict_tin"]),
    autoCorrect: z.boolean().default(false),
    strictValidation: z.boolean().default(true),
  }).optional(),
});

// Schema for user creation
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).default("user"),
  isActive: z.boolean().default(true),
});

type TenantForm = z.infer<typeof tenantSchema>;
type UserForm = z.infer<typeof userSchema>;

interface Tenant {
  id: number;
  name: string;
  tin: string;
  email: string;
  apiKey: string;
  isActive: boolean;
  config?: any;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  tenantId: number;
  createdAt: string;
}

export default function TenantManagementFull() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Check if user has permission to access tenant management
  if (authLoading) {
    return <div className="p-4 sm:p-6">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access tenant management. Only administrators can manage tenants and users.
          </p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Fetch tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  // Fetch users for selected tenant
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: [`/api/tenants/${selectedTenant?.id}/users`],
    enabled: !!selectedTenant,
  });

  // Forms
  const tenantForm = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      tin: "",
      email: "",
      isActive: true,
      config: {
        validationRules: ["strict_tin"],
        autoCorrect: false,
        strictValidation: true,
      },
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

  // Mutations
  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantForm) => {
      const response = await apiRequest("POST", "/api/tenants", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setShowCreateTenant(false);
      tenantForm.reset();
      toast({ title: "Success", description: "Tenant created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create tenant: " + error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const response = await apiRequest("POST", `/api/tenants/${selectedTenant!.id}/users`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${selectedTenant?.id}/users`] });
      setShowCreateUser(false);
      userForm.reset();
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserForm>) => {
      const response = await apiRequest("PUT", `/api/users/${editingUser!.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${selectedTenant?.id}/users`] });
      setShowEditUser(false);
      setEditingUser(null);
      userForm.reset();
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${selectedTenant?.id}/users`] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user: " + error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateApiKeyMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/regenerate-key`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Success", description: "API key regenerated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to regenerate API key: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const onCreateTenant = (data: TenantForm) => {
    createTenantMutation.mutate(data);
  };

  const onCreateUser = (data: UserForm) => {
    createUserMutation.mutate(data);
  };

  const onUpdateUser = (data: UserForm) => {
    updateUserMutation.mutate(data);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    userForm.setValue("username", user.username);
    userForm.setValue("email", user.email);
    userForm.setValue("role", user.role as "admin" | "user");
    userForm.setValue("isActive", user.isActive);
    userForm.setValue("password", ""); // Don't show current password
    setShowEditUser(true);
  };

  if (tenantsLoading) {
    return <div className="p-6">Loading tenants...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tenant Management</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage organizations and their users
          </p>
        </div>
        <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Add a new organization to the system
              </DialogDescription>
            </DialogHeader>
            <Form {...tenantForm}>
              <form onSubmit={tenantForm.handleSubmit(onCreateTenant)} className="space-y-4">
                <FormField
                  control={tenantForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tenantForm.control}
                  name="tin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TIN (Tax Identification Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678-9012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tenantForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tenantForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <p className="text-sm text-gray-600">
                          Enable API access for this tenant
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateTenant(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTenantMutation.isPending}
                    className="flex-1"
                  >
                    {createTenantMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants List */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenants.map((tenant: Tenant) => (
                <div
                  key={tenant.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedTenant?.id === tenant.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTenant(tenant)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{tenant.name}</h3>
                        <Badge variant={tenant.isActive ? "default" : "secondary"}>
                          {tenant.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {tenant.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        TIN: {tenant.tin}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateApiKeyMutation.mutate(tenant.id);
                          }}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Regenerate API Key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users
                  {selectedTenant && (
                    <Badge variant="outline">{selectedTenant.name}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedTenant 
                    ? `Manage users for ${selectedTenant.name}`
                    : "Select a tenant to manage users"
                  }
                </CardDescription>
              </div>
              {selectedTenant && (
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to {selectedTenant.name}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
                        <FormField
                          control={userForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@acme.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <p className="text-sm text-gray-600">
                                  Allow user to access the system
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateUser(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createUserMutation.isPending}
                            className="flex-1"
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTenant ? (
              <div className="text-center py-8 text-gray-500">
                Select a tenant from the left to manage its users
              </div>
            ) : usersLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found. Click "Add User" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{user.username}</h4>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditUser(user)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUpdateUser)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (leave empty to keep current)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-gray-600">
                        Allow user to access the system
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                    userForm.reset();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="flex-1"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}