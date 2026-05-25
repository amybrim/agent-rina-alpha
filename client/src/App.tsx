import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import RinaLayout from "./components/RinaLayout";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import WeeklyMeeting from "./pages/WeeklyMeeting";
import Scorecard from "./pages/Scorecard";
import FixQueue from "./pages/FixQueue";
import FixWorkspace from "./pages/FixWorkspace";
import Briefing from "./pages/Briefing";
import BusinessProfile from "./pages/BusinessProfile";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";

/**
 * AppShell — wraps all authenticated /app/* routes in RinaLayout.
 * Public routes (/, /pricing, /onboarding) render without the shell.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  return <RinaLayout>{children}</RinaLayout>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/onboarding" component={Onboarding} />

      {/* Authenticated app routes — all wrapped in RinaLayout */}
      <Route path="/app">
        {() => (
          <AppShell>
            <WeeklyMeeting />
          </AppShell>
        )}
      </Route>
      <Route path="/app/scorecard">
        {() => (
          <AppShell>
            <Scorecard />
          </AppShell>
        )}
      </Route>
      <Route path="/app/fixes">
        {() => (
          <AppShell>
            <FixQueue />
          </AppShell>
        )}
      </Route>
      <Route path="/app/fixes/:id">
        {(params) => (
          <AppShell>
            <FixWorkspace />
          </AppShell>
        )}
      </Route>
      <Route path="/app/briefing">
        {() => (
          <AppShell>
            <Briefing />
          </AppShell>
        )}
      </Route>
      <Route path="/app/profile">
        {() => (
          <AppShell>
            <BusinessProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/app/settings">
        {() => (
          <AppShell>
            <Settings />
          </AppShell>
        )}
      </Route>
      <Route path="/app/integrations">
        {() => (
          <AppShell>
            <Integrations />
          </AppShell>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
