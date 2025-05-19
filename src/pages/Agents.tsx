import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Edit } from "lucide-react";
import { Agent } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Agents() {
  const { toast } = useToast();
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // New agent form state
  const [newAgentId, setNewAgentId] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentType, setNewAgentType] = useState("editor");
  const [newAgentStatus, setNewAgentStatus] = useState(true);
  const [newAgentFilesPattern, setNewAgentFilesPattern] = useState("*.js");
  const [newAgentMaxChanges, setNewAgentMaxChanges] = useState("10");

  const { data: agents, isLoading, error, refetch } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const updateAgentMutation = useMutation({
    mutationFn: async (agent: Partial<Agent>) => {
      return apiRequest('PATCH', `/api/agents/${agent.id}`, agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Agent updated",
        description: "Agent settings have been updated successfully.",
      });
      setIsEditAgentOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update agent",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const addAgentMutation = useMutation({
    mutationFn: async (agent: Omit<Agent, 'id' | 'createdAt'>) => {
      return apiRequest('POST', `/api/agents`, agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Agent added",
        description: "New agent has been added successfully.",
      });
      setIsAddAgentOpen(false);
      resetNewAgentForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to add agent",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const resetNewAgentForm = () => {
    setNewAgentId("");
    setNewAgentName("");
    setNewAgentType("editor");
    setNewAgentStatus(true);
    setNewAgentFilesPattern("*.js");
    setNewAgentMaxChanges("10");
  };

  const handleAddAgent = () => {
    const newAgent = {
      agentId: newAgentId,
      name: newAgentName,
      type: newAgentType,
      status: newAgentStatus ? "active" : "inactive",
      metadata: {
        canEdit: [newAgentFilesPattern],
        maxChanges: parseInt(newAgentMaxChanges),
      }
    };
    
    addAgentMutation.mutate(newAgent as any);
  };

  const handleUpdateAgent = () => {
    if (!selectedAgent) return;
    
    updateAgentMutation.mutate({
      id: selectedAgent.id,
      // Include other updated fields here
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="mt-1 text-sm text-gray-500">Manage AI agents and their permissions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddAgentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500">
              Error loading agents: {(error as Error).message}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {agents?.map((agent) => (
            <Card key={agent.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-gray-50 py-3">
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-full ${getAgentColor(agent.agentId)} flex items-center justify-center mr-3`}>
                    <span className={getAgentTextColor(agent.agentId)}>
                      {getAgentInitials(agent.name)}
                    </span>
                  </div>
                  <CardTitle>{agent.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedAgent(agent);
                    setIsEditAgentOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === "active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {agent.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Type</h3>
                    <p className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Agent ID</h3>
                    <p className="mt-1 text-sm">{agent.agentId}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">File Permissions</h3>
                    <p className="mt-1 text-sm">{agent.metadata.canEdit?.join(', ') || "None"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Max Changes</h3>
                    <p className="mt-1 text-sm">{agent.metadata.maxChanges || "Unlimited"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="mt-1 text-sm">{formatDate(agent.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Agent Dialog */}
      <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Create a new AI agent with specific permissions and capabilities.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-id" className="text-right">
                Agent ID
              </Label>
              <Input 
                id="agent-id" 
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                placeholder="GPT-4" 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-name" className="text-right">
                Name
              </Label>
              <Input 
                id="agent-name" 
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="GPT-4 Agent" 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-type" className="text-right">
                Type
              </Label>
              <select 
                id="agent-type" 
                value={newAgentType}
                onChange={(e) => setNewAgentType(e.target.value)}
                className="col-span-3 border rounded p-2"
              >
                <option value="editor">Editor</option>
                <option value="reviewer">Reviewer</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-active" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch 
                  id="agent-active" 
                  checked={newAgentStatus}
                  onCheckedChange={setNewAgentStatus}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-files" className="text-right">
                Can Edit
              </Label>
              <Input 
                id="agent-files" 
                value={newAgentFilesPattern}
                onChange={(e) => setNewAgentFilesPattern(e.target.value)}
                placeholder="*.js" 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-max-changes" className="text-right">
                Max Changes
              </Label>
              <Input 
                id="agent-max-changes" 
                type="number"
                value={newAgentMaxChanges}
                onChange={(e) => setNewAgentMaxChanges(e.target.value)}
                className="col-span-3" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAgentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAgent} disabled={addAgentMutation.isPending}>
              {addAgentMutation.isPending ? "Adding..." : "Add Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditAgentOpen} onOpenChange={setIsEditAgentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update agent settings and permissions.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-agent-id" className="text-right">
                  Agent ID
                </Label>
                <Input 
                  id="edit-agent-id" 
                  value={selectedAgent.agentId}
                  disabled
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-agent-name" className="text-right">
                  Name
                </Label>
                <Input 
                  id="edit-agent-name" 
                  defaultValue={selectedAgent.name}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-agent-type" className="text-right">
                  Type
                </Label>
                <select 
                  id="edit-agent-type" 
                  defaultValue={selectedAgent.type}
                  className="col-span-3 border rounded p-2"
                >
                  <option value="editor">Editor</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-agent-active" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch 
                    id="edit-agent-active" 
                    defaultChecked={selectedAgent.status === "active"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-agent-files" className="text-right">
                  Can Edit
                </Label>
                <Input 
                  id="edit-agent-files" 
                  defaultValue={selectedAgent.metadata.canEdit?.join(', ')}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-agent-max-changes" className="text-right">
                  Max Changes
                </Label>
                <Input 
                  id="edit-agent-max-changes" 
                  type="number"
                  defaultValue={selectedAgent.metadata.maxChanges}
                  className="col-span-3" 
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAgentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAgent} disabled={updateAgentMutation.isPending}>
              {updateAgentMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function getAgentInitials(name: string): string {
  if (name === 'GPT-4') return 'GPT';
  return name.charAt(0);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}
