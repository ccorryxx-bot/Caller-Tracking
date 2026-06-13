import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CallbackQueueEntry() {
  const [formData, setFormData] = useState({
    callerName: "",
    callerPhone: "",
    scheduledTime: "",
    priority: "medium",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = trpc.callbackQueue.create.useMutation();
  const { refetch } = trpc.callbackQueue.listMine.useQuery({ includeCompleted: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scheduledDate = new Date(formData.scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        toast.error("Invalid scheduled time");
        setIsSubmitting(false);
        return;
      }

      await createMutation.mutateAsync({
        callerName: formData.callerName,
        callerPhone: formData.callerPhone,
        scheduledTime: scheduledDate,
        priority: formData.priority as "low" | "medium" | "high",
        notes: formData.notes || undefined,
      });

      toast.success("Callback added to queue");
      setFormData({
        callerName: "",
        callerPhone: "",
        scheduledTime: "",
        priority: "medium",
        notes: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to add callback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Add Callback</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caller Name *</label>
          <Input
            type="text"
            value={formData.callerName}
            onChange={(e) => setFormData({ ...formData, callerName: e.target.value })}
            placeholder="Enter caller name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caller Phone *</label>
          <Input
            type="tel"
            value={formData.callerPhone}
            onChange={(e) => setFormData({ ...formData, callerPhone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time *</label>
          <Input
            type="datetime-local"
            value={formData.scheduledTime}
            onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes for the callback"
            rows={3}
          />
        </div>

        <Button type="submit" disabled={isSubmitting || !formData.callerName || !formData.callerPhone || !formData.scheduledTime} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
          {isSubmitting ? "Adding..." : "Add Callback"}
        </Button>
      </form>
    </Card>
  );
}
