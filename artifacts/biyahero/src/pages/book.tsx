import { useState } from "react";
import { useLocation, Link } from "wouter";
import { 
  useGetSchedule, 
  useCreateBooking, 
  usePayBooking, 
  PaymentMethod,
  Booking
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MapPin, Clock, Users, ShieldCheck, CheckCircle2, ChevronRight, CreditCard, Banknote } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function BookPage({ scheduleId }: { scheduleId: string }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [seatCount, setSeatCount] = useState<number>(1);
  const [passengerName, setPassengerName] = useState(user?.name || "");
  const [passengerPhone, setPassengerPhone] = useState("");
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.gcash);
  
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [transactionId, setTransactionId] = useState("");

  const { data: schedule, isLoading: isScheduleLoading } = useGetSchedule(parseInt(scheduleId));

  const createBookingMutation = useCreateBooking({
    mutation: {
      onSuccess: (data) => {
        setCreatedBooking(data);
        setStep(3); // Move to payment
      },
      onError: (error) => {
        toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      }
    }
  });

  const payBookingMutation = usePayBooking({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          setTransactionId(data.transactionId);
          setStep(4); // Move to confirmation
        } else {
          toast({ title: "Payment failed", description: data.message || "Unknown error", variant: "destructive" });
        }
      },
      onError: (error) => {
        toast({ title: "Payment failed", description: error.message, variant: "destructive" });
      }
    }
  });

  if (isScheduleLoading || !schedule) {
    return <div className="container mx-auto p-8"><Skeleton className="h-[600px] w-full max-w-3xl mx-auto" /></div>;
  }

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingMutation.mutate({
      data: {
        scheduleId: parseInt(scheduleId),
        seatCount,
        passengerName,
        passengerPhone: passengerPhone || undefined,
      }
    });
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdBooking) return;
    
    payBookingMutation.mutate({
      id: createdBooking.id,
      data: {
        method: paymentMethod,
        mobileNumber: paymentMethod === 'gcash' || paymentMethod === 'maya' ? '09123456789' : undefined,
        cardNumber: paymentMethod === 'credit_card' ? '4111222233334444' : undefined,
        cardHolder: paymentMethod === 'credit_card' ? passengerName : undefined,
        expiryDate: paymentMethod === 'credit_card' ? '12/25' : undefined,
        cvv: paymentMethod === 'credit_card' ? '123' : undefined,
      }
    });
  };

  const totalFare = schedule.fare * seatCount;

  return (
    <div className="flex-1 bg-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10" />
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-background ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {s}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Trip Details</CardTitle>
                  <CardDescription>Verify your travel information before proceeding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex-1">
                      <div className="text-2xl font-bold">{format(new Date(schedule.departureTime), "HH:mm")}</div>
                      <div className="text-sm font-medium">{schedule.origin}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(schedule.departureTime), "MMM d, yyyy")}</div>
                    </div>
                    <ArrowRightIcon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 text-right">
                      <div className="text-2xl font-bold">{format(new Date(schedule.estimatedArrivalTime), "HH:mm")}</div>
                      <div className="text-sm font-medium">{schedule.destination}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(schedule.estimatedArrivalTime), "MMM d, yyyy")}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Operator</span>
                      <span className="font-semibold">{schedule.operator}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Vehicle Type</span>
                      <span className="font-semibold uppercase">{schedule.vehicleType.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Available Seats</span>
                      <span className="font-semibold text-green-600">{schedule.availableSeats}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Base Fare</span>
                      <span className="font-semibold">₱{schedule.fare.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t p-6">
                  <Button onClick={() => setStep(2)} size="lg">Continue to Details <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </CardFooter>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Passenger Details</CardTitle>
                  <CardDescription>Who is traveling?</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="passenger-form" onSubmit={handleCreateBooking} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="seats">Number of Seats</Label>
                      <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" size="icon" onClick={() => setSeatCount(Math.max(1, seatCount - 1))}>-</Button>
                        <span className="text-xl font-bold w-8 text-center">{seatCount}</span>
                        <Button type="button" variant="outline" size="icon" onClick={() => setSeatCount(Math.min(schedule.availableSeats, seatCount + 1))}>+</Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Primary Passenger Name</Label>
                        <Input id="name" required value={passengerName} onChange={e => setPassengerName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number (Optional)</Label>
                        <Input id="phone" type="tel" placeholder="09xx xxx xxxx" value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} />
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" form="passenger-form" size="lg" disabled={createBookingMutation.isPending}>
                    {createBookingMutation.isPending ? "Processing..." : "Proceed to Payment"}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Select how you want to pay for your ticket</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="payment-form" onSubmit={handlePayment} className="space-y-6">
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-3">
                      <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <RadioGroupItem value={PaymentMethod.gcash} id="gcash" />
                        <Label htmlFor="gcash" className="flex-1 cursor-pointer flex items-center justify-between">
                          <span className="font-semibold">GCash</span>
                          <Banknote className="h-5 w-5 text-blue-500" />
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <RadioGroupItem value={PaymentMethod.maya} id="maya" />
                        <Label htmlFor="maya" className="flex-1 cursor-pointer flex items-center justify-between">
                          <span className="font-semibold">Maya</span>
                          <Banknote className="h-5 w-5 text-green-500" />
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <RadioGroupItem value={PaymentMethod.credit_card} id="cc" />
                        <Label htmlFor="cc" className="flex-1 cursor-pointer flex items-center justify-between">
                          <span className="font-semibold">Credit/Debit Card</span>
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <RadioGroupItem value={PaymentMethod.cash} id="cash" />
                        <Label htmlFor="cash" className="flex-1 cursor-pointer flex items-center justify-between">
                          <span className="font-semibold">Over the Counter (Cash)</span>
                          <Banknote className="h-5 w-5 text-muted-foreground" />
                        </Label>
                      </div>
                    </RadioGroup>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6">
                  <Button variant="ghost" disabled={payBookingMutation.isPending} onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" form="payment-form" size="lg" disabled={payBookingMutation.isPending}>
                    {payBookingMutation.isPending ? "Processing Payment..." : `Pay ₱${totalFare.toLocaleString()}`}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 4 && (
              <Card className="text-center py-12 border-primary border-t-8">
                <CardContent className="space-y-6">
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-20 w-20 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your ticket has been successfully booked. Have a safe journey!
                    </p>
                  </div>
                  
                  <div className="bg-muted p-6 rounded-lg max-w-sm mx-auto text-left space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Booking ID</span>
                      <span className="font-mono font-bold">#{createdBooking?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction Ref</span>
                      <span className="font-mono font-bold text-xs self-center">{transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-semibold text-green-600 uppercase">Paid</span>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button size="lg" asChild>
                      <Link href="/trips">View My Trips</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">Fare Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Base fare ({seatCount} {seatCount === 1 ? 'seat' : 'seats'})</span>
                  <span>₱{totalFare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Processing Fee</span>
                  <span>₱0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between items-end">
                  <span className="font-bold">Total Pay</span>
                  <span className="text-2xl font-bold text-primary">₱{totalFare.toLocaleString()}</span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  <p>Safe and secure payments powered by biyaHERO trusted gateways.</p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}