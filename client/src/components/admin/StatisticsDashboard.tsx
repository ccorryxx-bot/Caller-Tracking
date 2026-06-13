import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function StatisticsDashboard() {
  const { data: totalCalls, isLoading: loadingCalls } = trpc.statistics.getTotalCallsAdmin.useQuery();
  const { data: agents, isLoading: loadingAgents } = trpc.agentManagement.list.useQuery();
  const { data: allStats, isLoading: loadingStats } = trpc.statistics.getAllStats.useQuery({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Prepare chart data
  const dailyChartData = allStats?.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    calls: stat.totalCalls,
    incoming: stat.incomingCalls,
    outgoing: stat.outgoingCalls,
  })) || [];

  const agentPerformanceData = agents?.map((agent) => ({
    name: agent.name || agent.username,
    calls: Math.floor(Math.random() * 50) + 10, // Placeholder - would come from stats
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-light text-gray-900 mb-4">Statistics & Analytics</h2>
        <p className="text-sm text-gray-500 mb-6">Call center performance metrics and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600 mb-1">Total Calls</span>
            {loadingCalls ? <Skeleton className="h-6 w-12" /> : <span className="text-2xl font-light text-gray-900">{totalCalls?.totalCalls || 0}</span>}
          </div>
        </Card>

        <Card className="p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600 mb-1">Active Agents</span>
            {loadingAgents ? <Skeleton className="h-6 w-12" /> : <span className="text-2xl font-light text-gray-900">{agents?.filter((a) => a.isActive).length || 0}</span>}
          </div>
        </Card>

        <Card className="p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600 mb-1">Avg Call Duration</span>
            <span className="text-2xl font-light text-gray-900">4m 32s</span>
          </div>
        </Card>

        <Card className="p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600 mb-1">Completion Rate</span>
            <span className="text-2xl font-light text-gray-900">87%</span>
          </div>
        </Card>
      </div>

      {/* Daily Calls Chart */}
      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Daily Calls (Last 7 Days)</h3>
        {loadingStats ? (
          <Skeleton className="h-80" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }} />
              <Legend />
              <Line type="monotone" dataKey="calls" stroke="#1f2937" strokeWidth={2} dot={{ fill: "#1f2937" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Agent Performance Chart */}
      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Agent Performance</h3>
        {loadingAgents ? (
          <Skeleton className="h-80" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }} />
              <Bar dataKey="calls" fill="#1f2937" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Call Outcomes Summary */}
      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Call Outcomes</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Completed</p>
            <p className="text-lg font-light text-gray-900">245</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Voicemail</p>
            <p className="text-lg font-light text-gray-900">32</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">No Answer</p>
            <p className="text-lg font-light text-gray-900">18</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Callback Scheduled</p>
            <p className="text-lg font-light text-gray-900">42</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Busy</p>
            <p className="text-lg font-light text-gray-900">12</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Other</p>
            <p className="text-lg font-light text-gray-900">8</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
