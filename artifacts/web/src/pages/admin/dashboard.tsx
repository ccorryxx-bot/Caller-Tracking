import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Loader2, PhoneCall, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const totalSystemCalls = stats.reduce((acc, row) => acc + row.totalCalls, 0);
  const totalInterested = stats.reduce((acc, row) => acc + (row.interested || 0), 0);
  const totalWillBuy = stats.reduce((acc, row) => acc + (row.will_buy || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time telemarketing performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Calls</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalSystemCalls}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Interested</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalInterested}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Will Buy</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalWillBuy}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mt-8 mb-4">Agent Performance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((agent) => (
          <Link key={agent.agentId} href={`/admin/agent/${agent.agentId}`}>
            <Card className="hover:border-primary cursor-pointer transition-colors h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-bold">{agent.agentName || agent.username}</CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                  {agent.agentName?.[0] || agent.username?.[0] || 'A'}
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{agent.totalCalls}</p>
                    <p className="text-xs text-gray-500 font-medium">Calls Made</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{agent.interested || 0}</p>
                    <p className="text-xs text-green-700 font-medium">Interested</p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg call duration</span>
                    <span className="font-medium text-gray-900">{agent.avgSecondsPerCall ? `${Math.round(agent.avgSecondsPerCall)}s` : '-'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Assigned phones</span>
                    <span className="font-medium text-gray-900">{agent.totalPhones}</span>
                  </div>
                </div>
              </CardContent>
              <div className="bg-gray-50 p-3 text-xs text-gray-500 flex items-center rounded-b-lg border-t mt-auto">
                <Clock className="h-3 w-3 mr-1" />
                {agent.lastCallAt ? `Last active ${formatDistanceToNow(new Date(agent.lastCallAt))} ago` : 'No activity yet'}
              </div>
            </Card>
          </Link>
        ))}
        {stats.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-dashed rounded-lg">
            No agents found.
          </div>
        )}
      </div>
    </div>
  );
}
