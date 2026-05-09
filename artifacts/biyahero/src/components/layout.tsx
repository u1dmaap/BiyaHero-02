import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Map, Search, ListTree, Plane, Menu, X, LogOut, Navigation, Truck } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, isAuthenticated, logout, isDriver } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const commuterNavItems = [
    { href: "/map", label: "Map", icon: Map },
  ];

  const navItems = commuterNavItems;

  return (
    <header className="sticky top-0 z-[1200] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={isDriver ? "/driver" : "/"} className="flex items-center gap-2 font-bold text-xl text-primary">
            <Navigation className="h-6 w-6 fill-primary text-primary" />
            biyaHERO
          </Link>
          {!isDriver && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
          {isDriver && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                href="/driver"
                className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location === "/driver" ? "text-primary" : "text-muted-foreground"}`}
              >
                <Truck className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/map"
                className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location === "/map" ? "text-primary" : "text-muted-foreground"}`}
              >
                <Map className="h-4 w-4" />
                Map
              </Link>
            </nav>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              {!isDriver && (
                <Link
                  href="/trips"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${location === "/trips" ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Plane className="h-4 w-4" />
                  My Trips
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        {isDriver && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Driver</Badge>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            {isDriver ? (
              <>
                <Link href="/driver" className="flex items-center gap-2 text-sm font-medium text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                  <Truck className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/map" className="flex items-center gap-2 text-sm font-medium text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                  <Map className="h-4 w-4" /> Map
                </Link>
              </>
            ) : (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
                <Link href="/trips" className="flex items-center gap-2 text-sm font-medium text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                  <Plane className="h-4 w-4" /> My Trips
                </Link>
              </>
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
