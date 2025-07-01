import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CalendarIcon, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface ApiUsageRecord {
  id: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

interface ApiUsageResponse {
  data: ApiUsageRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type SortField = 'timestamp' | 'endpoint' | 'responseTime' | 'statusCode';
type SortOrder = 'asc' | 'desc';

export default function ApiUsage() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Filters and pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortField,
    sortOrder,
    ...(endpointFilter && endpointFilter !== "all" && { endpoint: endpointFilter }),
    ...(methodFilter && methodFilter !== "all" && { method: methodFilter }),
    ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
    ...(dateRange.from && { fromDate: format(startOfDay(dateRange.from), 'yyyy-MM-dd') }),
    ...(dateRange.to && { toDate: format(endOfDay(dateRange.to), 'yyyy-MM-dd') })
  });

  // Fetch API usage data
  const { 
    data: apiUsageData, 
    error: apiUsageError, 
    isLoading,
    refetch 
  } = useQuery<ApiUsageResponse>({
    queryKey: ["/api/usage/detailed", queryParams.toString()],
    enabled: isAuthenticated,
  });

  // Handle authentication errors
  useEffect(() => {
    if (apiUsageError && isUnauthorizedError(apiUsageError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [apiUsageError, toast]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sorting
  };

  // Handle filter changes
  const handleFilterChange = () => {
    setPage(1); // Reset to first page when filtering
    refetch();
  };

  // Clear all filters
  const clearFilters = () => {
    setEndpointFilter("all");
    setMethodFilter("all");
    setStatusFilter("all");
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    setPage(1);
  };

  // Get unique endpoints for filter dropdown
  const uniqueEndpoints = Array.from(
    new Set(apiUsageData?.data?.map(record => record.endpoint) || [])
  );

  const uniqueMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const statusCodes = ['200', '201', '400', '401', '403', '404', '500'];

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getStatusBadgeVariant = (status: number) => {
    if (status >= 200 && status < 300) return "default";
    if (status >= 300 && status < 400) return "secondary";
    if (status >= 400 && status < 500) return "destructive";
    return "destructive";
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return "outline";
      case 'POST': return "default";
      case 'PUT': return "secondary";
      case 'DELETE': return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Usage Analytics</h1>
          <p className="text-muted-foreground">
            Detailed API usage history and analytics for your tenant
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Endpoint Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Endpoint</label>
              <Select value={endpointFilter} onValueChange={setEndpointFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All endpoints" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All endpoints</SelectItem>
                  {uniqueEndpoints.map(endpoint => (
                    <SelectItem key={endpoint} value={endpoint}>{endpoint}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Method Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Method</label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {uniqueMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusCodes.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleFilterChange}>Apply Filters</Button>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            API Usage Records
            {apiUsageData?.pagination && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({apiUsageData.pagination.total} total records)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : apiUsageData?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API usage records found for the selected criteria
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-2">
                          Timestamp
                          {getSortIcon('timestamp')}
                        </div>
                      </TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('endpoint')}
                      >
                        <div className="flex items-center gap-2">
                          Endpoint
                          {getSortIcon('endpoint')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('statusCode')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('statusCode')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('responseTime')}
                      >
                        <div className="flex items-center gap-2">
                          Response Time
                          {getSortIcon('responseTime')}
                        </div>
                      </TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiUsageData?.data?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(record.timestamp), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getMethodBadgeVariant(record.method)}>
                            {record.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.endpoint}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(record.statusCode)}>
                            {record.statusCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {record.responseTime}ms
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.ipAddress || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {apiUsageData?.pagination && apiUsageData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, apiUsageData.pagination.total)} of {apiUsageData.pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, apiUsageData.pagination.totalPages) }, (_, i) => {
                        const pageNumber = Math.max(1, Math.min(
                          apiUsageData.pagination.totalPages - 4,
                          page - 2
                        )) + i;
                        
                        if (pageNumber > apiUsageData.pagination.totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={page === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === apiUsageData.pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}