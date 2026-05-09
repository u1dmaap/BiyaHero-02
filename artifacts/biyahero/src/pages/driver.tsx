import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Truck, Users, MapPin, RefreshCw, CheckCircle2, Clock,
  Navigation, Wifi, WifiOff, AlertCircle, PhilippinePeso,
  Bell, ThumbsUp, ThumbsDown, CalendarClock, LocateFixed,
} from "lucide-react";
import { format } from "date-fns";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LeafletIconDefaultInternal = typeof L.Icon.Default.prototype & { _getIconUrl?: () => string };
delete (L.Icon.Default.prototype as LeafletIconDefaultInternal)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const BATANGAS_COORDS: Record<string, [number, number]> = {
  "Batangas City": [13.7565, 121.0583],
  "Batangas Port": [13.7748, 121.0622],
  "Lipa City": [13.9411, 121.1631],
  "Tanauan": [14.0853, 121.0085],
  "Nasugbu": [14.0703, 120.6262],
  "Lemery": [13.8778, 120.9071],
  "Balayan": [13.9394, 120.7238],
  "San Jose": [13.8673, 121.0903],
  "Rosario": [13.8477, 121.1979],
  "Bauan": [13.7947, 121.0074],
  "Tagaytay": [14.1153, 120.9621],
  "Calapan": [13.4148, 121.1803],
};

function getCoords(place: string): [number, number] | null {
  for (const [key, val] of Object.entries(BATANGAS_COORDS)) {
    if (place.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(place.toLowerCase())) {
      return val;
    }
  }
  return null;
}

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

interface PendingRequest {
  id: number;
  passengerName: string;
  passengerPhone: string | null;
  seatCount: number;
  totalFare: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  scheduleId: number;
  departureTime: string;
  origin: string;
  destination: string;
}

