import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vehiclesTable, routesTable } from "@workspace/db";
import {
  ListVehiclesQueryParams,
  GetVehicleParams,
  ListVehiclesResponse,
  GetVehicleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vehicles", async (req, res): Promise<void> => {
  const parsed = ListVehiclesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { type, status } = parsed.data;

  let query = db
    .select({
      id: vehiclesTable.id,
      type: vehiclesTable.type,
      plateNumber: vehiclesTable.plateNumber,
      operator: vehiclesTable.operator,
      capacity: vehiclesTable.capacity,
      status: vehiclesTable.status,
      currentLat: vehiclesTable.currentLat,
      currentLng: vehiclesTable.currentLng,
      routeId: vehiclesTable.routeId,
      routeName: routesTable.name,
    })
    .from(vehiclesTable)
    .leftJoin(routesTable, eq(vehiclesTable.routeId, routesTable.id));

  const results = await query;

  let filtered = results;
  if (type) filtered = filtered.filter((v) => v.type === type);
  if (status) filtered = filtered.filter((v) => v.status === status);

  res.json(ListVehiclesResponse.parse(filtered));
});

router.get("/vehicles/:id", async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const [result] = await db
    .select({
      id: vehiclesTable.id,
      type: vehiclesTable.type,
      plateNumber: vehiclesTable.plateNumber,
      operator: vehiclesTable.operator,
      capacity: vehiclesTable.capacity,
      status: vehiclesTable.status,
      currentLat: vehiclesTable.currentLat,
      currentLng: vehiclesTable.currentLng,
      routeId: vehiclesTable.routeId,
      routeName: routesTable.name,
    })
    .from(vehiclesTable)
    .leftJoin(routesTable, eq(vehiclesTable.routeId, routesTable.id))
    .where(eq(vehiclesTable.id, params.data.id));

  if (!result) {
    res.status(404).json({ error: "Not found", message: "Vehicle not found" });
    return;
  }

  res.json(GetVehicleResponse.parse(result));
});

export default router;
