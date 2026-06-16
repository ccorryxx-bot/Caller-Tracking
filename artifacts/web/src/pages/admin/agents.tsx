import { useListAgents, useCreateAgent, useUpdateAgent, useDeactivateAgent, useResetAgentPassword, getListAgentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreVertical, Key, Ban, UserCheck, Shield } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminAgents() {
  const { data: agents, isLoading } = useListAgents();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deactivateAgent = useDeactivateAgent();
  const resetPassword = useResetAgentPassword();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAgent.mutateAsync({ data: formData });
      setIsCreateOpen(false);
      setFormData({ name: "", username: "", password: "" });
      queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
      toast({ title: "Agent created successfully" });
    } catch (error: any) {
      toast({ title: "Error creating agent", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      if (currentActive) {
        await deactivateAgent.mutateAsync({ id });
      } else {
        await updateAgent.mutateAsync({ id, data: { isActive: true } });
      }
      queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
      toast({ title: `Agent ${currentActive ? 'deactivated' : 'activated'}` });
    } catch (error: any) {
      toast({ title: "Error updating agent", description: error.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (id: number) => {
    const newPassword = prompt("Enter new password for agent:");
    if (!newPassword) return;

    try {
      await resetPassword.mutateAsync({ id, data: { newPassword } });
      toast({ title: "Password reset successfully" });
    } catch (error: any) {
      toast({ title: "Error resetting password", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-500">Manage agent accounts and access</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createAgent.isPending}>
                  {createAgent.isPending ? "Creating..." : "Create Agent"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents?.map(agent => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name || '-'}</TableCell>
                  <TableCell>{agent.username}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${agent.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleActive(agent.id, agent.isActive)}>
                          {agent.isActive ? <Ban className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                          {agent.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(agent.id)}>
                          <Key className="mr-2 h-4 w-4" /> Reset Password
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!agents?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center p-8 text-gray-500">No agents found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
