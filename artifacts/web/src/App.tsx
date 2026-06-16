import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { AgentLayout } from "@/components/layout/agent-layout";
import { AdminLayout } from "@/components/layout/admin-layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Agent Pages
import AgentDashboard from "@/pages/agent/dashboard";
import AgentHistory from "@/pages/agent/history";
import AgentStats from "@/pages/agent/stats";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminAgents from "@/pages/admin/agents";
import AdminPhones from "@/pages/admin/phones";
import AdminPhonesBulk from "@/pages/admin/phones-bulk";
import AdminAgentDetail from "@/pages/admin/agent-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      
      {/* Agent Routes */}
      <Route path="/agent">
        <AgentLayout>
          <AgentDashboard />
        </AgentLayout>
      </Route>
      <Route path="/agent/history">
        <AgentLayout>
          <AgentHistory />
        </AgentLayout>
      </Route>
      <Route path="/agent/stats">
        <AgentLayout>
          <AgentStats />
        </AgentLayout>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/agents">
        <AdminLayout>
          <AdminAgents />
        </AdminLayout>
      </Route>
      <Route path="/admin/phones">
        <AdminLayout>
          <AdminPhones />
        </AdminLayout>
      </Route>
      <Route path="/admin/phones/bulk">
        <AdminLayout>
          <AdminPhonesBulk />
        </AdminLayout>
      </Route>
      <Route path="/admin/agent/:id">
        <AdminLayout>
          <AdminAgentDetail />
        </AdminLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
