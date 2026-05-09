import { useState } from "react";
import { useListSchedules, useCreateBooking } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationPickerMap, type PickedLocation } from "@/components/location-picker-map";
import { format } from "date-fns";
import {
  Clock, MapPin, Users, CheckCircle2, ChevronRight, ChevronLeft,
  CalendarClock, HourglassIcon, Navigation, LocateFixed,
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

type Mode = "scheduled" | "custom";

const today = format(new Date(), "yyyy-MM-dd");

export function VehicleBookingSheet({ vehicle, onClose }: VehicleBookingSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("scheduled");

  // Scheduled trip state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [passengerName, setPassengerName] = useState(user?.name || "");
  const [passengerPhone, setPassengerPhone] = useState("");

  // Custom trip state
  const [customStep, setCustomStep] = useState<1 | 2 | 3 | 4>(1);
  const [pickup, setPickup] = useState<PickedLocation | null>(null);
  const [dropoff, setDropoff] = useState<PickedLocation | null>(null);
  const [pickerOpen, setPickerOpen] = useState<"pickup" | "dropoff" | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [customName, setCustomName] = useState(user?.name || "");
  const [customPhone, setCustomPhone] = useState("");
  const [customSeats, setCustomSeats] = useState(1);
  const [customNotes, setCustomNotes] = useState("");
  const [isSendingCustom, setIsSendingCustom] = useState(false);

  const { data: allSchedules, isLoading } = useListSchedules(
    { origin: vehicle?.routeOrigin || undefined, destination: vehicle?.routeDestination || undefined, date: today },
    { query: { enabled: !!vehicle, staleTime: 30000 } }
  );

  const schedules = allSchedules?.filter((s) => s.vehicleId === vehicle?.id);
  const selectedSchedule = schedules?.find((s) => s.id === selectedScheduleId);

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: () => setStep(3),
      onError: (e) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
    },
  });

  const resetAll = () => {
    setMode("scheduled");
    setStep(1);
    setSelectedScheduleId(null);
    setSeatCount(1);
    setPassengerName(user?.name || "");
    setPassengerPhone("");
    setCustomStep(1);
    setPickup(null);
    setDropoff(null);
    setCustomTime("");
    setCustomName(user?.name || "");
    setCustomPhone("");
    setCustomSeats(1);
    setCustomNotes("");
  };

  const handleClose = () => { resetAll(); onClose(); };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep(1);
    setCustomStep(1);
    setSelectedScheduleId(null);
    setPickup(null);
    setDropoff(null);
  };

  const handleScheduledBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) return;
    createBooking.mutate({ data: { scheduleId: selectedScheduleId, seatCount, passengerName, passengerPhone: passengerPhone || undefined } });
  };

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
        }),
      });
      setCustomStep(4);
    } catch {
      toast({ title: "Request failed", description: "Could not send custom trip request.", variant: "destructive" });
    } finally {
      setIsSendingCustom(false);
    }
  };

  const totalSteps = mode === "scheduled" ? 3 : 4;
  const currentStep = mode === "scheduled" ? step : customStep;
  const stepLabels = mode === "scheduled"
    ? ["Pick Trip", "Your Details", "Requested!"]
    : ["Pickup", "Dropoff", "Details", "Requested!"];

  return (
    <>
      {/* Location Pickers (rendered outside sheet to avoid portal conflicts) */}
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

            {/* Mode tabs */}
            <div className="flex gap-1.5 mt-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => switchMode("scheduled")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === "scheduled" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Scheduled Trip
              </button>
              <button
                onClick={() => switchMode("custom")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === "custom" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Navigation className="h-3.5 w-3.5" />
                Custom Trip
              </button>
            </div>

            {/* Step progress */}
            <div className="flex gap-1.5 mt-1">
              {stepLabels.map((_, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${currentStep > i ? "bg-primary" : currentStep === i + 1 ? "bg-primary/40" : "bg-muted"}`} />
                </div>
              ))}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ── SCHEDULED TRIP ── */}
            {mode === "scheduled" && (
              <>
                {step === 1 && (
                  <div className="space-y-3">
                    {vehicle?.routeOrigin && vehicle?.routeDestination && (
                      <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium">{vehicle.routeOrigin}</span>
                        <span className="text-muted-foreground mx-0.5">→</span>
                        <span className="font-medium">{vehicle.routeDestination}</span>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      Available trips today
                    </p>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                    ) : !schedules?.length ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-medium">No trips available today</p>
                        <p className="text-xs mt-1">Try a custom trip instead</p>
                      </div>
                    ) : (
                      schedules.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedScheduleId(s.id)}
                          className={`w-full text-left rounded-xl border-2 p-4 transition-all ${selectedScheduleId === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-lg font-bold">{format(new Date(s.departureTime), "HH:mm")}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Arrives {format(new Date(s.estimatedArrivalTime), "HH:mm")}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Users className="h-3 w-3" /> {s.availableSeats} seats left
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-primary">₱{s.fare.toLocaleString()}</div>
                              <div className="text-[10px] text-muted-foreground">per seat</div>
                              <Badge variant="secondary" className="text-[10px] mt-1 capitalize">{s.vehicleType.replace("_", " ")}</Badge>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {step === 2 && selectedSchedule && (
                  <form id="passenger-form" onSubmit={handleScheduledBook} className="space-y-5">
                    <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departure</span>
                        <span className="font-semibold">{format(new Date(selectedSchedule.departureTime), "HH:mm")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Route</span>
                        <span className="font-semibold">{selectedSchedule.origin} → {selectedSchedule.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fare / seat</span>
                        <span className="font-semibold">₱{selectedSchedule.fare.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Seats</Label>
                      <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setSeatCount(Math.max(1, seatCount - 1))}>−</Button>
                        <span className="text-xl font-bold w-8 text-center">{seatCount}</span>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setSeatCount(Math.min(selectedSchedule.availableSeats, seatCount + 1))}>+</Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="pname">Your Name</Label>
                        <Input id="pname" required value={passengerName} onChange={e => setPassengerName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pphone">Mobile <span className="text-muted-foreground">(optional)</span></Label>
                        <Input id="pphone" type="tel" placeholder="09xx xxx xxxx" value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                      <HourglassIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <p>Your request will be sent to the driver for approval. Check status in <strong>My Trips</strong>.</p>
                    </div>
                  </form>
                )}

                {step === 3 && (
                  <div className="text-center py-10 space-y-5">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Request Sent!</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                        Your seat request has been sent to the driver. Once approved you can pay and confirm your trip.
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 text-sm text-left space-y-1.5">
                      <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-semibold">{vehicle?.plateNumber}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-semibold">{seatCount}</span></div>
                      {selectedSchedule && <div className="flex justify-between"><span className="text-muted-foreground">Est. Fare</span><span className="font-semibold text-primary">₱{(selectedSchedule.fare * seatCount).toLocaleString()}</span></div>}
                    </div>
                    <Button onClick={handleClose} className="w-full">Back to Map</Button>
                  </div>
                )}
              </>
            )}

            {/* ── CUSTOM TRIP ── */}
            {mode === "custom" && (
              <>
                {customStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                        <LocateFixed className="h-4 w-4 text-green-600" />
                        Where should we pick you up?
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">Click the button to open a map and tap your exact pickup spot.</p>
                    </div>
                    {pickup ? (
                      <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                          <CheckCircle2 className="h-4 w-4" /> Pickup set
                        </div>
                        <p className="text-sm font-medium">{pickup.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}</p>
                        <Button variant="outline" size="sm" className="mt-1" onClick={() => setPickerOpen("pickup")}>Change location</Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full h-24 flex-col gap-2 border-dashed border-2" onClick={() => setPickerOpen("pickup")}>
                        <MapPin className="h-6 w-6 text-green-600" />
                        <span className="text-sm font-medium">Tap to pick location on map</span>
                      </Button>
                    )}
                  </div>
                )}

                {customStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-red-500" />
                        Where do you want to go?
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">Select your exact dropoff point on the map.</p>
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
                        <Button variant="outline" size="sm" className="mt-1" onClick={() => setPickerOpen("dropoff")}>Change location</Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full h-24 flex-col gap-2 border-dashed border-2" onClick={() => setPickerOpen("dropoff")}>
                        <MapPin className="h-6 w-6 text-red-500" />
                        <span className="text-sm font-medium">Tap to pick location on map</span>
                      </Button>
                    )}
                  </div>
                )}

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
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                      <HourglassIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <p>The driver will review your custom trip request and approve or reject it.</p>
                    </div>
                  </form>
                )}

                {customStep === 4 && (
                  <div className="text-center py-10 space-y-5">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Custom Trip Requested!</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                        Your personalized trip request has been sent to the driver. They'll review your pickup and dropoff.
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
                      <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-semibold">{customSeats}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-semibold">{vehicle?.plateNumber}</span></div>
                    </div>
                    <Button onClick={handleClose} className="w-full">Back to Map</Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {(mode === "scheduled" ? step : customStep) !== (mode === "scheduled" ? 3 : 4) && (
            <div className="border-t px-5 py-4 flex items-center justify-between shrink-0 bg-background">
              {(mode === "scheduled" ? step : customStep) > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => mode === "scheduled" ? setStep(s => (s - 1) as typeof step) : setCustomStep(s => (s - 1) as typeof customStep)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
              )}

              {/* Scheduled trip navigation */}
              {mode === "scheduled" && step === 1 && (
                <Button disabled={!selectedScheduleId} onClick={() => setStep(2)} size="sm">
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {mode === "scheduled" && step === 2 && (
                <Button type="submit" form="passenger-form" size="sm" disabled={createBooking.isPending}
                  style={{ backgroundColor: vehicle?.color }} className="text-white hover:opacity-90">
                  {createBooking.isPending ? "Sending…" : "Send Request"} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}

              {/* Custom trip navigation */}
              {mode === "custom" && customStep === 1 && (
                <Button disabled={!pickup} onClick={() => setCustomStep(2)} size="sm">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {mode === "custom" && customStep === 2 && (
                <Button disabled={!dropoff} onClick={() => setCustomStep(3)} size="sm">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {mode === "custom" && customStep === 3 && (
                <Button type="submit" form="custom-form" size="sm" disabled={isSendingCustom}
                  style={{ backgroundColor: vehicle?.color }} className="text-white hover:opacity-90">
                  {isSendingCustom ? "Sending…" : "Send Request"} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
