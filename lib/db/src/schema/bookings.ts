import { pgTable, serial, integer, timestamp, doublePrecision, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  scheduleId: integer("schedule_id").notNull(),
  seatCount: integer("seat_count").notNull(),
  passengerName: text("passenger_name").notNull(),
  passengerPhone: text("passenger_phone"),
  totalFare: doublePrecision("total_fare").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  paymentMethod: text("payment_method"), // cash, gcash, maya, credit_card, debit_card
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, paid, refunded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
