import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AgentManagement from "@/components/admin/AgentManagement";
import PhoneNumberManagement from "@/components/admin/PhoneNumberManagement";
import SystemOverview from "@/components/admin/SystemOverview";

type AdminTab = "overview" | "agents" | "phone-numbers";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

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
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name || user?.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 bg-gray-50 min-h-[calc(100vh-80px)]">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-white text-gray-900 border border-gray-200"
                  : "text-gray-700 hover:bg-white hover:border hover:border-gray-200"
              }`}
            >
              System Overview
            </button>
            <button
              onClick={() => setActiveTab("agents")}
              className={`w-full text-left px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === "agents"
                  ? "bg-white text-gray-900 border border-gray-200"
                  : "text-gray-700 hover:bg-white hover:border hover:border-gray-200"
              }`}
            >
              Agent Management
            </button>
            <button
              onClick={() => setActiveTab("phone-numbers")}
              className={`w-full text-left px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === "phone-numbers"
                  ? "bg-white text-gray-900 border border-gray-200"
                  : "text-gray-700 hover:bg-white hover:border hover:border-gray-200"
              }`}
            >
              Phone Numbers
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === "overview" && <SystemOverview />}
          {activeTab === "agents" && <AgentManagement />}
          {activeTab === "phone-numbers" && <PhoneNumberManagement />}
        </main>
      </div>
    </div>
  );
}
