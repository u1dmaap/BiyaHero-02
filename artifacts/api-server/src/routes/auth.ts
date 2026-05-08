import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, vehiclesTable } from "@workspace/db";
import { RegisterBody, LoginBody, GetMeResponse, LoginResponse } from "@workspace/api-zod";
import { hashPassword, verifyPassword, signToken, requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { name, email, password, role, vehicleType, vehiclePlate, vehicleCapacity, vehicleOperator } = parsed.data;
  const userRole = role ?? "commuter";

  if (userRole === "driver") {
    if (!vehicleType || !vehiclePlate || !vehicleCapacity || !vehicleOperator) {
      res.status(400).json({ error: "Validation error", message: "Driver registration requires vehicleType, vehiclePlate, vehicleCapacity, and vehicleOperator" });
      return;
    }
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already in use" });
    return;
  }

  if (userRole === "driver" && vehiclePlate) {
    const [existingVehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.plateNumber, vehiclePlate));
    if (existingVehicle) {
      res.status(409).json({ error: "Conflict", message: "A vehicle with that plate number is already registered" });
      return;
    }
  }

  const passwordHash = hashPassword(password);

  let driverVehicleId: number | undefined;

  if (userRole === "driver" && vehicleType && vehiclePlate && vehicleCapacity && vehicleOperator) {
    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({
        type: vehicleType,
        plateNumber: vehiclePlate,
        operator: vehicleOperator,
        capacity: vehicleCapacity,
        status: "inactive",
        driverStatus: "offline",
        currentPassengers: 0,
      })
      .returning();
    driverVehicleId = vehicle.id;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role: userRole, driverVehicleId: driverVehicleId ?? null })
    .returning();

  const token = signToken(user.id);

  res.status(201).json(
    LoginResponse.parse({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        driverVehicleId: user.driverVehicleId ?? null,
        createdAt: user.createdAt,
      },
    }),
  );
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id);

  res.json(
    LoginResponse.parse({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        driverVehicleId: user.driverVehicleId ?? null,
        createdAt: user.createdAt,
      },
    }),
  );
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }
  res.json(
    GetMeResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      driverVehicleId: user.driverVehicleId ?? null,
      createdAt: user.createdAt,
    }),
  );
});

export default router;
