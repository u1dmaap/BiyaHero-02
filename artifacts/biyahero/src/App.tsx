import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, AuthGuard } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { initAuth } from "@/lib/auth";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import MapPage from "@/pages/map";
import SearchPage from "@/pages/search";
import ComparePage from "@/pages/compare";
import BookPage from "@/pages/book";
import TripsPage from "@/pages/trips";

initAuth();

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
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/map" component={MapPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/compare" component={ComparePage} />
        
        <Route path="/book/:scheduleId">
          {(params) => (
            <AuthGuard>
              <BookPage scheduleId={params.scheduleId} />
            </AuthGuard>
          )}
        </Route>
        
        <Route path="/trips">
          {() => (
            <AuthGuard>
              <TripsPage />
            </AuthGuard>
          )}
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
