import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Content from "@/pages/content";
import Schedule from "@/pages/schedule";
import Inbox from "@/pages/inbox";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Platforms from "@/pages/platforms";
import Subscription from "@/pages/subscription";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Debug logging
  console.log("Router state:", { isAuthenticated, isLoading, user });

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/onboarding" component={Onboarding} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/content" component={Content} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/platforms" component={Platforms} />
          <Route path="/subscription" component={Subscription} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
