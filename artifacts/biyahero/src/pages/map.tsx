import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useGetMapVehicles, VehicleType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bus, Car, Ship, Users, SlidersHorizontal, X, LocateFixed, RefreshCw, Ticket } from "lucide-react";
import L from "leaflet";
import { VehicleBookingSheet } from "@/components/vehicle-booking-sheet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LeafletIconDefaultInternal = typeof L.Icon.Default.prototype & { _getIconUrl?: () => string };
delete (L.Icon.Default.prototype as LeafletIconDefaultInternal)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const vehicleColors: Record<string, string> = {
  [VehicleType.jeepney]: "#E11D48",
  [VehicleType.tricycle]: "#F59E0B",
  [VehicleType.bus]: "#2563EB",
  [VehicleType.van]: "#10B981",
  [VehicleType.fx]: "#8B5CF6",
  [VehicleType.uv_express]: "#F97316",
  [VehicleType.ferry]: "#06B6D4",
};

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

function createUserIcon() {
  return new L.DivIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 4px 12px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

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

export default function MapPage() {
  const [activeTypes, setActiveTypes] = useState<Set<VehicleType>>(new Set(Object.values(VehicleType)));
  const [panelOpen, setPanelOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [bookingVehicle, setBookingVehicle] = useState<VehicleForBooking | null>(null);

  const { data: vehicles, isLoading, refetch } = useGetMapVehicles({ query: { queryKey: ["map-vehicles"], refetchInterval: 30000 } } as Parameters<typeof useGetMapVehicles>[0]);

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter((v) => activeTypes.has(v.type as VehicleType));
  }, [vehicles, activeTypes]);

  const toggleType = (type: VehicleType) => {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
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

  const center: [number, number] = [13.7565, 121.0583];
  const tileUrl = `${import.meta.env.BASE_URL}api/tiles/{z}/{x}/{y}.png`.replace(/\/+api\//, "/api/");

  return (
    <div style={{ position: "relative", flex: 1, height: "calc(100vh - 4rem)", overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <InvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
          maxZoom={19}
        />

        {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} />}

        {userLocation && (
          <Marker position={userLocation} icon={createUserIcon()}>
            <Popup>
              <div className="p-1 text-sm font-semibold text-blue-700">Your location</div>
            </Popup>
          </Marker>
        )}

        {filteredVehicles.map((vehicle) => {
          const color = vehicleColors[vehicle.type] || "#666";
          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.currentLat, vehicle.currentLng]}
              icon={createVehicleIcon(color)}
            >
              <Popup minWidth={240}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <strong className="uppercase tracking-wide text-sm">{vehicle.type.replace("_", " ")}</strong>
                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      vehicle.driverStatus === "available" ? "bg-green-100 text-green-800" :
                      vehicle.driverStatus === "en_route" ? "bg-blue-100 text-blue-800" :
                      vehicle.driverStatus === "arrived" ? "bg-amber-100 text-amber-800" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {vehicle.driverStatus ?? vehicle.status}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plate</span>
                      <span className="font-mono font-bold">{vehicle.plateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Operator</span>
                      <span className="font-medium">{vehicle.operator}</span>
                    </div>
                    {vehicle.routeName && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Route</span>
                        <span className="font-medium truncate max-w-[130px]">{vehicle.routeName}</span>
                      </div>
                    )}
                    {vehicle.routeOrigin && vehicle.routeDestination && (
                      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                        <span>{vehicle.routeOrigin}</span>
                        <span className="mx-1">→</span>
                        <span>{vehicle.routeDestination}</span>
                      </div>
                    )}
                    {vehicle.currentPassengers != null && (
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t">
                        <span className="text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" /> Passengers</span>
                        <span className="font-bold" style={{ color }}>{vehicle.currentPassengers}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setBookingVehicle({
                        id: vehicle.id,
                        type: vehicle.type,
                        plateNumber: vehicle.plateNumber,
                        operator: vehicle.operator,
                        routeName: vehicle.routeName,
                        routeOrigin: vehicle.routeOrigin,
                        routeDestination: vehicle.routeDestination,
                        color,
                      })
                    }
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: color }}
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    Book a Seat
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Right-side action buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl"
          onClick={() => setPanelOpen((o) => !o)}
          title="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-700" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl"
          onClick={locateUser}
          title="My location"
        >
          <LocateFixed className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="shadow-lg bg-white hover:bg-gray-50 h-10 w-10 rounded-xl"
          onClick={() => refetch()}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 text-gray-700 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Animated filter panel */}
      <div
        className={`absolute top-4 left-4 z-[1000] w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${
          panelOpen
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-x-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-sm text-gray-900">Live Map</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Batangas Province public transport</p>
          </div>
          <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Filter by type</p>
          {Object.values(VehicleType).map((type) => {
            const count = vehicles?.filter((v) => v.type === type).length ?? 0;
            return (
              <label
                key={type}
                htmlFor={`type-${type}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Checkbox
                  id={`type-${type}`}
                  checked={activeTypes.has(type as VehicleType)}
                  onCheckedChange={() => toggleType(type as VehicleType)}
                />
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: vehicleColors[type] }} />
                <span className="text-sm font-medium capitalize flex-1 text-gray-700">
                  {type.replace("_", " ")}
                </span>
                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{count}</span>
              </label>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 text-xs">Showing</span>
            <span className="font-bold text-primary">{filteredVehicles.length} vehicles</span>
          </div>
        </div>
      </div>

      {/* Booking sheet — rendered outside MapContainer so it's a normal React portal */}
      <VehicleBookingSheet
        vehicle={bookingVehicle}
        onClose={() => setBookingVehicle(null)}
      />
    </div>
  );
}
