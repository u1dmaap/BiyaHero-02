import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // jeepney, tricycle, bus, van, fx, uv_express, ferry
  plateNumber: text("plate_number").notNull().unique(),
  operator: text("operator").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status").notNull().default("active"), // active, inactive, en_route
  currentLat: doublePrecision("current_lat").notNull().default(14.5995),
  currentLng: doublePrecision("current_lng").notNull().default(120.9842),
  routeId: integer("route_id"),
  currentPassengers: integer("current_passengers").notNull().default(0),
  driverStatus: text("driver_status").notNull().default("offline"), // offline, available, en_route, arrived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
