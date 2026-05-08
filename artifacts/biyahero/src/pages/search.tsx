import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useListSchedules, VehicleType, ListSchedulesSortBy, getListSchedulesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowRight, Clock, Coins, MapPin, Users, Calendar, Filter } from "lucide-react";
import { Link } from "wouter";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const [origin, setOrigin] = useState(searchParams.get("origin") || "");
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [vehicleType, setVehicleType] = useState<VehicleType | "all">((searchParams.get("vehicleType") as VehicleType) || "all");
  const [sortBy, setSortBy] = useState<ListSchedulesSortBy>(ListSchedulesSortBy.departureTime);

  const { data: schedules, isLoading } = useListSchedules({
    origin: origin || undefined,
    destination: destination || undefined,
    date: date || undefined,
    vehicleType: vehicleType === "all" ? undefined : vehicleType,
    sortBy,
  }, {
    query: {
      staleTime: 30000,
      queryKey: getListSchedulesQueryKey({
        origin: origin || undefined,
        destination: destination || undefined,
        date: date || undefined,
        vehicleType: vehicleType === "all" ? undefined : vehicleType,
        sortBy,
      }),
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.append("origin", origin);
    if (destination) params.append("destination", destination);
    if (date) params.append("date", date);
    if (vehicleType && vehicleType !== "all") params.append("vehicleType", vehicleType);
    setLocation(`/search?${params.toString()}`);
  };

  return (
    <div className="flex-1 bg-muted/20 min-h-screen">
      {/* Search Header */}
      <div className="bg-card border-b border-border sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
              <div className="space-y-1.5">
                <Label htmlFor="origin" className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Origin</Label>
                <Input id="origin" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Where from?" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destination" className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Destination</Label>
                <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Where to?" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/> Date</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="space-y-1.5 flex-1 lg:w-40">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.values(VehicleType).map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 lg:w-40">
                <Label className="text-xs text-muted-foreground">Sort</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ListSchedulesSortBy.departureTime}>Earliest</SelectItem>
                    <SelectItem value={ListSchedulesSortBy.fare}>Cheapest</SelectItem>
                    <SelectItem value={ListSchedulesSortBy.duration}>Fastest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="h-10 self-end px-8">Update</Button>
            </div>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {isLoading ? "Searching..." : `${schedules?.length || 0} Trips Found`}
          </h1>
          {(origin && destination) && (
            <Button variant="outline" asChild>
              <Link href={`/compare?origin=${origin}&destination=${destination}&date=${date}`}>
                Compare Options
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row">
                  <Skeleton className="h-32 md:h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : schedules?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-lg border border-border">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No schedules found</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">Try adjusting your search criteria or selecting a different date.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setOrigin(""); setDestination(""); setDate(""); setVehicleType("all"); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            schedules?.map((schedule) => (
              <Card key={schedule.id} className="overflow-hidden hover-elevate transition-all border-l-4 border-l-primary group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left: Times and Route */}
                    <div className="flex-1 p-5 md:p-6 flex flex-col md:flex-row gap-6 md:items-center">
                      <div className="flex justify-between md:flex-col md:gap-8 md:min-w-[120px]">
                        <div>
                          <div className="text-2xl font-bold">{format(new Date(schedule.departureTime), "HH:mm")}</div>
                          <div className="text-sm text-muted-foreground font-medium">{schedule.origin}</div>
                        </div>
                        <div className="hidden md:block h-px w-8 bg-border rotate-90 mx-auto" />
                        <div className="text-right md:text-left">
                          <div className="text-2xl font-bold">{format(new Date(schedule.estimatedArrivalTime), "HH:mm")}</div>
                          <div className="text-sm text-muted-foreground font-medium">{schedule.destination}</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 grid gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="uppercase text-xs tracking-wider">{schedule.vehicleType.replace('_', ' ')}</Badge>
                          <span className="font-semibold">{schedule.operator}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Route {schedule.routeName}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {schedule.availableSeats} seats left</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Price and Action */}
                    <div className="bg-muted/50 p-5 md:p-6 flex flex-row md:flex-col items-center justify-between md:justify-center md:w-48 border-t md:border-t-0 md:border-l border-border gap-4">
                      <div className="text-left md:text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Fare per seat</div>
                        <div className="text-3xl font-bold text-primary flex items-center md:justify-center gap-1">
                          <span className="text-lg">₱</span>{schedule.fare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <Button asChild className="w-full md:w-auto shadow-md hover:shadow-lg transition-shadow group-hover:bg-primary/90">
                        <Link href={`/book/${schedule.id}`}>Book Now</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
