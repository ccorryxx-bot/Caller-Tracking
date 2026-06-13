import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallLogEntry from "@/components/agent/CallLogEntry";
import CallLogList from "@/components/agent/CallLogList";
import CallbackQueueEntry from "@/components/agent/CallbackQueueEntry";
import CallbackQueueList from "@/components/agent/CallbackQueueList";
import AgentStatistics from "./AgentStatistics";

export default function AgentDashboard() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-light text-gray-900">Caller Tracking System</h1>
            <p className="text-sm text-gray-500">Agent Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name || user?.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="call-logs" className="w-full">
          <TabsList className="border-b border-gray-200 bg-transparent p-0 w-full justify-start rounded-none">
            <TabsTrigger value="call-logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent">
              Call Logs
            </TabsTrigger>
            <TabsTrigger value="callbacks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent">
              Callback Queue
            </TabsTrigger>
            <TabsTrigger value="statistics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent">
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="call-logs" className="mt-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <CallLogEntry />
              </div>
              <div className="lg:col-span-2">
                <CallLogList />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="callbacks" className="mt-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <CallbackQueueEntry />
              </div>
              <div className="lg:col-span-2">
                <CallbackQueueList />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="mt-8">
            <AgentStatistics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
