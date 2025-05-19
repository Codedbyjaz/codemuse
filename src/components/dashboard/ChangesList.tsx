import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Change } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DiffViewer from "./DiffViewer";

export default function ChangesList() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const { data: changes, isLoading, error } = useQuery<Change[]>({
    queryKey: ['/api/changes'],
  });

  const approveMutation = useMutation({
    mutationFn: async (changeId: number) => {
      return apiRequest('POST', `/api/changes/${changeId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/changes'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (changeId: number) => {
      return apiRequest('POST', `/api/changes/${changeId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/changes'] });
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Changes</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-60 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Changes</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <div className="text-red-500">
            Error loading changes: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  const pendingChanges = changes?.filter(change => change.status === "pending") || [];
  
  // Filter changes based on active tab
  const filteredChanges = activeTab === "all" 
    ? pendingChanges 
    : pendingChanges.filter(change => change.agentId === activeTab);

  // Calculate pagination
  const totalPages = Math.ceil(filteredChanges.length / itemsPerPage);
  const paginatedChanges = filteredChanges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(id);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Pending Changes</h2>
        <div className="flex space-x-2">
          <button 
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={() => pendingChanges.forEach(change => handleApprove(change.id))}
          >
            Approve All
          </button>
          <button 
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={() => pendingChanges.forEach(change => handleReject(change.id))}
          >
            Reject All
          </button>
        </div>
      </div>

      {/* Tabbed Navigation for Changes */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button 
              className={`${
                activeTab === "all" 
                  ? "border-primary-500 text-primary-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab("all")}
            >
              All Pending ({pendingChanges.length})
            </button>
            <button 
              className={`${
                activeTab === "GPT-4" 
                  ? "border-primary-500 text-primary-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab("GPT-4")}
            >
              GPT-4 ({pendingChanges.filter(c => c.agentId === "GPT-4").length})
            </button>
            <button 
              className={`${
                activeTab === "Claude" 
                  ? "border-primary-500 text-primary-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab("Claude")}
            >
              Claude ({pendingChanges.filter(c => c.agentId === "Claude").length})
            </button>
            <button 
              className={`${
                activeTab === "Replit" 
                  ? "border-primary-500 text-primary-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab("Replit")}
            >
              Replit ({pendingChanges.filter(c => c.agentId === "Replit").length})
            </button>
          </nav>
        </div>

        {/* Change Items List */}
        {paginatedChanges.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No pending changes to review.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {paginatedChanges.map((change) => (
              <li key={change.id} className="px-4 py-5 sm:px-6">
                <div className="mb-3 flex justify-between">
                  <div>
                    <div className="flex items-center">
                      <div className={`h-8 w-8 rounded-full ${getAgentColor(change.agentId)} flex items-center justify-center`}>
                        <span className={getAgentTextColor(change.agentId)}>
                          {getAgentInitials(change.agentId)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {change.metadata.agent} • <span className="text-gray-500">{getTimeAgo(change.createdAt)}</span>
                        </p>
                        <p className="text-sm text-primary-600">{getChangeDescription(change)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={() => handleApprove(change.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </button>
                    <button 
                      className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={() => handleReject(change.id)}
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>

                <DiffViewer diff={change.diffContent} />
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredChanges.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredChanges.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
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

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function getChangeDescription(change: Change): string {
  // Extract description from the diff or file path
  const fileName = change.filePath.split('/').pop() || change.filePath;
  
  if (change.diffContent.includes('BaseAgent')) {
    return `Implementing ${fileName} for Agent Abstraction`;
  }
  
  if (change.diffContent.includes('checkLocks')) {
    return `Adding regex support to ${fileName}`;
  }
  
  return `Changes to ${fileName}`;
}
