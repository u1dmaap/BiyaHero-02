import { pgTable, serial, integer, timestamp, doublePrecision, text } from "drizzle-orm/pg-core";

export const customTripsTable = pgTable("custom_trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  pickupLat: doublePrecision("pickup_lat").notNull(),
  pickupLng: doublePrecision("pickup_lng").notNull(),
  pickupLabel: text("pickup_label").notNull(),
  dropoffLat: doublePrecision("dropoff_lat").notNull(),
  dropoffLng: doublePrecision("dropoff_lng").notNull(),
  dropoffLabel: text("dropoff_label").notNull(),
  requestedTime: text("requested_time").notNull(),
  passengerName: text("passenger_name").notNull(),
  passengerPhone: text("passenger_phone"),
  seatCount: integer("seat_count").notNull().default(1),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomTrip = typeof customTripsTable.$inferSelect;
