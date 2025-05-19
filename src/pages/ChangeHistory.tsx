import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Info } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

// Badge colors for each status
const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return <Badge className="bg-green-500 hover:bg-green-600">{status}</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500 hover:bg-red-600">{status}</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
    case 'locked':
      return <Badge className="bg-purple-500 hover:bg-purple-600">{status}</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

// Format relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
};

const ChangeDetails = ({ change }: { change: any }) => {
  if (!change) return null;

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Change #{change.id}</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p>{getStatusBadge(change.status)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Agent</p>
          <p>{change.agentId}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p>{formatDate(change.createdAt)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p>{formatDate(change.updatedAt)}</p>
        </div>
      </div>

      <Separator className="my-4" />

      <div>
        <p className="text-sm text-muted-foreground mb-1">File Path</p>
        <p className="bg-muted p-2 rounded text-sm font-mono mb-4">{change.filePath}</p>
      </div>

      {change.description && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Description</p>
          <p className="bg-muted p-2 rounded text-sm">{change.description}</p>
        </div>
      )}

      {change.metadata && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Metadata</p>
          <pre className="bg-muted p-2 rounded text-sm overflow-auto">
            {JSON.stringify(change.metadata, null, 2)}
          </pre>
        </div>
      )}

      {change.approvedBy && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Approved By</p>
          <p>{change.approvedBy} ({formatDate(change.approvedAt)})</p>
        </div>
      )}

      {change.rejectedBy && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Rejected By</p>
          <p>{change.rejectedBy} ({formatDate(change.rejectedAt)})</p>
        </div>
      )}

      <Separator className="my-4" />

      <div>
        <p className="text-sm text-muted-foreground mb-1">Diff</p>
        <pre className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-96">
          {change.diffContent}
        </pre>
      </div>
    </div>
  );
};

const ChangeHistory = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChange, setSelectedChange] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const PAGE_SIZE = 10;

  // Fetch changes
  const { data, isLoading } = useQuery({
    queryKey: ['/api/changes', currentPage, selectedAgent, selectedStatus, searchQuery],
    queryFn: () => apiRequest(`/api/changes?page=${currentPage}&pageSize=${PAGE_SIZE}&agent=${selectedAgent}&status=${selectedStatus}&search=${encodeURIComponent(searchQuery)}`),
  });

  // Fetch agents for filter
  const { data: agentsData } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: () => apiRequest('/api/agents'),
  });

  // Compute pagination values
  const totalPages = data?.totalPages || 1;
  const changes = data?.changes || [];

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // View details of a change
  const viewChangeDetails = (change: any) => {
    setSelectedChange(change);
    setDetailsOpen(true);
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    let items = [];
    
    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink 
          onClick={() => handlePageChange(1)}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Show ellipsis if needed
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Show current page and surrounding pages
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i <= 1 || i >= totalPages) continue;
      
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => handlePageChange(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <h2 className="text-2xl font-semibold">Loading change history...</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">
        Change History
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Agent</label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentsData?.map((agent: any) => (
                <SelectItem key={agent.agentId} value={agent.agentId}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="flex space-x-2">
            <Input
              placeholder="Search by file path or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={() => setCurrentPage(1)}>Search</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Change Records</CardTitle>
              <CardDescription>
                Complete history of all changes submitted to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>
                  Showing {changes.length} of {data?.totalItems || 0} total changes
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Agent</TableHead>
                    <TableHead>File Path</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.length > 0 ? (
                    changes.map((change: any) => (
                      <TableRow key={change.id}>
                        <TableCell>{change.id}</TableCell>
                        <TableCell>{getStatusBadge(change.status)}</TableCell>
                        <TableCell>{change.agentId}</TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]" title={change.filePath}>
                          {change.filePath}
                        </TableCell>
                        <TableCell title={formatDate(change.createdAt)}>
                          {formatRelativeTime(change.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewChangeDetails(change)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No changes found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {renderPaginationItems()}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Change Details</CardTitle>
              <CardDescription>
                Select a change to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                {selectedChange ? (
                  <ChangeDetails change={selectedChange} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="mb-2">No change selected</p>
                    <p className="text-sm text-muted-foreground">
                      Click on a change in the table to view its details
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChangeHistory;