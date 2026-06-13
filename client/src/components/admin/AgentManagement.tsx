import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentManagement() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", name: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: agents, isLoading, refetch } = trpc.agentManagement.list.useQuery();
  const createMutation = trpc.agentManagement.create.useMutation();
  const deactivateMutation = trpc.agentManagement.deactivate.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        email: formData.email || undefined,
      });

      toast.success("Agent created successfully");
      setFormData({ username: "", password: "", name: "", email: "" });
      setShowForm(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (agentId: number) => {
    try {
      await deactivateMutation.mutateAsync({ agentId });
      toast.success("Agent deactivated");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate agent");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-light text-gray-900 mb-2">Agent Management</h2>
          <p className="text-sm text-gray-500">Create and manage agent accounts</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gray-900 hover:bg-gray-800 text-white">
          {showForm ? "Cancel" : "Add Agent"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border border-gray-200 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email (optional)"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="bg-gray-900 hover:bg-gray-800 text-white">
                {isSubmitting ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Agents List</h3>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Username</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{agent.username}</td>
                    <td className="py-3 px-4 text-gray-900">{agent.name || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{agent.email || "-"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${agent.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {agent.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(agent.id)}
                          className="text-xs"
                        >
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No agents found</p>
        )}
      </Card>
    </div>
  );
}
