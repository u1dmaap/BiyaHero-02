import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useGetMapVehicles, VehicleType } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Bus, Car, Ship, Users, Info } from "lucide-react";
import L from "leaflet";

// Fix leaflet icon paths
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom colored icons for different vehicle types
const createIcon = (color: string) => {
  return new L.DivIcon({
    className: "custom-marker-icon",
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const vehicleColors: Record<string, string> = {
  [VehicleType.jeepney]: "#E11D48", // Primary Red
  [VehicleType.tricycle]: "#FBBF24", // Secondary Yellow
  [VehicleType.bus]: "#0284C7", // Blue
  [VehicleType.van]: "#10B981", // Green
  [VehicleType.fx]: "#8B5CF6", // Purple
  [VehicleType.uv_express]: "#F97316", // Orange
  [VehicleType.ferry]: "#06B6D4", // Light Blue
};

const vehicleIcons: Record<string, React.ElementType> = {
  [VehicleType.jeepney]: Car,
  [VehicleType.tricycle]: Car,
  [VehicleType.bus]: Bus,
  [VehicleType.van]: Car,
  [VehicleType.fx]: Car,
  [VehicleType.uv_express]: Car,
  [VehicleType.ferry]: Ship,
};

export default function MapPage() {
  const [activeTypes, setActiveTypes] = useState<Set<VehicleType>>(
    new Set(Object.values(VehicleType))
  );

  const { data: vehicles, isLoading } = useGetMapVehicles();

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter(v => activeTypes.has(v.type as VehicleType));
  }, [vehicles, activeTypes]);

  const toggleType = (type: VehicleType) => {
    const next = new Set(activeTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setActiveTypes(next);
  };

  const center: [number, number] = [14.5995, 120.9842]; // Manila

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto z-10 shadow-md">
        <div>
          <h2 className="text-xl font-bold mb-2">Live Map</h2>
          <p className="text-sm text-muted-foreground">Track public transport vehicles in real-time across Metro Manila.</p>
        </div>

        <div className="space-y-3 mt-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" /> Filters
          </h3>
          <div className="flex flex-col gap-2">
            {Object.values(VehicleType).map((type) => {
              const count = vehicles?.filter(v => v.type === type).length ?? 0;
              return (
                <div key={type} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${type}`} 
                      checked={activeTypes.has(type as VehicleType)}
                      onCheckedChange={() => toggleType(type as VehicleType)}
                    />
                    <label 
                      htmlFor={`type-${type}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer flex items-center gap-2"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vehicleColors[type] }} />
                      {type.replace('_', ' ')}
                    </label>
                  </div>
                  <Badge variant="secondary" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="bg-primary/5 p-4 rounded-lg">
            <div className="text-sm font-semibold text-primary mb-1">Status Summary</div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Showing:</span>
              <span className="font-medium">{filteredVehicles.length} vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0 h-[60vh] md:h-auto min-h-[500px]">
        <MapContainer 
          center={center} 
          zoom={13} 
          className="w-full h-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {filteredVehicles.map(vehicle => {
            const IconComp = vehicleIcons[vehicle.type] || Car;
            return (
              <Marker 
                key={vehicle.id} 
                position={[vehicle.currentLat, vehicle.currentLng]}
                icon={createIcon(vehicleColors[vehicle.type] || "#000")}
              >
                <Popup className="biyahero-popup">
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                      <IconComp className="h-5 w-5 text-primary" style={{ color: vehicleColors[vehicle.type] }} />
                      <strong className="text-base uppercase tracking-wide">{vehicle.type.replace('_', ' ')}</strong>
                      <Badge variant="outline" className={`ml-auto text-[10px] ${vehicle.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}`}>
                        {vehicle.status}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plate:</span>
                        <span className="font-mono font-bold">{vehicle.plateNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Operator:</span>
                        <span className="font-medium">{vehicle.operator}</span>
                      </div>
                      {vehicle.routeName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Route:</span>
                          <span className="font-medium truncate max-w-[120px]" title={vehicle.routeName}>{vehicle.routeName}</span>
                        </div>
                      )}
                      {vehicle.availableSeats !== null && vehicle.availableSeats !== undefined && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> Seats:
                          </span>
                          <span className="font-bold text-primary">{vehicle.availableSeats}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
