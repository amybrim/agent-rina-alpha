import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import CommandCenter from "./pages/CommandCenter";
import Scorecard from "./pages/Scorecard";
import FixQueue from "./pages/FixQueue";
import FixDetail from "./pages/FixDetail";
import Briefing from "./pages/Briefing";
import BusinessProfile from "./pages/BusinessProfile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/app" component={CommandCenter} />
      <Route path="/app/scorecard" component={Scorecard} />
      <Route path="/app/fixes" component={FixQueue} />
      <Route path="/app/fixes/:id" component={FixDetail} />
      <Route path="/app/briefing" component={Briefing} />
      <Route path="/app/profile" component={BusinessProfile} />
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
