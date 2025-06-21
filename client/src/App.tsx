import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import Dashboard from "./pages/dashboard";
import ProjectDetail from "./pages/project-detail";
import TeamPage from "./pages/team";
import TimelinePage from "./pages/timeline";
import AllProjectsPage from "./pages/all-projects";
import InboxPage from "./pages/inbox";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import MemberProjectsPage from "./pages/member-projects";
import AdminPanel from "./pages/admin-panel";
import SharedProject from "./pages/shared-project";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={AllProjectsPage} />
      <Route path="/project/:id" component={ProjectDetail} />
      <Route path="/team" component={TeamPage} />
      <Route path="/timeline" component={TimelinePage} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/member/:memberId/projects" component={MemberProjectsPage} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/shared/:token" component={SharedProject} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
