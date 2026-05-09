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
  Bell, ThumbsUp, ThumbsDown, CalendarClock, LocateFixed, Flag, X, Navigation2,
} from "lucide-react";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LeafletIconDefaultInternal = typeof L.Icon.Default.prototype & { _getIconUrl?: () => string };
delete (L.Icon.Default.prototype as LeafletIconDefaultInternal)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

type DriverStatus = "offline" | "available" | "en_route" | "arrived";
type TripStep = "en_route" | "arrived";

interface Vehicle {
  id: number; type: string; plateNumber: string; operator: string; capacity: number;
  status: string; currentLat: number; currentLng: number; currentPassengers: number; driverStatus: DriverStatus;
}
interface RecentBooking {
  id: number; passengerName: string; seatCount: number; totalFare: number;
  status: string; paymentStatus: string; createdAt: string;
}
interface CustomTripRequest {
  id: number; passengerName: string; passengerPhone: string | null; seatCount: number;
  pickupLat: number; pickupLng: number; pickupLabel: string;
  dropoffLat: number; dropoffLng: number; dropoffLabel: string;
  requestedTime: string; status: string; notes: string | null; createdAt: string;
}
interface DashboardData { vehicle: Vehicle; recentBookings: RecentBooking[]; }

const STATUS_CONFIG: Record<"offline" | "available", { label: string; color: string; bg: string; description: string; icon: React.ReactNode }> = {
  offline:   { label: "Offline",   color: "text-slate-500", bg: "bg-slate-100", description: "Not accepting passengers", icon: <WifiOff className="h-4 w-4 text-slate-400" /> },
  available: { label: "Available", color: "text-green-700", bg: "bg-green-100", description: "Ready for passengers",    icon: <Wifi className="h-4 w-4 text-green-500" /> },
};

// ─── Map icons ─────────────────────────────────────────────────────────────────

function mkPin(color: string, size = 32, square = false) {
  const h = Math.round(size * 1.25);
  const i = Math.round(size * 0.19);
  const s = Math.round(size * 0.44);
  const inner = square
    ? `<div style="position:absolute;top:${i}px;left:${i}px;width:${s}px;height:${s}px;border-radius:3px;background:rgba(255,255,255,0.9);"></div>`
    : `<div style="position:absolute;top:${i}px;left:${i}px;width:${s}px;height:${s}px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>`;
  return `<div style="position:relative;width:${size}px;height:${h}px;"><div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>${inner}</div>`;
}

