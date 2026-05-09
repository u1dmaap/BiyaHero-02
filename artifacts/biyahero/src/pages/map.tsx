import { useState, useMemo, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useGetMapVehicles, VehicleType, customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, SlidersHorizontal, X, LocateFixed, RefreshCw, Ticket, CheckCircle2, Clock, AlertCircle, MapPin, Navigation, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";
import { VehicleBookingSheet } from "@/components/vehicle-booking-sheet";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LeafletIconDefaultInternal = typeof L.Icon.Default.prototype & { _getIconUrl?: () => string };
delete (L.Icon.Default.prototype as LeafletIconDefaultInternal)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const HIDDEN_TYPES = new Set(["fx", "ferry"]);

const vehicleColors: Record<string, string> = {
  [VehicleType.jeepney]: "#E11D48",
  [VehicleType.tricycle]: "#F59E0B",
  [VehicleType.bus]: "#2563EB",
  [VehicleType.van]: "#10B981",
  [VehicleType.uv_express]: "#F97316",
};

const ACTIVE_TRIP_COLOR = "#16A34A";

interface VehicleForBooking {
  id: number;
  type: string;
  plateNumber: string;
  operator: string;
  routeName?: string | null;
  routeOrigin?: string | null;
  routeDestination?: string | null;
  color: string;
}

interface CustomTripRequest {
  id: number;
  vehicleId: number;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffLabel: string;
  requestedTime: string;
  passengerName: string;
  passengerPhone: string | null;
  seatCount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  rating?: number | null;
  ratingComment?: string | null;
}

interface DriverVehicle {
  id: number;
  type: string;
  plateNumber: string;
  operator: string;
  capacity: number;
  currentLat: number;
  currentLng: number;
  currentPassengers: number;
  driverStatus: string;
}

// ─── Icon factories ───────────────────────────────────────────────────────────

function createVehicleIcon(color: string) {
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:40px;">
      <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>
      <div style="position:absolute;top:6px;left:6px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  });
}

function createActiveTripIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:36px;height:44px;">
      <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:${ACTIVE_TRIP_COLOR};transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 16px rgba(22,163,74,0.5);"></div>
      <div style="position:absolute;top:7px;left:7px;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.95);"></div>
    </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

function createUserIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 4px 12px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

function createDriverSelfIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 4px 12px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
  });
}

function createPendingPassengerIcon() {
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

function createConfirmedPassengerIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:40px;">
      <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#16A34A;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 14px rgba(22,163,74,0.4);"></div>
      <div style="position:absolute;top:6px;left:6px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.95);"></div>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  });
}

// ─── Map helpers ──────────────────────────────────────────────────────────────

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
  }, [lat, lng, map]);
  return null;
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

// ─── Status config ────────────────────────────────────────────────────────────

