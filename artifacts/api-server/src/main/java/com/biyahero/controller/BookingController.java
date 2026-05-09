package com.biyahero.controller;

import com.biyahero.model.Booking;
import com.biyahero.model.Route;
import com.biyahero.model.Schedule;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.BookingRepository;
import com.biyahero.repository.PaymentRepository;
import com.biyahero.repository.RouteRepository;
import com.biyahero.repository.ScheduleRepository;
import com.biyahero.repository.VehicleRepository;
import com.biyahero.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class BookingController {

    private final BookingRepository bookingRepo;
    private final ScheduleRepository scheduleRepo;
    private final VehicleRepository vehicleRepo;
    private final RouteRepository routeRepo;
    private final PaymentRepository paymentRepo;

    public BookingController(BookingRepository bookingRepo, ScheduleRepository scheduleRepo,
                              VehicleRepository vehicleRepo, RouteRepository routeRepo,
                              PaymentRepository paymentRepo) {
        this.bookingRepo = bookingRepo;
        this.scheduleRepo = scheduleRepo;
        this.vehicleRepo = vehicleRepo;
        this.routeRepo = routeRepo;
        this.paymentRepo = paymentRepo;
    }

    private Integer requireAuth(HttpServletRequest request) {
        return (Integer) request.getAttribute(JwtAuthFilter.USER_ID_ATTR);
    }

    private Map<String, String> error(String error, String message) {
        return Map.of("error", error, "message", message);
    }

    private Map<String, Object> enrichBooking(Booking booking) {
        Map<String, Object> map = bookingToMap(booking);
        scheduleRepo.findById(booking.getScheduleId()).ifPresent(schedule -> {
            Map<String, Object> schedMap = new HashMap<>();
            schedMap.put("id", schedule.getId());
            schedMap.put("routeId", schedule.getRouteId());
            schedMap.put("vehicleId", schedule.getVehicleId());
            schedMap.put("departureTime", schedule.getDepartureTime());
            schedMap.put("estimatedArrivalTime", schedule.getEstimatedArrivalTime());
            schedMap.put("availableSeats", schedule.getAvailableSeats());
            schedMap.put("fare", schedule.getFare());
            schedMap.put("date", schedule.getDate());
            routeRepo.findById(schedule.getRouteId()).ifPresent(route -> {
                schedMap.put("routeName", route.getName());
                schedMap.put("origin", route.getOrigin());
                schedMap.put("destination", route.getDestination());
            });
            vehicleRepo.findById(schedule.getVehicleId()).ifPresent(vehicle -> {
                schedMap.put("vehicleType", vehicle.getType());
                schedMap.put("operator", vehicle.getOperator());
                schedMap.put("plateNumber", vehicle.getPlateNumber());
                schedMap.put("totalCapacity", vehicle.getCapacity());
            });
            map.put("schedule", schedMap);
        });
        return map;
    }

    private Map<String, Object> bookingToMap(Booking b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("userId", b.getUserId());
        m.put("scheduleId", b.getScheduleId());
        m.put("seatCount", b.getSeatCount());
        m.put("passengerName", b.getPassengerName());
        m.put("passengerPhone", b.getPassengerPhone());
        m.put("totalFare", b.getTotalFare());
        m.put("status", b.getStatus());
        m.put("paymentMethod", b.getPaymentMethod());
        m.put("paymentStatus", b.getPaymentStatus());
        m.put("createdAt", b.getCreatedAt());
        return m;
    }

    @GetMapping("/bookings")
    public ResponseEntity<Object> listBookings(HttpServletRequest request,
                                               @RequestParam(required = false) String status) {
        Integer userId = requireAuth(request);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        List<Booking> bookings = status != null
            ? bookingRepo.findByUserIdAndStatus(userId, status)
            : bookingRepo.findByUserId(userId);

        List<Map<String, Object>> enriched = bookings.stream().map(this::enrichBooking).toList();
        return ResponseEntity.ok(enriched);
    }

    @PostMapping("/bookings")
    @Transactional
    public ResponseEntity<Object> createBooking(HttpServletRequest request,
                                                @RequestBody Map<String, Object> body) {
        Integer userId = requireAuth(request);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Number scheduleIdNum = (Number) body.get("scheduleId");
        Number seatCountNum = (Number) body.get("seatCount");
        String passengerName = (String) body.get("passengerName");

        if (scheduleIdNum == null || seatCountNum == null || passengerName == null) {
            return ResponseEntity.badRequest().body(error("Validation error", "scheduleId, seatCount, and passengerName are required"));
        }

        int scheduleId = scheduleIdNum.intValue();
        int seatCount = seatCountNum.intValue();
        String passengerPhone = (String) body.get("passengerPhone");

        Optional<Schedule> scheduleOpt = scheduleRepo.findById(scheduleId);
        if (scheduleOpt.isEmpty()) {
            return ResponseEntity.status(404).body(error("Not found", "Schedule not found"));
        }

        Schedule schedule = scheduleOpt.get();
        boolean decremented = scheduleRepo.decrementSeats(scheduleId, seatCount);
        if (!decremented) {
            return ResponseEntity.badRequest().body(error("Bad request", "Not enough seats available"));
        }

        double totalFare = schedule.getFare() * seatCount;
        Booking booking = bookingRepo.insert(userId, scheduleId, seatCount, passengerName, passengerPhone, totalFare);
        return ResponseEntity.status(201).body(enrichBooking(booking));
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<Object> getBooking(HttpServletRequest request, @PathVariable int id) {
        Integer userId = requireAuth(request);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Optional<Booking> bookingOpt = bookingRepo.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().getUserId() != userId) {
            return ResponseEntity.status(404).body(error("Not found", "Booking not found"));
        }

        return ResponseEntity.ok(enrichBooking(bookingOpt.get()));
    }

    @DeleteMapping("/bookings/{id}")
    @Transactional
    public ResponseEntity<Object> cancelBooking(HttpServletRequest request, @PathVariable int id) {
        Integer userId = requireAuth(request);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Optional<Booking> bookingOpt = bookingRepo.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().getUserId() != userId) {
            return ResponseEntity.status(404).body(error("Not found", "Booking not found"));
        }

        Booking existing = bookingOpt.get();
        if (!List.of("pending", "confirmed").contains(existing.getStatus())) {
            return ResponseEntity.badRequest().body(error("Bad request", "Cannot cancel this booking"));
        }

        Optional<Booking> cancelled = bookingRepo.cancelIfOwned(id, userId);
        if (cancelled.isEmpty()) {
            return ResponseEntity.badRequest().body(error("Bad request", "Cannot cancel this booking"));
        }

        scheduleRepo.restoreSeats(existing.getScheduleId(), existing.getSeatCount());
        return ResponseEntity.ok(enrichBooking(cancelled.get()));
    }

    @PostMapping("/bookings/{id}/pay")
    @Transactional
    public ResponseEntity<Object> payBooking(HttpServletRequest request,
                                              @PathVariable int id,
                                              @RequestBody Map<String, Object> body) {
        Integer userId = requireAuth(request);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        String method = (String) body.get("method");
        if (method == null) {
            return ResponseEntity.badRequest().body(error("Validation error", "method is required"));
        }

        Optional<Booking> bookingOpt = bookingRepo.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().getUserId() != userId) {
            return ResponseEntity.status(404).body(error("Not found", "Booking not found"));
        }

        if (!"unpaid".equals(bookingOpt.get().getPaymentStatus())) {
            return ResponseEntity.badRequest().body(error("Bad request", "Booking already paid"));
        }

        Optional<Booking> paid = bookingRepo.pay(id, userId, method);
        if (paid.isEmpty()) {
            return ResponseEntity.badRequest().body(error("Bad request", "Payment failed"));
        }

        String transactionId = "TXN-" + System.currentTimeMillis() + "-" +
            Long.toHexString(Double.doubleToLongBits(Math.random())).substring(0, 6).toUpperCase();

        paymentRepo.insert(id, userId, paid.get().getTotalFare(), method, transactionId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("transactionId", transactionId);
        result.put("booking", enrichBooking(paid.get()));
        result.put("message", "Payment processed successfully");
        return ResponseEntity.ok(result);
    }
}
