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
public class ScheduleController {

    private final ScheduleRepository scheduleRepo;
    private final RouteRepository routeRepo;
    private final VehicleRepository vehicleRepo;

    public ScheduleController(ScheduleRepository scheduleRepo, RouteRepository routeRepo, VehicleRepository vehicleRepo) {
        this.scheduleRepo = scheduleRepo;
        this.routeRepo = routeRepo;
        this.vehicleRepo = vehicleRepo;
    }

    private Map<String, Object> enrichSchedule(Schedule s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("routeId", s.getRouteId());
        m.put("vehicleId", s.getVehicleId());
        m.put("departureTime", s.getDepartureTime());
        m.put("estimatedArrivalTime", s.getEstimatedArrivalTime());
        m.put("availableSeats", s.getAvailableSeats());
        m.put("fare", s.getFare());
        m.put("date", s.getDate());

        routeRepo.findById(s.getRouteId()).ifPresent(r -> {
            m.put("routeName", r.getName());
            m.put("origin", r.getOrigin());
            m.put("destination", r.getDestination());
        });
        vehicleRepo.findById(s.getVehicleId()).ifPresent(v -> {
            m.put("vehicleType", v.getType());
            m.put("operator", v.getOperator());
            m.put("plateNumber", v.getPlateNumber());
            m.put("totalCapacity", v.getCapacity());
        });
        return m;
    }

    @GetMapping("/schedules")
    public ResponseEntity<Object> listSchedules(
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) String sortBy) {

        List<Schedule> schedules = scheduleRepo.findAll();
        List<Map<String, Object>> enriched = schedules.stream()
            .map(this::enrichSchedule)
            .filter(m -> origin == null || origin.isBlank()
                || m.getOrDefault("origin", "").toString().toLowerCase().contains(origin.toLowerCase()))
            .filter(m -> destination == null || destination.isBlank()
                || m.getOrDefault("destination", "").toString().toLowerCase().contains(destination.toLowerCase()))
            .filter(m -> date == null || date.isBlank()
                || date.equals(m.getOrDefault("date", "").toString()))
            .filter(m -> vehicleType == null || vehicleType.isBlank()
                || vehicleType.equals(m.get("vehicleType")))
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        if ("fare".equals(sortBy)) {
            enriched.sort(Comparator.comparingDouble(m -> ((Number) m.get("fare")).doubleValue()));
        } else if ("departureTime".equals(sortBy)) {
            enriched.sort(Comparator.comparing(m -> m.get("departureTime").toString()));
        }

        return ResponseEntity.ok(enriched);
    }

    @GetMapping("/schedules/{id}")
    public ResponseEntity<Object> getSchedule(@PathVariable int id) {
        Optional<Schedule> scheduleOpt = scheduleRepo.findById(id);
        if (scheduleOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Not found", "message", "Schedule not found"));
        }
        return ResponseEntity.ok(enrichSchedule(scheduleOpt.get()));
    }
}
