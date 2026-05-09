import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, customTripsTable, vehiclesTable } from "@workspace/db";
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

router.put("/custom-trips/:id/rate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Invalid trip ID" });
    return;
  }

  const { rating, ratingComment } = req.body as { rating: number; ratingComment?: string };

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Bad request", message: "Rating must be between 1 and 5" });
    return;
  }

  const [trip] = await db
    .select()
    .from(customTripsTable)
    .where(and(eq(customTripsTable.id, id), eq(customTripsTable.userId, req.userId!)));

  if (!trip) {
    res.status(404).json({ error: "Not found", message: "Trip not found" });
    return;
  }

  if (trip.status !== "completed") {
    res.status(400).json({ error: "Bad request", message: "Can only rate completed trips" });
    return;
  }

  const [updated] = await db
    .update(customTripsTable)
    .set({ rating, ratingComment: ratingComment || null })
    .where(eq(customTripsTable.id, id))
    .returning();

  res.json({ success: true, trip: updated });
});

export default router;
