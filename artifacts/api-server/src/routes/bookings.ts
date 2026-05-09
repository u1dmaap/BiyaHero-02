import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, bookingsTable, schedulesTable, vehiclesTable, routesTable, paymentsTable } from "@workspace/db";
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

  // Verify schedule exists before entering transaction
  const precheck = await getScheduleWithDetails(scheduleId);
  if (!precheck) {
    res.status(404).json({ error: "Not found", message: "Schedule not found" });
    return;
  }

  let bookingId: number;

  try {
    bookingId = await db.transaction(async (tx) => {
      // Atomically decrement seats only if sufficient availability exists.
      // Using a conditional UPDATE avoids TOCTOU races between two concurrent bookings.
      const decremented = await tx
        .update(schedulesTable)
        .set({ availableSeats: sql`${schedulesTable.availableSeats} - ${seatCount}` })
        .where(
          and(
            eq(schedulesTable.id, scheduleId),
            sql`${schedulesTable.availableSeats} >= ${seatCount}`,
          ),
        )
        .returning({ id: schedulesTable.id });

      // If no rows updated, the guard failed — seats unavailable or another transaction won the race.
      if (decremented.length === 0) {
        throw Object.assign(new Error("Not enough seats available"), { status: 400 });
      }

      const totalFare = precheck.fare * seatCount;

      const [booking] = await tx
        .insert(bookingsTable)
        .values({
          userId: req.userId!,
          scheduleId,
          seatCount,
          passengerName,
          passengerPhone: passengerPhone ?? null,
          totalFare,
          status: "pending",
          paymentStatus: "unpaid",
        })
        .returning();

      return booking.id;
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 400) {
      res.status(400).json({ error: "Bad request", message: e.message });
    } else {
      res.status(500).json({ error: "Internal server error", message: "Booking failed" });
    }
    return;
  }

  const enriched = await getBookingWithSchedule(bookingId);
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

  const bookingId = params.data.id;
  let updatedBookingId: number;

  try {
    updatedBookingId = await db.transaction(async (tx) => {
      // Update status only if the booking belongs to this user and is still cancellable.
      // The WHERE guard makes this idempotent — a second concurrent cancel hits 0 rows.
      const cancelled = await tx
        .update(bookingsTable)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(bookingsTable.id, bookingId),
            eq(bookingsTable.userId, req.userId!),
            inArray(bookingsTable.status, ["pending", "confirmed"]),
          ),
        )
        .returning({ id: bookingsTable.id, scheduleId: bookingsTable.scheduleId, seatCount: bookingsTable.seatCount });

      if (cancelled.length === 0) {
        // Either not found/not owned, or already cancelled/completed.
        const [existing] = await tx
          .select({ status: bookingsTable.status })
          .from(bookingsTable)
          .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.userId, req.userId!)));

        if (!existing) throw Object.assign(new Error("Booking not found"), { status: 404 });
        throw Object.assign(new Error("Cannot cancel this booking"), { status: 400 });
      }

      const { scheduleId, seatCount } = cancelled[0];

      // Restore seats atomically in the same transaction.
      await tx
        .update(schedulesTable)
        .set({ availableSeats: sql`${schedulesTable.availableSeats} + ${seatCount}` })
        .where(eq(schedulesTable.id, scheduleId));

      return cancelled[0].id;
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) {
      res.status(404).json({ error: "Not found", message: e.message });
    } else if (e.status === 400) {
      res.status(400).json({ error: "Bad request", message: e.message });
    } else {
      res.status(500).json({ error: "Internal server error", message: "Cancellation failed" });
    }
    return;
  }

  const enriched = await getBookingWithSchedule(updatedBookingId);
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

  const bookingId = params.data.id;
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  let updatedBookingId: number;

  try {
    updatedBookingId = await db.transaction(async (tx) => {
      // Guard: only pay if booking exists, belongs to user, and is unpaid.
      const paid = await tx
        .update(bookingsTable)
        .set({ paymentMethod: parsed.data.method, paymentStatus: "paid", status: "confirmed" })
        .where(
          and(
            eq(bookingsTable.id, bookingId),
            eq(bookingsTable.userId, req.userId!),
            eq(bookingsTable.paymentStatus, "unpaid"),
          ),
        )
        .returning({ id: bookingsTable.id, totalFare: bookingsTable.totalFare, userId: bookingsTable.userId });

      if (paid.length === 0) {
        const [existing] = await tx
          .select({ paymentStatus: bookingsTable.paymentStatus })
          .from(bookingsTable)
          .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.userId, req.userId!)));

        if (!existing) throw Object.assign(new Error("Booking not found"), { status: 404 });
        throw Object.assign(new Error("Booking already paid"), { status: 400 });
      }

      // Persist payment record for auditability.
      await tx.insert(paymentsTable).values({
        bookingId,
        userId: paid[0].userId,
        amount: paid[0].totalFare,
        method: parsed.data.method,
        status: "completed",
        transactionId,
      });

      return paid[0].id;
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) {
      res.status(404).json({ error: "Not found", message: e.message });
    } else if (e.status === 400) {
      res.status(400).json({ error: "Bad request", message: e.message });
    } else {
      res.status(500).json({ error: "Internal server error", message: "Payment failed" });
    }
    return;
  }

  const enriched = await getBookingWithSchedule(updatedBookingId);

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
