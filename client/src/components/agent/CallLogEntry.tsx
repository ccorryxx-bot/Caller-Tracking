import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const CALL_OUTCOMES = [
  { value: "completed", label: "Completed" },
  { value: "voicemail", label: "Voicemail" },
  { value: "callback_scheduled", label: "Callback Scheduled" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "other", label: "Other" },
];

export default function CallLogEntry() {
  const [formData, setFormData] = useState({
    callType: "incoming",
    callerName: "",
    callerPhone: "",
    duration: 0,
    outcome: "completed",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = trpc.callLog.create.useMutation();
  const { refetch } = trpc.callLog.listMine.useQuery({ limit: 50 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createMutation.mutateAsync({
        callType: formData.callType as "incoming" | "outgoing",
        callerName: formData.callerName || undefined,
        callerPhone: formData.callerPhone,
        duration: parseInt(formData.duration.toString()),
        outcome: formData.outcome as any,
        notes: formData.notes || undefined,
      });

      toast.success("Call logged successfully");
      setFormData({
        callType: "incoming",
        callerName: "",
        callerPhone: "",
        duration: 0,
        outcome: "completed",
        notes: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to log call");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Log a Call</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Call Type</label>
          <Select value={formData.callType} onValueChange={(value) => setFormData({ ...formData, callType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incoming">Incoming</SelectItem>
              <SelectItem value="outgoing">Outgoing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caller Name</label>
          <Input
            type="text"
            value={formData.callerName}
            onChange={(e) => setFormData({ ...formData, callerName: e.target.value })}
            placeholder="Enter caller name"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Outcome</label>
          <Select value={formData.outcome} onValueChange={(value) => setFormData({ ...formData, outcome: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_OUTCOMES.map((outcome) => (
                <SelectItem key={outcome.value} value={outcome.value}>
                  {outcome.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about the call"
            rows={3}
          />
        </div>

        <Button type="submit" disabled={isSubmitting || !formData.callerPhone} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
          {isSubmitting ? "Logging..." : "Log Call"}
        </Button>
      </form>
    </Card>
  );
}
