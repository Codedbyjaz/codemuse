import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Lock } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Locks() {
  const { toast } = useToast();
  const [isAddLockOpen, setIsAddLockOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newPattern, setNewPattern] = useState("");

  const { data: locks, isLoading, error, refetch } = useQuery<Lock[]>({
    queryKey: ['/api/locks'],
  });

  const deleteLockMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/locks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locks'] });
      toast({
        title: "Lock removed",
        description: "The lock has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove lock",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const addLockMutation = useMutation({
    mutationFn: async (lock: { filePath: string; pattern: string | null }) => {
      return apiRequest('POST', `/api/locks`, lock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locks'] });
      toast({
        title: "Lock added",
        description: "New lock has been added successfully.",
      });
      setIsAddLockOpen(false);
      setNewFilePath("");
      setNewPattern("");
    },
    onError: (error) => {
      toast({
        title: "Failed to add lock",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const handleDeleteLock = (id: number) => {
    if (confirm("Are you sure you want to remove this lock?")) {
      deleteLockMutation.mutate(id);
    }
  };

  const handleAddLock = () => {
    if (!newFilePath) {
      toast({
        title: "File path required",
        description: "Please enter a file path to lock.",
        variant: "destructive",
      });
      return;
    }

    addLockMutation.mutate({
      filePath: newFilePath,
      pattern: newPattern || null
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locks</h1>
          <p className="mt-1 text-sm text-gray-500">Manage file locks and protection patterns</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddLockOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lock
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Locks Work</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Locks prevent AI agents from modifying protected files. You can lock files in two ways:
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium">File Path Locks</h3>
              <p className="text-sm text-gray-500 mt-1">
                Lock an entire file by specifying its path. For example: <code>config/settings.json</code>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Pattern Locks</h3>
              <p className="text-sm text-gray-500 mt-1">
                Lock specific patterns within a file using regular expressions. For example, locking <code>def delete_user\(</code> in <code>main.py</code> prevents changes to the delete_user function.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500">
              Error loading locks: {(error as Error).message}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Locks</CardTitle>
          </CardHeader>
          <CardContent>
            {locks && locks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No locks currently active</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddLockOpen(true)}
                  className="mt-2"
                >
                  Add your first lock
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {locks?.map((lock) => (
                  <div key={lock.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{lock.filePath}</p>
                      {lock.pattern && (
                        <p className="text-sm text-gray-500 mt-1">
                          Pattern: <code className="text-xs bg-gray-100 p-1 rounded">{lock.pattern}</code>
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteLock(lock.id)}
                      disabled={deleteLockMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Lock Dialog */}
      <Dialog open={isAddLockOpen} onOpenChange={setIsAddLockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lock</DialogTitle>
            <DialogDescription>
              Lock a file or pattern to prevent modifications by AI agents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-path">File Path</Label>
              <Input 
                id="file-path" 
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="config/settings.json" 
              />
              <p className="text-xs text-gray-500">
                Relative path to the file you want to lock.
              </p>
            </div>

            <Separator className="my-2" />
            
            <div className="space-y-2">
              <Label htmlFor="pattern">Pattern (Optional)</Label>
              <Input 
                id="pattern" 
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="function delete\(" 
              />
              <p className="text-xs text-gray-500">
                Regular expression pattern to lock specific parts of the file.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLockOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLock} disabled={addLockMutation.isPending}>
              {addLockMutation.isPending ? "Adding..." : "Add Lock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
