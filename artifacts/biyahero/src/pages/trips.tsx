import { useState, useEffect, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, AlertCircle, LocateFixed, MapPin, Clock, CheckCircle2, Users, CalendarClock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface CustomTrip {
  id: number;
  vehicleId: number;
  pickupLabel: string;
  dropoffLabel: string;
  requestedTime: string;
  passengerName: string;
  passengerPhone: string | null;
  seatCount: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bar: string; badge: string }> = {
  pending: {
    label: "Pending Approval",
    color: "text-amber-700",
    bar: "bg-amber-400",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  confirmed: {
    label: "Confirmed — On the Way",
    color: "text-green-700",
    bar: "bg-green-500",
    badge: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  completed: {
    label: "Completed",
    color: "text-blue-700",
    bar: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  confirmed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  rejected: <AlertCircle className="h-4 w-4 text-red-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
};

export default function TripsPage() {
  const { toast } = useToast();
  const [trips, setTrips] = useState<CustomTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await customFetch<CustomTrip[]>("/api/custom-trips");
      setTrips(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      toast({ title: "Error", description: "Could not load your trips.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const activeTrips = trips.filter((t) => t.status === "pending" || t.status === "confirmed");
  const pastTrips = trips.filter((t) => t.status === "completed" || t.status === "rejected");

  return (
    <div className="flex-1 bg-muted/20 py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Trips</h1>
          <p className="text-muted-foreground mt-2">Track your active and past custom trip bookings.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold">No trips yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">Book a custom trip from the map to get started.</p>
            <Button asChild>
              <Link href="/map">Go to Map</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">

            {activeTrips.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active</h2>
                <div className="grid gap-4">
                  {activeTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Past Trips</h2>
                <div className="grid gap-4">
                  {pastTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: CustomTrip }) {
  const cfg = STATUS_CONFIG[trip.status] ?? { label: trip.status, color: "text-gray-700", bar: "bg-gray-400", badge: "bg-gray-100 text-gray-800 border-gray-200" };
  const icon = STATUS_ICON[trip.status] ?? <Clock className="h-4 w-4 text-gray-400" />;
  const isActive = trip.status === "pending" || trip.status === "confirmed";

  return (
    <Card className={`overflow-hidden transition-all ${!isActive ? "opacity-75" : ""}`}>
      <div className={`h-1.5 w-full ${cfg.bar}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">#{trip.id}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2.5 text-gray-700">
            <LocateFixed className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-gray-400 block leading-none mb-0.5">Pickup</span>
              <span className="font-medium">{trip.pickupLabel}</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-gray-700">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-gray-400 block leading-none mb-0.5">Dropoff</span>
              <span className="font-medium">{trip.dropoffLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {new Date(trip.requestedTime).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {trip.seatCount} seat{trip.seatCount !== 1 ? "s" : ""}
          </span>
          {trip.notes && (
            <span className="italic text-gray-400">"{trip.notes}"</span>
          )}
        </div>

        {isActive && (
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild className="w-full text-xs">
              <Link href="/map">View on Map</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
