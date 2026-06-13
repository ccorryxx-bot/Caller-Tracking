import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function PhoneNumberManagement() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ phoneNumber: "", agentId: "", campaign: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: phoneNumbers, isLoading: loadingPhones, refetch: refetchPhones } = trpc.phoneNumber.list.useQuery();
  const { data: agents, isLoading: loadingAgents } = trpc.agentManagement.list.useQuery();
  const assignMutation = trpc.phoneNumber.assign.useMutation();

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await assignMutation.mutateAsync({
        phoneNumber: formData.phoneNumber,
        agentId: parseInt(formData.agentId),
        campaign: formData.campaign || undefined,
      });

      toast.success("Phone number assigned successfully");
      setFormData({ phoneNumber: "", agentId: "", campaign: "" });
      setShowForm(false);
      refetchPhones();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign phone number");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-light text-gray-900 mb-2">Phone Number Management</h2>
          <p className="text-sm text-gray-500">Assign and track phone numbers</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gray-900 hover:bg-gray-800 text-white">
          {showForm ? "Cancel" : "Assign Phone Number"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border border-gray-200 shadow-sm">
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                <Select value={formData.agentId} onValueChange={(value) => setFormData({ ...formData, agentId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name || agent.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign (Optional)</label>
                <Input
                  type="text"
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting || !formData.phoneNumber || !formData.agentId} className="bg-gray-900 hover:bg-gray-800 text-white">
                {isSubmitting ? "Assigning..." : "Assign Phone Number"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Phone Numbers</h3>
        {loadingPhones ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : phoneNumbers && phoneNumbers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Phone Number</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Agent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {phoneNumbers.map((pn) => {
                  const agent = agents?.find((a) => a.id === pn.agentId);
                  return (
                    <tr key={pn.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{pn.phoneNumber}</td>
                      <td className="py-3 px-4 text-gray-900">{agent?.name || agent?.username || "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{pn.campaign || "-"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded ${pn.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {pn.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No phone numbers assigned</p>
        )}
      </Card>
    </div>
  );
}
