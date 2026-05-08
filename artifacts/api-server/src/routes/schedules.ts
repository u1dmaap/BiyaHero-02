import { Router, type IRouter } from "express";
import { eq, and, ilike, asc } from "drizzle-orm";
import { db, schedulesTable, vehiclesTable, routesTable } from "@workspace/db";
import {
  ListSchedulesQueryParams,
  GetScheduleParams,
  ListSchedulesResponse,
  GetScheduleResponse,
} from "@workspace/api-zod";
import { SQL } from "drizzle-orm";

const router: IRouter = Router();

function preprocessQuery(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...query };
  if (typeof out.date === "string" && out.date) {
    const d = new Date(out.date);
    if (!isNaN(d.getTime())) out.date = d;
  }
  return out;
}

const SCHEDULE_COLUMNS = {
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
};

router.get("/schedules", async (req, res): Promise<void> => {
  const parsed = ListSchedulesQueryParams.safeParse(preprocessQuery(req.query));
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { origin, destination, date, vehicleType, sortBy } = parsed.data;
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : date;

  const conditions: SQL[] = [];
  if (origin) conditions.push(ilike(routesTable.origin, `%${origin}%`));
  if (destination) conditions.push(ilike(routesTable.destination, `%${destination}%`));
  if (dateStr) conditions.push(eq(schedulesTable.date, dateStr));
  if (vehicleType) conditions.push(eq(vehiclesTable.type, vehicleType));

  const query = db
    .select(SCHEDULE_COLUMNS)
    .from(schedulesTable)
    .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
    .innerJoin(vehiclesTable, eq(schedulesTable.vehicleId, vehiclesTable.id));

  const results = await (conditions.length > 0
    ? query.where(and(...conditions))
    : query);

  if (sortBy === "fare") {
    results.sort((a, b) => a.fare - b.fare);
  } else if (sortBy === "departureTime") {
    results.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }

  res.json(ListSchedulesResponse.parse(results));
});

router.get("/schedules/:id", async (req, res): Promise<void> => {
  const params = GetScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const [schedule] = await db
    .select(SCHEDULE_COLUMNS)
    .from(schedulesTable)
    .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
    .innerJoin(vehiclesTable, eq(schedulesTable.vehicleId, vehiclesTable.id))
    .where(eq(schedulesTable.id, params.data.id));

  if (!schedule) {
    res.status(404).json({ error: "Not found", message: "Schedule not found" });
    return;
  }

  res.json(GetScheduleResponse.parse(schedule));
});

export default router;
