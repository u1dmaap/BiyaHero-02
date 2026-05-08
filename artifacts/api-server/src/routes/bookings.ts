import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, bookingsTable, schedulesTable, vehiclesTable, routesTable } from "@workspace/db";
import {
  ListBookingsQueryParams,
  CreateBookingBody,
  GetBookingParams,
  CancelBookingParams,
  PayBookingParams,
  PayBookingBody,
  ListBookingsResponse,
  GetBookingResponse,
  CancelBookingResponse,
  PayBookingResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

async function getScheduleWithDetails(scheduleId: number) {
  const [result] = await db
    .select({
      id: schedulesTable.id,
      routeId: schedulesTable.routeId,
      routeName: routesTable.name,
      origin: routesTable.origin,
      destination: routesTable.destination,
      vehicleId: schedulesTable.vehicleId,
      vehicleType: vehiclesTable.type,
      operator: vehiclesTable.operator,
      plateNumber: vehiclesTable.plateNumber,
      departureTime: schedulesTable.departureTime,
      estimatedArrivalTime: schedulesTable.estimatedArrivalTime,
      availableSeats: schedulesTable.availableSeats,
      totalCapacity: vehiclesTable.capacity,
      fare: schedulesTable.fare,
      date: schedulesTable.date,
    })
    .from(schedulesTable)
    .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
    .innerJoin(vehiclesTable, eq(schedulesTable.vehicleId, vehiclesTable.id))
    .where(eq(schedulesTable.id, scheduleId));
  return result ?? null;
}

async function getBookingWithSchedule(bookingId: number) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) return null;
  const schedule = await getScheduleWithDetails(booking.scheduleId);
  return { ...booking, schedule };
}

router.get("/bookings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { status } = parsed.data;

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(
      status
        ? and(eq(bookingsTable.userId, req.userId!), eq(bookingsTable.status, status))
        : eq(bookingsTable.userId, req.userId!),
    );

  const enriched = await Promise.all(
    bookings.map(async (b) => {
      const schedule = await getScheduleWithDetails(b.scheduleId);
      return { ...b, schedule };
    }),
  );

  res.json(ListBookingsResponse.parse(enriched));
});

router.post("/bookings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { scheduleId, seatCount, passengerName, passengerPhone } = parsed.data;

  const schedule = await getScheduleWithDetails(scheduleId);
  if (!schedule) {
    res.status(404).json({ error: "Not found", message: "Schedule not found" });
    return;
  }

  if (schedule.availableSeats < seatCount) {
    res.status(400).json({ error: "Bad request", message: "Not enough seats available" });
    return;
  }

  const totalFare = schedule.fare * seatCount;

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      userId: req.userId!,
      scheduleId,
      seatCount,
      passengerName,
      passengerPhone: passengerPhone ?? null,
      totalFare,
      status: "confirmed",
      paymentStatus: "unpaid",
    })
    .returning();

  await db
    .update(schedulesTable)
    .set({ availableSeats: schedule.availableSeats - seatCount })
    .where(eq(schedulesTable.id, scheduleId));

  const enriched = await getBookingWithSchedule(booking.id);
  res.status(201).json(GetBookingResponse.parse(enriched));
});

router.get("/bookings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const enriched = await getBookingWithSchedule(params.data.id);
  if (!enriched || enriched.userId !== req.userId) {
    res.status(404).json({ error: "Not found", message: "Booking not found" });
    return;
  }

  res.json(GetBookingResponse.parse(enriched));
});

router.delete("/bookings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = CancelBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.userId, req.userId!)));

  if (!booking) {
    res.status(404).json({ error: "Not found", message: "Booking not found" });
    return;
  }

  if (booking.status === "completed" || booking.status === "cancelled") {
    res.status(400).json({ error: "Bad request", message: "Cannot cancel this booking" });
    return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, booking.scheduleId));
  if (schedule) {
    await db
      .update(schedulesTable)
      .set({ availableSeats: schedule.availableSeats + booking.seatCount })
      .where(eq(schedulesTable.id, booking.scheduleId));
  }

  const enriched = await getBookingWithSchedule(updated.id);
  res.json(CancelBookingResponse.parse(enriched));
});

router.post("/bookings/:id/pay", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = PayBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const parsed = PayBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.userId, req.userId!)));

  if (!booking) {
    res.status(404).json({ error: "Not found", message: "Booking not found" });
    return;
  }

  if (booking.paymentStatus === "paid") {
    res.status(400).json({ error: "Bad request", message: "Booking already paid" });
    return;
  }

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const [updated] = await db
    .update(bookingsTable)
    .set({ paymentMethod: parsed.data.method, paymentStatus: "paid", status: "confirmed" })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  const enriched = await getBookingWithSchedule(updated.id);

  res.json(
    PayBookingResponse.parse({
      success: true,
      transactionId,
      booking: enriched,
      message: "Payment processed successfully",
    }),
  );
});

export default router;