function createDriverIcon() { return new L.DivIcon({ className: "", html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 4px 12px rgba(0,0,0,0.3);"></div>`, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -14] }); }
function createPickupPendingIcon() { return new L.DivIcon({ className: "", html: mkPin("#F59E0B", 28), iconSize: [28, 35], iconAnchor: [14, 35], popupAnchor: [0, -37] }); }
function createPickupConfirmedIcon() { return new L.DivIcon({ className: "", html: mkPin("#16A34A", 32), iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -42] }); }
function createDropoffIcon() { return new L.DivIcon({ className: "", html: mkPin("#EF4444", 28, false), iconSize: [28, 35], iconAnchor: [14, 35], popupAnchor: [0, -37] }); }

function InvalidateSize() {
  const map = useMap();
  useEffect(() => { const t1 = setTimeout(() => map.invalidateSize(), 100); const t2 = setTimeout(() => map.invalidateSize(), 500); return () => { clearTimeout(t1); clearTimeout(t2); }; }, [map]);
  return null;
}

// ─── Trip completion summary modal ────────────────────────────────────────────

function TripSummaryModal({ trip, onClose }: { trip: CustomTripRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-green-600 px-6 py-5 text-white text-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-green-200 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
          <h2 className="text-lg font-bold">Trip Finished!</h2>
          <p className="text-green-100 text-sm mt-0.5">Great job completing the trip</p>
        </div>
        <div className="p-6 space-y-0 text-sm divide-y divide-border">
          <div className="flex justify-between items-start py-3 first:pt-0"><span className="text-gray-500 shrink-0">Passenger</span><span className="font-semibold text-right">{trip.passengerName}</span></div>
          {trip.passengerPhone && <div className="flex justify-between py-3"><span className="text-gray-500">Phone</span><span className="font-medium">{trip.passengerPhone}</span></div>}
          <div className="flex justify-between items-start py-3"><span className="text-gray-500 shrink-0 mt-0.5">Pickup</span><span className="font-medium text-right max-w-[200px]">{trip.pickupLabel}</span></div>
          <div className="flex justify-between items-start py-3"><span className="text-gray-500 shrink-0 mt-0.5">Dropoff</span><span className="font-medium text-right max-w-[200px]">{trip.dropoffLabel}</span></div>
          <div className="flex justify-between py-3"><span className="text-gray-500">Seats</span><span className="font-medium">{trip.seatCount} seat{trip.seatCount !== 1 ? "s" : ""}</span></div>
          <div className="flex justify-between py-3"><span className="text-gray-500">Date &amp; Time</span><span className="font-medium">{new Date(trip.requestedTime).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span></div>
          {trip.notes && <div className="flex justify-between items-start py-3"><span className="text-gray-500 shrink-0">Notes</span><span className="text-gray-600 italic text-right max-w-[200px]">"{trip.notes}"</span></div>}
        </div>
        <div className="px-6 pb-6 pt-2">
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [customRequests, setCustomRequests] = useState<CustomTripRequest[]>([]);
  const [activeTrips, setActiveTrips] = useState<CustomTripRequest[]>([]);
  const [tripSteps, setTripSteps] = useState<Record<number, TripStep>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshSpinning, setIsRefreshSpinning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPassengers, setIsUpdatingPassengers] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [completedTrip, setCompletedTrip] = useState<CustomTripRequest | null>(null);

  const tileUrl = `${import.meta.env.BASE_URL}api/tiles/{z}/{x}/{y}.png`.replace(/\/+api\//, "/api/");

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, customReqs, active] = await Promise.all([
        customFetch<DashboardData>("/api/driver/dashboard"),
        customFetch<CustomTripRequest[]>("/api/driver/custom-requests"),
        customFetch<CustomTripRequest[]>("/api/driver/active-trips"),
      ]);
      setData(result); setCustomRequests(customReqs); setActiveTrips(active);
    } catch {
      toast({ title: "Error", description: "Could not load dashboard.", variant: "destructive" });
    } finally { setIsLoading(false); }
  }, [toast]);

  const fetchRequests = useCallback(async () => {
    try {
      const [customReqs, active] = await Promise.all([
        customFetch<CustomTripRequest[]>("/api/driver/custom-requests"),
        customFetch<CustomTripRequest[]>("/api/driver/active-trips"),
      ]);
      setCustomRequests(customReqs); setActiveTrips(active);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { const interval = setInterval(fetchRequests, 10000); return () => clearInterval(interval); }, [fetchRequests]);

  const handleRefresh = () => { setIsRefreshSpinning(true); fetchDashboard(); setTimeout(() => setIsRefreshSpinning(false), 600); };

  const handleApprove = async (id: number) => {
    const key = `custom-${id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/custom-requests/${id}/approve`, { method: "PUT" });
      setCustomRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Trip request approved" }); fetchRequests();
    } catch { toast({ title: "Error", description: "Could not approve request.", variant: "destructive" }); }
    finally { setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; }); }
  };

  const handleReject = async (id: number) => {
    const key = `custom-${id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/custom-requests/${id}/reject`, { method: "PUT" });
      setCustomRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Trip request rejected" });
    } catch { toast({ title: "Error", description: "Could not reject request.", variant: "destructive" }); }
    finally { setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; }); }
  };

  const handleStepEnRoute = async (trip: CustomTripRequest) => {
    setTripSteps((prev) => ({ ...prev, [trip.id]: "en_route" }));
    try {
      await customFetch("/api/driver/status", { method: "PUT", body: JSON.stringify({ driverStatus: "en_route" }) });
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, driverStatus: "en_route" } } : prev);
    } catch { /* silent — step is already set */ }
  };

  const handleStepArrived = async (trip: CustomTripRequest) => {
    setTripSteps((prev) => ({ ...prev, [trip.id]: "arrived" }));
    try {
      await customFetch("/api/driver/status", { method: "PUT", body: JSON.stringify({ driverStatus: "arrived" }) });
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, driverStatus: "arrived" } } : prev);
    } catch { /* silent */ }
  };

  const handleCompleteTrip = async (trip: CustomTripRequest) => {
    const key = `complete-${trip.id}`;
    setProcessingIds((s) => new Set(s).add(key));
    try {
      await customFetch(`/api/driver/custom-requests/${trip.id}/complete`, { method: "PUT" });
      setActiveTrips((prev) => prev.filter((r) => r.id !== trip.id));
      setTripSteps((prev) => { const n = { ...prev }; delete n[trip.id]; return n; });
      setCompletedTrip(trip);
      // Reset vehicle status back to available
      await customFetch("/api/driver/status", { method: "PUT", body: JSON.stringify({ driverStatus: "available" }) }).catch(() => {});
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, driverStatus: "available" } } : prev);
      fetchDashboard();
    } catch { toast({ title: "Error", description: "Could not complete trip.", variant: "destructive" }); }
    finally { setProcessingIds((s) => { const n = new Set(s); n.delete(key); return n; }); }
  };

  const updateStatus = async (driverStatus: "offline" | "available") => {
    if (!data) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await customFetch<Partial<Vehicle>>("/api/driver/status", { method: "PUT", body: JSON.stringify({ driverStatus }) });
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ...updated } } : prev);
      toast({ title: "Status updated", description: `You are now ${STATUS_CONFIG[driverStatus].label}.` });
    } catch { toast({ title: "Error", description: "Could not update status.", variant: "destructive" }); }
    finally { setIsUpdatingStatus(false); }
  };

  const updatePassengers = async (delta: number) => {
    if (!data) return;
    const next = Math.max(0, Math.min(data.vehicle.capacity, data.vehicle.currentPassengers + delta));
    if (next === data.vehicle.currentPassengers) return;
    setIsUpdatingPassengers(true);
    try {
      const updated = await customFetch<Partial<Vehicle>>("/api/driver/passengers", { method: "PUT", body: JSON.stringify({ currentPassengers: next }) });
      setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ...updated } } : prev);
    } catch { toast({ title: "Error", description: "Could not update passenger count.", variant: "destructive" }); }
    finally { setIsUpdatingPassengers(false); }
  };

  const refreshLocation = () => {
    if (!navigator.geolocation) { toast({ title: "Unavailable", description: "Geolocation is not supported.", variant: "destructive" }); return; }
    setIsRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await customFetch<Partial<Vehicle>>("/api/driver/status", { method: "PUT", body: JSON.stringify({ currentLat: pos.coords.latitude, currentLng: pos.coords.longitude }) });
          setData((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ...updated } } : prev);
          toast({ title: "Location updated" });
        } catch { toast({ title: "Error", description: "Could not update location.", variant: "destructive" }); }
        finally { setIsRefreshingLocation(false); }
      },
      () => { toast({ title: "Permission denied", description: "Allow location access to update your position.", variant: "destructive" }); setIsRefreshingLocation(false); },
    );
  };

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { vehicle, recentBookings } = data;
  const status = vehicle.driverStatus as DriverStatus;
  const isSimpleStatus = status === "offline" || status === "available";
  const statusCfg = isSimpleStatus ? STATUS_CONFIG[status] : STATUS_CONFIG.available;
  const occupancyPct = vehicle.capacity > 0 ? Math.round((vehicle.currentPassengers / vehicle.capacity) * 100) : 0;
  const driverPos: [number, number] = [vehicle.currentLat, vehicle.currentLng];
  const totalPending = customRequests.length;

  return (
    <div className="flex-1 bg-muted/20 p-4 md:p-6">
      <style>{`
        @keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-once { animation: spin-once 0.6s ease-in-out; }
      `}</style>

      {completedTrip && <TripSummaryModal trip={completedTrip} onClose={() => setCompletedTrip(null)} />}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6 text-primary" />Driver Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome, {user?.name} — {vehicle.type.replace("_", " ")} operator</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshSpinning || isLoading ? "spin-once" : ""}`} key={isRefreshSpinning ? "spinning" : "idle"} />
            Refresh
          </Button>
        </div>

        {/* Active Trips */}
        {activeTrips.length > 0 && (
          <Card className="border-green-300 shadow-green-100 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Active Trips
                <Badge className="ml-auto bg-green-600 hover:bg-green-600 text-white text-xs">{activeTrips.length} active</Badge>
              </CardTitle>
              <CardDescription>Follow the steps to complete each trip</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeTrips.map((r) => {
                  const step = tripSteps[r.id];
                  return (
                    <div key={r.id} className="flex flex-col gap-3 p-4 rounded-xl border-2 border-green-200 bg-green-50/50">
                      <div>
                        <div className="font-semibold text-sm">{r.passengerName}</div>
                        {r.passengerPhone && <div className="text-xs text-muted-foreground">{r.passengerPhone}</div>}
                        <div className="text-xs mt-1.5 space-y-1">
                          <div className="flex items-start gap-1.5 text-muted-foreground"><LocateFixed className="h-3 w-3 text-green-600 mt-0.5 shrink-0" /><span><span className="font-medium text-foreground">Pickup:</span> {r.pickupLabel}</span></div>
                          <div className="flex items-start gap-1.5 text-muted-foreground"><MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" /><span><span className="font-medium text-foreground">Dropoff:</span> {r.dropoffLabel}</span></div>
                          <div className="flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="h-3 w-3 shrink-0" />{new Date(r.requestedTime).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })} · {r.seatCount} seat{r.seatCount !== 1 ? "s" : ""}</div>
                        </div>
                        {r.notes && <div className="text-xs text-muted-foreground mt-1 italic">"{r.notes}"</div>}
                      </div>

                      {/* Step indicators */}
                      <div className="flex gap-1.5 text-[10px] font-semibold">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${step ? "bg-green-200 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                          <Navigation2 className="h-2.5 w-2.5" />En Route
                        </div>
                        <span className="text-gray-300 self-center">›</span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${step === "arrived" ? "bg-green-200 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                          <LocateFixed className="h-2.5 w-2.5" />Arrived
                        </div>
                        <span className="text-gray-300 self-center">›</span>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          <Flag className="h-2.5 w-2.5" />Done
                        </div>
                      </div>

                      {/* Action button — changes per step */}
                      {!step && (
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleStepEnRoute(r)}>
                          <Navigation2 className="h-3.5 w-3.5 mr-1.5" />Mark as En Route
                        </Button>
                      )}
                      {step === "en_route" && (
                        <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleStepArrived(r)}>
                          <LocateFixed className="h-3.5 w-3.5 mr-1.5" />Mark as Arrived
                        </Button>
                      )}
                      {step === "arrived" && (
                        <Button size="sm" className="w-full bg-green-700 hover:bg-green-800 text-white"
                          disabled={processingIds.has(`complete-${r.id}`)} onClick={() => handleCompleteTrip(r)}>
                          <Flag className="h-3.5 w-3.5 mr-1.5" />
                          {processingIds.has(`complete-${r.id}`) ? "Marking complete…" : "Mark Trip as Finished"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip Requests */}
        <Card className={totalPending > 0 ? "border-amber-300 shadow-amber-100 shadow-md" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className={`h-4 w-4 ${totalPending > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"}`} />
              Trip Requests
              {totalPending > 0 && <Badge className="ml-auto bg-amber-500 hover:bg-amber-500 text-white text-xs">{totalPending} new</Badge>}
            </CardTitle>
            <CardDescription>Passengers requesting a custom pickup &amp; dropoff</CardDescription>
          </CardHeader>
          <CardContent>
            {customRequests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending trip requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customRequests.map((r) => (
                  <div key={r.id} className="flex flex-col gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50">
                    <div>
                      <div className="font-semibold text-sm">{r.passengerName}</div>
                      {r.passengerPhone && <div className="text-xs text-muted-foreground">{r.passengerPhone}</div>}
                      <div className="text-xs mt-1.5 space-y-1">
                        <div className="flex items-start gap-1.5 text-muted-foreground"><LocateFixed className="h-3 w-3 text-green-600 mt-0.5 shrink-0" /><span><span className="font-medium text-foreground">Pickup:</span> {r.pickupLabel}</span></div>
                        <div className="flex items-start gap-1.5 text-muted-foreground"><MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" /><span><span className="font-medium text-foreground">Dropoff:</span> {r.dropoffLabel}</span></div>
                        <div className="flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="h-3 w-3 shrink-0" />{new Date(r.requestedTime).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })} · {r.seatCount} seat{r.seatCount !== 1 ? "s" : ""}</div>
                      </div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-1 italic">"{r.notes}"</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={processingIds.has(`custom-${r.id}`)} onClick={() => handleApprove(r.id)}>
                        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />{processingIds.has(`custom-${r.id}`) ? "Processing…" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" disabled={processingIds.has(`custom-${r.id}`)} onClick={() => handleReject(r.id)}>
                        <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Navigation className="h-4 w-4 text-primary" />Live Map</CardTitle>
            <CardDescription>
              <span className="inline-flex items-center gap-1.5 mr-3"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Your location</span>
              <span className="inline-flex items-center gap-1.5 mr-3"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Pickup (pending)</span>
              <span className="inline-flex items-center gap-1.5 mr-3"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />Pickup (confirmed)</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Dropoff</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 340, position: "relative" }}>
              <MapContainer center={driverPos} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom={false} zoomControl={true}>
                <InvalidateSize />
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url={tileUrl} maxZoom={19} />
                <Marker position={driverPos} icon={createDriverIcon()}>
                  <Popup><div className="text-sm p-1 font-semibold text-blue-700">Your location<br /><span className="text-xs text-muted-foreground font-normal">{vehicle.plateNumber}</span></div></Popup>
                </Marker>
                {customRequests.map((r) => (
                  <Marker key={`pickup-pending-${r.id}`} position={[r.pickupLat, r.pickupLng]} icon={createPickupPendingIcon()}>
                    <Popup><div className="text-sm p-1 space-y-1"><div className="font-semibold">{r.passengerName}</div><div className="text-xs text-muted-foreground">📍 {r.pickupLabel}</div><Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Pending Pickup</Badge></div></Popup>
                  </Marker>
                ))}
                {customRequests.map((r) => (
                  <Marker key={`dropoff-pending-${r.id}`} position={[r.dropoffLat, r.dropoffLng]} icon={createDropoffIcon()}>
                    <Popup><div className="text-sm p-1 space-y-1"><div className="font-semibold text-red-600">Dropoff</div><div className="text-xs text-muted-foreground">{r.passengerName}</div><div className="text-xs text-muted-foreground">{r.dropoffLabel}</div><Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Pending</Badge></div></Popup>
                  </Marker>
                ))}
                {activeTrips.map((r) => (
                  <Marker key={`pickup-active-${r.id}`} position={[r.pickupLat, r.pickupLng]} icon={createPickupConfirmedIcon()}>
                    <Popup><div className="text-sm p-1 space-y-1"><div className="font-semibold">{r.passengerName}</div><div className="text-xs text-muted-foreground">📍 {r.pickupLabel}</div><div className="text-xs text-muted-foreground">→ {r.dropoffLabel}</div><Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Confirmed Pickup</Badge></div></Popup>
                  </Marker>
                ))}
                {activeTrips.map((r) => (
                  <Marker key={`dropoff-active-${r.id}`} position={[r.dropoffLat, r.dropoffLng]} icon={createDropoffIcon()}>
                    <Popup><div className="text-sm p-1 space-y-1"><div className="font-semibold text-red-600">Dropoff</div><div className="text-xs text-muted-foreground">{r.passengerName}</div><div className="text-xs text-muted-foreground">{r.dropoffLabel}</div><Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Confirmed</Badge></div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="px-4 py-2 border-t">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={refreshLocation} disabled={isRefreshingLocation}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingLocation ? "spin-once" : ""}`} key={isRefreshingLocation ? "spin" : "still"} />
                Update my location
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle info + Status + Passengers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold capitalize">{vehicle.type.replace("_", " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plate</span><span className="font-mono font-bold">{vehicle.plateNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Operator</span><span className="font-medium">{vehicle.operator}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium">{vehicle.capacity} seats</span></div>
              <Separator />
              <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Coords</span><span className="text-xs font-mono">{vehicle.currentLat.toFixed(4)}, {vehicle.currentLng.toFixed(4)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isSimpleStatus ? statusCfg.icon : <Navigation2 className="h-4 w-4 text-blue-500" />}
                Status
              </CardTitle>
              <CardDescription>
                {status === "en_route" ? <span className="text-blue-600 font-medium">Currently on a trip</span>
                  : status === "arrived" ? <span className="text-amber-600 font-medium">At destination</span>
                  : isSimpleStatus ? <span className={statusCfg.color}>{statusCfg.description}</span>
                  : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["offline", "available"] as const).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button key={s} onClick={() => updateStatus(s)} disabled={isUpdatingStatus || isActive}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${isActive ? `border-primary ${cfg.bg} ${cfg.color} font-semibold` : "border-border hover:border-primary/30 hover:bg-muted/50"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-current" : "bg-muted-foreground/30"}`} />
                    <span className="text-sm">{cfg.label}</span>
                    {isActive && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
              {(status === "en_route" || status === "arrived") && (
                <div className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${status === "en_route" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                  {status === "en_route" ? <Navigation2 className="h-3.5 w-3.5" /> : <LocateFixed className="h-3.5 w-3.5" />}
                  {status === "en_route" ? "En route to passenger" : "Arrived at destination"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Passengers</CardTitle>
              <CardDescription>Current occupancy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <div className="text-5xl font-bold text-primary">{vehicle.currentPassengers}</div>
                <div className="text-sm text-muted-foreground mt-1">of {vehicle.capacity} seats</div>
                <div className="w-full bg-muted rounded-full h-2 mt-3">
                  <div className={`h-2 rounded-full transition-all ${occupancyPct >= 90 ? "bg-destructive" : occupancyPct >= 60 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${occupancyPct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{occupancyPct}% full</div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 text-lg font-bold h-12" onClick={() => updatePassengers(-1)} disabled={isUpdatingPassengers || vehicle.currentPassengers <= 0}>-</Button>
                <Button className="flex-1 text-lg font-bold h-12" onClick={() => updatePassengers(1)} disabled={isUpdatingPassengers || vehicle.currentPassengers >= vehicle.capacity}>+</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Recent Bookings</CardTitle>
            <CardDescription>Last completed trips for your vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No bookings yet.</p></div>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{b.passengerName}</div><div className="text-xs text-muted-foreground">{b.seatCount} seat{b.seatCount !== 1 ? "s" : ""} · #{b.id}</div></div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold flex items-center gap-0.5 justify-end"><PhilippinePeso className="h-3 w-3" />{b.totalFare.toLocaleString()}</div>
                      <div className="flex gap-1 mt-0.5 justify-end">
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${b.status === "confirmed" ? "border-green-300 text-green-700" : b.status === "cancelled" ? "border-red-300 text-red-700" : ""}`}>{b.status}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${b.paymentStatus === "paid" ? "border-blue-300 text-blue-700" : ""}`}>{b.paymentStatus}</Badge>
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
