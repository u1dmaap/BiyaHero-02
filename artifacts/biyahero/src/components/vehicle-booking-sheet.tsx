import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LocationPickerMap, type PickedLocation } from "@/components/location-picker-map";
import {
  MapPin, CheckCircle2, HourglassIcon, Navigation, LocateFixed, Loader2,
  Banknote, Smartphone, CreditCard,
} from "lucide-react";

interface VehicleInfo {
  id: number;
  type: string;
  plateNumber: string;
  operator: string;
  routeName?: string | null;
  routeOrigin?: string | null;
  routeDestination?: string | null;
  color: string;
}

interface VehicleBookingSheetProps {
  vehicle: VehicleInfo | null;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { id: "cash",   label: "Cash",   icon: Banknote,    desc: "Pay the driver directly" },
  { id: "gcash",  label: "GCash",  icon: Smartphone,  desc: "Send via GCash" },
  { id: "maya",   label: "Maya",   icon: Smartphone,  desc: "Send via Maya" },
  { id: "card",   label: "Card",   icon: CreditCard,  desc: "Debit / Credit card" },
];

export function VehicleBookingSheet({ vehicle, onClose }: VehicleBookingSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [customStep, setCustomStep] = useState<1 | 2 | 3 | 4>(1);
  const [pickup, setPickup] = useState<PickedLocation | null>(null);
  const [dropoff, setDropoff] = useState<PickedLocation | null>(null);
  const [pickerOpen, setPickerOpen] = useState<"pickup" | "dropoff" | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [customName, setCustomName] = useState(user?.name || "");
  const [customPhone, setCustomPhone] = useState("");
  const [customSeats, setCustomSeats] = useState(1);
  const [customNotes, setCustomNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [locatingFor, setLocatingFor] = useState<"pickup" | "dropoff" | null>(null);

  const useCurrentLocation = useCallback((type: "pickup" | "dropoff") => {
    if (!navigator.geolocation) return;
    setLocatingFor(type);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
            { headers: { "User-Agent": "PasaHeroGo/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          name = addr.suburb || addr.neighbourhood || addr.village || addr.town
            || addr.city_district || addr.city || data.display_name?.split(",")[0] || name;
        } catch { /* coords fallback */ }
        const loc: PickedLocation = { name, lat, lng };
        if (type === "pickup") setPickup(loc);
        else setDropoff(loc);
        setLocatingFor(null);
      },
      () => setLocatingFor(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const resetAll = () => {
    setCustomStep(1);
    setPickup(null);
    setDropoff(null);
    setCustomTime("");
    setCustomName(user?.name || "");
    setCustomPhone("");
    setCustomSeats(1);
    setCustomNotes("");
    setPaymentMethod("cash");
  };

  const handleClose = () => { resetAll(); onClose(); };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !pickup || !dropoff) return;
    setIsSendingCustom(true);
    try {
      await customFetch("/api/custom-trips", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: vehicle.id,
          pickupLat: pickup.lat, pickupLng: pickup.lng, pickupLabel: pickup.name,
          dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, dropoffLabel: dropoff.name,
          requestedTime: customTime,
          passengerName: customName,
          passengerPhone: customPhone || undefined,
          seatCount: customSeats,
          notes: customNotes || undefined,
          paymentMethod,
        }),
      });
      setCustomStep(4);
    } catch {
      toast({ title: "Request failed", description: "Could not send trip request.", variant: "destructive" });
    } finally {
      setIsSendingCustom(false);
    }
  };

  const stepLabels = ["Pickup", "Dropoff", "Details", "Requested!"];

  return (
    <>
      <Sheet open={!!vehicle} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0 overflow-hidden top-16 h-[calc(100vh-4rem)]">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: vehicle?.color }} />
              <div>
                <SheetTitle className="text-base leading-tight">
                  {vehicle?.type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} — {vehicle?.plateNumber}
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{vehicle?.operator}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <Navigation className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-medium text-foreground">Custom Trip</span>
              <span className="mx-1">—</span>
              <span>Pick your own pickup & dropoff</span>
            </div>

            {/* Step progress */}
            <div className="flex gap-1.5 mt-1">
              {stepLabels.map((_, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${customStep > i ? "bg-primary" : customStep === i + 1 ? "bg-primary/40" : "bg-muted"}`} />
                </div>
              ))}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ── Step 1: Pickup ─────────────────────────────── */}
            {customStep === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                    <LocateFixed className="h-4 w-4 text-green-600" />
                    Where should we pick you up?
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Pick on the map or tap to use your GPS location.</p>
                </div>
                {pickup ? (
                  <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4" /> Pickup set
                    </div>
                    <p className="text-sm font-medium">{pickup.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}</p>
                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen("pickup")}>
                        Change on map
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => useCurrentLocation("pickup")}
                        disabled={locatingFor === "pickup"}
                        className="w-9 p-0"
                      >
                        {locatingFor === "pickup"
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <LocateFixed className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 flex-col gap-2 border-dashed border-2"
                      onClick={() => setPickerOpen("pickup")}
                    >
                      <MapPin className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Pick on map</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => useCurrentLocation("pickup")}
                      disabled={locatingFor === "pickup"}
                    >
                      <span className="flex items-center gap-2">
                        {locatingFor === "pickup"
                          ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          : <LocateFixed className="h-4 w-4 shrink-0" />}
                        <span>{locatingFor === "pickup" ? "Getting your location…" : "Use my current location"}</span>
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Dropoff ─────────────────────────────── */}
            {customStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-red-500" />
                    Where do you want to go?
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Pick your dropoff on the map or use GPS.</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <LocateFixed className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  Pickup: <span className="font-medium text-foreground">{pickup?.name}</span>
                </div>
                {dropoff ? (
                  <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4" /> Dropoff set
                    </div>
                    <p className="text-sm font-medium">{dropoff.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{dropoff.lat.toFixed(5)}, {dropoff.lng.toFixed(5)}</p>
                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen("dropoff")}>
                        Change on map
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => useCurrentLocation("dropoff")}
                        disabled={locatingFor === "dropoff"}
                        className="w-9 p-0"
                      >
                        {locatingFor === "dropoff"
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <LocateFixed className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 flex-col gap-2 border-dashed border-2"
                      onClick={() => setPickerOpen("dropoff")}
                    >
                      <MapPin className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium">Pick on map</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => useCurrentLocation("dropoff")}
                      disabled={locatingFor === "dropoff"}
                    >
                      <span className="flex items-center gap-2">
                        {locatingFor === "dropoff"
                          ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          : <LocateFixed className="h-4 w-4 shrink-0" />}
                        <span>{locatingFor === "dropoff" ? "Getting your location…" : "Use my current location"}</span>
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Details + Payment ─────────────────── */}
            {customStep === 3 && (
              <form id="custom-form" onSubmit={handleCustomSubmit} className="space-y-4">
                <div className="bg-muted/40 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <LocateFixed className="h-3 w-3 text-green-600" />
                    <span className="font-medium text-foreground">{pickup?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3 text-red-500" />
                    <span className="font-medium text-foreground">{dropoff?.name}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ctime">Preferred Pickup Time</Label>
                  <Input id="ctime" type="datetime-local" required value={customTime} onChange={e => setCustomTime(e.target.value)} />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>Seats</Label>
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setCustomSeats(Math.max(1, customSeats - 1))}>−</Button>
                    <span className="text-xl font-bold w-8 text-center">{customSeats}</span>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setCustomSeats(customSeats + 1)}>+</Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cname">Your Name</Label>
                  <Input id="cname" required value={customName} onChange={e => setCustomName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cphone">Mobile <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="cphone" type="tel" placeholder="09xx xxx xxxx" value={customPhone} onChange={e => setCustomPhone(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cnotes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="cnotes" placeholder="e.g. landmark, luggage..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                </div>

                <Separator />

                {/* Payment method */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const Icon = pm.icon;
                      const selected = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-background text-foreground hover:border-primary/40"
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className={`text-xs font-semibold leading-tight ${selected ? "text-primary" : ""}`}>{pm.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{pm.desc}</p>
                          </div>
                          {selected && (
                            <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <HourglassIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>The driver will review your trip request and approve or reject it.</p>
                </div>
              </form>
            )}

            {/* ── Step 4: Confirmation ─────────────────────── */}
            {customStep === 4 && (
              <div className="text-center py-10 space-y-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Trip Requested!</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    Your trip request has been sent to the driver. They'll review your pickup and dropoff.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-left space-y-2">
                  <div className="flex items-start gap-2">
                    <LocateFixed className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span><span className="text-muted-foreground">Pickup:</span> <span className="font-medium">{pickup?.name}</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                    <span><span className="text-muted-foreground">Dropoff:</span> <span className="font-medium">{dropoff?.name}</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{vehicle?.plateNumber}</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    {paymentMethod === "cash" ? <Banknote className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                      : <Smartphone className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />}
                    <span><span className="text-muted-foreground">Payment:</span> <span className="font-medium capitalize">{PAYMENT_METHODS.find(p => p.id === paymentMethod)?.label}</span></span>
                  </div>
                </div>
                <Button onClick={handleClose} className="w-full">Back to Map</Button>
              </div>
            )}
          </div>

          {/* Footer nav */}
          {customStep < 4 && (
            <div className="px-5 pb-5 pt-3 border-t shrink-0 flex gap-3">
              {customStep > 1 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCustomStep((s) => (s - 1) as 1 | 2 | 3 | 4)}>
                  Back
                </Button>
              )}
              {customStep === 1 && (
                <Button type="button" className="flex-1" disabled={!pickup || locatingFor === "pickup"} onClick={() => setCustomStep(2)}>
                  Next: Set Dropoff
                </Button>
              )}
              {customStep === 2 && (
                <Button type="button" className="flex-1" disabled={!dropoff || locatingFor === "dropoff"} onClick={() => setCustomStep(3)}>
                  Next: Trip Details
                </Button>
              )}
              {customStep === 3 && (
                <Button className="flex-1" type="submit" form="custom-form" disabled={isSendingCustom}>
                  {isSendingCustom ? "Sending..." : "Send Request"}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LocationPickerMap
        open={pickerOpen === "pickup"}
        onClose={() => setPickerOpen(null)}
        onConfirm={(loc) => { setPickup(loc); setPickerOpen(null); }}
        title="Set Your Pickup Location"
      />
      <LocationPickerMap
        open={pickerOpen === "dropoff"}
        onClose={() => setPickerOpen(null)}
        onConfirm={(loc) => { setDropoff(loc); setPickerOpen(null); }}
        title="Set Your Dropoff Location"
      />
    </>
  );
}
