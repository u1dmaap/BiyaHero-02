import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import vehiclesRouter from "./vehicles";
import routesRouter from "./routes";
import schedulesRouter from "./schedules";
import faresRouter from "./fares";
import mapRouter from "./map";
import bookingsRouter from "./bookings";
import statsRouter from "./stats";
import driverRouter from "./driver";
import customTripsRouter from "./custom-trips";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(vehiclesRouter);
router.use(routesRouter);
router.use(schedulesRouter);
router.use(faresRouter);
router.use(mapRouter);
router.use(bookingsRouter);
router.use(statsRouter);
router.use(driverRouter);
router.use(customTripsRouter);

export default router;
