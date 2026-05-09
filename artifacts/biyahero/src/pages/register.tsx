import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useRegister, VehicleType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { setAuthToken } from "@/lib/auth";
import { Navigation, User, Truck } from "lucide-react";
import { Link } from "wouter";

type Role = "commuter" | "driver";

export default function Register() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [role, setRole] = useState<Role>("commuter");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.jeepney);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(16);
  const [vehicleOperator, setVehicleOperator] = useState("");

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setAuthToken(data.token);
        toast({ title: "Account created!", description: "Welcome to PasaHero Go." });
        if (data.user.role === "driver") {
          setLocation("/driver");
        } else {
          setLocation("/");
        }
        window.location.reload();
      },
      onError: (error) => {
        toast({
          title: "Registration Failed",
          description: error.message || "Please check your inputs and try again.",
          variant: "destructive",
        });
      },
    },
  });

  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (role === "driver") {
      if (!vehiclePlate.trim() || !vehicleOperator.trim()) {
        toast({ title: "Validation Error", description: "Plate number and operator name are required for drivers.", variant: "destructive" });
        return;
      }
    }
    registerMutation.mutate({
      data: {
        name,
        email,
        password,
        role,
        ...(role === "driver" && {
          vehicleType,
          vehiclePlate: vehiclePlate.toUpperCase(),
          vehicleCapacity,
          vehicleOperator,
        }),
      },
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Join PasaHero Go to track rides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole("commuter")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                role === "commuter" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
              }`}
            >
              <User className="h-6 w-6" />
              <span className="text-sm font-semibold">Commuter</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Search & book rides</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("driver")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                role === "driver" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
              }`}
            >
              <Truck className="h-6 w-6" />
              <span className="text-sm font-semibold">Driver</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Register your vehicle</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Juan Dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="juan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters.</p>
            </div>

            {role === "driver" && (
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Vehicle Details
                </p>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VehicleType).map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Plate Number</Label>
                  <Input id="plate" placeholder="ABC-1234" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} required={role === "driver"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operator">Operator / Company Name</Label>
                  <Input id="operator" placeholder="RJDL Transport" value={vehicleOperator} onChange={(e) => setVehicleOperator(e.target.value)} required={role === "driver"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Passenger Capacity</Label>
                  <Input id="capacity" type="number" min={1} max={100} value={vehicleCapacity} onChange={(e) => setVehicleCapacity(parseInt(e.target.value))} required={role === "driver"} />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-6" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : role === "driver" ? "Register as Driver" : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