const TRIP_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: "Awaiting Driver Approval", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: <Clock className="h-4 w-4 text-amber-500" /> },
  confirmed: { label: "On the Way!",              color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
  rejected:  { label: "Trip Rejected",            color: "text-red-700",    bg: "bg-red-50 border-red-200",      icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  completed: { label: "Trip Completed",           color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: <CheckCircle2 className="h-4 w-4 text-blue-500" /> },
};

// ─── Complete-trip popup (inline in Leaflet Popup via React portal) ────────────

function CompleteTripPopupButton({ trip, onComplete }: { trip: CustomTripRequest; onComplete: (t: CustomTripRequest) => void }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handle = async () => {
    setLoading(true);
    try {
      await customFetch(`/api/driver/custom-requests/${trip.id}/complete`, { method: "PUT" });
      onComplete(trip);
    } catch {
      toast({ title: "Error", description: "Could not complete trip.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 transition-colors"
    >
      <Flag className="h-3.5 w-3.5" />
      {loading ? "Finishing…" : "Mark Trip as Finished"}
    </button>
  );
}

// ─── Driver map view ──────────────────────────────────────────────────────────

function DriverMapView() {
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<DriverVehicle | null>(null);
  const [pendingTrips, setPendingTrips] = useState<CustomTripRequest[]>([]);
  const [activeTrips, setActiveTrips] = useState<CustomTripRequest[]>([]);
  const [isRefreshSpinning, setIsRefreshSpinning] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [completedTrip, setCompletedTrip] = useState<CustomTripRequest | null>(null);

  const tileUrl = `${import.meta.env.BASE_URL}api/tiles/{z}/{x}/{y}.png`.replace(/\/+api\//, "/api/");

  const fetchData = useCallback(async () => {
    try {
      const [dash, pending, active] = await Promise.all([
        customFetch<{ vehicle: DriverVehicle }>("/api/driver/dashboard"),
        customFetch<CustomTripRequest[]>("/api/driver/custom-requests"),
        customFetch<CustomTripRequest[]>("/api/driver/active-trips"),
      ]);
      setVehicle(dash.vehicle);
      setPendingTrips(pending);
      setActiveTrips(active);
    } catch {
      toast({ title: "Error", description: "Could not load map data.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshSpinning(true);
    fetchData();
    setTimeout(() => setIsRefreshSpinning(false), 600);
  };

  const handleCompleted = (trip: CustomTripRequest) => {
    setActiveTrips((prev) => prev.filter((t) => t.id !== trip.id));
    setCompletedTrip(trip);
    toast({ title: "Trip completed!", description: `${trip.passengerName}'s trip has been marked as finished.` });
  };

  const refreshLocation = () => {
    if (!navigator.geolocation) { toast({ title: "Unavailable", description: "Geolocation not supported.", variant: "destructive" }); return; }
    setIsRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await customFetch("/api/driver/status", {
            method: "PUT",
            body: JSON.stringify({ currentLat: pos.coords.latitude, currentLng: pos.coords.longitude }),
          });
          fetchData();
          toast({ title: "Location updated" });
        } catch {
          toast({ title: "Error", description: "Could not update location.", variant: "destructive" });
        } finally { setIsRefreshingLocation(false); }
      },
      () => {
        toast({ title: "Permission denied", description: "Allow location access to update position.", variant: "destructive" });
        setIsRefreshingLocation(false);
      },
    );
  };

  const center: [number, number] = vehicle ? [vehicle.currentLat, vehicle.currentLng] : [13.7565, 121.0583];
  const totalPending = pendingTrips.length;
  const totalActive = activeTrips.length;

  return (
    <div style={{ position: "relative", flex: 1, height: "calc(100vh - 4rem)", overflow: "hidden" }}>
      <style>{`
        @keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-once { animation: spin-once 0.6s ease-in-out; }
      `}</style>

      <MapContainer center={center} zoom={13}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        scrollWheelZoom={true} zoomControl={false}
      >
        <InvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl} maxZoom={19}
        />

        {/* Driver own location */}
        {vehicle && (
          <Marker position={[vehicle.currentLat, vehicle.currentLng]} icon={createDriverSelfIcon()}>
            <Popup>
              <div className="p-1 text-sm">
                <div className="font-bold text-blue-700">Your Location</div>
                <div className="text-xs text-muted-foreground">{vehicle.plateNumber} · {vehicle.type.replace("_", " ")}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pending passenger pins */}
        {pendingTrips.map((r) => (
          <Marker key={`pending-${r.id}`} position={[r.pickupLat, r.pickupLng]} icon={createPendingPassengerIcon()}>
            <Popup minWidth={220}>
              <div className="p-1 space-y-1.5 text-sm">
                <div className="font-semibold">{r.passengerName}</div>
                <div className="text-xs text-muted-foreground flex items-start gap-1"><LocateFixed className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />{r.pickupLabel}</div>
                <div className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />{r.dropoffLabel}</div>
                <div className="text-xs text-muted-foreground">{r.seatCount} seat{r.seatCount !== 1 ? "s" : ""}</div>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Awaiting approval</Badge>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Confirmed passenger pins */}
        {activeTrips.map((r) => (
          <Marker key={`active-${r.id}`} position={[r.pickupLat, r.pickupLng]} icon={createConfirmedPassengerIcon()}>
            <Popup minWidth={220}>
              <div className="p-1 space-y-1.5 text-sm">
                <div className="font-semibold">{r.passengerName}</div>
                {r.passengerPhone && <div className="text-xs text-muted-foreground">{r.passengerPhone}</div>}
                <div className="text-xs text-muted-foreground flex items-start gap-1"><LocateFixed className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />{r.pickupLabel}</div>
                <div className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />{r.dropoffLabel}</div>
                <div className="text-xs text-muted-foreground">{r.seatCount} seat{r.seatCount !== 1 ? "s" : ""} · {new Date(r.requestedTime).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}</div>
                <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Confirmed</Badge>
                <CompleteTripPopupButton trip={r} onComplete={handleCompleted} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Right-side buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button size="icon" variant="secondary" className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl" onClick={refreshLocation} disabled={isRefreshingLocation} title="Update location">
          <LocateFixed className={`h-4 w-4 text-blue-600 ${isRefreshingLocation ? "spin-once" : ""}`} key={isRefreshingLocation ? "spin" : "still"} />
        </Button>
        <Button size="icon" variant="secondary" className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl" onClick={handleRefresh} title="Refresh">
          <RefreshCw className={`h-4 w-4 text-gray-700 ${isRefreshSpinning ? "spin-once" : ""}`} key={isRefreshSpinning ? "spinning" : "idle"} />
        </Button>
      </div>

      {/* Driver info panel */}
      <div className="absolute top-4 left-4 z-[1000] w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-primary" /> Driver Map
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{vehicle?.plateNumber} · {vehicle?.type.replace("_", " ")}</p>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shrink-0" />
            <span className="text-gray-600">Your location</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shrink-0" />
              <span className="text-gray-600">Pending pickup</span>
            </div>
            {totalPending > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">{totalPending}</Badge>}
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600 inline-block shrink-0" />
              <span className="text-gray-600">Confirmed passenger</span>
            </div>
            {totalActive > 0 && <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">{totalActive}</Badge>}
          </div>
          {totalPending === 0 && totalActive === 0 && (
            <p className="text-[11px] text-gray-400 text-center pt-1">No passengers on the map</p>
          )}
        </div>
      </div>

      {/* Trip completion summary modal */}
      {completedTrip && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-green-600 px-6 py-5 text-white text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
              <h2 className="text-lg font-bold">Trip Finished!</h2>
              <p className="text-green-100 text-sm mt-0.5">Great job completing the trip</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 shrink-0">Passenger</span>
                  <span className="font-semibold text-right">{completedTrip.passengerName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 shrink-0 mt-0.5">Pickup</span>
                  <span className="font-medium text-right max-w-[200px]">{completedTrip.pickupLabel}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 shrink-0 mt-0.5">Dropoff</span>
                  <span className="font-medium text-right max-w-[200px]">{completedTrip.dropoffLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Seats</span>
                  <span className="font-medium">{completedTrip.seatCount} seat{completedTrip.seatCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date &amp; Time</span>
                  <span className="font-medium">{new Date(completedTrip.requestedTime).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                {completedTrip.notes && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 shrink-0">Notes</span>
                    <span className="text-gray-600 italic text-right max-w-[200px]">"{completedTrip.notes}"</span>
                  </div>
                )}
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setCompletedTrip(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Commuter map view ────────────────────────────────────────────────────────

function CommuterMapView() {
  const { isAuthenticated } = useAuth();
  const [activeTypes, setActiveTypes] = useState<Set<VehicleType>>(new Set(Object.values(VehicleType)));
  const [panelOpen, setPanelOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [bookingVehicle, setBookingVehicle] = useState<VehicleForBooking | null>(null);
  const [isRefreshSpinning, setIsRefreshSpinning] = useState(false);
  const [myTrips, setMyTrips] = useState<CustomTripRequest[]>([]);

  const { data: vehicles, isLoading, refetch } = useGetMapVehicles({ query: { queryKey: ["map-vehicles"], refetchInterval: 30000 } } as Parameters<typeof useGetMapVehicles>[0]);

  const fetchMyTrips = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const trips = await customFetch<CustomTripRequest[]>("/api/custom-trips");
      setMyTrips(trips);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchMyTrips();
    const interval = setInterval(fetchMyTrips, 10000);
    return () => clearInterval(interval);
  }, [fetchMyTrips]);

  const activeTrip = useMemo(() => myTrips.find((t) => t.status === "pending" || t.status === "confirmed") ?? null, [myTrips]);
  const hasActiveTrip = !!activeTrip;

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (hasActiveTrip) return vehicles.filter((v) => v.id === activeTrip?.vehicleId);
    return vehicles.filter((v) => !HIDDEN_TYPES.has(v.type) && activeTypes.has(v.type as VehicleType));
  }, [vehicles, activeTypes, hasActiveTrip, activeTrip]);

  const toggleType = (type: VehicleType) => {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    setActiveTypes(next);
  };

  const locateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(coords);
      setFlyTo({ lat: coords[0], lng: coords[1] });
    });
  };

  const handleRefresh = () => {
    setIsRefreshSpinning(true);
    refetch();
    fetchMyTrips();
    setTimeout(() => setIsRefreshSpinning(false), 600);
  };

  const center: [number, number] = [13.7565, 121.0583];
  const tileUrl = `${import.meta.env.BASE_URL}api/tiles/{z}/{x}/{y}.png`.replace(/\/+api\//, "/api/");
  const tripStatusCfg = activeTrip ? (TRIP_STATUS_CONFIG[activeTrip.status] ?? null) : null;

  return (
    <div style={{ position: "relative", flex: 1, height: "calc(100vh - 4rem)", overflow: "hidden" }}>
      <style>{`
        @keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-once { animation: spin-once 0.6s ease-in-out; }
      `}</style>

      <MapContainer center={center} zoom={13}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        scrollWheelZoom={true} zoomControl={false}
      >
        <InvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl} maxZoom={19}
        />
        {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} />}
        {userLocation && (
          <Marker position={userLocation} icon={createUserIcon()}>
            <Popup><div className="p-1 text-sm font-semibold text-blue-700">Your location</div></Popup>
          </Marker>
        )}
        {filteredVehicles.map((vehicle) => {
          const isBooked = activeTrip?.vehicleId === vehicle.id;
          const color = isBooked ? ACTIVE_TRIP_COLOR : (vehicleColors[vehicle.type] || "#666");
          return (
            <Marker key={vehicle.id} position={[vehicle.currentLat, vehicle.currentLng]} icon={isBooked ? createActiveTripIcon() : createVehicleIcon(color)}>
              <Popup minWidth={240}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <strong className="uppercase tracking-wide text-sm">{vehicle.type.replace("_", " ")}</strong>
                    {isBooked
                      ? <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Your ride</span>
                      : <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          vehicle.driverStatus === "available" ? "bg-green-100 text-green-800" :
                          vehicle.driverStatus === "en_route"  ? "bg-blue-100 text-blue-800" :
                          vehicle.driverStatus === "arrived"   ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>{vehicle.driverStatus ?? vehicle.status}</span>
                    }
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Plate</span><span className="font-mono font-bold">{vehicle.plateNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Operator</span><span className="font-medium">{vehicle.operator}</span></div>
                    {vehicle.routeName && <div className="flex justify-between"><span className="text-gray-500">Route</span><span className="font-medium truncate max-w-[130px]">{vehicle.routeName}</span></div>}
                    {vehicle.currentPassengers != null && (
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t">
                        <span className="text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" />Passengers</span>
                        <span className="font-bold" style={{ color }}>{vehicle.currentPassengers}</span>
                      </div>
                    )}
                  </div>
                  {!hasActiveTrip && (
                    <button
                      onClick={() => setBookingVehicle({ id: vehicle.id, type: vehicle.type, plateNumber: vehicle.plateNumber, operator: vehicle.operator, routeName: vehicle.routeName, routeOrigin: vehicle.routeOrigin, routeDestination: vehicle.routeDestination, color })}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-2 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: color }}
                    >
                      <Ticket className="h-3.5 w-3.5" /> Book a Seat
                    </button>
                  )}
                  {isBooked && activeTrip && (
                    <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold border flex items-center gap-2 ${tripStatusCfg?.bg ?? ""} ${tripStatusCfg?.color ?? ""}`}>
                      {tripStatusCfg?.icon}{tripStatusCfg?.label ?? activeTrip.status}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Right-side buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {!hasActiveTrip && (
          <Button size="icon" variant="secondary" className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl" onClick={() => setPanelOpen((o) => !o)} title="Toggle filters">
            <SlidersHorizontal className="h-4 w-4 text-gray-700" />
          </Button>
        )}
        <Button size="icon" variant="secondary" className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl" onClick={locateUser} title="My location">
          <LocateFixed className="h-4 w-4 text-blue-600" />
        </Button>
        <Button size="icon" variant="secondary" className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl" onClick={handleRefresh} title="Refresh">
          <RefreshCw className={`h-4 w-4 text-gray-700 ${isRefreshSpinning || isLoading ? "spin-once" : ""}`} key={isRefreshSpinning ? "spinning" : "idle"} />
        </Button>
      </div>

      {/* Active trip status panel */}
      {activeTrip && (
        <div className="absolute top-4 left-4 z-[1000] w-72">
          <div className={`rounded-2xl shadow-2xl border-2 overflow-hidden ${tripStatusCfg?.bg ?? "bg-white border-gray-100"}`}>
            <div className="px-4 py-3 border-b border-current/10">
              <div className="flex items-center gap-2">{tripStatusCfg?.icon}<h2 className={`font-bold text-sm ${tripStatusCfg?.color ?? "text-gray-900"}`}>{tripStatusCfg?.label ?? "Trip in Progress"}</h2></div>
              <p className="text-[11px] text-gray-500 mt-0.5">Your custom trip is active</p>
            </div>
            <div className="p-4 space-y-2 bg-white/80 backdrop-blur-sm">
              <div className="flex items-start gap-2 text-xs text-gray-600"><LocateFixed className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" /><span><span className="font-semibold text-gray-800">Pickup:</span> {activeTrip.pickupLabel}</span></div>
              <div className="flex items-start gap-2 text-xs text-gray-600"><MapPin className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" /><span><span className="font-semibold text-gray-800">Dropoff:</span> {activeTrip.dropoffLabel}</span></div>
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-100"><Users className="h-3.5 w-3.5 shrink-0" />{activeTrip.seatCount} seat{activeTrip.seatCount !== 1 ? "s" : ""} · {new Date(activeTrip.requestedTime).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter panel — no active trip */}
      {!hasActiveTrip && (
        <div className={`absolute top-4 left-4 z-[1000] w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${panelOpen ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-4 pointer-events-none"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div><h2 className="font-bold text-sm text-gray-900">Live Map</h2><p className="text-[11px] text-gray-500 mt-0.5">Batangas Province public transport</p></div>
            <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Filter by type</p>
            {Object.values(VehicleType).filter((t) => !HIDDEN_TYPES.has(t)).map((type) => (
              <label key={type} htmlFor={`type-${type}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <Checkbox id={`type-${type}`} checked={activeTypes.has(type as VehicleType)} onCheckedChange={() => toggleType(type as VehicleType)} />
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: vehicleColors[type] }} />
                <span className="text-sm font-medium capitalize flex-1 text-gray-700">{type.replace("_", " ")}</span>
                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{vehicles?.filter((v) => v.type === type).length ?? 0}</span>
              </label>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80">
            <div className="flex justify-between items-center text-sm"><span className="text-gray-500 text-xs">Showing</span><span className="font-bold text-primary">{filteredVehicles.length} vehicles</span></div>
          </div>
        </div>
      )}

      <VehicleBookingSheet vehicle={bookingVehicle} onClose={() => { setBookingVehicle(null); fetchMyTrips(); }} />
    </div>
  );
}

// ─── Page entry point ─────────────────────────────────────────────────────────

export default function MapPage() {
  const { isDriver } = useAuth();
  return isDriver ? <DriverMapView /> : <CommuterMapView />;
}
