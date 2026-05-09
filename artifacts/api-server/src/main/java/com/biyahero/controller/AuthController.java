package com.biyahero.controller;

import com.biyahero.model.User;
import com.biyahero.model.Vehicle;
import com.biyahero.repository.UserRepository;
import com.biyahero.repository.VehicleRepository;
import com.biyahero.security.JwtAuthFilter;
import com.biyahero.security.JwtUtil;
import com.biyahero.security.PasswordUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepository userRepo;
    private final VehicleRepository vehicleRepo;
    private final JwtUtil jwtUtil;
    private final PasswordUtil passwordUtil;

    public AuthController(UserRepository userRepo, VehicleRepository vehicleRepo,
                          JwtUtil jwtUtil, PasswordUtil passwordUtil) {
        this.userRepo = userRepo;
        this.vehicleRepo = vehicleRepo;
        this.jwtUtil = jwtUtil;
        this.passwordUtil = passwordUtil;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Object> register(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String email = (String) body.get("email");
        String password = (String) body.get("password");
        String role = body.getOrDefault("role", "commuter").toString();

        if (name == null || email == null || password == null) {
            return ResponseEntity.badRequest().body(error("Validation error", "name, email, and password are required"));
        }

        if ("driver".equals(role)) {
            String vType = (String) body.get("vehicleType");
            String vPlate = (String) body.get("vehiclePlate");
            Object vCap = body.get("vehicleCapacity");
            String vOp = (String) body.get("vehicleOperator");
            if (vType == null || vPlate == null || vCap == null || vOp == null) {
                return ResponseEntity.badRequest().body(error("Validation error",
                    "Driver registration requires vehicleType, vehiclePlate, vehicleCapacity, and vehicleOperator"));
            }
        }

        if (userRepo.findByEmail(email).isPresent()) {
            return ResponseEntity.status(409).body(error("Conflict", "Email already in use"));
        }

        Integer driverVehicleId = null;

        if ("driver".equals(role)) {
            String vehiclePlate = (String) body.get("vehiclePlate");
            if (vehiclePlate != null && vehicleRepo.findByPlateNumber(vehiclePlate).isPresent()) {
                return ResponseEntity.status(409).body(error("Conflict", "A vehicle with that plate number is already registered"));
            }
            String vehicleType = (String) body.get("vehicleType");
            String vehicleOperator = (String) body.get("vehicleOperator");
            int vehicleCapacity = ((Number) body.get("vehicleCapacity")).intValue();
            Vehicle vehicle = vehicleRepo.insert(vehicleType, vehiclePlate, vehicleOperator, vehicleCapacity, "inactive", "offline", 0);
            driverVehicleId = vehicle.getId();
        }

        String passwordHash = passwordUtil.hashPassword(password);
        User user = userRepo.insert(name, email, passwordHash, role, driverVehicleId);
        String token = jwtUtil.signToken(user.getId());

        return ResponseEntity.status(201).body(buildUserResponse(token, user));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Object> login(@RequestBody Map<String, Object> body) {
        String email = (String) body.get("email");
        String password = (String) body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(error("Validation error", "email and password are required"));
        }

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty() || !passwordUtil.verifyPassword(password, userOpt.get().getPasswordHash())) {
            return ResponseEntity.status(401).body(error("Unauthorized", "Invalid email or password"));
        }

        User user = userOpt.get();
        String token = jwtUtil.signToken(user.getId());
        return ResponseEntity.ok(buildUserResponse(token, user));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<Object> me(HttpServletRequest request) {
        Integer userId = (Integer) request.getAttribute(JwtAuthFilter.USER_ID_ATTR);
        if (userId == null) return ResponseEntity.status(401).body(error("Unauthorized", "Missing or invalid token"));

        Optional<User> userOpt = userRepo.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(404).body(error("Not found", "User not found"));

        User user = userOpt.get();
        Map<String, Object> resp = new HashMap<>();
        resp.put("id", user.getId());
        resp.put("name", user.getName());
        resp.put("email", user.getEmail());
        resp.put("role", user.getRole());
        resp.put("driverVehicleId", user.getDriverVehicleId());
        resp.put("createdAt", user.getCreatedAt());
        return ResponseEntity.ok(resp);
    }

    private Map<String, Object> buildUserResponse(String token, User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("name", user.getName());
        userMap.put("email", user.getEmail());
        userMap.put("role", user.getRole());
        userMap.put("driverVehicleId", user.getDriverVehicleId());
        userMap.put("createdAt", user.getCreatedAt());
        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("user", userMap);
        return resp;
    }

    private Map<String, String> error(String error, String message) {
        return Map.of("error", error, "message", message);
    }
}
