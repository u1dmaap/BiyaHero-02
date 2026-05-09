package com.biyahero.controller;

import com.biyahero.model.Route;
import com.biyahero.repository.RouteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class RouteController {

    private final RouteRepository routeRepo;

    public RouteController(RouteRepository routeRepo) {
        this.routeRepo = routeRepo;
    }

    @GetMapping("/routes")
    public ResponseEntity<Object> listRoutes(@RequestParam(required = false) String origin,
                                             @RequestParam(required = false) String destination) {
        List<Route> routes = routeRepo.findAll();
        List<Route> filtered = routes.stream()
            .filter(r -> origin == null || r.getOrigin().toLowerCase().contains(origin.toLowerCase()))
            .filter(r -> destination == null || r.getDestination().toLowerCase().contains(destination.toLowerCase()))
            .toList();
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<Object> getRoute(@PathVariable int id) {
        Optional<Route> routeOpt = routeRepo.findById(id);
        if (routeOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Not found", "message", "Route not found"));
        }
        return ResponseEntity.ok(routeOpt.get());
    }
}
