import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, routesTable } from "@workspace/db";
import {
  ListRoutesQueryParams,
  GetRouteParams,
  ListRoutesResponse,
  GetRouteResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/routes", async (req, res): Promise<void> => {
  const parsed = ListRoutesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { origin, destination } = parsed.data;

  let results = await db.select().from(routesTable);

  if (origin) {
    results = results.filter((r) => r.origin.toLowerCase().includes(origin.toLowerCase()));
  }
  if (destination) {
    results = results.filter((r) => r.destination.toLowerCase().includes(destination.toLowerCase()));
  }

  res.json(ListRoutesResponse.parse(results));
});

router.get("/routes/:id", async (req, res): Promise<void> => {
  const params = GetRouteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad request", message: params.error.message });
    return;
  }

  const [route] = await db.select().from(routesTable).where(eq(routesTable.id, params.data.id));

  if (!route) {
    res.status(404).json({ error: "Not found", message: "Route not found" });
    return;
  }

  res.json(GetRouteResponse.parse(route));
});

export default router;
