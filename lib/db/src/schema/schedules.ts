import { pgTable, serial, integer, timestamp, doublePrecision, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  departureTime: timestamp("departure_time", { withTimezone: true }).notNull(),
  estimatedArrivalTime: timestamp("estimated_arrival_time", { withTimezone: true }).notNull(),
  availableSeats: integer("available_seats").notNull(),
  fare: doublePrecision("fare").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
