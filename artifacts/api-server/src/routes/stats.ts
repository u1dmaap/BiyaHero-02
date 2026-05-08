import { Router, type IRouter } from "express";
import { db, vehiclesTable, routesTable, schedulesTable, bookingsTable } from "@workspace/db";
import { count, sql, eq, desc } from "drizzle-orm";
import { GetStatsSummaryResponse, GetPopularRoutesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [totalVehiclesRow] = await db.select({ count: count() }).from(vehiclesTable);
  const [activeVehiclesRow] = await db
    .select({ count: count() })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.status, "active"));
  const [totalRoutesRow] = await db.select({ count: count() }).from(routesTable);
  const [totalSchedulesTodayRow] = await db
    .select({ count: count() })
    .from(schedulesTable)
    .where(eq(schedulesTable.date, today));
  const [totalBookingsRow] = await db.select({ count: count() }).from(bookingsTable);

  const typeCounts = await db
    .select({ type: vehiclesTable.type, cnt: count() })
    .from(vehiclesTable)
    .groupBy(vehiclesTable.type);

  const vehicleTypeCounts: Record<string, number> = {};
  for (const row of typeCounts) {
    vehicleTypeCounts[row.type] = row.cnt;
  }

  res.json(
    GetStatsSummaryResponse.parse({
      totalVehicles: totalVehiclesRow?.count ?? 0,
      activeVehicles: activeVehiclesRow?.count ?? 0,
      totalRoutes: totalRoutesRow?.count ?? 0,
      totalSchedulesToday: totalSchedulesTodayRow?.count ?? 0,
      totalBookings: totalBookingsRow?.count ?? 0,
      vehicleTypeCounts,
    }),
  );
});

router.get("/stats/popular-routes", async (_req, res): Promise<void> => {
  const popularRoutes = await db
    .select({
      routeId: routesTable.id,
      routeName: routesTable.name,
      origin: routesTable.origin,
      destination: routesTable.destination,
      bookingCount: count(bookingsTable.id),
    })
    .from(routesTable)
    .leftJoin(schedulesTable, eq(schedulesTable.routeId, routesTable.id))
    .leftJoin(bookingsTable, eq(bookingsTable.scheduleId, schedulesTable.id))
    .groupBy(routesTable.id, routesTable.name, routesTable.origin, routesTable.destination)
    .orderBy(desc(count(bookingsTable.id)))
    .limit(10);

  const enriched = await Promise.all(
    popularRoutes.map(async (r) => {
      const vehicles = await db
        .select({ type: vehiclesTable.type })
        .from(vehiclesTable)
        .where(eq(vehiclesTable.routeId, r.routeId));
      const types = [...new Set(vehicles.map((v) => v.type))];
      return {
        ...r,
        availableVehicleTypes: types,
      };
    }),
  );

  res.json(GetPopularRoutesResponse.parse(enriched));
});

export default router;
