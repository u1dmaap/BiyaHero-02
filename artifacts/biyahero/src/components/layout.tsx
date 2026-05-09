import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Navigation, Truck, History } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, isAuthenticated, logout, isDriver } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[1200] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={isDriver ? "/driver" : "/map"} className="flex items-center gap-2 font-bold text-xl text-primary">
            <Navigation className="h-6 w-6 fill-primary text-primary" />
            PasaHero Go
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {isDriver && (
              <Link
                href="/driver"
                className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location === "/driver" ? "text-primary" : "text-muted-foreground"}`}
              >
                <Truck className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/trips"
                className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location === "/trips" ? "text-primary" : "text-muted-foreground"}`}
              >
                <History className="h-4 w-4" />
                My Trips
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name}</span>
              {isDriver && <Badge variant="secondary" className="text-[10px]">Driver</Badge>}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-4">
          <nav className="flex flex-col gap-4">
            {isDriver && (
              <Link href="/driver" className="flex items-center gap-2 text-sm font-medium text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                <Truck className="h-4 w-4" /> Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/trips" className="flex items-center gap-2 text-sm font-medium text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                <History className="h-4 w-4" /> My Trips
              </Link>
            )}
            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 text-sm font-medium text-destructive text-left w-full"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Log in</Link>
                </Button>
                <Button asChild className="w-full justify-start">
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>Sign up</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
