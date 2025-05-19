import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Agent } from "@/lib/types";

export default function AgentList() {
  const { data: agents, isLoading, error } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <div className="text-red-500">
            Error loading agents: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {agents?.map((agent) => (
            <li key={agent.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full ${getAgentColor(agent.agentId)} flex items-center justify-center`}>
                      <span className={`${getAgentTextColor(agent.agentId)} font-medium`}>
                        {getAgentInitials(agent.name)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-primary-600 truncate">{agent.name}</p>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {capitalize(agent.status)}
                        </span>
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {capitalize(agent.type)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>
                          {agent.metadata.canEdit?.length 
                            ? `Can edit ${agent.metadata.canEdit.join(', ')} files` 
                            : "No edit permissions"}
                          {agent.metadata.maxChanges 
                            ? ` • Max ${agent.metadata.maxChanges} changes/day` 
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {/* We'd get this from a real API */}
                      {agent.status === 'active' ? `${Math.floor(Math.random() * (agent.metadata.maxChanges || 10))}/${agent.metadata.maxChanges || 0} edits today` : "Inactive"}
                    </span>
                    <Link href={`/agents/${agent.id}`}>
                      <a className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        Configure
                      </a>
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
  if (agentId.startsWith('GPT')) return 'text-blue-600';
  if (agentId === 'Claude') return 'text-purple-600';
  return 'text-gray-600';
}

function getAgentInitials(name: string): string {
  if (name === 'GPT-4') return 'GPT';
  return name.charAt(0);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
