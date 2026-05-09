package com.biyahero.controller;

import com.biyahero.model.Booking;
import com.biyahero.model.CustomTrip;
import com.biyahero.model.User;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.BookingRepository;
import com.biyahero.repository.CustomTripRepository;
import com.biyahero.repository.RouteRepository;
import com.biyahero.repository.ScheduleRepository;
import com.biyahero.repository.UserRepository;
import com.biyahero.repository.VehicleRepository;
import com.biyahero.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class DriverController {

    private final UserRepository userRepo;
    private final VehicleRepository vehicleRepo;
    private final BookingRepository bookingRepo;
    private final ScheduleRepository scheduleRepo;
    private final RouteRepository routeRepo;
    private final CustomTripRepository customTripRepo;

    public DriverController(UserRepository userRepo, VehicleRepository vehicleRepo,
                             BookingRepository bookingRepo, ScheduleRepository scheduleRepo,
                             RouteRepository routeRepo, CustomTripRepository customTripRepo) {
        this.userRepo = userRepo;
        this.vehicleRepo = vehicleRepo;
        this.bookingRepo = bookingRepo;
        this.scheduleRepo = scheduleRepo;
        this.routeRepo = routeRepo;
        this.customTripRepo = customTripRepo;
    }

    private Map<String, String> error(String err, String msg) {
        return Map.of("error", err, "message", msg);
    }

    private record DriverCtx(User user, Vehicle vehicle) {}

    private ResponseEntity<Object> getDriverCtx(HttpServletRequest request, Object[] ctxOut) {
        Integer userId = (Integer) request.getAttribute(JwtAuthFilter.USER_ID_ATTR);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Optional<User> userOpt = userRepo.findById(userId);
        if (userOpt.isEmpty() || !"driver".equals(userOpt.get().getRole()) || userOpt.get().getDriverVehicleId() == null) {
            return ResponseEntity.status(403).body(error("Forbidden", "Driver account with registered vehicle required"));
        }

        Optional<Vehicle> vehicleOpt = vehicleRepo.findById(userOpt.get().getDriverVehicleId());
        if (vehicleOpt.isEmpty()) {
            return ResponseEntity.status(404).body(error("Not found", "Vehicle not found"));
        }

        ctxOut[0] = new DriverCtx(userOpt.get(), vehicleOpt.get());
        return null;
    }

    @GetMapping("/driver/dashboard")
    public ResponseEntity<Object> dashboard(HttpServletRequest request) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];
        Vehicle vehicle = ctx.vehicle();

        List<Booking> recent = bookingRepo.findByScheduleVehicleAndStatus(
            vehicle.getId(), List.of("confirmed", "completed", "cancelled"));

        Map<String, Object> vehicleMap = new LinkedHashMap<>();
        vehicleMap.put("id", vehicle.getId());
        vehicleMap.put("type", vehicle.getType());
        vehicleMap.put("plateNumber", vehicle.getPlateNumber());
        vehicleMap.put("operator", vehicle.getOperator());
        vehicleMap.put("capacity", vehicle.getCapacity());
        vehicleMap.put("status", vehicle.getStatus());
        vehicleMap.put("currentLat", vehicle.getCurrentLat());
        vehicleMap.put("currentLng", vehicle.getCurrentLng());
        vehicleMap.put("currentPassengers", vehicle.getCurrentPassengers());
        vehicleMap.put("driverStatus", vehicle.getDriverStatus());

        List<Map<String, Object>> bookingMaps = recent.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("passengerName", b.getPassengerName());
            m.put("seatCount", b.getSeatCount());
            m.put("totalFare", b.getTotalFare());
            m.put("status", b.getStatus());
            m.put("paymentStatus", b.getPaymentStatus());
            m.put("createdAt", b.getCreatedAt());
            m.put("scheduleId", b.getScheduleId());
            return m;
        }).toList();

        return ResponseEntity.ok(Map.of("vehicle", vehicleMap, "recentBookings", bookingMaps));
    }

    @GetMapping("/driver/requests")
    public ResponseEntity<Object> requests(HttpServletRequest request) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        List<Booking> pending = bookingRepo.findPendingByVehicle(ctx.vehicle().getId());
        List<Map<String, Object>> result = pending.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("passengerName", b.getPassengerName());
            m.put("passengerPhone", b.getPassengerPhone());
            m.put("seatCount", b.getSeatCount());
            m.put("totalFare", b.getTotalFare());
            m.put("status", b.getStatus());
            m.put("paymentStatus", b.getPaymentStatus());
            m.put("createdAt", b.getCreatedAt());
            m.put("scheduleId", b.getScheduleId());
            scheduleRepo.findById(b.getScheduleId()).ifPresent(s -> {
                m.put("departureTime", s.getDepartureTime());
                routeRepo.findById(s.getRouteId()).ifPresent(r -> {
                    m.put("origin", r.getOrigin());
                    m.put("destination", r.getDestination());
                });
            });
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PutMapping("/driver/requests/{id}/approve")
    public ResponseEntity<Object> approveRequest(HttpServletRequest request, @PathVariable int id) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        Optional<Booking> bookingOpt = bookingRepo.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.status(404).body(error("Not found", "Pending booking not found for your vehicle"));
        }
        Booking booking = bookingOpt.get();
        if (!"pending".equals(booking.getStatus())) {
            return ResponseEntity.status(404).body(error("Not found", "Pending booking not found for your vehicle"));
        }
        scheduleRepo.findById(booking.getScheduleId()).filter(s -> s.getVehicleId() == ctx.vehicle().getId())
            .orElseGet(() -> {
                return null;
            });

        Optional<Booking> updated = bookingRepo.updateStatus(id, "confirmed");
        return ResponseEntity.ok(Map.of("success", true, "booking", updated.orElse(booking)));
    }

    @PutMapping("/driver/requests/{id}/reject")
    @Transactional
    public ResponseEntity<Object> rejectRequest(HttpServletRequest request, @PathVariable int id) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        Optional<Booking> bookingOpt = bookingRepo.findById(id);
        if (bookingOpt.isEmpty() || !"pending".equals(bookingOpt.get().getStatus())) {
            return ResponseEntity.status(404).body(error("Not found", "Pending booking not found for your vehicle"));
        }

        Booking booking = bookingOpt.get();
        bookingRepo.updateStatus(id, "cancelled");
        scheduleRepo.restoreSeats(booking.getScheduleId(), booking.getSeatCount());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/driver/status")
    public ResponseEntity<Object> updateStatus(HttpServletRequest request,
                                               @RequestBody Map<String, Object> body) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];
        Vehicle vehicle = ctx.vehicle();

        String driverStatus = (String) body.get("driverStatus");
        Double lat = body.get("currentLat") != null ? ((Number) body.get("currentLat")).doubleValue() : null;
        Double lng = body.get("currentLng") != null ? ((Number) body.get("currentLng")).doubleValue() : null;

        List<String> validStatuses = List.of("offline", "available", "en_route", "arrived");
        if (driverStatus != null && !validStatuses.contains(driverStatus)) {
            return ResponseEntity.badRequest().body(error("Bad request",
                "Status must be one of: " + String.join(", ", validStatuses)));
        }

        String newStatus = null;
        if (driverStatus != null) {
            newStatus = "offline".equals(driverStatus) ? "inactive" : "active";
        }

        Optional<Vehicle> updated = vehicleRepo.updateStatus(vehicle.getId(), driverStatus, newStatus, lat, lng);
        Vehicle v = updated.orElse(vehicle);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", v.getId());
        resp.put("driverStatus", v.getDriverStatus());
        resp.put("status", v.getStatus());
        resp.put("currentLat", v.getCurrentLat());
        resp.put("currentLng", v.getCurrentLng());
        resp.put("currentPassengers", v.getCurrentPassengers());
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/driver/passengers")
    public ResponseEntity<Object> updatePassengers(HttpServletRequest request,
                                                   @RequestBody Map<String, Object> body) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];
        Vehicle vehicle = ctx.vehicle();

        Object cpObj = body.get("currentPassengers");
        if (cpObj == null) {
            return ResponseEntity.badRequest().body(error("Bad request", "currentPassengers must be a non-negative number"));
        }
        int currentPassengers = ((Number) cpObj).intValue();
        if (currentPassengers < 0) {
            return ResponseEntity.badRequest().body(error("Bad request", "currentPassengers must be a non-negative number"));
        }
        if (currentPassengers > vehicle.getCapacity()) {
            return ResponseEntity.badRequest().body(error("Bad request",
                "Cannot exceed vehicle capacity of " + vehicle.getCapacity()));
        }

        Optional<Vehicle> updated = vehicleRepo.updatePassengers(vehicle.getId(), currentPassengers);
        Vehicle v = updated.orElse(vehicle);
        return ResponseEntity.ok(Map.of("id", v.getId(), "currentPassengers", v.getCurrentPassengers(), "capacity", v.getCapacity()));
    }

    @GetMapping("/driver/custom-requests")
    public ResponseEntity<Object> customRequests(HttpServletRequest request) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        List<CustomTrip> trips = customTripRepo.findByVehicleIdAndStatus(ctx.vehicle().getId(), "pending");
        return ResponseEntity.ok(trips);
    }

    @PutMapping("/driver/custom-requests/{id}/approve")
    public ResponseEntity<Object> approveCustomRequest(HttpServletRequest request, @PathVariable int id) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        Optional<CustomTrip> tripOpt = customTripRepo.findById(id);
        if (tripOpt.isEmpty() || tripOpt.get().getVehicleId() != ctx.vehicle().getId()
                || !"pending".equals(tripOpt.get().getStatus())) {
            return ResponseEntity.status(404).body(error("Not found", "Pending custom trip not found for your vehicle"));
        }

        Optional<CustomTrip> updated = customTripRepo.updateStatus(id, "confirmed");
        return ResponseEntity.ok(Map.of("success", true, "trip", updated.orElse(tripOpt.get())));
    }

    @PutMapping("/driver/custom-requests/{id}/reject")
    public ResponseEntity<Object> rejectCustomRequest(HttpServletRequest request, @PathVariable int id) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        Optional<CustomTrip> tripOpt = customTripRepo.findById(id);
        if (tripOpt.isEmpty() || tripOpt.get().getVehicleId() != ctx.vehicle().getId()
                || !"pending".equals(tripOpt.get().getStatus())) {
            return ResponseEntity.status(404).body(error("Not found", "Pending custom trip not found for your vehicle"));
        }

        customTripRepo.updateStatus(id, "rejected");
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/driver/active-trips")
    public ResponseEntity<Object> activeTrips(HttpServletRequest request) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        List<CustomTrip> trips = customTripRepo.findByVehicleIdAndStatus(ctx.vehicle().getId(), "confirmed");
        return ResponseEntity.ok(trips);
    }

    @GetMapping("/driver/trips-history")
    public ResponseEntity<Object> tripsHistory(HttpServletRequest request) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        List<CustomTrip> trips = customTripRepo.findByVehicleId(ctx.vehicle().getId());
        return ResponseEntity.ok(trips);
    }

    @PutMapping("/driver/custom-requests/{id}/complete")
    public ResponseEntity<Object> completeCustomRequest(HttpServletRequest request, @PathVariable int id) {
        Object[] ctxOut = new Object[1];
        ResponseEntity<Object> err = getDriverCtx(request, ctxOut);
        if (err != null) return err;
        DriverCtx ctx = (DriverCtx) ctxOut[0];

        Optional<CustomTrip> tripOpt = customTripRepo.findById(id);
        if (tripOpt.isEmpty() || tripOpt.get().getVehicleId() != ctx.vehicle().getId()
                || !"confirmed".equals(tripOpt.get().getStatus())) {
            return ResponseEntity.status(404).body(error("Not found", "Confirmed trip not found for your vehicle"));
        }

        Optional<CustomTrip> updated = customTripRepo.updateStatus(id, "completed");
        return ResponseEntity.ok(Map.of("success", true, "trip", updated.orElse(tripOpt.get())));
    }
}
