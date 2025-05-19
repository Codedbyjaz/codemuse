import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Loader2, RefreshCw, Info, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';

// Color schemes for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#8884d8'];

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

// Calculate grade based on approval rate
const getGrade = (approvalRate: number) => {
  if (approvalRate >= 90) return { grade: 'A', color: 'text-green-500' };
  if (approvalRate >= 80) return { grade: 'B', color: 'text-blue-500' };
  if (approvalRate >= 70) return { grade: 'C', color: 'text-yellow-500' };
  if (approvalRate >= 60) return { grade: 'D', color: 'text-orange-500' };
  return { grade: 'F', color: 'text-red-500' };
};

// Agent metrics card component
const AgentMetricCard = ({ title, value, icon, description, trend }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className={`flex items-center text-xs ${
            trend.direction === 'up' 
              ? 'text-green-500' 
              : trend.direction === 'down' 
                ? 'text-red-500' 
                : 'text-gray-500'
          }`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            {Math.abs(trend.value)}% from previous period
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

const AgentPerformance = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');

  // Fetch agent statistics
  const { data: agentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/agents/stats', timeRange, selectedAgent],
    queryFn: () => apiRequest(`/api/agents/stats?timeRange=${timeRange}&agentId=${selectedAgent}`),
  });

  // Fetch all agents for dropdown
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: () => apiRequest('/api/agents'),
  });

  // Fetch agent performance over time
  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['/api/agents/timeline', timeRange, selectedAgent],
    queryFn: () => apiRequest(`/api/agents/timeline?timeRange=${timeRange}&agentId=${selectedAgent}`),
  });

  // Fetch file type distribution by agent
  const { data: fileTypesData, isLoading: fileTypesLoading } = useQuery({
    queryKey: ['/api/agents/filetypes', timeRange, selectedAgent],
    queryFn: () => apiRequest(`/api/agents/filetypes?timeRange=${timeRange}&agentId=${selectedAgent}`),
  });

  // Loading state
  const isLoading = statsLoading || agentsLoading || timeSeriesLoading || fileTypesLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <h2 className="text-2xl font-semibold">Loading agent performance data...</h2>
      </div>
    );
  }

  // Extract data
  const agents = agentsData || [];
  const performance = agentStats?.performance || [];
  const selectedAgentData = selectedAgent === 'all' 
    ? null 
    : performance.find((a: any) => a.agentId === selectedAgent);
  const timeSeries = timeSeriesData?.data || [];
  const fileTypes = fileTypesData?.data || [];

  const getRadarData = () => {
    // Convert data to radar format for the selected agent or for all agents
    if (selectedAgent !== 'all' && selectedAgentData) {
      return [
        { subject: 'Approval Rate', A: selectedAgentData.approvalRate, fullMark: 100 },
        { subject: 'Changes', A: selectedAgentData.totalChanges / 10, fullMark: 100 },
        { subject: 'Accuracy', A: selectedAgentData.accuracy || 0, fullMark: 100 },
        { subject: 'File Types', A: selectedAgentData.fileTypesCount || 0, fullMark: 100 },
        { subject: 'Speed', A: selectedAgentData.avgProcessingTime || 0, fullMark: 100 }
      ];
    }
    
    // If all agents selected, compare top performers
    const topAgents = performance.slice(0, 3).map((agent: any, index: number) => {
      return {
        subject: 'Approval Rate',
        [agent.name]: agent.approvalRate,
        fullMark: 100,
      };
    });
    
    return topAgents;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">
        Agent Performance
      </h1>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <div className="text-xl font-semibold">Agent Performance Metrics</div>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <span>Agent:</span>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.agentId} value={agent.agentId}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <span>Time Range:</span>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedAgent !== 'all' && selectedAgentData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedAgentData.name}</CardTitle>
                    <CardDescription>{selectedAgentData.type} agent</CardDescription>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-3xl font-bold">
                      <span className={getGrade(selectedAgentData.approvalRate).color}>
                        {getGrade(selectedAgentData.approvalRate).grade}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Performance Grade
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Approval Rate</span>
                    <span className="font-semibold">{selectedAgentData.approvalRate}%</span>
                  </div>
                  <Progress value={selectedAgentData.approvalRate} className="h-2" />
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  Last active: {formatDate(selectedAgentData.lastActivity || new Date().toISOString())}
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <AgentMetricCard
              title="Total Changes"
              value={selectedAgentData.totalChanges}
              icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
              description="Total changes submitted"
              trend={{ value: 5.2, direction: 'up' }}
            />
            <AgentMetricCard
              title="Approved"
              value={selectedAgentData.approved}
              icon={<Award className="h-4 w-4 text-green-500" />}
              description="Changes approved"
              trend={{ value: 8.1, direction: 'up' }}
            />
            <AgentMetricCard
              title="Rejected"
              value={selectedAgentData.rejected}
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              description="Changes rejected"
              trend={{ value: 2.3, direction: 'down' }}
            />
            <AgentMetricCard
              title="Accuracy"
              value={`${selectedAgentData.accuracy || 0}%`}
              icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
              description="Overall accuracy score"
              trend={{ value: 1.5, direction: 'up' }}
            />
          </div>
        </>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-1 md:grid-cols-4 w-full">
          <TabsTrigger value="summary">Performance Summary</TabsTrigger>
          <TabsTrigger value="comparison">Agent Comparison</TabsTrigger>
          <TabsTrigger value="timeline">Performance Over Time</TabsTrigger>
          <TabsTrigger value="filetypes">File Type Analysis</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Radar Chart</CardTitle>
                <CardDescription>
                  {selectedAgent === 'all' 
                    ? 'Comparison of top 3 agents across different metrics' 
                    : 'Performance metrics across different dimensions'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={90} data={getRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    {selectedAgent !== 'all' ? (
                      <Radar
                        name={selectedAgentData?.name || 'Agent'}
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    ) : (
                      performance.slice(0, 3).map((agent: any, index: number) => (
                        <Radar
                          key={agent.agentId}
                          name={agent.name}
                          dataKey={agent.name}
                          stroke={COLORS[index % COLORS.length]}
                          fill={COLORS[index % COLORS.length]}
                          fillOpacity={0.6}
                        />
                      ))
                    )}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Rate by Agent</CardTitle>
                <CardDescription>
                  Percentage of changes approved for each agent
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="approvalRate" 
                      name="Approval Rate (%)" 
                      fill={selectedAgent === 'all' ? '#82ca9d' : '#8884d8'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of all agents in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>Performance metrics for all agents</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Changes</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Approval Rate</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance.map((agent: any) => {
                      const gradeInfo = getGrade(agent.approvalRate);
                      return (
                        <TableRow key={agent.agentId}>
                          <TableCell className="font-medium">{agent.name}</TableCell>
                          <TableCell>{agent.type}</TableCell>
                          <TableCell className="text-right">{agent.totalChanges}</TableCell>
                          <TableCell className="text-right">{agent.approved}</TableCell>
                          <TableCell className="text-right">{agent.rejected}</TableCell>
                          <TableCell className="text-right">{agent.approvalRate}%</TableCell>
                          <TableCell>
                            <span className={gradeInfo.color}>{gradeInfo.grade}</span>
                          </TableCell>
                          <TableCell>{formatDate(agent.lastActivity || new Date().toISOString())}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Changes by Agent</CardTitle>
                <CardDescription>
                  Total number of changes submitted by each agent
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalChanges" name="Total Changes" fill="#8884d8" />
                    <Bar dataKey="approved" name="Approved" fill="#82ca9d" />
                    <Bar dataKey="rejected" name="Rejected" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Distribution</CardTitle>
                <CardDescription>
                  Percentage of changes by agent type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalChanges"
                    >
                      {performance.map((entry: any, index: number) => (
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
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                {selectedAgent === 'all' 
                  ? 'All agents performance trend over time' 
                  : `${selectedAgentData?.name}'s performance trend over time`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="changes"
                    name="Changes"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="approvalRate"
                    name="Approval Rate (%)"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Types Tab */}
        <TabsContent value="filetypes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>File Types Distribution</CardTitle>
                <CardDescription>
                  Types of files being edited by {selectedAgent === 'all' ? 'all agents' : selectedAgentData?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fileTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {fileTypes.map((entry: any, index: number) => (
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
                <CardTitle>File Type Success Rate</CardTitle>
                <CardDescription>
                  Approval rate by file type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={fileTypes}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approvalRate" name="Approval Rate (%)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  Higher is better - indicates which file types have higher approval rates
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentPerformance;