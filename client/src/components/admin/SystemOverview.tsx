import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export default function SystemOverview() {
  const { data: totalCalls, isLoading: loadingCalls } = trpc.statistics.getTotalCallsAdmin.useQuery();
  const { data: agents, isLoading: loadingAgents } = trpc.agentManagement.list.useQuery();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-light text-gray-900 mb-4">System Overview</h2>
        <p className="text-sm text-gray-500 mb-6">Key metrics and system statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Calls Card */}
        <Card className="p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-600 mb-2">Total Calls</span>
            {loadingCalls ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-light text-gray-900">{totalCalls?.totalCalls || 0}</span>
            )}
          </div>
        </Card>

        {/* Active Agents Card */}
        <Card className="p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-600 mb-2">Active Agents</span>
            {loadingAgents ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-light text-gray-900">{agents?.filter((a) => a.isActive).length || 0}</span>
            )}
          </div>
        </Card>

        {/* Total Agents Card */}
        <Card className="p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-600 mb-2">Total Agents</span>
            {loadingAgents ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-light text-gray-900">{agents?.length || 0}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Agents List */}
      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Agents</h3>
        {loadingAgents ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                <div>
                  <p className="font-medium text-gray-900">{agent.name || agent.username}</p>
                  <p className="text-xs text-gray-500">{agent.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${agent.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {agent.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No agents found</p>
        )}
      </Card>
    </div>
  );
}
