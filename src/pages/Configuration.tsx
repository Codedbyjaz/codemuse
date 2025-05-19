import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Configuration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // These would typically come from API calls
  const [rateLimitValue, setRateLimitValue] = useState("10");
  const [maxChangesValue, setMaxChangesValue] = useState("50");
  const [fingerprintCacheTime, setFingerprintCacheTime] = useState("30");
  const [diffContextLines, setDiffContextLines] = useState("3");

  const handleSaveConfig = () => {
    toast({
      title: "Configuration saved",
      description: "Your changes have been saved successfully.",
      duration: 3000,
    });
  };

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="mt-1 text-sm text-gray-500">Manage system settings and preferences</p>
        </div>
        <Button onClick={handleSaveConfig} className="bg-primary-600 hover:bg-primary-700">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input id="project-name" defaultValue="DevSync" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-version">Version</Label>
                  <Input id="project-version" defaultValue="2.0.0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input id="admin-email" defaultValue="admin@devsync.io" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-dir">Project Directory</Label>
                  <Input id="project-dir" defaultValue="./project" />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="max-changes">Maximum Changes Per Day</Label>
                <Input 
                  id="max-changes"
                  type="number"
                  value={maxChangesValue}
                  onChange={(e) => setMaxChangesValue(e.target.value)}
                />
                <p className="text-sm text-gray-500">Total changes allowed across all agents per day</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Manage agent permissions, roles, and limitations. These settings control how AI agents interact with your codebase.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">GPT-4 Agent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="gpt-role">Role</Label>
                          <select id="gpt-role" className="border rounded p-1">
                            <option>editor</option>
                            <option>reviewer</option>
                            <option>restricted</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center">
                          <Label htmlFor="gpt-can-edit">Can Edit</Label>
                          <Input id="gpt-can-edit" className="w-1/2" defaultValue="*.js" />
                        </div>
                        <div className="flex justify-between items-center">
                          <Label htmlFor="gpt-max-changes">Max Changes/Day</Label>
                          <Input id="gpt-max-changes" type="number" className="w-1/4" defaultValue="10" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Claude Agent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="claude-role">Role</Label>
                          <select id="claude-role" className="border rounded p-1">
                            <option>reviewer</option>
                            <option>editor</option>
                            <option>restricted</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center">
                          <Label htmlFor="claude-can-comment">Can Comment</Label>
                          <input id="claude-can-comment" type="checkbox" defaultChecked />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Replit Agent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="replit-role">Role</Label>
                          <select id="replit-role" className="border rounded p-1">
                            <option>editor</option>
                            <option>reviewer</option>
                            <option>restricted</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center">
                          <Label htmlFor="replit-can-edit">Can Edit</Label>
                          <Input id="replit-can-edit" className="w-1/2" defaultValue="*.py" />
                        </div>
                        <div className="flex justify-between items-center">
                          <Label htmlFor="replit-max-changes">Max Changes/Day</Label>
                          <Input id="replit-max-changes" type="number" className="w-1/4" defaultValue="15" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                  <Input 
                    id="rate-limit" 
                    type="number" 
                    value={rateLimitValue}
                    onChange={(e) => setRateLimitValue(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Maximum requests allowed per agent per minute</p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Abuse Detection</h3>
                  <div className="flex items-center">
                    <input id="enable-abuse-detection" type="checkbox" className="mr-2" defaultChecked />
                    <Label htmlFor="enable-abuse-detection">Enable abuse detection</Label>
                  </div>
                  <p className="text-sm text-gray-500">Automatically block agents that exceed rate limits or attempt to access locked resources</p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Sandbox Settings</h3>
                  <div className="flex items-center">
                    <input id="require-approval" type="checkbox" className="mr-2" defaultChecked />
                    <Label htmlFor="require-approval">Require approval for all changes</Label>
                  </div>
                  <p className="text-sm text-gray-500">When enabled, all changes must be approved before being applied to production</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fingerprint-cache">Fingerprint Cache Time (minutes)</Label>
                <Input 
                  id="fingerprint-cache" 
                  type="number" 
                  value={fingerprintCacheTime}
                  onChange={(e) => setFingerprintCacheTime(e.target.value)}
                />
                <p className="text-sm text-gray-500">How long to cache file fingerprints before recalculating</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="diff-context">Diff Context Lines</Label>
                <Input 
                  id="diff-context" 
                  type="number" 
                  value={diffContextLines}
                  onChange={(e) => setDiffContextLines(e.target.value)}
                />
                <p className="text-sm text-gray-500">Number of unchanged context lines to show in diffs</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="log-retention">Log Retention (days)</Label>
                <Input id="log-retention" type="number" defaultValue="30" />
                <p className="text-sm text-gray-500">How long to keep logs before automatic cleanup</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
