import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import L from "leaflet";

const pickerIcon = new L.DivIcon({
  className: "",
  html: `<div style="position:relative;width:32px;height:40px;">
    <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#E11D48;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);"></div>
    <div style="position:absolute;top:6px;left:6px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function InvalidateSize() {
  const map = useMapEvents({});
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

function FlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 16, { duration: 1 });
  }, [coords, map]);
  return null;
}

export interface PickedLocation {
  name: string;
  lat: number;
  lng: number;
}

interface LocationPickerMapProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: PickedLocation) => void;
  title: string;
  initialCenter?: [number, number];
}

export function LocationPickerMap({ open, onClose, onConfirm, title, initialCenter = [13.7565, 121.0583] }: LocationPickerMapProps) {
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const tileUrl = `${import.meta.env.BASE_URL}api/tiles/{z}/{x}/{y}.png`.replace(/\/+api\//, "/api/");

  const handlePick = useCallback(async (lat: number, lng: number) => {
    setPicked([lat, lng]);
    setPlaceName(null);
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        { headers: { "User-Agent": "PasaHeroGo/1.0" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const name =
        addr.suburb ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.village ||
        addr.town ||
        addr.city_district ||
        addr.city ||
        addr.municipality ||
        data.display_name?.split(",")[0] ||
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setPlaceName(name);
    } catch {
      setPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFlyTo(coords);
        handlePick(coords[0], coords[1]);
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    if (placeName && picked) {
      onConfirm({ name: placeName, lat: picked[0], lng: picked[1] });
      setPicked(null);
      setPlaceName(null);
      setFlyTo(null);
    }
  };

  const handleClose = () => {
    setPicked(null);
    setPlaceName(null);
    setFlyTo(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Click anywhere on the map to select a location, or use your GPS.</p>
        </DialogHeader>

        <div style={{ height: 420, position: "relative" }}>
          {open && (
            <MapContainer
              center={initialCenter}
              zoom={12}
              style={{ width: "100%", height: "100%" }}
              scrollWheelZoom={true}
              zoomControl={true}
            >
              <InvalidateSize />
              <FlyTo coords={flyTo} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={tileUrl}
                maxZoom={19}
              />
              <ClickHandler onPick={handlePick} />
              {picked && <Marker position={picked} icon={pickerIcon} />}
            </MapContainer>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs mr-auto"
            onClick={useCurrentLocation}
            disabled={locating || loading}
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5 text-blue-500" />}
            {locating ? "Locating…" : "Use my location"}
          </Button>
          <div className="text-sm">
            {loading && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Looking up location…
              </span>
            )}
            {!loading && placeName && (
              <span className="font-medium text-foreground">
                <MapPin className="h-3.5 w-3.5 inline mr-1 text-primary" />
                {placeName}
              </span>
            )}
            {!loading && !placeName && (
              <span className="text-muted-foreground">No location selected</span>
            )}
          </div>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!placeName || loading}>
            Use this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
