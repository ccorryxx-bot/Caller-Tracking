import { useAuth } from "@/lib/auth-context";
import { Redirect, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, Phone, Upload, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) return null;

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "admin") {
    return <Redirect to="/agent" />;
  }

  const handleLogout = async () => {
    await logout();
  };

  const NavLinks = () => (
    <div className="flex flex-col space-y-1">
      <Link href="/admin" className={`flex items-center space-x-3 px-3 py-2 rounded-md ${location === '/admin' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setIsOpen(false)}>
        <LayoutDashboard className="h-5 w-5" />
        <span>Overview</span>
      </Link>
      <Link href="/admin/agents" className={`flex items-center space-x-3 px-3 py-2 rounded-md ${location.startsWith('/admin/agent') ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setIsOpen(false)}>
        <Users className="h-5 w-5" />
        <span>Agents</span>
      </Link>
      <Link href="/admin/phones" className={`flex items-center space-x-3 px-3 py-2 rounded-md ${location === '/admin/phones' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setIsOpen(false)}>
        <Phone className="h-5 w-5" />
        <span>Phones</span>
      </Link>
      <Link href="/admin/phones/bulk" className={`flex items-center space-x-3 px-3 py-2 rounded-md ${location === '/admin/phones/bulk' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setIsOpen(false)}>
        <Upload className="h-5 w-5" />
        <span>Bulk Upload</span>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="p-4 border-b text-left">
                <SheetTitle>Admin Panel</SheetTitle>
              </SheetHeader>
              <div className="p-4 flex-1">
                <NavLinks />
              </div>
              <div className="p-4 border-t mt-auto">
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-gray-900">Admin Panel</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-bold text-lg text-gray-900">Caller Tracking</h1>
          <p className="text-xs text-gray-500">Admin Dashboard</p>
        </div>
        <div className="p-4 flex-1">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {user.name?.[0] || user.username[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name || user.username}</p>
              <p className="text-xs text-gray-500 truncate">Admin</p>
            </div>
          </div>
          <Button variant="outline" className="w-full text-gray-600" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
