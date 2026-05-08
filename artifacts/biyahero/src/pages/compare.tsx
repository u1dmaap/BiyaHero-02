import { useLocation, useSearch } from "wouter";
import { useCompareFares, VehicleType, getCompareFaresQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Coins, CheckCircle2, Zap, Coffee, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ComparePage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const date = searchParams.get("date") || "";

  const { data: comparisons, isLoading } = useCompareFares({
    origin,
    destination,
    date: date || undefined
  }, {
    query: {
      enabled: !!origin && !!destination,
      queryKey: getCompareFaresQueryKey({ origin, destination, date: date || undefined }),
    }
  });

  const getComfortIcon = (level: string) => {
    switch (level) {
      case "premium": return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
      case "comfortable": return <Coffee className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const getComfortColor = (level: string) => {
    switch (level) {
      case "premium": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800";
      case "comfortable": return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800";
      case "standard": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  if (!origin || !destination) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
        <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Select a Route to Compare</h2>
        <p className="text-muted-foreground max-w-md mb-6">Enter an origin and destination to see all available transport options side-by-side.</p>
        <Button asChild>
          <Link href="/">Back to Search</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Route Comparison
          </h1>
          <p className="text-lg text-muted-foreground flex items-center gap-2 mt-2">
            <span className="font-semibold text-foreground">{origin}</span> 
            <ArrowRightIcon className="h-4 w-4" /> 
            <span className="font-semibold text-foreground">{destination}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : comparisons?.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <h3 className="text-xl font-bold">No data available</h3>
            <p className="text-muted-foreground mt-2">We don't have enough data to compare this route yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisons?.map((comp) => (
              <Card key={comp.vehicleType} className={`relative overflow-hidden ${comp.isCheapest || comp.isFastest ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                {(comp.isCheapest || comp.isFastest) && (
                  <div className="absolute top-0 right-0 right-[-32px] top-[16px] rotate-45 bg-primary text-primary-foreground text-[10px] font-bold py-1 px-10 shadow-sm">
                    {comp.isCheapest && comp.isFastest ? "BEST OVERALL" : comp.isCheapest ? "CHEAPEST" : "FASTEST"}
                  </div>
                )}
                
                <CardHeader className="bg-card pb-4 border-b border-border">
                  <CardTitle className="text-xl capitalize flex items-center gap-2">
                    {comp.vehicleType.replace('_', ' ')}
                  </CardTitle>
                  <CardDescription className="flex gap-2 mt-2">
                    <Badge variant="outline" className={getComfortColor(comp.comfortLevel)}>
                      <span className="flex items-center gap-1">
                        {getComfortIcon(comp.comfortLevel)}
                        {comp.comfortLevel}
                      </span>
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-wider font-medium">
                      <Coins className="h-4 w-4" /> Fare Range
                    </div>
                    <div className="text-2xl font-bold">
                      ₱{comp.minFare} {comp.minFare !== comp.maxFare && `- ₱${comp.maxFare}`}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-wider font-medium">
                      <Clock className="h-4 w-4" /> Est. Travel Time
                    </div>
                    <div className="text-xl font-semibold">
                      {Math.floor(comp.estimatedMinutes / 60)}h {comp.estimatedMinutes % 60}m
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {comp.availableSchedules} options available
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/search?origin=${origin}&destination=${destination}&vehicleType=${comp.vehicleType}${date ? `&date=${date}` : ''}`}>
                        View schedules
                      </Link>
                    </Button>
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