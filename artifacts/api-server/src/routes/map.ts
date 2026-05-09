import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vehiclesTable, routesTable } from "@workspace/db";
import { GetMapVehiclesQueryParams, GetMapVehiclesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tiles/:z/:x/:y", async (req, res): Promise<void> => {
  const { z, x, y } = req.params;
  const subdomains = ["a", "b", "c", "d"];
  const s = subdomains[(Number(x) + Number(y)) % subdomains.length];
  const tileUrl = `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  try {
    const response = await fetch(tileUrl, {
      headers: { "User-Agent": "Mozilla/5.0 biyaHERO/1.0" },
    });
    if (!response.ok) {
      res.status(response.status).end();
      return;
    }
    const buffer = await response.arrayBuffer();
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).end();
  }
});

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
      routeOrigin: routesTable.origin,
      routeDestination: routesTable.destination,
      currentPassengers: vehiclesTable.currentPassengers,
      driverStatus: vehiclesTable.driverStatus,
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
