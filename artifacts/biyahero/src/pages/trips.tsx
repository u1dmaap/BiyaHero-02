import { useListBookings, useCancelBooking, BookingStatus, getListBookingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MapPin, Users, Ticket, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function TripsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: bookings, isLoading } = useListBookings();
  
  const cancelMutation = useCancelBooking({
    mutation: {
      onSuccess: () => {
        toast({ title: "Booking Cancelled", description: "Your trip has been cancelled successfully." });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Cancellation Failed", description: error.message, variant: "destructive" });
      }
    }
  });

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.confirmed: return "bg-green-100 text-green-800 border-green-200";
      case BookingStatus.completed: return "bg-blue-100 text-blue-800 border-blue-200";
      case BookingStatus.cancelled: return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="flex-1 bg-muted/20 py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Trips</h1>
          <p className="text-muted-foreground mt-2">Manage your upcoming and past bookings.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : bookings?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold">No trips found</h3>
            <p className="text-muted-foreground mt-2 mb-6">You haven't booked any trips yet.</p>
            <Button asChild>
              <Link href="/">Find a Trip</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings?.map((booking) => (
              <Card key={booking.id} className={`overflow-hidden transition-all ${booking.status === BookingStatus.cancelled ? 'opacity-70' : ''}`}>
                <div className={`h-2 w-full ${
                  booking.status === BookingStatus.confirmed ? 'bg-green-500' :
                  booking.status === BookingStatus.completed ? 'bg-blue-500' :
                  booking.status === BookingStatus.cancelled ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`uppercase ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">ID: #{booking.id}</span>
                      </div>

                      {booking.schedule && (
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-lg font-bold">{format(new Date(booking.schedule.departureTime), "HH:mm")}</div>
                            <div className="text-sm">{booking.schedule.origin}</div>
                          </div>
                          <ArrowRightIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 text-right">
                            <div className="text-lg font-bold">{format(new Date(booking.schedule.estimatedArrivalTime), "HH:mm")}</div>
                            <div className="text-sm">{booking.schedule.destination}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" /> 
                          {booking.schedule ? format(new Date(booking.schedule.departureTime), "MMM d, yyyy") : 'Unknown Date'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> {booking.seatCount} Seat(s)
                        </span>
                        <span className="flex items-center gap-1 uppercase">
                          <MapPin className="h-4 w-4" /> {booking.schedule?.vehicleType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="md:w-48 flex flex-col justify-between bg-muted/30 p-4 rounded-lg border border-border">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Paid</div>
                        <div className="text-2xl font-bold text-primary">₱{booking.totalFare.toLocaleString()}</div>
                        {booking.paymentMethod && (
                          <div className="text-xs text-muted-foreground mt-1 capitalize">Via {booking.paymentMethod.replace('_', ' ')}</div>
                        )}
                      </div>
                      
                      {booking.status === BookingStatus.confirmed && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full mt-4"
                          onClick={() => cancelMutation.mutate({ id: booking.id })}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel Trip
                        </Button>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  )
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  )
}