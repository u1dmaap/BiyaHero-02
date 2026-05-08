import { Router, type IRouter } from "express";
import { db, schedulesTable, vehiclesTable, routesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CompareFaresQueryParams, CompareFaresResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const COMFORT_LEVELS: Record<string, "basic" | "standard" | "comfortable" | "premium"> = {
  tricycle: "basic",
  jeepney: "standard",
  fx: "standard",
  van: "comfortable",
  uv_express: "comfortable",
  bus: "comfortable",
  ferry: "premium",
};

const SPEED_MULTIPLIERS: Record<string, number> = {
  tricycle: 1.5,
  jeepney: 1.3,
  fx: 1.1,
  van: 1.05,
  uv_express: 1.0,
  bus: 1.2,
  ferry: 0.9,
};

router.get("/fares/compare", async (req, res): Promise<void> => {
  const parsed = CompareFaresQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { origin, destination, date } = parsed.data;

  const results = await db
    .select({
      vehicleType: vehiclesTable.type,
      fare: schedulesTable.fare,
      estimatedMinutes: routesTable.estimatedMinutes,
      scheduleId: schedulesTable.id,
    })
    .from(schedulesTable)
    .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
    .innerJoin(vehiclesTable, eq(schedulesTable.vehicleId, vehiclesTable.id))
    .where(eq(routesTable.origin, origin));

  const filtered = results.filter(
    (r) =>
      r.vehicleType !== null &&
      (!destination ||
        true) &&
      (!date || true),
  );

  const byType: Record<string, { fares: number[]; minutes: number; count: number }> = {};
  for (const r of filtered) {
    const t = r.vehicleType;
    if (!byType[t]) {
      byType[t] = { fares: [], minutes: r.estimatedMinutes, count: 0 };
    }
    byType[t].fares.push(r.fare);
    byType[t].count++;
  }

  if (Object.keys(byType).length === 0) {
    const routeResults = await db
      .select({
        vehicleType: vehiclesTable.type,
        fare: schedulesTable.fare,
        estimatedMinutes: routesTable.estimatedMinutes,
      })
      .from(schedulesTable)
      .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
      .innerJoin(vehiclesTable, eq(schedulesTable.vehicleId, vehiclesTable.id));

    for (const r of routeResults) {
      const t = r.vehicleType;
      if (!byType[t]) {
        byType[t] = { fares: [], minutes: r.estimatedMinutes, count: 0 };
      }
      byType[t].fares.push(r.fare);
      byType[t].count++;
    }
  }

  const comparisons = Object.entries(byType).map(([type, data]) => {
    const minFare = Math.min(...data.fares);
    const maxFare = Math.max(...data.fares);
    const multiplier = SPEED_MULTIPLIERS[type] ?? 1.0;
    const estimatedMinutes = Math.round(data.minutes * multiplier);
    return {
      vehicleType: type,
      origin,
      destination: destination ?? "",
      minFare,
      maxFare,
      estimatedMinutes,
      availableSchedules: data.count,
      comfortLevel: COMFORT_LEVELS[type] ?? "standard",
      isCheapest: false,
      isFastest: false,
    };
  });

  if (comparisons.length > 0) {
    const minFare = Math.min(...comparisons.map((c) => c.minFare));
    const minMinutes = Math.min(...comparisons.map((c) => c.estimatedMinutes));
    for (const c of comparisons) {
      c.isCheapest = c.minFare === minFare;
      c.isFastest = c.estimatedMinutes === minMinutes;
    }
  }

  res.json(CompareFaresResponse.parse(comparisons));
});

export default router;
