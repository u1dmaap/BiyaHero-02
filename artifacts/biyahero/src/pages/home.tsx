import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, Map as MapIcon, ArrowRight, Star, Clock, Compass, Navigation } from "lucide-react";
import { useGetPopularRoutes, useGetStatsSummary } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [, setLocation] = useLocation();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  const { data: popularRoutes, isLoading: isRoutesLoading } = useGetPopularRoutes();
  const { data: stats, isLoading: isStatsLoading } = useGetStatsSummary();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.append("origin", origin);
    if (destination) params.append("destination", destination);
    if (date) params.append("date", date);
    setLocation(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-24 px-4 overflow-hidden flex-1 flex flex-col justify-center">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1518414436573-078a1660d5b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center" />
        <div className="container mx-auto max-w-4xl relative z-10 text-center flex flex-col gap-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Your Ultimate Philippine Transport Companion
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            From daily jeepney rides to long-haul provincial buses. Find schedules, compare fares, and book your tickets effortlessly.
          </p>

          <Card className="mt-8 bg-card text-card-foreground shadow-2xl border-none">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 text-left space-y-1.5">
                  <Label htmlFor="origin" className="text-muted-foreground">Origin</Label>
                  <Input 
                    id="origin" 
                    placeholder="e.g. Cubao" 
                    value={origin} 
                    onChange={(e) => setOrigin(e.target.value)} 
                    className="h-12"
                  />
                </div>
                <div className="flex-1 text-left space-y-1.5">
                  <Label htmlFor="destination" className="text-muted-foreground">Destination</Label>
                  <Input 
                    id="destination" 
                    placeholder="e.g. Makati" 
                    value={destination} 
                    onChange={(e) => setDestination(e.target.value)} 
                    className="h-12"
                  />
                </div>
                <div className="flex-1 text-left space-y-1.5">
                  <Label htmlFor="date" className="text-muted-foreground">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="h-12"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="lg" className="w-full md:w-auto h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <Search className="mr-2 h-5 w-5" />
                    Search Trips
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-card border-b border-border py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col gap-2">
              {isStatsLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : <div className="text-3xl font-bold text-primary">{stats?.totalRoutes.toLocaleString() ?? 0}</div>}
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Active Routes</div>
            </div>
            <div className="flex flex-col gap-2">
              {isStatsLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : <div className="text-3xl font-bold text-primary">{stats?.activeVehicles.toLocaleString() ?? 0}</div>}
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Vehicles on Road</div>
            </div>
            <div className="flex flex-col gap-2">
              {isStatsLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : <div className="text-3xl font-bold text-primary">{stats?.totalSchedulesToday.toLocaleString() ?? 0}</div>}
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Daily Schedules</div>
            </div>
            <div className="flex flex-col gap-2">
              {isStatsLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : <div className="text-3xl font-bold text-primary">{stats?.totalBookings.toLocaleString() ?? 0}</div>}
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Happy Commuters</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-secondary fill-secondary" />
              Popular Routes
            </h2>
            <Button variant="outline" asChild>
              <Link href="/search">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isRoutesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : (
              popularRoutes?.map((route) => (
                <Card key={route.routeId} className="hover-elevate cursor-pointer transition-colors hover:border-primary/50" onClick={() => setLocation(`/search?origin=${route.origin}&destination=${route.destination}`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{route.origin} <ArrowRight className="inline mx-1 h-4 w-4 text-muted-foreground" /> {route.destination}</span>
                    </CardTitle>
                    <CardDescription>{route.routeName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {route.availableVehicleTypes.map(type => (
                        <span key={type} className="inline-flex items-center rounded-md bg-secondary/20 px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary/20 uppercase">
                          {type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {!isRoutesLoading && popularRoutes?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No popular routes found at the moment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-card border-t border-border text-center">
        <div className="container mx-auto max-w-3xl flex flex-col gap-6 items-center">
          <MapIcon className="h-16 w-16 text-primary mb-4" />
          <h2 className="text-3xl font-bold">Track Vehicles in Real-Time</h2>
          <p className="text-lg text-muted-foreground">
            Don't wait blindly. See exactly where your bus or jeepney is on the live map and know exactly when it will arrive.
          </p>
          <Button size="lg" className="mt-4" asChild>
            <Link href="/map">Open Live Map</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
