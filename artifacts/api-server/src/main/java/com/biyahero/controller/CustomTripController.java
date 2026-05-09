package com.biyahero.controller;

import com.biyahero.model.CustomTrip;
import com.biyahero.repository.CustomTripRepository;
import com.biyahero.repository.VehicleRepository;
import com.biyahero.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class CustomTripController {

    private final CustomTripRepository customTripRepo;
    private final VehicleRepository vehicleRepo;

    public CustomTripController(CustomTripRepository customTripRepo, VehicleRepository vehicleRepo) {
        this.customTripRepo = customTripRepo;
        this.vehicleRepo = vehicleRepo;
    }

    private Map<String, String> error(String err, String msg) {
        return Map.of("error", err, "message", msg);
    }

    @PostMapping("/custom-trips")
    public ResponseEntity<Object> createCustomTrip(HttpServletRequest request,
                                                   @RequestBody Map<String, Object> body) {
        Integer userId = (Integer) request.getAttribute(JwtAuthFilter.USER_ID_ATTR);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Number vehicleIdNum = (Number) body.get("vehicleId");
        Number pickupLatNum = (Number) body.get("pickupLat");
        Number pickupLngNum = (Number) body.get("pickupLng");
        String pickupLabel = (String) body.get("pickupLabel");
        Number dropoffLatNum = (Number) body.get("dropoffLat");
        Number dropoffLngNum = (Number) body.get("dropoffLng");
        String dropoffLabel = (String) body.get("dropoffLabel");
        String requestedTime = (String) body.get("requestedTime");
        String passengerName = (String) body.get("passengerName");

        if (vehicleIdNum == null || pickupLatNum == null || pickupLngNum == null || pickupLabel == null
                || dropoffLatNum == null || dropoffLngNum == null || dropoffLabel == null
                || requestedTime == null || passengerName == null) {
            return ResponseEntity.badRequest().body(error("Bad request", "Missing required fields"));
        }

        int vehicleId = vehicleIdNum.intValue();
        if (vehicleRepo.findById(vehicleId).isEmpty()) {
            return ResponseEntity.status(404).body(error("Not found", "Vehicle not found"));
        }

        String passengerPhone = (String) body.get("passengerPhone");
        int seatCount = body.get("seatCount") != null ? ((Number) body.get("seatCount")).intValue() : 1;
        String notes = (String) body.get("notes");
        String paymentMethod = (String) body.get("paymentMethod");

        CustomTrip trip = customTripRepo.insert(userId, vehicleId,
            pickupLatNum.doubleValue(), pickupLngNum.doubleValue(), pickupLabel,
            dropoffLatNum.doubleValue(), dropoffLngNum.doubleValue(), dropoffLabel,
            requestedTime, passengerName, passengerPhone, seatCount, notes, paymentMethod);

        return ResponseEntity.status(201).body(trip);
    }

    @GetMapping("/custom-trips")
    public ResponseEntity<Object> listCustomTrips(HttpServletRequest request) {
        Integer userId = (Integer) request.getAttribute(JwtAuthFilter.USER_ID_ATTR);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        List<CustomTrip> trips = customTripRepo.findByUserId(userId);
        return ResponseEntity.ok(trips);
    }

    @PutMapping("/custom-trips/{id}/rate")
    public ResponseEntity<Object> rateTrip(HttpServletRequest request,
                                           @PathVariable int id,
                                           @RequestBody Map<String, Object> body) {
        Integer userId = (Integer) request.getAttribute(JwtAuthFilter.USER_ID_ATTR);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Number ratingNum = (Number) body.get("rating");
        if (ratingNum == null) {
            return ResponseEntity.badRequest().body(error("Bad request", "Rating must be between 1 and 5"));
        }
        int rating = ratingNum.intValue();
        if (rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body(error("Bad request", "Rating must be between 1 and 5"));
        }

        Optional<CustomTrip> tripOpt = customTripRepo.findById(id);
        if (tripOpt.isEmpty() || tripOpt.get().getUserId() != userId) {
            return ResponseEntity.status(404).body(error("Not found", "Trip not found"));
        }

        if (!"completed".equals(tripOpt.get().getStatus())) {
            return ResponseEntity.badRequest().body(error("Bad request", "Can only rate completed trips"));
        }

        String ratingComment = (String) body.get("ratingComment");
        Optional<CustomTrip> updated = customTripRepo.rate(id, userId, rating, ratingComment);
        return ResponseEntity.ok(Map.of("success", true, "trip", updated.orElse(tripOpt.get())));
    }
}
