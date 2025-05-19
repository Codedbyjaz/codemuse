import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import { ThemeProvider } from "@/context/ThemeContext";
import { TeachingProvider } from "@/context/TeachingContext";
import { ProjectProvider } from "@/context/ProjectContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProjectProvider>
          <TeachingProvider>
            <Router />
            <Toaster />
          </TeachingProvider>
        </ProjectProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
