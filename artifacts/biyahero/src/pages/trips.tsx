import { useState, useEffect, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Ticket, AlertCircle, LocateFixed, MapPin, Clock, CheckCircle2, Users, CalendarClock, Star, Truck } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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
  rating: number | null;
  ratingComment: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
  pending:   { label: "Pending Approval",       color: "text-amber-700", bar: "bg-amber-400" },
  confirmed: { label: "Confirmed — On the Way", color: "text-green-700", bar: "bg-green-500" },
  rejected:  { label: "Rejected",               color: "text-red-700",   bar: "bg-red-500"   },
  completed: { label: "Completed",              color: "text-blue-700",  bar: "bg-blue-500"  },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock className="h-4 w-4 text-amber-500" />,
  confirmed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  rejected:  <AlertCircle className="h-4 w-4 text-red-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
};

function StarRating({
  tripId,
  existingRating,
  onRated,
}: {
  tripId: number;
  existingRating: number | null;
  onRated: (rating: number, comment: string) => void;
}) {
  const { toast } = useToast();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(existingRating ?? 0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingRating);

  if (submitted && existingRating) {
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Your rating</p>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`h-5 w-5 ${s <= existingRating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
          ))}
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await customFetch(`/api/custom-trips/${tripId}/rate`, {
        method: "PUT",
        body: JSON.stringify({ rating: selected, ratingComment: comment || undefined }),
      });
      setSubmitted(true);
      onRated(selected, comment);
      toast({ title: "Rating submitted!", description: "Thank you for your feedback." });
    } catch {
      toast({ title: "Error", description: "Could not submit rating.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const display = hovered || selected;

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <p className="text-xs font-semibold text-gray-700">Rate your driver</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setSelected(s)}
            className="p-0.5 transition-transform hover:scale-110 active:scale-95"
          >
            <Star className={`h-7 w-7 transition-colors ${s <= display ? "fill-amber-400 text-amber-400" : "text-gray-200 hover:text-amber-200"}`} />
          </button>
        ))}
      </div>
      {selected > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (optional)…"
            rows={2}
            className="w-full text-xs rounded-lg border border-border px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
          />
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Rating"}
          </Button>
        </>
      )}
    </div>
  );
}

function TripCard({
  trip,
  isDriver,
  onRated,
}: {
  trip: CustomTrip;
  isDriver: boolean;
  onRated: (id: number, rating: number, comment: string) => void;
}) {
  const cfg = STATUS_CONFIG[trip.status] ?? { label: trip.status, color: "text-gray-700", bar: "bg-gray-400" };
  const icon = STATUS_ICON[trip.status] ?? <Clock className="h-4 w-4 text-gray-400" />;
  const isActive = trip.status === "pending" || trip.status === "confirmed";

  return (
    <Card className={`overflow-hidden transition-all ${!isActive && trip.status !== "completed" ? "opacity-75" : ""}`}>
      <div className={`h-1.5 w-full ${cfg.bar}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">{icon}<span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span></div>
          <span className="text-xs text-muted-foreground font-mono shrink-0">#{trip.id}</span>
        </div>

        {isDriver && (
          <div className="flex items-center gap-1.5 mb-3 text-sm font-medium">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <span>{trip.passengerName}</span>
            {trip.passengerPhone && <span className="text-xs text-muted-foreground ml-1">· {trip.passengerPhone}</span>}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2.5 text-gray-700">
            <LocateFixed className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div><span className="text-xs text-gray-400 block leading-none mb-0.5">Pickup</span><span className="font-medium">{trip.pickupLabel}</span></div>
          </div>
          <div className="flex items-start gap-2.5 text-gray-700">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div><span className="text-xs text-gray-400 block leading-none mb-0.5">Dropoff</span><span className="font-medium">{trip.dropoffLabel}</span></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{new Date(trip.requestedTime).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{trip.seatCount} seat{trip.seatCount !== 1 ? "s" : ""}</span>
          {trip.notes && <span className="italic text-gray-400">"{trip.notes}"</span>}
        </div>

        {isActive && !isDriver && (
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild className="w-full text-xs">
              <Link href="/map">View on Map</Link>
            </Button>
          </div>
        )}

        {trip.status === "completed" && !isDriver && (
          <StarRating
            tripId={trip.id}
            existingRating={trip.rating}
            onRated={(rating, comment) => onRated(trip.id, rating, comment)}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function TripsPage() {
  const { toast } = useToast();
  const { isDriver } = useAuth();
  const [trips, setTrips] = useState<CustomTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = isDriver ? "/api/driver/trips-history" : "/api/custom-trips";
      const data = await customFetch<CustomTrip[]>(url);
      setTrips(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      toast({ title: "Error", description: "Could not load your trips.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isDriver]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleRated = (id: number, rating: number, comment: string) => {
    setTrips((prev) => prev.map((t) => t.id === id ? { ...t, rating, ratingComment: comment } : t));
  };

  const activeTrips = trips.filter((t) => t.status === "pending" || t.status === "confirmed");
  const pastTrips   = trips.filter((t) => t.status === "completed" || t.status === "rejected");

  return (
    <div className="flex-1 bg-muted/20 py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {isDriver ? <Truck className="h-7 w-7 text-primary" /> : null}
            My Trips
          </h1>
          <p className="text-muted-foreground mt-2">
            {isDriver ? "All trip requests received for your vehicle." : "Track your active and past custom trip bookings."}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold">No trips yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              {isDriver ? "Trip requests will appear here once passengers book your vehicle." : "Book a custom trip from the map to get started."}
            </p>
            {!isDriver && <Button asChild><Link href="/map">Go to Map</Link></Button>}
          </div>
        ) : (
          <div className="space-y-8">
            {activeTrips.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active</h2>
                <div className="grid gap-4">{activeTrips.map((t) => <TripCard key={t.id} trip={t} isDriver={isDriver} onRated={handleRated} />)}</div>
              </section>
            )}
            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Past Trips</h2>
                <div className="grid gap-4">{pastTrips.map((t) => <TripCard key={t.id} trip={t} isDriver={isDriver} onRated={handleRated} />)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
