import { useGetAgentDetail } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, User, PhoneCall, Clock } from "lucide-react";
import { format } from "date-fns";

const outcomeLabels: Record<string, string> = {
  interested: "Interested",
  will_buy: "Will Buy",
  phone_off: "Phone Off",
  no_answer: "No Answer",
  hung_up: "Hung Up",
};

export default function AdminAgentDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data, isLoading } = useGetAgentDetail(id, {
    query: {
      enabled: !isNaN(id),
      queryKey: ["agent-detail", id] as any
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!data) return <div>Agent not found</div>;

  const { agent, calls } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{agent.name || agent.username}</h1>
          <p className="text-sm text-gray-500">@{agent.username} • {agent.isActive ? 'Active' : 'Inactive'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Calls Logged</p>
              <h3 className="text-2xl font-bold text-gray-900">{calls.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Time Since Prev</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-medium">
                    {format(new Date(call.recordedAt), "dd MMM yyyy, HH:mm:ss")}
                  </TableCell>
                  <TableCell>{call.phoneNumber}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {outcomeLabels[call.outcome] || call.outcome}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {call.secondsSincePrev ? `${call.secondsSincePrev}s` : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {!calls.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center p-8 text-gray-500">No calls recorded yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
