package com.biyahero.controller;

import com.biyahero.model.Route;
import com.biyahero.model.Schedule;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.RouteRepository;
import com.biyahero.repository.ScheduleRepository;
import com.biyahero.repository.VehicleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class FareController {

    private static final Map<String, String> COMFORT_LEVELS = Map.of(
        "tricycle", "basic",
        "jeepney", "standard",
        "fx", "standard",
        "van", "comfortable",
        "uv_express", "comfortable",
        "bus", "comfortable",
        "ferry", "premium"
    );

    private static final Map<String, Double> SPEED_MULTIPLIERS = Map.of(
        "tricycle", 1.5,
        "jeepney", 1.3,
        "fx", 1.1,
        "van", 1.05,
        "uv_express", 1.0,
        "bus", 1.2,
        "ferry", 0.9
    );

    private final ScheduleRepository scheduleRepo;
    private final RouteRepository routeRepo;
    private final VehicleRepository vehicleRepo;

    public FareController(ScheduleRepository scheduleRepo, RouteRepository routeRepo, VehicleRepository vehicleRepo) {
        this.scheduleRepo = scheduleRepo;
        this.routeRepo = routeRepo;
        this.vehicleRepo = vehicleRepo;
    }

    @GetMapping("/fares/compare")
    public ResponseEntity<Object> compareFares(
            @RequestParam String origin,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String date) {

        if (origin == null || origin.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad request", "message", "origin is required"));
        }

        List<Schedule> schedules = scheduleRepo.findAll();
        Map<String, List<double[]>> byType = new LinkedHashMap<>();

        for (Schedule schedule : schedules) {
            Optional<Route> routeOpt = routeRepo.findById(schedule.getRouteId());
            Optional<Vehicle> vehicleOpt = vehicleRepo.findById(schedule.getVehicleId());
            if (routeOpt.isEmpty() || vehicleOpt.isEmpty()) continue;

            Route route = routeOpt.get();
            Vehicle vehicle = vehicleOpt.get();

            if (!route.getOrigin().equalsIgnoreCase(origin)) continue;
            if (destination != null && !destination.isBlank()
                    && !route.getDestination().equalsIgnoreCase(destination)) continue;
            if (date != null && !date.isBlank() && !date.equals(schedule.getDate())) continue;

            String type = vehicle.getType();
            byType.computeIfAbsent(type, k -> new ArrayList<>())
                .add(new double[]{schedule.getFare(), route.getEstimatedMinutes()});
        }

        List<Map<String, Object>> comparisons = new ArrayList<>();
        for (Map.Entry<String, List<double[]>> entry : byType.entrySet()) {
            String type = entry.getKey();
            List<double[]> data = entry.getValue();

            double minFare = data.stream().mapToDouble(d -> d[0]).min().orElse(0);
            double maxFare = data.stream().mapToDouble(d -> d[0]).max().orElse(0);
            int estimatedMinutes = (int) data.get(0)[1];
            double multiplier = SPEED_MULTIPLIERS.getOrDefault(type, 1.0);
            int adjustedMinutes = (int) Math.round(estimatedMinutes * multiplier);

            Map<String, Object> c = new LinkedHashMap<>();
            c.put("vehicleType", type);
            c.put("origin", origin);
            c.put("destination", destination != null ? destination : "");
            c.put("minFare", minFare);
            c.put("maxFare", maxFare);
            c.put("estimatedMinutes", adjustedMinutes);
            c.put("availableSchedules", data.size());
            c.put("comfortLevel", COMFORT_LEVELS.getOrDefault(type, "standard"));
            c.put("isCheapest", false);
            c.put("isFastest", false);
            comparisons.add(c);
        }

        if (!comparisons.isEmpty()) {
            double minFare = comparisons.stream().mapToDouble(c -> ((Number) c.get("minFare")).doubleValue()).min().orElse(0);
            int minMinutes = comparisons.stream().mapToInt(c -> ((Number) c.get("estimatedMinutes")).intValue()).min().orElse(0);
            for (Map<String, Object> c : comparisons) {
                c.put("isCheapest", ((Number) c.get("minFare")).doubleValue() == minFare);
                c.put("isFastest", ((Number) c.get("estimatedMinutes")).intValue() == minMinutes);
            }
        }

        return ResponseEntity.ok(comparisons);
    }
}
