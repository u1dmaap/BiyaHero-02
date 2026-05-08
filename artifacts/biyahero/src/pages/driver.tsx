import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, Users, MapPin, RefreshCw, CheckCircle2, Clock,
  Navigation, Wifi, WifiOff, AlertCircle, PhilippinePeso,
} from "lucide-react";

type DriverStatus = "offline" | "available" | "en_route" | "arrived";

interface Vehicle {
  id: number;
  type: string;
  plateNumber: string;
  operator: string;
  capacity: number;
  status: string;
  currentLat: number;
  currentLng: number;
  currentPassengers: number;
  driverStatus: DriverStatus;
}

interface RecentBooking {
  id: number;
  passengerName: string;
  seatCount: number;
  totalFare: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface DashboardData {
  vehicle: Vehicle;
  recentBookings: RecentBooking[];
}

const STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; bg: string; description: string }> = {
  offline: { label: "Offline", color: "text-slate-500", bg: "bg-slate-100", description: "Not accepting passengers" },
  available: { label: "Available", color: "text-green-700", bg: "bg-green-100", description: "Ready for passengers" },
  en_route: { label: "En Route", color: "text-blue-700", bg: "bg-blue-100", description: "Currently on a trip" },
  arrived: { label: "Arrived", color: "text-amber-700", bg: "bg-amber-100", description: "At destination" },
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPassengers, setIsUpdatingPassengers] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await customFetch<DashboardData>("/api/driver/dashboard");
      setData(result);
    } catch {
      toast({ title: "Error", description: "Could not load dashboard.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const updateStatus = async (driverStatus: DriverStatus) => {
    if (!data) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await customFetch<Partial<Vehicle>>("/api/driver/status", {
        method: "PUT",
        body: JSON.stringify({ driverStatus }),
      });
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ...updated } } : prev);
      toast({ title: "Status updated", description: `You are now ${STATUS_CONFIG[driverStatus].label}.` });
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const updatePassengers = async (delta: number) => {
    if (!data) return;
    const next = Math.max(0, Math.min(data.vehicle.capacity, data.vehicle.currentPassengers + delta));
    if (next === data.vehicle.currentPassengers) return;
    setIsUpdatingPassengers(true);
    try {
      const updated = await customFetch<Partial<Vehicle>>("/api/driver/passengers", {
        method: "PUT",
        body: JSON.stringify({ currentPassengers: next }),
      });
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ...updated } } : prev);
    } catch {
      toast({ title: "Error", description: "Could not update passenger count.", variant: "destructive" });
    } finally {
      setIsUpdatingPassengers(false);
    }
  };

  const refreshLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Unavailable", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    setIsRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await customFetch<Partial<Vehicle>>("/api/driver/status", {
            method: "PUT",
            body: JSON.stringify({ currentLat: pos.coords.latitude, currentLng: pos.coords.longitude }),
          });
          setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ...updated } } : prev);
          toast({ title: "Location updated", description: "Your position has been refreshed on the map." });
        } catch {
          toast({ title: "Error", description: "Could not update location.", variant: "destructive" });
        } finally {
          setIsRefreshingLocation(false);
        }
      },
      () => {
        toast({ title: "Permission denied", description: "Allow location access to update your position.", variant: "destructive" });
        setIsRefreshingLocation(false);
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { vehicle, recentBookings } = data;
  const status = vehicle.driverStatus as DriverStatus;
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
  const occupancyPct = vehicle.capacity > 0 ? Math.round((vehicle.currentPassengers / vehicle.capacity) * 100) : 0;

  return (
    <div className="flex-1 bg-muted/20 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Driver Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome, {user?.name} — {vehicle.type.replace("_", " ")} operator
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vehicle Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold capitalize">{vehicle.type.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plate</span>
                <span className="font-mono font-bold">{vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operator</span>
                <span className="font-medium">{vehicle.operator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-medium">{vehicle.capacity} seats</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Coords</span>
                <span className="text-xs font-mono">{vehicle.currentLat.toFixed(4)}, {vehicle.currentLng.toFixed(4)}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={refreshLocation} disabled={isRefreshingLocation}>
                <RefreshCw className={`h-3 w-3 mr-2 ${isRefreshingLocation ? "animate-spin" : ""}`} />
                {isRefreshingLocation ? "Updating..." : "Refresh Location"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {status === "offline" ? <WifiOff className="h-4 w-4 text-slate-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
                Current Status
              </CardTitle>
              <CardDescription className={statusCfg.color}>{statusCfg.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["offline", "available", "en_route", "arrived"] as DriverStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={isUpdatingStatus || status === s}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      status === s
                        ? `border-primary ${cfg.bg} ${cfg.color} font-semibold`
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${status === s ? "bg-current" : "bg-muted-foreground/30"}`} />
                    <span className="text-sm">{cfg.label}</span>
                    {status === s && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Passengers
              </CardTitle>
              <CardDescription>Current occupancy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <div className="text-5xl font-bold text-primary">{vehicle.currentPassengers}</div>
                <div className="text-sm text-muted-foreground mt-1">of {vehicle.capacity} seats</div>
                <div className="w-full bg-muted rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${occupancyPct >= 90 ? "bg-destructive" : occupancyPct >= 60 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{occupancyPct}% full</div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-lg font-bold h-12"
                  onClick={() => updatePassengers(-1)}
                  disabled={isUpdatingPassengers || vehicle.currentPassengers <= 0}
                >
                  -
                </Button>
                <Button
                  className="flex-1 text-lg font-bold h-12"
                  onClick={() => updatePassengers(1)}
                  disabled={isUpdatingPassengers || vehicle.currentPassengers >= vehicle.capacity}
                >
                  +
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Bookings
            </CardTitle>
            <CardDescription>Last 10 bookings for your vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{b.passengerName}</div>
                      <div className="text-xs text-muted-foreground">{b.seatCount} seat{b.seatCount !== 1 ? "s" : ""} · #{b.id}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold flex items-center gap-0.5 justify-end">
                        <PhilippinePeso className="h-3 w-3" />{b.totalFare.toLocaleString()}
                      </div>
                      <div className="flex gap-1 mt-0.5 justify-end">
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${b.status === "confirmed" ? "border-green-300 text-green-700" : b.status === "cancelled" ? "border-red-300 text-red-700" : ""}`}>
                          {b.status}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${b.paymentStatus === "paid" ? "border-blue-300 text-blue-700" : ""}`}>
                          {b.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