interface CustomTripRequest {
  id: number;
  passengerName: string;
  passengerPhone: string | null;
  seatCount: number;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffLabel: string;
  requestedTime: string;
  status: string;
  notes: string | null;
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

function createDriverIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 4px 12px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

function createPassengerIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:36px;">
      <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#F59E0B;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>
      <div style="position:absolute;top:5px;left:5px;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>
    </div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomTripRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPassengers, setIsUpdatingPassengers] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const tileUrl = `${import.meta.env.BASE_URL}api/tiles/{z}/{x}/{y}.png`.replace(/\/+api\//, "/api/");

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, reqs, customReqs] = await Promise.all([
        customFetch<DashboardData>("/api/driver/dashboard"),
        customFetch<PendingRequest[]>("/api/driver/requests"),
        customFetch<CustomTripRequest[]>("/api/driver/custom-requests"),
      ]);
      setData(result);
      setRequests(reqs);
      setCustomRequests(customReqs);
    } catch {
      toast({ title: "Error", description: "Could not load dashboard.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchRequests = useCallback(async () => {
    try {
      const [reqs, customReqs] = await Promise.all([
        customFetch<PendingRequest[]>("/api/driver/requests"),
        customFetch<CustomTripRequest[]>("/api/driver/custom-requests"),
      ]);
      setRequests(reqs);
      setCustomRequests(customReqs);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    const key = `sched-${id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/requests/${id}/approve`, { method: "PUT" });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Request approved", description: "The passenger has been confirmed." });
      fetchDashboard();
    } catch {
      toast({ title: "Error", description: "Could not approve request.", variant: "destructive" });
    } finally {
      setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const handleReject = async (id: number) => {
    const key = `sched-${id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/requests/${id}/reject`, { method: "PUT" });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Request rejected", description: "Seat has been released." });
    } catch {
      toast({ title: "Error", description: "Could not reject request.", variant: "destructive" });
    } finally {
      setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const handleCustomApprove = async (id: number) => {
    const key = `custom-${id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/custom-requests/${id}/approve`, { method: "PUT" });
      setCustomRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Custom trip approved", description: "Passenger has been confirmed." });
    } catch {
      toast({ title: "Error", description: "Could not approve custom trip.", variant: "destructive" });
    } finally {
      setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const handleCustomReject = async (id: number) => {
    const key = `custom-${id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/custom-requests/${id}/reject`, { method: "PUT" });
      setCustomRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Custom trip rejected" });
    } catch {
      toast({ title: "Error", description: "Could not reject custom trip.", variant: "destructive" });
    } finally {
      setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

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
      toast({ title: "Unavailable", description: "Geolocation is not supported.", variant: "destructive" });
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
          toast({ title: "Location updated", description: "Your position has been refreshed." });
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

  const driverPos: [number, number] = [vehicle.currentLat, vehicle.currentLng];
  const pickupPins = requests
    .map((r) => ({ ...r, coords: getCoords(r.origin) }))
    .filter((r) => r.coords !== null) as (PendingRequest & { coords: [number, number] })[];
  const totalPending = requests.length + customRequests.length;

  return (
    <div className="flex-1 bg-muted/20 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
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

        {/* Pending Requests — Scheduled */}
        <Card className={totalPending > 0 ? "border-amber-300 shadow-amber-100 shadow-md" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className={`h-4 w-4 ${totalPending > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"}`} />
              Pending Requests
              {totalPending > 0 && (
                <Badge className="ml-auto bg-amber-500 hover:bg-amber-500 text-white text-xs">
                  {totalPending} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Approve or reject scheduled seat requests</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-7 w-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending scheduled requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="flex flex-col gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm">{r.passengerName}</div>
                        {r.passengerPhone && <div className="text-xs text-muted-foreground">{r.passengerPhone}</div>}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{r.origin} → {r.destination}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <CalendarClock className="h-3 w-3" />
                          {format(new Date(r.departureTime), "HH:mm")} · {r.seatCount} seat{r.seatCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm flex items-center gap-0.5 justify-end text-primary">
                          <PhilippinePeso className="h-3 w-3" />{r.totalFare.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={processingIds.has(`sched-${r.id}`)} onClick={() => handleApprove(r.id)}>
                        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                        {processingIds.has(`sched-${r.id}`) ? "Processing…" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        disabled={processingIds.has(`sched-${r.id}`)} onClick={() => handleReject(r.id)}>
                        <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests — Custom Trips */}
        {customRequests.length > 0 && (
          <Card className="border-purple-300 shadow-purple-100 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LocateFixed className="h-4 w-4 text-purple-500 animate-pulse" />
                Custom Trip Requests
                <Badge className="ml-auto bg-purple-500 hover:bg-purple-500 text-white text-xs">
                  {customRequests.length} new
                </Badge>
              </CardTitle>
              <CardDescription>Passengers who chose their own pickup &amp; dropoff</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customRequests.map((r) => (
                  <div key={r.id} className="flex flex-col gap-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50">
                    <div>
                      <div className="font-semibold text-sm">{r.passengerName}</div>
                      {r.passengerPhone && <div className="text-xs text-muted-foreground">{r.passengerPhone}</div>}
                      <div className="text-xs mt-1.5 space-y-1">
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <LocateFixed className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                          <span><span className="font-medium text-foreground">Pickup:</span> {r.pickupLabel}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                          <span><span className="font-medium text-foreground">Dropoff:</span> {r.dropoffLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          {new Date(r.requestedTime).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })} · {r.seatCount} seat{r.seatCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-1 italic">"{r.notes}"</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={processingIds.has(`custom-${r.id}`)} onClick={() => handleCustomApprove(r.id)}>
                        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                        {processingIds.has(`custom-${r.id}`) ? "Processing…" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        disabled={processingIds.has(`custom-${r.id}`)} onClick={() => handleCustomReject(r.id)}>
                        <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map — driver location + passenger pickup pins */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              Live Map
            </CardTitle>
            <CardDescription>
              Your position (blue) and pending passenger pickup locations (orange)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 320, position: "relative" }}>
              <MapContainer
                center={driverPos}
                zoom={13}
                style={{ width: "100%", height: "100%" }}
                scrollWheelZoom={false}
                zoomControl={true}
              >
                <InvalidateSize />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={tileUrl}
                  maxZoom={19}
                />
                {/* Driver pin */}
                <Marker position={driverPos} icon={createDriverIcon()}>
                  <Popup>
                    <div className="text-sm font-semibold text-blue-700 p-1">
                      Your location<br />
                      <span className="text-xs text-muted-foreground font-normal">{vehicle.plateNumber}</span>
                    </div>
                  </Popup>
                </Marker>
                {/* Scheduled pickup pins (from route origin lookup) */}
                {pickupPins.map((r) => (
                  <Marker key={`sched-${r.id}`} position={r.coords} icon={createPassengerIcon()}>
                    <Popup>
                      <div className="text-sm p-1 space-y-1">
                        <div className="font-semibold">{r.passengerName}</div>
                        <div className="text-xs text-muted-foreground">Pickup: {r.origin}</div>
                        <div className="text-xs text-muted-foreground">{r.seatCount} seat{r.seatCount !== 1 ? "s" : ""} · {format(new Date(r.departureTime), "HH:mm")}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {/* Custom trip pickup pins (exact GPS coordinates) */}
                {customRequests.map((r) => (
                  <Marker key={`custom-${r.id}`} position={[r.pickupLat, r.pickupLng]} icon={createPassengerIcon()}>
                    <Popup>
                      <div className="text-sm p-1 space-y-1">
                        <div className="font-semibold">{r.passengerName}</div>
                        <div className="text-xs text-muted-foreground">📍 {r.pickupLabel}</div>
                        <div className="text-xs text-muted-foreground">→ {r.dropoffLabel}</div>
                        <div className="text-xs text-muted-foreground">{r.seatCount} seat{r.seatCount !== 1 ? "s" : ""} · Custom trip</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Your location
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Passenger pickup
              </span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs px-2" onClick={refreshLocation} disabled={isRefreshingLocation}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingLocation ? "animate-spin" : ""}`} />
                Update my location
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle info + Status + Passengers */}
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
                >-</Button>
                <Button
                  className="flex-1 text-lg font-bold h-12"
                  onClick={() => updatePassengers(1)}
                  disabled={isUpdatingPassengers || vehicle.currentPassengers >= vehicle.capacity}
                >+</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent confirmed bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Bookings
            </CardTitle>
            <CardDescription>Last 10 confirmed bookings for your vehicle</CardDescription>
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
