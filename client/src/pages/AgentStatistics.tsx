import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AgentStatistics() {
  const { data: totalCalls, isLoading: loadingCalls } = trpc.statistics.getTotalCalls.useQuery();
  const { data: myStats, isLoading: loadingStats } = trpc.statistics.getMyStats.useQuery({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Prepare chart data
  const dailyChartData = myStats?.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    calls: stat.totalCalls,
    incoming: stat.incomingCalls,
    outgoing: stat.outgoingCalls,
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-light text-gray-900 mb-4">My Statistics</h2>
        <p className="text-sm text-gray-500 mb-6">Your call center performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600 mb-1">Total Calls</span>
            {loadingCalls ? <Skeleton className="h-6 w-12" /> : <span className="text-2xl font-light text-gray-900">{totalCalls?.totalCalls || 0}</span>}
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

      {/* Call Type Distribution */}
      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Call Distribution</h3>
        {loadingStats ? (
          <Skeleton className="h-80" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }} />
              <Legend />
              <Bar dataKey="incoming" fill="#1f2937" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outgoing" fill="#9ca3af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
