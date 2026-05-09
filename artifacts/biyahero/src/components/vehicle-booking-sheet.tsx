import { useState } from "react";
import {
  useListSchedules,
  useCreateBooking,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Clock, MapPin, Users, CheckCircle2, ChevronRight, ChevronLeft, CalendarClock, HourglassIcon
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

const today = format(new Date(), "yyyy-MM-dd");

export function VehicleBookingSheet({ vehicle, onClose }: VehicleBookingSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [passengerName, setPassengerName] = useState(user?.name || "");
  const [passengerPhone, setPassengerPhone] = useState("");

  const { data: allSchedules, isLoading } = useListSchedules(
    {
      origin: vehicle?.routeOrigin || undefined,
      destination: vehicle?.routeDestination || undefined,
      date: today,
    },
    { query: { enabled: !!vehicle, staleTime: 30000 } }
  );

  // Only show schedules for THIS specific vehicle
  const schedules = allSchedules?.filter((s) => s.vehicleId === vehicle?.id);
  const selectedSchedule = schedules?.find((s) => s.id === selectedScheduleId);

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: () => { setStep(3); },
      onError: (e) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedScheduleId(null);
    setSeatCount(1);
    setPassengerName(user?.name || "");
    setPassengerPhone("");
    onClose();
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) return;
    createBooking.mutate({
      data: {
        scheduleId: selectedScheduleId,
        seatCount,
        passengerName,
        passengerPhone: passengerPhone || undefined,
      },
    });
  };

  return (
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
          {vehicle?.routeOrigin && vehicle?.routeDestination && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2 mt-1">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-medium text-foreground">{vehicle.routeOrigin}</span>
              <span className="text-muted-foreground mx-0.5">→</span>
              <span className="font-medium text-foreground">{vehicle.routeDestination}</span>
            </div>
          )}
          {/* Step progress */}
          <div className="flex gap-1.5 mt-2">
            {["Pick Trip", "Your Details", "Requested!"].map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${step > i ? "bg-primary" : step === i + 1 ? "bg-primary/40" : "bg-muted"}`} />
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Step 1: Pick Schedule */}
          {step === 1 && (
            <div className="space-y-3">
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
                  <p className="text-xs mt-1">This vehicle has no scheduled trips today</p>
                </div>
              ) : (
                schedules.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScheduleId(s.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      selectedScheduleId === s.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-bold">{format(new Date(s.departureTime), "HH:mm")}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Arrives {format(new Date(s.estimatedArrivalTime), "HH:mm")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {s.availableSeats} seats available
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

          {/* Step 2: Passenger Details */}
          {step === 2 && selectedSchedule && (
            <form id="passenger-form" onSubmit={handleBook} className="space-y-5">
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
                  <Label htmlFor="pphone">Mobile Number <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="pphone" type="tel" placeholder="09xx xxx xxxx" value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <HourglassIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>Your request will be sent to the driver for approval. You'll see the status update in <strong>My Trips</strong>.</p>
              </div>
            </form>
          )}

          {/* Step 3: Request Sent */}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="font-semibold">{vehicle?.plateNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-semibold">{seatCount}</span>
                </div>
                {selectedSchedule && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Fare</span>
                    <span className="font-semibold text-primary">₱{(selectedSchedule.fare * seatCount).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <Button onClick={handleClose} className="w-full">Back to Map</Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="border-t px-5 py-4 flex items-center justify-between shrink-0 bg-background">
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => (s - 1) as typeof step)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
            )}
            {step === 1 && (
              <Button disabled={!selectedScheduleId} onClick={() => setStep(2)} size="sm">
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button
                type="submit" form="passenger-form" size="sm"
                disabled={createBooking.isPending}
                style={{ backgroundColor: vehicle?.color }}
                className="text-white hover:opacity-90"
              >
                {createBooking.isPending ? "Sending…" : "Send Request"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
