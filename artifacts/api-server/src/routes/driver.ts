import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, vehiclesTable, bookingsTable, schedulesTable, routesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/driver/dashboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || user.role !== "driver" || !user.driverVehicleId) {
    res.status(403).json({ error: "Forbidden", message: "Driver account with registered vehicle required" });
    return;
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, user.driverVehicleId));
  if (!vehicle) {
    res.status(404).json({ error: "Not found", message: "Vehicle not found" });
    return;
  }

  const recentBookings = await db
    .select({
      id: bookingsTable.id,
      passengerName: bookingsTable.passengerName,
      seatCount: bookingsTable.seatCount,
      totalFare: bookingsTable.totalFare,
      status: bookingsTable.status,
      paymentStatus: bookingsTable.paymentStatus,
      createdAt: bookingsTable.createdAt,
      scheduleId: bookingsTable.scheduleId,
    })
    .from(bookingsTable)
    .innerJoin(schedulesTable, eq(bookingsTable.scheduleId, schedulesTable.id))
    .where(eq(schedulesTable.vehicleId, vehicle.id))
    .orderBy(desc(bookingsTable.createdAt))
    .limit(10);

  res.json({
    vehicle: {
      id: vehicle.id,
      type: vehicle.type,
      plateNumber: vehicle.plateNumber,
      operator: vehicle.operator,
      capacity: vehicle.capacity,
      status: vehicle.status,
      currentLat: vehicle.currentLat,
      currentLng: vehicle.currentLng,
      currentPassengers: vehicle.currentPassengers,
      driverStatus: vehicle.driverStatus,
    },
    recentBookings,
  });
});

router.put("/driver/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || user.role !== "driver" || !user.driverVehicleId) {
    res.status(403).json({ error: "Forbidden", message: "Driver account with registered vehicle required" });
    return;
  }

  const { driverStatus, currentLat, currentLng } = req.body as {
    driverStatus?: string;
    currentLat?: number;
    currentLng?: number;
  };

  const validStatuses = ["offline", "available", "en_route", "arrived"];
  if (driverStatus && !validStatuses.includes(driverStatus)) {
    res.status(400).json({ error: "Bad request", message: `Status must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const updates: Partial<{ driverStatus: string; currentLat: number; currentLng: number; status: string }> = {};
  if (driverStatus) {
    updates.driverStatus = driverStatus;
    updates.status = driverStatus === "offline" ? "inactive" : "active";
  }
  if (typeof currentLat === "number") updates.currentLat = currentLat;
  if (typeof currentLng === "number") updates.currentLng = currentLng;

  const [updated] = await db
    .update(vehiclesTable)
    .set(updates)
    .where(eq(vehiclesTable.id, user.driverVehicleId))
    .returning();

  res.json({
    id: updated.id,
    driverStatus: updated.driverStatus,
    status: updated.status,
    currentLat: updated.currentLat,
    currentLng: updated.currentLng,
    currentPassengers: updated.currentPassengers,
  });
});

router.put("/driver/passengers", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || user.role !== "driver" || !user.driverVehicleId) {
    res.status(403).json({ error: "Forbidden", message: "Driver account with registered vehicle required" });
    return;
  }

  const { currentPassengers } = req.body as { currentPassengers?: number };
  if (typeof currentPassengers !== "number" || currentPassengers < 0) {
    res.status(400).json({ error: "Bad request", message: "currentPassengers must be a non-negative number" });
    return;
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, user.driverVehicleId));
  if (!vehicle) {
    res.status(404).json({ error: "Not found", message: "Vehicle not found" });
    return;
  }

  if (currentPassengers > vehicle.capacity) {
    res.status(400).json({ error: "Bad request", message: `Cannot exceed vehicle capacity of ${vehicle.capacity}` });
    return;
  }

  const [updated] = await db
    .update(vehiclesTable)
    .set({ currentPassengers })
    .where(eq(vehiclesTable.id, user.driverVehicleId))
    .returning();

  res.json({
    id: updated.id,
    currentPassengers: updated.currentPassengers,
    capacity: updated.capacity,
  });
});

export default router;
