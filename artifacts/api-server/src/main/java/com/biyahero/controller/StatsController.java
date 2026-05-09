package com.biyahero.controller;

import com.biyahero.model.Route;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.RouteRepository;
import com.biyahero.repository.VehicleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class StatsController {

    private final JdbcTemplate jdbc;
    private final VehicleRepository vehicleRepo;
    private final RouteRepository routeRepo;

    public StatsController(JdbcTemplate jdbc, VehicleRepository vehicleRepo, RouteRepository routeRepo) {
        this.jdbc = jdbc;
        this.vehicleRepo = vehicleRepo;
        this.routeRepo = routeRepo;
    }

    @GetMapping("/stats/summary")
    public ResponseEntity<Object> summary() {
        String today = LocalDate.now().toString();

        Integer totalVehicles = jdbc.queryForObject("SELECT COUNT(*) FROM vehicles", Integer.class);
        Integer activeVehicles = jdbc.queryForObject("SELECT COUNT(*) FROM vehicles WHERE status = 'active'", Integer.class);
        Integer totalRoutes = jdbc.queryForObject("SELECT COUNT(*) FROM routes", Integer.class);
        Integer totalSchedulesToday = jdbc.queryForObject("SELECT COUNT(*) FROM schedules WHERE date = ?", Integer.class, today);
        Integer totalBookings = jdbc.queryForObject("SELECT COUNT(*) FROM bookings", Integer.class);

        List<Map<String, Object>> typeCounts = jdbc.queryForList("SELECT type, COUNT(*) as cnt FROM vehicles GROUP BY type");
        Map<String, Integer> vehicleTypeCounts = new LinkedHashMap<>();
        for (Map<String, Object> row : typeCounts) {
            vehicleTypeCounts.put((String) row.get("type"), ((Number) row.get("cnt")).intValue());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalVehicles", totalVehicles != null ? totalVehicles : 0);
        result.put("activeVehicles", activeVehicles != null ? activeVehicles : 0);
        result.put("totalRoutes", totalRoutes != null ? totalRoutes : 0);
        result.put("totalSchedulesToday", totalSchedulesToday != null ? totalSchedulesToday : 0);
        result.put("totalBookings", totalBookings != null ? totalBookings : 0);
        result.put("vehicleTypeCounts", vehicleTypeCounts);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/stats/popular-routes")
    public ResponseEntity<Object> popularRoutes() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT r.id as route_id, r.name as route_name, r.origin, r.destination,
                   COUNT(b.id) as booking_count
            FROM routes r
            LEFT JOIN schedules s ON s.route_id = r.id
            LEFT JOIN bookings b ON b.schedule_id = s.id
            GROUP BY r.id, r.name, r.origin, r.destination
            ORDER BY booking_count DESC
            LIMIT 10
            """);

        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            int routeId = ((Number) row.get("route_id")).intValue();
            List<Vehicle> vehicles = vehicleRepo.findAll().stream()
                .filter(v -> v.getRouteId() != null && v.getRouteId() == routeId)
                .toList();
            List<String> types = vehicles.stream().map(Vehicle::getType).distinct().toList();

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("routeId", routeId);
            m.put("routeName", row.get("route_name"));
            m.put("origin", row.get("origin"));
            m.put("destination", row.get("destination"));
            m.put("bookingCount", ((Number) row.get("booking_count")).intValue());
            m.put("availableVehicleTypes", types);
            enriched.add(m);
        }

        return ResponseEntity.ok(enriched);
    }
}
