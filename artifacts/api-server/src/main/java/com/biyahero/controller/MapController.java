package com.biyahero.controller;

import com.biyahero.model.Route;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.RouteRepository;
import com.biyahero.repository.VehicleRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

@RestController
@RequestMapping("/api")
public class MapController {

    private final VehicleRepository vehicleRepo;
    private final RouteRepository routeRepo;
    private final HttpClient httpClient;

    public MapController(VehicleRepository vehicleRepo, RouteRepository routeRepo) {
        this.vehicleRepo = vehicleRepo;
        this.routeRepo = routeRepo;
        this.httpClient = HttpClient.newHttpClient();
    }

    @GetMapping("/tiles/{z}/{x}/{y}")
    public void getTile(@PathVariable String z, @PathVariable String x, @PathVariable String y,
                        HttpServletResponse response) throws IOException {
        String[] subdomains = {"a", "b", "c", "d"};
        String s = subdomains[(Integer.parseInt(x) + Integer.parseInt(y)) % subdomains.length];
        String tileUrl = "https://" + s + ".basemaps.cartocdn.com/rastertiles/voyager/" + z + "/" + x + "/" + y + ".png";

        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(tileUrl))
                .header("User-Agent", "Mozilla/5.0 biyaHERO/1.0")
                .GET()
                .build();
            HttpResponse<byte[]> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
            response.setStatus(resp.statusCode());
            response.setContentType("image/png");
            response.setHeader("Cache-Control", "public, max-age=86400");
            response.getOutputStream().write(resp.body());
        } catch (Exception e) {
            response.setStatus(500);
        }
    }

    @GetMapping("/map/vehicles")
    public ResponseEntity<Object> mapVehicles(@RequestParam(required = false) String type) {
        List<Vehicle> vehicles = vehicleRepo.findAll();
        List<Map<String, Object>> result = vehicles.stream()
            .filter(v -> type == null || type.equals(v.getType()))
            .map(v -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", v.getId());
                m.put("type", v.getType());
                m.put("plateNumber", v.getPlateNumber());
                m.put("operator", v.getOperator());
                m.put("status", v.getStatus());
                m.put("currentLat", v.getCurrentLat());
                m.put("currentLng", v.getCurrentLng());
                m.put("currentPassengers", v.getCurrentPassengers());
                m.put("driverStatus", v.getDriverStatus());
                m.put("availableSeats", (Object) null);
                if (v.getRouteId() != null) {
                    routeRepo.findById(v.getRouteId()).ifPresent(r -> {
                        m.put("routeName", r.getName());
                        m.put("routeOrigin", r.getOrigin());
                        m.put("routeDestination", r.getDestination());
                    });
                } else {
                    m.put("routeName", null);
                    m.put("routeOrigin", null);
                    m.put("routeDestination", null);
                }
                return m;
            }).toList();
        return ResponseEntity.ok(result);
    }
}
