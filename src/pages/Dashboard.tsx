import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertCircle, Eye } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import AgentList from "@/components/dashboard/AgentList";
import ChangesList from "@/components/dashboard/ChangesList";
import SystemStatus from "@/components/dashboard/SystemStatus";
import { SystemStatus as SystemStatusType } from "@/lib/types";

export default function Dashboard() {
  const { data: status, isLoading } = useQuery<SystemStatusType>({
    queryKey: ['/api/status'],
  });

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor and manage AI agent activities in real-time</p>
        </div>
        <div className="mt-4 md:mt-0 flex">
          <button type="button" className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Agent
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          icon={<CheckCircle />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          title="Approved Edits"
          value={isLoading ? 0 : (status?.changes.approved || 0)}
          linkText="View all"
          linkHref="/logs"
        />
        
        <StatCard
          icon={<Clock />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          title="Pending Approvals"
          value={isLoading ? 0 : (status?.changes.pending || 0)}
          linkText="Review now"
          linkHref="/"
        />
        
        <StatCard
          icon={<AlertCircle />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          title="Rejected Edits"
          value={isLoading ? 0 : (status?.changes.rejected || 0)}
          linkText="View details"
          linkHref="/logs"
        />
        
        <StatCard
          icon={<Eye />}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          title="Active Agents"
          value={isLoading ? 0 : (status?.agents.active || 0)}
          linkText="Manage agents"
          linkHref="/agents"
        />
      </div>

      {/* Agent Status Section */}
      <AgentList />

      {/* Pending Changes Section */}
      <ChangesList />

      {/* System Status Section */}
      <SystemStatus />
    </>
  );
}
