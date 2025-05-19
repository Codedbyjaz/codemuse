import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, Filter, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Change } from "@/lib/types";
import DiffViewer from "@/components/dashboard/DiffViewer";

export default function Logs() {
  const [activeTab, setActiveTab] = useState("changes");
  const [logFilter, setLogFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");

  // Load approved and rejected changes
  const { data: changesData, isLoading, error, refetch } = useQuery<Change[]>({
    queryKey: ['/api/changes'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvedChanges = changesData?.filter(change => change.status === "approved") || [];
  const rejectedChanges = changesData?.filter(change => change.status === "rejected") || [];

  // Filter changes based on selected filter
  const filteredChanges = activeTab === "changes"
    ? logFilter === "approved" 
      ? approvedChanges 
      : logFilter === "rejected" 
        ? rejectedChanges 
        : [...approvedChanges, ...rejectedChanges]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="agents">Agent Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filter:</span>
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter logs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="approved">Approved Changes</SelectItem>
                <SelectItem value="rejected">Rejected Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Time Range:</span>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="changes" className="space-y-4">
          {filteredChanges.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium">No changes found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  There are no {logFilter !== "all" ? logFilter : ""} changes in the selected time period.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredChanges.map((change) => (
              <Card key={change.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 py-3 px-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full ${getAgentColor(change.agentId)} flex items-center justify-center`}>
                        <span className={getAgentTextColor(change.agentId)}>
                          {getAgentInitials(change.agentId)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {change.metadata.agent} • {formatDate(change.createdAt)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500">{change.filePath}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            change.status === "approved" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DiffViewer diff={change.diffContent} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">Agent activity logs</h3>
              <p className="text-sm text-gray-500 mt-1">
                Agent activity logs will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
              <h3 className="mt-2 text-lg font-medium">Security logs</h3>
              <p className="text-sm text-gray-500 mt-1">
                Security-related logs including rate limiting and abuse detection events.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">System logs</h3>
              <p className="text-sm text-gray-500 mt-1">
                System-level logs will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getAgentColor(agentId: string): string {
  if (agentId.startsWith('GPT')) return 'bg-blue-100';
  if (agentId === 'Claude') return 'bg-purple-100';
  return 'bg-gray-100';
}

function getAgentTextColor(agentId: string): string {
  if (agentId.startsWith('GPT')) return 'text-blue-600 font-medium';
  if (agentId === 'Claude') return 'text-purple-600 font-medium';
  return 'text-gray-600 font-medium';
}

function getAgentInitials(agentId: string): string {
  if (agentId.startsWith('GPT')) return 'GPT';
  if (agentId === 'Claude') return 'C';
  if (agentId === 'Replit') return 'R';
  return agentId.charAt(0);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}
