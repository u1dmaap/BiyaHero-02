import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vehiclesTable, routesTable, schedulesTable } from "@workspace/db";
import { GetMapVehiclesQueryParams, GetMapVehiclesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/map/vehicles", async (req, res): Promise<void> => {
  const parsed = GetMapVehiclesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { type } = parsed.data;

  const results = await db
    .select({
      id: vehiclesTable.id,
      type: vehiclesTable.type,
      plateNumber: vehiclesTable.plateNumber,
      operator: vehiclesTable.operator,
      status: vehiclesTable.status,
      currentLat: vehiclesTable.currentLat,
      currentLng: vehiclesTable.currentLng,
      routeName: routesTable.name,
    })
    .from(vehiclesTable)
    .leftJoin(routesTable, eq(vehiclesTable.routeId, routesTable.id))
    .where(type ? eq(vehiclesTable.type, type) : undefined);

  const enriched = results.map((v) => ({
    ...v,
    availableSeats: null as number | null,
  }));

  res.json(GetMapVehiclesResponse.parse(enriched));
});

export default router;
