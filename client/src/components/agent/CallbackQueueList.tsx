import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

export default function CallbackQueueList() {
  const { data: callbacks, isLoading, refetch } = trpc.callbackQueue.listMine.useQuery({ includeCompleted: false });
  const markCompletedMutation = trpc.callbackQueue.markCompleted.useMutation();

  const handleMarkCompleted = async (callbackId: number) => {
    try {
      await markCompletedMutation.mutateAsync({ callbackId });
      toast.success("Callback marked as completed");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark callback as completed");
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const isOverdue = (scheduledTime: Date) => {
    return new Date(scheduledTime) < new Date();
  };

  return (
    <Card className="p-6 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Callback Queue</h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : callbacks && callbacks.length > 0 ? (
        <div className="space-y-2">
          {callbacks
            .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
            .map((callback) => (
              <div
                key={callback.id}
                className={`p-3 rounded border transition-colors ${
                  isOverdue(callback.scheduledTime) ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{callback.callerName}</p>
                    <p className="text-xs text-gray-500">{callback.callerPhone}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(callback.priority)}`}>{callback.priority}</span>
                    {isOverdue(callback.scheduledTime) && <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Overdue</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>📅 {format(new Date(callback.scheduledTime), "MMM d, yyyy h:mm a")}</span>
                  <span>{formatDistanceToNow(new Date(callback.scheduledTime), { addSuffix: true })}</span>
                </div>
                {callback.notes && <p className="text-xs text-gray-600 mb-2 italic">{callback.notes}</p>}
                <Button
                  size="sm"
                  onClick={() => handleMarkCompleted(callback.id)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white text-xs"
                >
                  Mark Completed
                </Button>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No pending callbacks</p>
      )}
    </Card>
  );
}
