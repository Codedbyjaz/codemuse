import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Loader2, FileText, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';

// Color schemes for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#8884d8'];
const STATUS_COLORS = {
  pending: '#FFBB28',
  approved: '#00C49F',
  rejected: '#FF8042',
  locked: '#8884d8'
};

const Statistics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats', timeRange],
    queryFn: () => apiRequest(`/api/stats?timeRange=${timeRange}`),
  });

  // Fetch change history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/changes/history', timeRange],
    queryFn: () => apiRequest(`/api/changes/history?timeRange=${timeRange}`),
  });

  // Fetch agent performance
  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ['/api/agents/stats', timeRange],
    queryFn: () => apiRequest(`/api/agents/stats?timeRange=${timeRange}`),
  });

  // Fetch file activity
  const { data: fileData, isLoading: fileLoading } = useQuery({
    queryKey: ['/api/stats/files', timeRange],
    queryFn: () => apiRequest(`/api/stats/files?timeRange=${timeRange}`),
  });

  // Loading state
  if (statsLoading || historyLoading || agentLoading || fileLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <h2 className="text-2xl font-semibold">Loading dashboard data...</h2>
      </div>
    );
  }

  // Calculate statistics for the cards
  const totalChanges = statsData?.totalChanges || 0;
  const approvalRate = statsData?.approvalRate || 0;
  const activeAgents = statsData?.activeAgents || 0;
  const mostActiveDir = statsData?.mostActiveDirectory || 'N/A';

  // Prepare data for time series chart
  const timeSeriesData = historyData?.timeSeriesData || [];

  // Prepare data for status distribution pie chart
  const statusDistributionData = statsData?.statusDistribution || [];

  // Prepare data for agent performance
  const agentPerformanceData = agentData?.performance || [];

  // Prepare data for file types
  const fileTypesData = fileData?.fileTypes || [];

  // Prepare data for directories
  const directoriesData = fileData?.directories || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">
        VoidSync Dashboard
      </h1>

      <div className="flex justify-between items-center mb-6">
        <div className="text-xl font-semibold">Statistics and Visualization</div>
        <div className="flex items-center space-x-2">
          <span>Time Range:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards for quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChanges}</div>
            <p className="text-xs text-muted-foreground">Edit requests in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalRate}%</div>
            <p className="text-xs text-muted-foreground">Changes approved vs. rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAgents}</div>
            <p className="text-xs text-muted-foreground">Agents with activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Most Active Area</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate" title={mostActiveDir}>
              {mostActiveDir}
            </div>
            <p className="text-xs text-muted-foreground">Directory with most changes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="files">File Activity</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Volume Over Time</CardTitle>
                <CardDescription>
                  Number of changes submitted over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>
                  Distribution of changes by current status
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                Chart shows the percentage of changes in each status category
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Performance Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
              <CardDescription>
                Performance metrics for each agent in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submitted" fill="#8884d8" name="Submitted" />
                  <Bar dataKey="approved" fill="#82ca9d" name="Approved" />
                  <Bar dataKey="rejected" fill="#ff8042" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Comparison of submitted, approved, and rejected changes by agent
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Approval Rates</CardTitle>
              <CardDescription>
                Percentage of changes approved for each agent
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approvalRate" fill="#82ca9d" name="Approval Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Activity Tab */}
        <TabsContent value="files" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>File Types Distribution</CardTitle>
                <CardDescription>
                  Types of files being edited
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fileTypesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {fileTypesData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Directory Activity</CardTitle>
                <CardDescription>
                  Most active directories by number of changes
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={directoriesData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Changes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Change History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change History Timeline</CardTitle>
              <CardDescription>
                Complete history of changes over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#8884d8"
                    name="Submitted"
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#82ca9d"
                    name="Approved"
                  />
                  <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="#ff8042"
                    name="Rejected"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Visual timeline of change activity by status
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Statistics;