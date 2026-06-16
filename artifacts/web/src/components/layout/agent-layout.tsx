import { useAuth } from "@/lib/auth-context";
import { Redirect, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, History, BarChart3, PhoneCall } from "lucide-react";

export function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();

  if (isLoading) return null;

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "agent") {
    return <Redirect to="/admin" />;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-semibold text-gray-900">{user.name || user.username}</h1>
          <p className="text-xs text-gray-500">Agent</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col pb-24">
        {children}
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 px-2 py-2 flex justify-around items-center z-10 pb-safe">
        <Link href="/agent" className={`flex flex-col items-center p-2 rounded-lg ${location === '/agent' ? 'text-primary' : 'text-gray-500'}`}>
          <PhoneCall className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">ခေါ်ဆိုရန်</span>
        </Link>
        <Link href="/agent/history" className={`flex flex-col items-center p-2 rounded-lg ${location === '/agent/history' ? 'text-primary' : 'text-gray-500'}`}>
          <History className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">မှတ်တမ်း</span>
        </Link>
        <Link href="/agent/stats" className={`flex flex-col items-center p-2 rounded-lg ${location === '/agent/stats' ? 'text-primary' : 'text-gray-500'}`}>
          <BarChart3 className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">စာရင်း</span>
        </Link>
      </nav>
    </div>
  );
}
