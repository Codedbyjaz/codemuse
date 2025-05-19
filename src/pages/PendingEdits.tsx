import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Edit } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function PendingEdits() {
  const { toast } = useToast();
  
  const { data: pendingEdits, isLoading } = useQuery<Edit[]>({
    queryKey: ['/api/edits?status=pending'],
  });

  const approveEditMutation = useMutation({
    mutationFn: async (editId: number) => {
      return apiRequest('POST', `/api/edits/${editId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Edit approved",
        description: "The changes have been approved and applied to the project.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/edits'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve edit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectEditMutation = useMutation({
    mutationFn: async (editId: number) => {
      return apiRequest('POST', `/api/edits/${editId}/reject`, {
        reason: "Manually rejected by admin",
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit rejected",
        description: "The changes have been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/edits'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to reject edit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="p-4">Loading pending edits...</div>;
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Pending Changes</h2>
        
        {!pendingEdits || pendingEdits.length === 0 ? (
          <p className="text-neutral-600">No pending edits found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Agent</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">File</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Changes</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {pendingEdits.map((edit) => (
                  <tr key={edit.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`
                          h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                          ${edit.agentId === 'GPT-4' ? 'bg-blue-100 text-blue-800' : 
                            edit.agentId === 'Claude' ? 'bg-purple-100 text-purple-800' : 
                            edit.agentId === 'Replit' ? 'bg-orange-100 text-orange-800' : 
                            'bg-neutral-200 text-neutral-800'}
                        `}>
                          <span>{edit.agentId.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900">{edit.agentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900 font-mono">{edit.file}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={edit.status as any} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(edit.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {edit.changes} files
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/edit/${edit.id}`}>
                        <a className="text-primary hover:text-primary-dark mr-4">View</a>
                      </Link>
                      {edit.status !== 'locked' && (
                        <>
                          <Button 
                            variant="ghost" 
                            className="text-secondary hover:text-green-700 mr-2"
                            onClick={() => approveEditMutation.mutate(edit.id)}
                            disabled={approveEditMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="text-error hover:text-red-700"
                            onClick={() => rejectEditMutation.mutate(edit.id)}
                            disabled={rejectEditMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
