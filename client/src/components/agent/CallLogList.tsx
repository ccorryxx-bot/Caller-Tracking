import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function CallLogList() {
  const { data: callLogs, isLoading } = trpc.callLog.listMine.useQuery({ limit: 50 });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      voicemail: "bg-blue-100 text-blue-800",
      callback_scheduled: "bg-yellow-100 text-yellow-800",
      no_answer: "bg-gray-100 text-gray-800",
      busy: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[outcome] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="p-6 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Calls</h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : callLogs && callLogs.length > 0 ? (
        <div className="space-y-2">
          {callLogs.map((log) => (
            <div key={log.id} className="p-3 bg-gray-50 rounded border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{log.callerName || log.callerPhone}</p>
                  <p className="text-xs text-gray-500">{log.callerPhone}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getOutcomeColor(log.outcome)}`}>{log.outcome.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex gap-4">
                  <span>{log.callType === "incoming" ? "📥" : "📤"} {log.callType}</span>
                  <span>⏱️ {formatDuration(log.duration)}</span>
                </div>
                <span>{formatDistanceToNow(new Date(log.recordedAt), { addSuffix: true })}</span>
              </div>
              {log.notes && <p className="text-xs text-gray-600 mt-2 italic">{log.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No call logs yet</p>
      )}
    </Card>
  );
}
