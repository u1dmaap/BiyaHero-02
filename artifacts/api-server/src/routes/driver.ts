import { Router, type IRouter } from "express";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { db, usersTable, vehiclesTable, bookingsTable, schedulesTable, routesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

async function requireDriver(req: AuthRequest, res: import("express").Response) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || user.role !== "driver" || !user.driverVehicleId) {
    res.status(403).json({ error: "Forbidden", message: "Driver account with registered vehicle required" });
    return null;
  }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, user.driverVehicleId));
  if (!vehicle) {
    res.status(404).json({ error: "Not found", message: "Vehicle not found" });
    return null;
  }
  return { user, vehicle };
}

router.get("/driver/dashboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ctx = await requireDriver(req, res);
  if (!ctx) return;
  const { vehicle } = ctx;

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
    .where(
      and(
        eq(schedulesTable.vehicleId, vehicle.id),
        inArray(bookingsTable.status, ["confirmed", "completed", "cancelled"]),
      ),
    )
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

router.get("/driver/requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ctx = await requireDriver(req, res);
  if (!ctx) return;
  const { vehicle } = ctx;

  const pending = await db
    .select({
      id: bookingsTable.id,
      passengerName: bookingsTable.passengerName,
      passengerPhone: bookingsTable.passengerPhone,
      seatCount: bookingsTable.seatCount,
      totalFare: bookingsTable.totalFare,
      status: bookingsTable.status,
      paymentStatus: bookingsTable.paymentStatus,
      createdAt: bookingsTable.createdAt,
      scheduleId: bookingsTable.scheduleId,
      departureTime: schedulesTable.departureTime,
      origin: routesTable.origin,
      destination: routesTable.destination,
    })
    .from(bookingsTable)
    .innerJoin(schedulesTable, eq(bookingsTable.scheduleId, schedulesTable.id))
    .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
    .where(
      and(
        eq(schedulesTable.vehicleId, vehicle.id),
        eq(bookingsTable.status, "pending"),
      ),
    )
    .orderBy(desc(bookingsTable.createdAt));

  res.json(pending);
});

router.put("/driver/requests/:id/approve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ctx = await requireDriver(req, res);
  if (!ctx) return;
  const { vehicle } = ctx;

  const bookingId = parseInt(req.params.id);
  if (isNaN(bookingId)) {
    res.status(400).json({ error: "Bad request", message: "Invalid booking ID" });
    return;
  }

  const [booking] = await db
    .select({ id: bookingsTable.id, scheduleId: bookingsTable.scheduleId, status: bookingsTable.status })
    .from(bookingsTable)
    .innerJoin(schedulesTable, eq(bookingsTable.scheduleId, schedulesTable.id))
    .where(
      and(
        eq(bookingsTable.id, bookingId),
        eq(schedulesTable.vehicleId, vehicle.id),
        eq(bookingsTable.status, "pending"),
      ),
    );

  if (!booking) {
    res.status(404).json({ error: "Not found", message: "Pending booking not found for your vehicle" });
    return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "confirmed" })
    .where(eq(bookingsTable.id, bookingId))
    .returning();

  res.json({ success: true, booking: updated });
});

router.put("/driver/requests/:id/reject", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ctx = await requireDriver(req, res);
  if (!ctx) return;
  const { vehicle } = ctx;

  const bookingId = parseInt(req.params.id);
  if (isNaN(bookingId)) {
    res.status(400).json({ error: "Bad request", message: "Invalid booking ID" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({ id: bookingsTable.id, scheduleId: bookingsTable.scheduleId, seatCount: bookingsTable.seatCount, status: bookingsTable.status })
        .from(bookingsTable)
        .innerJoin(schedulesTable, eq(bookingsTable.scheduleId, schedulesTable.id))
        .where(
          and(
            eq(bookingsTable.id, bookingId),
            eq(schedulesTable.vehicleId, vehicle.id),
            eq(bookingsTable.status, "pending"),
          ),
        );

      if (!booking) {
        throw Object.assign(new Error("Pending booking not found for your vehicle"), { status: 404 });
      }

      await tx
        .update(bookingsTable)
        .set({ status: "cancelled" })
        .where(eq(bookingsTable.id, bookingId));

      await tx
        .update(schedulesTable)
        .set({ availableSeats: sql`${schedulesTable.availableSeats} + ${booking.seatCount}` })
        .where(eq(schedulesTable.id, booking.scheduleId));
    });

    res.json({ success: true });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: "Error", message: e.message });
  }
});

router.put("/driver/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ctx = await requireDriver(req, res);
  if (!ctx) return;
  const { vehicle } = ctx;

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
    .where(eq(vehiclesTable.id, vehicle.id))
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
  const ctx = await requireDriver(req, res);
  if (!ctx) return;
  const { vehicle } = ctx;

  const { currentPassengers } = req.body as { currentPassengers?: number };
  if (typeof currentPassengers !== "number" || currentPassengers < 0) {
    res.status(400).json({ error: "Bad request", message: "currentPassengers must be a non-negative number" });
    return;
  }

  if (currentPassengers > vehicle.capacity) {
    res.status(400).json({ error: "Bad request", message: `Cannot exceed vehicle capacity of ${vehicle.capacity}` });
    return;
  }

  const [updated] = await db
    .update(vehiclesTable)
    .set({ currentPassengers })
    .where(eq(vehiclesTable.id, vehicle.id))
    .returning();

  res.json({
    id: updated.id,
    currentPassengers: updated.currentPassengers,
    capacity: updated.capacity,
  });
});

export default router;
