import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListSchedules,
  useCreateBooking,
  usePayBooking,
  PaymentMethod,
  type Booking,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Clock, MapPin, Users, CheckCircle2, ChevronRight, ChevronLeft,
  Banknote, CreditCard, ShieldCheck, CalendarClock
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
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [passengerName, setPassengerName] = useState(user?.name || "");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.gcash);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [transactionId, setTransactionId] = useState("");

  const { data: schedules, isLoading } = useListSchedules(
    {
      origin: vehicle?.routeOrigin || undefined,
      destination: vehicle?.routeDestination || undefined,
      date: today,
    },
    { query: { enabled: !!vehicle, staleTime: 30000 } }
  );

  const selectedSchedule = schedules?.find((s) => s.id === selectedScheduleId);

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: (data) => { setCreatedBooking(data); setStep(3); },
      onError: (e) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
    },
  });

  const payBooking = usePayBooking({
    mutation: {
      onSuccess: (data) => {
        if (data.success) { setTransactionId(data.transactionId); setStep(4); }
        else toast({ title: "Payment failed", description: data.message || "Unknown error", variant: "destructive" });
      },
      onError: (e) => toast({ title: "Payment failed", description: e.message, variant: "destructive" }),
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedScheduleId(null);
    setSeatCount(1);
    setPassengerName(user?.name || "");
    setPassengerPhone("");
    setCreatedBooking(null);
    setTransactionId("");
    onClose();
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) return;
    createBooking.mutate({ data: { scheduleId: selectedScheduleId, seatCount, passengerName, passengerPhone: passengerPhone || undefined } });
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdBooking) return;
    payBooking.mutate({
      id: createdBooking.id,
      data: {
        method: paymentMethod,
        mobileNumber: paymentMethod === "gcash" || paymentMethod === "maya" ? "09123456789" : undefined,
        cardNumber: paymentMethod === "credit_card" ? "4111222233334444" : undefined,
        cardHolder: paymentMethod === "credit_card" ? passengerName : undefined,
        expiryDate: paymentMethod === "credit_card" ? "12/25" : undefined,
        cvv: paymentMethod === "credit_card" ? "123" : undefined,
      },
    });
  };

  const totalFare = selectedSchedule ? selectedSchedule.fare * seatCount : 0;

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
          {/* Steps */}
          <div className="flex items-center gap-1 mt-2">
            {["Schedule", "Details", "Payment", "Done"].map((label, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${step > i ? "bg-primary" : "bg-muted"}`} />
                {i < 3 && <div className={`h-1.5 w-1.5 rounded-full transition-colors ${step > i + 1 ? "bg-primary" : "bg-muted"}`} />}
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
                  <p className="text-xs mt-1">Check back later or browse the search page</p>
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
                          {s.availableSeats} seats left
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
                  <span className="text-muted-foreground">Fare / seat</span>
                  <span className="font-semibold">₱{selectedSchedule.fare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-semibold">{selectedSchedule.availableSeats} seats</span>
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
                  <Label htmlFor="pname">Passenger Name</Label>
                  <Input id="pname" required value={passengerName} onChange={e => setPassengerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pphone">Mobile Number <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="pphone" type="tel" placeholder="09xx xxx xxxx" value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} />
                </div>
              </div>
            </form>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <form id="payment-form" onSubmit={handlePay} className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Total ({seatCount} {seatCount === 1 ? "seat" : "seats"})</span>
                  <span className="text-primary text-base">₱{totalFare.toLocaleString()}</span>
                </div>
              </div>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-2">
                {[
                  { value: PaymentMethod.gcash, label: "GCash", icon: <Banknote className="h-4 w-4 text-blue-500" /> },
                  { value: PaymentMethod.maya, label: "Maya", icon: <Banknote className="h-4 w-4 text-green-500" /> },
                  { value: PaymentMethod.credit_card, label: "Credit / Debit Card", icon: <CreditCard className="h-4 w-4 text-muted-foreground" /> },
                  { value: PaymentMethod.cash, label: "Cash (Over the Counter)", icon: <Banknote className="h-4 w-4 text-muted-foreground" /> },
                ].map(({ value, label, icon }) => (
                  <div key={value} className="flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all hover:border-primary/40">
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value} className="flex-1 cursor-pointer flex items-center justify-between">
                      <span className="font-medium text-sm">{label}</span>
                      {icon}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <p>Payments are encrypted and processed securely.</p>
              </div>
            </form>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="text-center py-8 space-y-5">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-bold">Booking Confirmed!</h3>
                <p className="text-sm text-muted-foreground mt-1">Have a safe journey!</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-sm text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="font-mono font-bold">#{createdBooking?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref</span>
                  <span className="font-mono text-xs self-center">{transactionId.slice(0, 20)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-green-600">Paid</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => { handleClose(); setLocation("/trips"); }} className="w-full">View My Trips</Button>
                <Button variant="outline" onClick={handleClose} className="w-full">Back to Map</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 4 && (
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
              <Button type="submit" form="passenger-form" size="sm" disabled={createBooking.isPending}>
                {createBooking.isPending ? "Processing…" : "Proceed to Payment"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" form="payment-form" size="sm" disabled={payBooking.isPending}
                style={{ backgroundColor: vehicle?.color }}
                className="text-white hover:opacity-90"
              >
                {payBooking.isPending ? "Processing…" : `Pay ₱${totalFare.toLocaleString()}`}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
