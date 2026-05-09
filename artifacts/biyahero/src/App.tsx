import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, AuthGuard, DriverGuard } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { initAuth } from "@/lib/auth";

import Login from "@/pages/login";
import Register from "@/pages/register";
import MapPage from "@/pages/map";
import SearchPage from "@/pages/search";
import ComparePage from "@/pages/compare";
import BookPage from "@/pages/book";
import TripsPage from "@/pages/trips";
import DriverDashboard from "@/pages/driver";

initAuth();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RedirectToMap() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/map"); }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        <Route path="/">
          {() => <AuthGuard><RedirectToMap /></AuthGuard>}
        </Route>
        <Route path="/map">
          {() => <AuthGuard><MapPage /></AuthGuard>}
        </Route>
        <Route path="/search">
          {() => <AuthGuard><SearchPage /></AuthGuard>}
        </Route>
        <Route path="/compare">
          {() => <AuthGuard><ComparePage /></AuthGuard>}
        </Route>
        <Route path="/book/:scheduleId">
          {(params) => (
            <AuthGuard>
              <BookPage scheduleId={params.scheduleId} />
            </AuthGuard>
          )}
        </Route>
        <Route path="/trips">
          {() => <AuthGuard><TripsPage /></AuthGuard>}
        </Route>
        <Route path="/driver">
          {() => <DriverGuard><DriverDashboard /></DriverGuard>}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
