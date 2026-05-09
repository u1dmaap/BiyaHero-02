import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, customTripsTable, vehiclesTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.post("/custom-trips", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const {
    vehicleId, pickupLat, pickupLng, pickupLabel,
    dropoffLat, dropoffLng, dropoffLabel,
    requestedTime, passengerName, passengerPhone,
    seatCount, notes,
  } = req.body as {
    vehicleId: number;
    pickupLat: number; pickupLng: number; pickupLabel: string;
    dropoffLat: number; dropoffLng: number; dropoffLabel: string;
    requestedTime: string;
    passengerName: string;
    passengerPhone?: string;
    seatCount?: number;
    notes?: string;
  };

  if (!vehicleId || pickupLat == null || pickupLng == null || !pickupLabel ||
      dropoffLat == null || dropoffLng == null || !dropoffLabel ||
      !requestedTime || !passengerName) {
    res.status(400).json({ error: "Bad request", message: "Missing required fields" });
    return;
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, vehicleId));
  if (!vehicle) {
    res.status(404).json({ error: "Not found", message: "Vehicle not found" });
    return;
  }

  const [trip] = await db.insert(customTripsTable).values({
    userId: req.userId!,
    vehicleId,
    pickupLat,
    pickupLng,
    pickupLabel,
    dropoffLat,
    dropoffLng,
    dropoffLabel,
    requestedTime,
    passengerName,
    passengerPhone: passengerPhone || null,
    seatCount: seatCount || 1,
    status: "pending",
    notes: notes || null,
  }).returning();

  res.status(201).json(trip);
});

router.get("/custom-trips", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const trips = await db
    .select()
    .from(customTripsTable)
    .where(eq(customTripsTable.userId, req.userId!));
  res.json(trips);
});

export default router;
