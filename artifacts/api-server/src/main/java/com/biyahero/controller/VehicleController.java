package com.biyahero.controller;

import com.biyahero.model.Route;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.RouteRepository;
import com.biyahero.repository.VehicleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class VehicleController {

    private final VehicleRepository vehicleRepo;
    private final RouteRepository routeRepo;

    public VehicleController(VehicleRepository vehicleRepo, RouteRepository routeRepo) {
        this.vehicleRepo = vehicleRepo;
        this.routeRepo = routeRepo;
    }

    private Map<String, Object> vehicleToMap(Vehicle v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId());
        m.put("type", v.getType());
        m.put("plateNumber", v.getPlateNumber());
        m.put("operator", v.getOperator());
        m.put("capacity", v.getCapacity());
        m.put("status", v.getStatus());
        m.put("currentLat", v.getCurrentLat());
        m.put("currentLng", v.getCurrentLng());
        m.put("routeId", v.getRouteId());
        if (v.getRouteId() != null) {
            routeRepo.findById(v.getRouteId()).ifPresent(r -> m.put("routeName", r.getName()));
        } else {
            m.put("routeName", null);
        }
        return m;
    }

    @GetMapping("/vehicles")
    public ResponseEntity<Object> listVehicles(@RequestParam(required = false) String type,
                                               @RequestParam(required = false) String status) {
        List<Vehicle> vehicles = vehicleRepo.findAll();
        List<Map<String, Object>> result = vehicles.stream()
            .filter(v -> type == null || type.equals(v.getType()))
            .filter(v -> status == null || status.equals(v.getStatus()))
            .map(this::vehicleToMap)
            .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/vehicles/{id}")
    public ResponseEntity<Object> getVehicle(@PathVariable int id) {
        Optional<Vehicle> vehicleOpt = vehicleRepo.findById(id);
        if (vehicleOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Not found", "message", "Vehicle not found"));
        }
        return ResponseEntity.ok(vehicleToMap(vehicleOpt.get()));
    }
}
